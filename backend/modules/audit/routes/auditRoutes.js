const express = require("express")
const { authenticate } = require("../../../middleware/auth")
const { requireRoles } = require("../../../middleware/authorize")
const { auditQuerySchema } = require("../validation/auditSchemas")
const controller = require("../controllers/auditController")

const router = express.Router()

router.use(authenticate)
router.use(requireRoles("INTERNAL_AUDITOR", "BURSAR", "VICE_CHANCELLOR"))

router.get("/", (req, res, next) => {
  const parsed = auditQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    const HttpError = require("../../../utils/httpError")
    return next(new HttpError(400, "Invalid audit query", parsed.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }))))
  }
  req.validatedQuery = parsed.data
  controller.list(req, res, next)
})

router.get("/:id", controller.getById)

module.exports = router
