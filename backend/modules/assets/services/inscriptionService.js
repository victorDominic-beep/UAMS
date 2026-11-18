const prisma = require("../../../config/prisma")
const HttpError = require("../../../utils/httpError")
const { recordAudit } = require("../../audit/services/auditService")

async function getAsset(identifier, actor, roleNames = []) {
  const rows = await prisma.$queryRaw`
    SELECT "id" FROM "Asset"
    WHERE "id"::text = ${identifier} OR "painCode" = ${identifier}
    LIMIT 1
  `
  if (!rows.length) throw new HttpError(404, "Asset not found")
  const asset = await prisma.asset.findUnique({ where: { id: rows[0].id }, include: { department: true, assetCategory: true } })
  if (roleNames.includes("DEPARTMENTAL_CUSTODIAN") && asset.departmentId !== actor.departmentId) throw new HttpError(404, "Asset not found")
  return asset
}

async function confirmInscription(identifier, painCode, actor, ipAddress) {
  let asset
  try {
    asset = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw`
      SELECT "id" FROM "Asset"
      WHERE "id"::text = ${identifier} OR "painCode" = ${identifier}
      FOR UPDATE
    `
    if (!rows.length) throw new HttpError(404, "Asset not found")
    const current = await tx.asset.findUnique({ where: { id: rows[0].id } })
    if (current.status !== "PENDING_INSCRIPTION") {
      throw new HttpError(409, "Only assets pending inscription can be confirmed")
    }
    if (painCode !== current.painCode) {
      throw new HttpError(400, "The physical tag PAIN must match the registered asset PAIN")
    }
    return tx.asset.update({ where: { id: current.id }, data: { status: "IN_STORE" } })
    }, { isolationLevel: "Serializable", timeout: 15000 })
  } catch (error) {
    await recordAudit({ userId: actor.id, ipAddress, actionType: "OTHER", entityName: "Asset", entityId: identifier,
      delta: { event: "TAG_INSCRIPTION_FAILED", reason: error.message } })
    throw error
  }

  await recordAudit({
    userId: actor.id,
    ipAddress,
    actionType: "VERIFY",
    entityName: "Asset",
    entityId: asset.id,
    delta: { event: "TAG_INSCRIPTION_CONFIRMED", painCode: asset.painCode, from: "PENDING_INSCRIPTION", to: "IN_STORE" },
  })
  return asset
}

module.exports = { getAsset, confirmInscription }
