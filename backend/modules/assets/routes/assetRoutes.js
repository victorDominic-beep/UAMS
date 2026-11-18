const express = require("express")
const { authenticate } = require("../../../middleware/auth")
const { requirePermissions } = require("../../../middleware/authorize")
const labelController = require("../controllers/labelController")
const inscriptionService = require("../services/inscriptionService")
const { requireRoles } = require("../../../middleware/authorize")
const { z } = require("zod")
const HttpError = require("../../../utils/httpError")
const movementService = require("../services/movementService")
const assetService = require("../services/assetService")
const { getUserRoleNames } = require("../../../config/roles")

const router = express.Router()

router.use(authenticate)

router.get("/movements", requirePermissions("custody.read"), (req, res, next) => {
  const result = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(50) }).safeParse(req.query)
  if (!result.success) return next(new HttpError(400, "Invalid movement query", result.error.issues))
  movementService.listAllMovements(result.data, req.user, getUserRoleNames(req.user)).then((data) => res.status(200).json({ success: true, data })).catch(next)
})

router.get("/", requirePermissions("assets.read"), (req, res, next) => {
  const result = z.object({
    search: z.string().trim().max(200).optional(),
    status: z.enum(["PENDING_INSCRIPTION", "IN_STORE", "IN_SERVICE", "UNDER_MAINTENANCE", "UNSERVICEABLE", "UNDER_SURVEY", "WRITTEN_OFF", "DISPOSED"]).optional(),
    departmentId: z.string().uuid().optional(),
    assetCategoryId: z.string().uuid().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(100),
  }).safeParse(req.query)
  if (!result.success) return next(new HttpError(400, "Invalid asset query", result.error.issues))
  assetService.listAssets(result.data, req.user, getUserRoleNames(req.user)).then((data) => res.status(200).json({ success: true, data })).catch(next)
})

router.get("/:id", requirePermissions("assets.read"), (req, res, next) => {
  inscriptionService.getAsset(req.params.id, req.user, getUserRoleNames(req.user))
    .then((asset) => res.status(200).json({ success: true, data: asset }))
    .catch(next)
})

router.post("/:id/inscription/confirm", requireRoles("WORKS_INSPECTION_OFFICER"), requirePermissions("tag.confirm"), (req, res, next) => {
  const result = z.object({ painCode: z.string().min(1).max(100) }).safeParse(req.body)
  if (!result.success) return next(new HttpError(400, "A matching PAIN is required", result.error.issues))
  inscriptionService.confirmInscription(req.params.id, result.data.painCode, req.user, req.ip)
    .then((asset) => res.status(200).json({ success: true, data: asset }))
    .catch(next)
})

router.post("/:id/movements", requireRoles("WORKS_INSPECTION_OFFICER"), requirePermissions("assets.move"), (req, res, next) => {
  const result = z.object({ toLocation: z.string().trim().min(1).max(300), toDepartmentId: z.string().uuid().optional(), reason: z.string().trim().min(3).max(1000) }).safeParse(req.body)
  if (!result.success) return next(new HttpError(400, "Invalid asset movement", result.error.issues))
  movementService.recordMovement(req.params.id, result.data, req.user, req.ip)
    .then((data) => res.status(201).json({ success: true, data }))
    .catch(next)
})

router.get("/:id/movements", requirePermissions("assets.read"), (req, res, next) => {
  movementService.listMovements(req.params.id, req.user, getUserRoleNames(req.user)).then((data) => res.status(200).json({ success: true, data })).catch(next)
})

router.post("/:id/report-unserviceable", requireRoles("DEPARTMENTAL_CUSTODIAN"), requirePermissions("asset.unserviceable.report"), (req, res, next) => {
  const result = z.object({ reason: z.string().trim().min(3).max(1000) }).safeParse(req.body)
  if (!result.success) return next(new HttpError(400, "A reason is required", result.error.issues))
  movementService.reportUnserviceable(req.params.id, result.data.reason, req.user, req.ip)
    .then(() => res.status(200).json({ success: true, message: "Asset reported unserviceable" }))
    .catch(next)
})

router.post("/:id/label", requirePermissions("label.print"), labelController.postAssetLabel)
router.get("/:id/label", requirePermissions("label.print"), labelController.getAssetLabel)

module.exports = router
