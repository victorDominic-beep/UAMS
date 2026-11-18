const { z } = require("zod")

const createMaintenanceSchema = z.object({
  assetId: z.string().uuid(),
  serviceDate: z.coerce.date(),
  description: z.string().trim().min(3).max(4000),
  partsReplaced: z.string().trim().max(2000).optional().nullable(),
  expenditure: z.coerce.number().finite().min(0).max(9999999999999999),
  isCapitalAddition: z.literal(false).optional(),
})

const listMaintenanceSchema = z.object({
  assetId: z.string().uuid().optional(),
  status: z.enum(["OPEN", "COMPLETED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

module.exports = { createMaintenanceSchema, listMaintenanceSchema }
