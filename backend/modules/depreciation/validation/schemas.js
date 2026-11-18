const { z } = require("zod")
const period = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Period must use YYYY-MM")
const runBatchSchema = z.object({ period })
const configureAssetSchema = z.object({
  usefulLifeYears: z.number().int().positive().max(100).optional(),
  salvageValue: z.coerce.number().finite().min(0).max(9999999999999999).optional(),
  isDepreciable: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, "At least one depreciation setting is required")
const ledgerQuerySchema = z.object({
  assetId: z.string().uuid().optional(),
  fiscalYear: z.coerce.number().int().min(2000).max(2200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})
module.exports = { runBatchSchema, configureAssetSchema, ledgerQuerySchema }
