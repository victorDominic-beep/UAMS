const express = require("express")
const rateLimit = require("express-rate-limit")
const { authenticate } = require("../../../middleware/auth")
const { validateBody } = require("../../../middleware/validate")
const { loginSchema, changePasswordSchema } = require("../validation/authSchemas")
const controller = require("../controllers/authController")

const router = express.Router()

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, error: "Too many login attempts. Try again later." },
})

router.post("/login", loginLimiter, validateBody(loginSchema), controller.login)
router.post("/logout", authenticate, controller.logout)
router.get("/me", authenticate, controller.me)
router.post("/change-password", authenticate, validateBody(changePasswordSchema), controller.changePassword)

module.exports = router
