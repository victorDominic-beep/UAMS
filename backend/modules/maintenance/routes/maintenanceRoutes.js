const express = require("express")
const { authenticate } = require("../../../middleware/auth")
const { requirePermissions, requireRoles } = require("../../../middleware/authorize")
const { validateBody } = require("../../../middleware/validate")
const HttpError = require("../../../utils/httpError")
const service = require("../services/maintenanceService")
const { createMaintenanceSchema, listMaintenanceSchema } = require("../validation/schemas")

const router = express.Router()
const run = (handler, status = 200) => (req, res, next) => Promise.resolve(handler(req)).then((data) => res.status(status).json({ success: true, data })).catch(next)
router.use(authenticate)
router.get("/", requirePermissions("assets.read"), (req, res, next) => {
  const result = listMaintenanceSchema.safeParse(req.query)
  if (!result.success) return next(new HttpError(400, "Invalid maintenance query", result.error.issues))
  return Promise.resolve(service.listMaintenance(result.data)).then((data) => res.status(200).json({ success: true, data })).catch(next)
})
router.post("/", requireRoles("WORKS_INSPECTION_OFFICER"), requirePermissions("maintenance.log"), validateBody(createMaintenanceSchema), run((req) => service.createMaintenance(req.body, req.user, req.ip), 201))
router.get("/:id", requirePermissions("assets.read"), run((req) => service.getMaintenance(req.params.id)))
router.post("/:id/complete", requireRoles("WORKS_INSPECTION_OFFICER"), requirePermissions("maintenance.close"), run((req) => service.completeMaintenance(req.params.id, req.user, req.ip)))

module.exports = router
