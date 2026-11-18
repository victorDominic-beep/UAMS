const prisma = require("../../../config/prisma")
const HttpError = require("../../../utils/httpError")

function publicAuditEntry(entry) {
  return {
    id: entry.id,
    timestamp: entry.timestamp,
    userId: entry.userId,
    ipAddress: entry.ipAddress,
    actionType: entry.actionType,
    entityName: entry.entityName,
    entityId: entry.entityId,
    delta: entry.delta,
    prevHash: entry.prevHash,
    rowHash: entry.rowHash,
  }
}

async function listAuditEntries(query) {
  const where = {}
  if (query.userId) where.userId = query.userId
  if (query.actionType) where.actionType = query.actionType
  if (query.entityName) where.entityName = { contains: query.entityName, mode: "insensitive" }
  if (query.entityId) where.entityId = query.entityId
  if (query.from || query.to) {
    where.timestamp = {}
    if (query.from) where.timestamp.gte = query.from
    if (query.to) where.timestamp.lte = query.to
  }

  const skip = (query.page - 1) * query.pageSize
  const [total, entries] = await prisma.$transaction([
    prisma.auditTrail.count({ where }),
    prisma.auditTrail.findMany({
      where,
      skip,
      take: query.pageSize,
      orderBy: [{ timestamp: "desc" }, { createdAt: "desc" }],
      include: { user: { select: { id: true, fullName: true, staffNumber: true } } },
    }),
  ])

  return {
    items: entries.map((entry) => ({
      ...publicAuditEntry(entry),
      user: entry.user,
    })),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
  }
}

async function getAuditEntry(id) {
  const entry = await prisma.auditTrail.findUnique({
    where: { id },
    include: { user: { select: { id: true, fullName: true, staffNumber: true } } },
  })
  if (!entry) throw new HttpError(404, "Audit entry not found")
  return { ...publicAuditEntry(entry), user: entry.user }
}

module.exports = { listAuditEntries, getAuditEntry }
