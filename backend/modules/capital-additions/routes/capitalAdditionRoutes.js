const express = require("express")
const { authenticate } = require("../../../middleware/auth")
const { requirePermissions, requireRoles } = require("../../../middleware/authorize")
const { validateBody } = require("../../../middleware/validate")
const HttpError = require("../../../utils/httpError")
const service = require("../services/capitalAdditionService")
const { createCapitalAdditionSchema, listCapitalAdditionSchema } = require("../validation/schemas")

const router = express.Router()
const run = (handler, status = 200) => (req, res, next) => Promise.resolve(handler(req)).then((data) => res.status(status).json({ success: true, data })).catch(next)
router.use(authenticate)
router.get("/", requirePermissions("assets.read"), (req, res, next) => {
  const result = listCapitalAdditionSchema.safeParse(req.query)
  if (!result.success) return next(new HttpError(400, "Invalid capital addition query", result.error.issues))
  return Promise.resolve(service.listCapitalAdditions(result.data)).then((data) => res.status(200).json({ success: true, data })).catch(next)
})
router.post("/", requireRoles("BURSAR"), requirePermissions("capital_addition.flag"), validateBody(createCapitalAdditionSchema), run((req) => service.createCapitalAddition(req.body, req.user, req.ip), 201))
router.post("/:id/approve", requireRoles("BURSAR"), requirePermissions("capital_addition.flag"), run((req) => service.approveCapitalAddition(req.params.id, req.user, req.ip)))
module.exports = router
