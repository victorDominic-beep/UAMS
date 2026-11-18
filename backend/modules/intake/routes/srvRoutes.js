const express = require("express")
const { authenticate } = require("../../../middleware/auth")
const { requirePermissions } = require("../../../middleware/authorize")
const { validateBody } = require("../../../middleware/validate")
const { createSrvSchema, updateSrvSchema, listSrvSchema } = require("../validation/srvSchemas")
const controller = require("../controllers/srvController")

const router = express.Router()

router.use(authenticate)

router.post("/", requirePermissions("srv.create"), validateBody(createSrvSchema), controller.create)

router.get("/", (req, res, next) => {
  const result = listSrvSchema.safeParse(req.query)
  if (!result.success) {
    const HttpError = require("../../../utils/httpError")
    return next(new HttpError(400, "Invalid SRV query", result.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message }))))
  }
  req.validatedQuery = result.data
  controller.list(req, res, next)
})

router.get("/:id", requirePermissions("assets.read"), controller.getById)
router.patch("/:id", requirePermissions("srv.edit"), validateBody(updateSrvSchema), controller.update)
router.post("/:id/submit", requirePermissions("srv.create"), controller.submit)
router.post("/:id/approve", requirePermissions("srv.approve"), controller.approve)
router.post("/:id/reject", requirePermissions("srv.approve"), controller.reject)

module.exports = router
