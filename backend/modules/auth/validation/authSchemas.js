const { z } = require("zod")

const loginSchema = z.object({
  username: z.string().trim().min(3).max(254),
  password: z.string().min(8).max(128),
}).strict()

const changePasswordSchema = z.object({
  currentPassword: z.string().min(8).max(128),
  newPassword: z.string().min(12).max(128).regex(/[A-Z]/, "New password must contain an uppercase letter").regex(/[a-z]/, "New password must contain a lowercase letter").regex(/[0-9]/, "New password must contain a number").regex(/[^A-Za-z0-9]/, "New password must contain a symbol"),
}).strict().refine((value) => value.currentPassword !== value.newPassword, {
  message: "New password must differ from current password",
  path: ["newPassword"],
})

module.exports = { loginSchema, changePasswordSchema }
