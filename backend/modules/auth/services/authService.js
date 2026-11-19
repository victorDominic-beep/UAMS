const bcrypt = require("bcrypt")
const crypto = require("node:crypto")
const jwt = require("jsonwebtoken")
const prisma = require("../../../config/prisma")
const HttpError = require("../../../utils/httpError")
const { OFFICIAL_ROLES } = require("../../../config/roles")
const { appendAuditInTransaction } = require("../../audit/services/auditService")

const BCRYPT_COST = 12
const ADMIN_BOOTSTRAP_LOCK_KEY = 78114420913n

function publicUser(user) {
  return {
    id: user.id,
    staffNumber: user.staffNumber,
    email: user.email,
    fullName: user.fullName,
    isActive: user.isActive,
    department: user.department,
    roles: user.roles.map((entry) => ({
      id: entry.role.id,
      name: entry.role.name,
      displayName: entry.role.description || entry.role.name,
      assignedAt: entry.assignedAt,
    })),
  }
}

async function login({ username, password, ipAddress }) {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: username, mode: "insensitive" } },
        { staffNumber: { equals: username, mode: "insensitive" } },
      ],
      isActive: true,
    },
    include: {
      department: true,
      roles: {
        where: { revokedAt: null },
        include: { role: true },
      },
    },
  })

  const passwordMatches = user
    ? await bcrypt.compare(password, user.passwordHash)
    : await bcrypt.compare(password, "$2b$12$3t7nNn5z9b7vQ5rF7j2HCOxwBq8cV4xM1hF6gP2zK9dL3rT7sE1mG")

  if (!user || !passwordMatches) {
    throw new HttpError(401, "Invalid username or password")
  }

  const safeUser = publicUser(user)
  const token = jwt.sign(
    { sub: user.id, roles: user.roles.map((entry) => entry.role.name) },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN },
  )

  const auditService = require("../../audit/services/auditService")
  await auditService.recordAudit({
    userId: user.id,
    ipAddress,
    actionType: "LOGIN",
    entityName: "User",
    entityId: user.id,
    delta: { result: "success" },
  })

  return { user: safeUser, token }
}

async function changePassword(userId, currentPassword, newPassword, ipAddress) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || !user.isActive) throw new HttpError(401, "Account is unavailable")

  const matches = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!matches) throw new HttpError(400, "Current password is incorrect")

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST)
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  })

  const auditService = require("../../audit/services/auditService")
  await auditService.recordAudit({
    userId,
    ipAddress,
    actionType: "UPDATE",
    entityName: "UserPassword",
    entityId: userId,
    delta: { result: "password_changed" },
  })

  return { success: true }
}

function bootstrapSecretMatches(expected, provided) {
  if (typeof expected !== "string" || expected.length < 32 || typeof provided !== "string") return false
  const expectedBytes = Buffer.from(expected, "utf8")
  const providedBytes = Buffer.from(provided, "utf8")
  return expectedBytes.length === providedBytes.length && crypto.timingSafeEqual(expectedBytes, providedBytes)
}

async function bootstrapInitialAdministrator({ secret, staffNumber, email, fullName, password, ipAddress }) {
  if (process.env.NODE_ENV !== "production") {
    throw new HttpError(404, "Administrator bootstrap is unavailable")
  }

  const expectedSecret = process.env.UAMS_ADMIN_BOOTSTRAP_SECRET
  if (!expectedSecret) throw new HttpError(404, "Administrator bootstrap is unavailable")
  if (!bootstrapSecretMatches(expectedSecret, secret)) {
    throw new HttpError(401, "Invalid bootstrap credential")
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST)
  const user = await prisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(${ADMIN_BOOTSTRAP_LOCK_KEY})`

    const expectedDatabaseName = process.env.UAMS_PRESENTATION_DATABASE_NAME
    const [databaseIdentity] = await transaction.$queryRaw`SELECT current_database() AS "databaseName", current_schema() AS "schemaName"`
    if (
      !/^uams_presentation(?:_[a-z0-9_]+)?$/i.test(expectedDatabaseName || "") ||
      databaseIdentity?.databaseName !== expectedDatabaseName ||
      databaseIdentity?.schemaName !== "public"
    ) {
      throw new HttpError(403, "Administrator bootstrap is restricted to the configured presentation database")
    }

    // Include revoked assignments: once an administrator has been provisioned,
    // this public bootstrap path must never become usable again.
    const existingAdministrator = await transaction.userRole.findFirst({
      where: { role: { name: "SYSTEM_ADMINISTRATOR" } },
      select: { id: true },
    })
    if (existingAdministrator) {
      throw new HttpError(409, "Initial administrator has already been provisioned")
    }

    const roleRows = new Map()
    for (const role of Object.values(OFFICIAL_ROLES)) {
      const row = await transaction.role.upsert({
        where: { name: role.name },
        update: { description: role.displayName, isActive: true },
        create: { name: role.name, description: role.displayName, isActive: true },
      })
      roleRows.set(role.name, row)
    }

    const centralDepartment = await transaction.department.create({
      data: { code: "DEMO", name: "UAMS Demonstration Stores", isActive: true },
    })
    await transaction.department.create({
      data: { code: "DEMOENG", name: "UAMS Demonstration Engineering", isActive: true },
    })
    await transaction.department.create({
      data: { code: "DEMOICT", name: "UAMS Demonstration ICT", isActive: true },
    })
    await transaction.assetCategory.create({
      data: { code: "DEMOEQ", name: "Demonstration Equipment", isActive: true },
    })

    const adminRole = roleRows.get("SYSTEM_ADMINISTRATOR")
    const createdUser = await transaction.user.create({
      data: {
        staffNumber,
        email,
        fullName,
        passwordHash,
        isActive: true,
        roles: { create: { roleId: adminRole.id } },
      },
      include: {
        department: true,
        roles: { where: { revokedAt: null }, include: { role: true } },
      },
    })

    await appendAuditInTransaction(transaction, {
      userId: null,
      ipAddress,
      actionType: "CREATE",
      entityName: "InitialAdministrator",
      entityId: createdUser.id,
      delta: {
        staffNumber,
        roles: ["SYSTEM_ADMINISTRATOR"],
        source: "one_time_bootstrap",
        presentationReferenceData: { departmentId: centralDepartment.id, categoryCode: "DEMOEQ" },
      },
    })

    return createdUser
  }, { isolationLevel: "ReadCommitted", timeout: 20000 })

  return publicUser(user)
}

module.exports = { BCRYPT_COST, publicUser, login, changePassword, bootstrapInitialAdministrator }
