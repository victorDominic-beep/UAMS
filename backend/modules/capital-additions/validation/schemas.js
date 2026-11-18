const { z } = require("zod")
const createCapitalAdditionSchema = z.object({
  assetId: z.string().uuid(),
  amount: z.coerce.number().finite().positive().max(9999999999999999),
  description: z.string().trim().min(3).max(2000),
})
const listCapitalAdditionSchema = z.object({
  assetId: z.string().uuid().optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})
module.exports = { createCapitalAdditionSchema, listCapitalAdditionSchema }
