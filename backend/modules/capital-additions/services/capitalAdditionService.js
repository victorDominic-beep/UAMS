const prisma = require("../../../config/prisma")
const HttpError = require("../../../utils/httpError")
const { recordAudit } = require("../../audit/services/auditService")

async function createCapitalAddition(data, actor, ipAddress) {
  const item = await prisma.$transaction(async (tx) => {
    const asset = await tx.asset.findUnique({ where: { id: data.assetId }, select: { id: true, status: true } })
    if (!asset) throw new HttpError(404, "Asset not found")
    if (asset.status !== "IN_SERVICE") throw new HttpError(409, "Capital additions can only be flagged for assets in service")
    return tx.capitalAddition.create({ data: {
      assetId: asset.id,
      recordedById: actor.id,
      amount: String(data.amount),
      description: data.description,
      status: "PENDING",
    } })
  }, { isolationLevel: "Serializable" })
  await recordAudit({ userId: actor.id, ipAddress, actionType: "CREATE", entityName: "CapitalAddition", entityId: item.id,
    delta: { assetId: item.assetId, amount: String(item.amount), status: "PENDING", description: item.description } })
  return item
}

async function approveCapitalAddition(id, actor, ipAddress) {
  const result = await prisma.$transaction(async (tx) => {
    const additionRows = await tx.$queryRaw`SELECT "id" FROM "CapitalAddition" WHERE "id" = ${id}::uuid FOR UPDATE`
    if (!additionRows.length) throw new HttpError(404, "Capital addition not found")
    const item = await tx.capitalAddition.findUnique({ where: { id } })
    if (item.recordedById === actor.id) throw new HttpError(403, "A Bursar cannot approve a capital addition they flagged")
    if (item.status !== "PENDING") throw new HttpError(409, "Only pending capital additions can be approved")
    const assetRows = await tx.$queryRaw`SELECT "id" FROM "Asset" WHERE "id" = ${item.assetId}::uuid FOR UPDATE`
    if (!assetRows.length) throw new HttpError(404, "Asset not found")
    const asset = await tx.asset.findUnique({ where: { id: item.assetId } })
    if (asset.status !== "IN_SERVICE") throw new HttpError(409, "Capital addition asset must remain in service")
    const approvedAt = new Date()
    if (!asset.inServiceDate || !asset.usefulLifeYears) throw new HttpError(409, "A verified in-service date and useful life are required before approving a capital addition")
    const monthsElapsed = Math.max(0, (approvedAt.getUTCFullYear() - asset.inServiceDate.getUTCFullYear()) * 12 + approvedAt.getUTCMonth() - asset.inServiceDate.getUTCMonth())
    if (asset.usefulLifeYears * 12 - monthsElapsed <= 0) throw new HttpError(409, "The asset's useful life is exhausted; this addition requires financial review")
    const addition = await tx.capitalAddition.update({ where: { id }, data: { status: "APPROVED", approvedById: actor.id, approvedAt } })
    const updatedAsset = await tx.asset.update({ where: { id: asset.id }, data: {
      currentNetBookValue: { increment: item.amount },
    } })
    return { addition, asset: updatedAsset }
  }, { isolationLevel: "Serializable", timeout: 15000 })
  await recordAudit({ userId: actor.id, ipAddress, actionType: "APPROVE", entityName: "CapitalAddition", entityId: id,
    delta: { status: { from: "PENDING", to: "APPROVED" }, approvedById: actor.id, amount: String(result.addition.amount), assetNBV: String(result.asset.currentNetBookValue) } })
  return result.addition
}

async function listCapitalAdditions(query) {
  const where = {}
  if (query.assetId) where.assetId = query.assetId
  if (query.status) where.status = query.status
  const skip = (query.page - 1) * query.pageSize
  const [total, items] = await prisma.$transaction([
    prisma.capitalAddition.count({ where }),
    prisma.capitalAddition.findMany({ where, skip, take: query.pageSize, orderBy: { createdAt: "desc" }, include: {
      asset: { select: { id: true, painCode: true, name: true } },
      recordedBy: { select: { id: true, fullName: true, staffNumber: true } },
      approvedBy: { select: { id: true, fullName: true, staffNumber: true } },
    } }),
  ])
  return { items, pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) } }
}

module.exports = { createCapitalAddition, approveCapitalAddition, listCapitalAdditions }
