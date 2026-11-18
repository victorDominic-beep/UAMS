const prisma = require("../../../config/prisma")
const HttpError = require("../../../utils/httpError")
const { recordAudit } = require("../../audit/services/auditService")

async function recordMovement(assetId, data, actor, ipAddress) {
  const result = await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw`SELECT "id" FROM "Asset" WHERE "id" = ${assetId}::uuid FOR UPDATE`
    if (!locked.length) throw new HttpError(404, "Asset not found")
    const asset = await tx.asset.findUnique({ where: { id: assetId }, include: { department: true } })
    if (asset.status !== "IN_SERVICE") throw new HttpError(409, "Only assets in service can be moved")
    let destination = null
    if (data.toDepartmentId) {
      destination = await tx.department.findUnique({ where: { id: data.toDepartmentId } })
      if (!destination || !destination.isActive) throw new HttpError(400, "Destination department not found or inactive")
    }
    const transfer = await tx.custodyTransfer.create({ data: {
      assetId,
      fromDepartmentId: asset.departmentId,
      toDepartmentId: destination?.id || asset.departmentId,
      fromLocation: asset.location,
      toLocation: data.toLocation,
      actorId: actor.id,
      status: "APPROVED",
      reason: data.reason,
      transferredAt: new Date(),
      immutable: true,
    } })
    const moved = await tx.asset.update({ where: { id: assetId }, data: {
      departmentId: destination?.id || asset.departmentId,
      location: data.toLocation,
    } })
    return { transfer, before: asset, after: moved }
  }, { isolationLevel: "Serializable", timeout: 15000 })
  await recordAudit({ userId: actor.id, ipAddress, actionType: "TRANSFER", entityName: "CustodyTransfer", entityId: result.transfer.id,
    delta: { assetId, fromDepartmentId: result.before.departmentId, toDepartmentId: result.after.departmentId, fromLocation: result.before.location, toLocation: result.after.location, authorizedBy: actor.id, transferredAt: result.transfer.transferredAt } })
  return result.transfer
}

async function listMovements(assetId, actor, roleNames = []) {
  const asset = await prisma.asset.findUnique({ where: { id: assetId }, select: { id: true, departmentId: true } })
  if (!asset) throw new HttpError(404, "Asset not found")
  if (roleNames.includes("DEPARTMENTAL_CUSTODIAN") && asset.departmentId !== actor.departmentId) throw new HttpError(404, "Asset not found")
  return prisma.custodyTransfer.findMany({ where: { assetId }, orderBy: [{ transferredAt: "desc" }, { createdAt: "desc" }], include: {
    actor: { select: { id: true, fullName: true, staffNumber: true } },
    fromDepartment: true,
    toDepartment: true,
  } })
}

async function listAllMovements(query, actor, roleNames = []) {
  const where = { immutable: true }
  if (roleNames.includes("DEPARTMENTAL_CUSTODIAN")) {
    where.asset = { departmentId: actor.departmentId || "__unassigned__" }
  }
  const skip = (query.page - 1) * query.pageSize
  const [total, items] = await prisma.$transaction([
    prisma.custodyTransfer.count({ where }),
    prisma.custodyTransfer.findMany({ where, skip, take: query.pageSize, orderBy: [{ transferredAt: "desc" }, { createdAt: "desc" }], include: {
      asset: { select: { id: true, painCode: true, name: true } }, actor: { select: { id: true, fullName: true, staffNumber: true } },
      fromDepartment: true, toDepartment: true,
    } }),
  ])
  return { items, pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) } }
}

async function reportUnserviceable(assetId, reason, actor, ipAddress) {
  const result = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw`SELECT "id" FROM "Asset" WHERE "id" = ${assetId}::uuid FOR UPDATE`
    if (!rows.length) throw new HttpError(404, "Asset not found")
    const asset = await tx.asset.findUnique({ where: { id: assetId } })
    if (asset.departmentId !== actor.departmentId) throw new HttpError(403, "Only the assigned department custodian can report this asset")
    if (asset.status !== "IN_SERVICE") throw new HttpError(409, "Only an asset in service can be reported unserviceable")
    const updated = await tx.asset.update({ where: { id: assetId }, data: { status: "UNSERVICEABLE" } })
    return { before: asset.status, after: updated.status }
  }, { isolationLevel: "Serializable" })
  await recordAudit({ userId: actor.id, ipAddress, actionType: "UPDATE", entityName: "Asset", entityId: assetId,
    delta: { event: "ASSET_REPORTED_UNSERVICEABLE", status: { from: result.before, to: result.after }, reason } })
}

module.exports = { recordMovement, listMovements, listAllMovements, reportUnserviceable }
