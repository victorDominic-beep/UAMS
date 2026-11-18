const prisma = require("../../../config/prisma")
const HttpError = require("../../../utils/httpError")
const { recordAudit } = require("../../audit/services/auditService")

async function createMaintenance(data, actor, ipAddress) {
  const created = await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw`SELECT "id" FROM "Asset" WHERE "id" = ${data.assetId}::uuid FOR UPDATE`
    if (!locked.length) throw new HttpError(404, "Asset not found")
    const asset = await tx.asset.findUnique({ where: { id: data.assetId } })
    if (asset.status !== "IN_SERVICE") throw new HttpError(409, "Only assets in service can enter maintenance")
    const record = await tx.maintenanceRecord.create({ data: {
      assetId: asset.id,
      recordedById: actor.id,
      serviceDate: data.serviceDate,
      description: data.description,
      partsReplaced: data.partsReplaced || null,
      expenditure: data.expenditure,
      isCapitalAddition: false,
      status: "OPEN",
    } })
    await tx.asset.update({ where: { id: asset.id }, data: { status: "UNDER_MAINTENANCE" } })
    return record
  }, { isolationLevel: "Serializable", timeout: 15000 })

  await recordAudit({ userId: actor.id, ipAddress, actionType: "CREATE", entityName: "MaintenanceRecord", entityId: created.id,
    delta: { assetId: created.assetId, status: "OPEN", serviceDate: created.serviceDate, expenditure: String(created.expenditure), isCapitalAddition: false, assetStatus: { from: "IN_SERVICE", to: "UNDER_MAINTENANCE" } } })
  return created
}

async function completeMaintenance(id, actor, ipAddress) {
  const result = await prisma.$transaction(async (tx) => {
    const record = await tx.maintenanceRecord.findUnique({ where: { id } })
    if (!record) throw new HttpError(404, "Maintenance record not found")
    const locked = await tx.$queryRaw`SELECT "id" FROM "Asset" WHERE "id" = ${record.assetId}::uuid FOR UPDATE`
    if (!locked.length) throw new HttpError(404, "Asset not found")
    const asset = await tx.asset.findUnique({ where: { id: record.assetId } })
    if (record.status !== "OPEN" || asset.status !== "UNDER_MAINTENANCE") throw new HttpError(409, "Maintenance operation is not open")
    const updated = await tx.maintenanceRecord.update({ where: { id }, data: { status: "COMPLETED" } })
    const updatedAsset = await tx.asset.update({ where: { id: asset.id }, data: { status: "IN_SERVICE" } })
    return { record: updated, asset: updatedAsset }
  }, { isolationLevel: "Serializable", timeout: 15000 })

  await recordAudit({ userId: actor.id, ipAddress, actionType: "UPDATE", entityName: "MaintenanceRecord", entityId: id,
    delta: { event: "MAINTENANCE_COMPLETED", status: { from: "OPEN", to: "COMPLETED" }, assetStatus: { from: "UNDER_MAINTENANCE", to: "IN_SERVICE" } } })
  return result.record
}

async function listMaintenance(query) {
  const where = {}
  if (query.assetId) where.assetId = query.assetId
  if (query.status) where.status = query.status
  const skip = (query.page - 1) * query.pageSize
  const [total, items] = await prisma.$transaction([
    prisma.maintenanceRecord.count({ where }),
    prisma.maintenanceRecord.findMany({ where, skip, take: query.pageSize, orderBy: { serviceDate: "desc" }, include: {
      asset: { select: { id: true, painCode: true, name: true, status: true } },
      recordedBy: { select: { id: true, fullName: true, staffNumber: true } },
    } }),
  ])
  return { items, pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) } }
}

async function getMaintenance(id) {
  const item = await prisma.maintenanceRecord.findUnique({ where: { id }, include: { asset: true, recordedBy: { select: { id: true, fullName: true, staffNumber: true } } } })
  if (!item) throw new HttpError(404, "Maintenance record not found")
  return item
}

module.exports = { createMaintenance, completeMaintenance, listMaintenance, getMaintenance }
