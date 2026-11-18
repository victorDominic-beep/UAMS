const express = require("express")
const { authenticate } = require("../../../middleware/auth")
const { requireRoles } = require("../../../middleware/authorize")
const { validateBody } = require("../../../middleware/validate")
const {
  createUserSchema,
  patchUserSchema,
  rolesSchema,
  statusSchema,
  uuidSchema,
} = require("../validation/userSchemas")
const controller = require("../controllers/userController")

const router = express.Router()

router.use(authenticate)
router.use(requireRoles("SYSTEM_ADMINISTRATOR"))

router.get("/", controller.listUsers)
router.post("/", validateBody(createUserSchema), controller.createUser)
router.get("/:id", controller.getUser)
router.patch("/:id", validateBody(patchUserSchema), controller.updateUser)
router.patch("/:id/roles", validateBody(rolesSchema), controller.replaceRoles)
router.patch("/:id/status", validateBody(statusSchema), controller.setStatus)

module.exports = router
