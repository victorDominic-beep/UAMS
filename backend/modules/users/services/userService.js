const bcrypt = require("bcrypt")
const prisma = require("../../../config/prisma")
const HttpError = require("../../../utils/httpError")
const { OFFICIAL_ROLES } = require("../../../config/roles")
const { BCRYPT_COST } = require("../../auth/services/authService")
const { recordAudit } = require("../../audit/services/auditService")

function publicUser(user) {
  return {
    id: user.id,
    staffNumber: user.staffNumber,
    email: user.email,
    fullName: user.fullName,
    isActive: user.isActive,
    department: user.department,
    roles: (user.roles || []).filter((entry) => entry.revokedAt === null).map((entry) => ({
      id: entry.role.id,
      name: entry.role.name,
      displayName: entry.role.description || entry.role.name,
      assignedAt: entry.assignedAt,
    })),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

async function listUsers() {
  const users = await prisma.user.findMany({
    include: {
      department: true,
      roles: { where: { revokedAt: null }, include: { role: true } },
    },
    orderBy: { fullName: "asc" },
  })
  return users.map(publicUser)
}

async function getUser(id) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      department: true,
      roles: { where: { revokedAt: null }, include: { role: true } },
    },
  })
  if (!user) throw new HttpError(404, "User not found")
  return publicUser(user)
}

async function createUser(data, actorId, ipAddress) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: data.email }, { staffNumber: data.staffNumber }] },
    select: { id: true },
  })
  if (existing) throw new HttpError(409, "A user with that staff number or email already exists")

  if (data.departmentId) {
    const department = await prisma.department.findUnique({ where: { id: data.departmentId }, select: { id: true } })
    if (!department) throw new HttpError(400, "Department not found")
  }

  const roles = await prisma.role.findMany({
    where: { name: { in: data.roleNames }, isActive: true },
  })
  if (roles.length !== data.roleNames.length) throw new HttpError(400, "One or more roles are invalid")

  const passwordHash = await bcrypt.hash(data.password, BCRYPT_COST)
  const user = await prisma.user.create({
    data: {
      staffNumber: data.staffNumber,
      email: data.email,
      fullName: data.fullName,
      passwordHash,
      departmentId: data.departmentId || null,
      isActive: data.isActive,
      roles: {
        create: roles.map((role) => ({ roleId: role.id, assignedById: actorId })),
      },
    },
    include: {
      department: true,
      roles: { where: { revokedAt: null }, include: { role: true } },
    },
  })

  await recordAudit({
    userId: actorId,
    ipAddress,
    actionType: "CREATE",
    entityName: "User",
    entityId: user.id,
    delta: { roles: data.roleNames, isActive: data.isActive },
  })

  return publicUser(user)
}

async function updateUser(id, data, actorId, ipAddress) {
  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing) throw new HttpError(404, "User not found")

  if (data.departmentId) {
    const department = await prisma.department.findUnique({ where: { id: data.departmentId }, select: { id: true } })
    if (!department) throw new HttpError(400, "Department not found")
  }

  if (data.email || data.staffNumber) {
    const duplicate = await prisma.user.findFirst({
      where: {
        id: { not: id },
        OR: [
          ...(data.email ? [{ email: data.email }] : []),
          ...(data.staffNumber ? [{ staffNumber: data.staffNumber }] : []),
        ],
      },
      select: { id: true },
    })
    if (duplicate) throw new HttpError(409, "A user with that staff number or email already exists")
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    include: {
      department: true,
      roles: { where: { revokedAt: null }, include: { role: true } },
    },
  })

  await recordAudit({
    userId: actorId,
    ipAddress,
    actionType: "UPDATE",
    entityName: "User",
    entityId: id,
    delta: data,
  })

  return publicUser(user)
}

async function replaceRoles(id, roleNames, actorId, ipAddress) {
  if (id === actorId && roleNames.includes("SYSTEM_ADMINISTRATOR") === false) {
    throw new HttpError(403, "You cannot remove your own System Administrator role")
  }

  const target = await prisma.user.findUnique({
    where: { id },
    include: { roles: { where: { revokedAt: null }, include: { role: true } } },
  })
  if (!target) throw new HttpError(404, "User not found")

  const roles = await prisma.role.findMany({
    where: { name: { in: roleNames }, isActive: true },
  })
  if (roles.length !== roleNames.length) throw new HttpError(400, "One or more roles are invalid")

  const desiredRoleIds = new Set(roles.map((role) => role.id))
  const existingRoleIds = new Set(target.roles.map((entry) => entry.roleId))

  await prisma.$transaction(async (transaction) => {
    for (const entry of target.roles) {
      if (!desiredRoleIds.has(entry.roleId)) {
        await transaction.userRole.update({
          where: { id: entry.id },
          data: { revokedAt: new Date() },
        })
      }
    }

    for (const role of roles) {
      if (!existingRoleIds.has(role.id)) {
        await transaction.userRole.create({
          data: { userId: id, roleId: role.id, assignedById: actorId },
        })
      }
    }
  })

  await recordAudit({
    userId: actorId,
    ipAddress,
    actionType: "ROLE_ASSIGN",
    entityName: "UserRole",
    entityId: id,
    delta: { roleNames },
  })

  return getUser(id)
}

async function setStatus(id, isActive, actorId, ipAddress) {
  if (id === actorId && isActive === false) {
    throw new HttpError(403, "You cannot deactivate your own account")
  }

  const target = await prisma.user.findUnique({
    where: { id },
    include: { roles: { where: { revokedAt: null }, include: { role: true } } },
  })
  if (!target) throw new HttpError(404, "User not found")

  if (!isActive && target.roles.some((entry) => entry.role.name === "SYSTEM_ADMINISTRATOR") && target.isActive) {
    const activeAdmins = await prisma.user.count({
      where: {
        isActive: true,
        roles: {
          some: {
            revokedAt: null,
            role: { name: "SYSTEM_ADMINISTRATOR", isActive: true },
          },
        },
      },
    })
    if (activeAdmins <= 1) throw new HttpError(409, "Cannot deactivate the last active System Administrator")
  }

  await prisma.user.update({ where: { id }, data: { isActive } })

  await recordAudit({
    userId: actorId,
    ipAddress,
    actionType: "ACCESS_CHANGE",
    entityName: "User",
    entityId: id,
    delta: { isActive },
  })

  return getUser(id)
}

module.exports = {
  publicUser,
  listUsers,
  getUser,
  createUser,
  updateUser,
  replaceRoles,
  setStatus,
}
