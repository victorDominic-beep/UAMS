const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const prisma = require("../../../config/prisma")
const HttpError = require("../../../utils/httpError")

const BCRYPT_COST = 12

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

module.exports = { BCRYPT_COST, publicUser, login, changePassword }
