const prisma = require("../../../config/prisma")
const HttpError = require("../../../utils/httpError")
const { recordAudit } = require("../../audit/services/auditService")

async function createPolicy(data, actor, ipAddress) {
  const asset = await prisma.asset.findUnique({ where: { id: data.assetId }, select: { id: true } })
  if (!asset) throw new HttpError(404, "Asset not found")
  const item = await prisma.insurancePolicy.create({ data: { ...data, coverageAmount: String(data.coverageAmount), createdById: actor.id } })
  await recordAudit({ userId: actor.id, ipAddress, actionType: "CREATE", entityName: "InsurancePolicy", entityId: item.id,
    delta: { policyNumber: item.policyNumber, assetId: item.assetId, underwriter: item.underwriter, expiryDate: item.expiryDate } })
  return item
}

async function listPolicies(query) {
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const throughRenewal = new Date(today)
  throughRenewal.setUTCDate(throughRenewal.getUTCDate() + 30)
  const where = {}
  if (query.assetId) where.assetId = query.assetId
  if (query.status === "active") Object.assign(where, { effectiveDate: { lte: today }, expiryDate: { gte: today } })
  if (query.status === "expired") where.expiryDate = { lt: today }
  if (query.status === "upcoming") where.expiryDate = { gte: today, lte: throughRenewal }
  const skip = (query.page - 1) * query.pageSize
  const [total, items] = await prisma.$transaction([
    prisma.insurancePolicy.count({ where }),
    prisma.insurancePolicy.findMany({ where, skip, take: query.pageSize, orderBy: { expiryDate: "asc" }, include: { asset: { select: { id: true, painCode: true, name: true } } } }),
  ])
  return { items, pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) } }
}

async function getPolicy(id) {
  const item = await prisma.insurancePolicy.findUnique({ where: { id }, include: { asset: true, createdBy: { select: { id: true, fullName: true, staffNumber: true } } } })
  if (!item) throw new HttpError(404, "Insurance policy not found")
  return item
}

async function updatePolicy(id, data, actor, ipAddress) {
  const before = await prisma.insurancePolicy.findUnique({ where: { id } })
  if (!before) throw new HttpError(404, "Insurance policy not found")
  const merged = { ...before, ...data }
  if (merged.expiryDate < merged.effectiveDate) throw new HttpError(400, "Expiry must not precede the effective date")
  if (data.coverageAmount !== undefined) data.coverageAmount = String(data.coverageAmount)
  const after = await prisma.insurancePolicy.update({ where: { id }, data })
  await recordAudit({ userId: actor.id, ipAddress, actionType: "UPDATE", entityName: "InsurancePolicy", entityId: id,
    delta: { before: { policyNumber: before.policyNumber, expiryDate: before.expiryDate }, after: { policyNumber: after.policyNumber, expiryDate: after.expiryDate } } })
  return after
}

module.exports = { createPolicy, listPolicies, getPolicy, updatePolicy }
