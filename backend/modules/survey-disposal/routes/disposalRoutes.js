const express = require("express")
const { authenticate } = require("../../../middleware/auth")
const { requirePermissions, requireRoles } = require("../../../middleware/authorize")
const { validateBody } = require("../../../middleware/validate")
const HttpError = require("../../../utils/httpError")
const service = require("../services/surveyDisposalService")
const { disposalSchema, listDisposalSchema } = require("../validation/schemas")

const router = express.Router()
const run = (handler, status = 200) => (req, res, next) => Promise.resolve(handler(req)).then((data) => res.status(status).json({ success: true, data })).catch(next)
router.use(authenticate)
router.get("/", requirePermissions("assets.read"), (req, res, next) => {
  const result = listDisposalSchema.safeParse(req.query)
  if (!result.success) return next(new HttpError(400, "Invalid disposal query", result.error.issues))
  return Promise.resolve(service.listDisposals(result.data)).then((data) => res.status(200).json({ success: true, data })).catch(next)
})
router.post("/", requireRoles("BURSARY_ASSET_ACCOUNTANT"), requirePermissions("auction.proceeds.record"), validateBody(disposalSchema), run((req) => service.recordDisposal(req.body, req.user, req.ip), 201))
module.exports = router
