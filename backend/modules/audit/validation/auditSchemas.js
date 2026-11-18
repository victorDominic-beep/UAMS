const { z } = require("zod")

const auditActionTypes = [
  "CREATE", "UPDATE", "APPROVE", "REJECT", "TRANSFER", "VERIFY",
  "WRITE_OFF", "DISPOSE", "LOGIN", "LOGOUT", "ROLE_ASSIGN",
  "ACCESS_CHANGE", "OTHER",
]

const auditQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  actionType: z.enum(auditActionTypes).optional(),
  entityName: z.string().trim().min(1).max(100).optional(),
  entityId: z.string().trim().min(1).max(200).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
}).strict().refine((value) => !value.from || !value.to || value.from <= value.to, {
  message: "from date must be before or equal to to date",
  path: ["to"],
})

module.exports = { auditQuerySchema }
