const prisma = require("../../../config/prisma")
const HttpError = require("../../../utils/httpError")
const { generateLabelPayload } = require("../services/labelService")
const { recordAudit } = require("../../audit/services/auditService")

async function getAssetLabel(req, res, next) {
  try {
    const asset = await prisma.asset.findUnique({
      where: { id: req.params.id },
      include: { department: true, assetCategory: true },
    })
    if (!asset) throw new HttpError(404, "Asset not found")
    if (!asset.painCode) throw new HttpError(409, "Asset does not have a PAIN code")

    const payload = await generateLabelPayload(asset)

    await recordAudit({
      userId: req.user.id,
      ipAddress: req.ip,
      actionType: "CREATE",
      entityName: "AssetLabel",
      entityId: asset.id,
      delta: { painCode: asset.painCode, format: "CODE128_QR", printerConnected: false },
    })

    res.status(200).json({ success: true, data: payload })
  } catch (error) {
    next(error)
  }
}

async function postAssetLabel(req, res, next) {
  return getAssetLabel(req, res, next)
}

module.exports = { getAssetLabel, postAssetLabel }
