const express = require("express")
const { authenticate } = require("../../../middleware/auth")
const { requirePermissions, requireRoles } = require("../../../middleware/authorize")
const { validateBody } = require("../../../middleware/validate")
const HttpError = require("../../../utils/httpError")
const { createSivSchema, listSivSchema } = require("../validation/sivSchemas")
const controller = require("../controllers/sivController")

const router = express.Router()
router.use(authenticate)

router.post("/", requirePermissions("siv.create"), validateBody(createSivSchema), controller.create)
router.get("/pending-receipt", requireRoles("DEPARTMENTAL_CUSTODIAN"), requirePermissions("siv.receipt.sign"), controller.pendingReceipt)
router.post("/:id/confirm-receipt", requireRoles("DEPARTMENTAL_CUSTODIAN"), requirePermissions("siv.receipt.sign"), controller.confirmReceipt)
router.get("/", requirePermissions("assets.read"), (req, res, next) => {
  const result = listSivSchema.safeParse(req.query)
  if (!result.success) return next(new HttpError(400, "Invalid SIV query", result.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message }))))
  req.validatedQuery = result.data
  controller.list(req, res, next)
})
router.get("/:id", requirePermissions("assets.read"), controller.getById)
router.post("/:id/approve", requirePermissions("siv.approve"), controller.approve)

module.exports = router
