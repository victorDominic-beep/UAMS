const { z } = require("zod")

const policyFields = {
  policyNumber: z.string().trim().min(1).max(100),
  assetId: z.string().uuid(),
  underwriter: z.string().trim().min(2).max(200),
  coverageScope: z.string().trim().min(2).max(2000),
  coverageAmount: z.coerce.number().finite().positive().max(9999999999999999),
  effectiveDate: z.coerce.date(),
  expiryDate: z.coerce.date(),
}
const createInsuranceSchema = z.object(policyFields).refine((v) => v.expiryDate >= v.effectiveDate, { path: ["expiryDate"], message: "Expiry must not precede the effective date" })
const updateInsuranceSchema = z.object(Object.fromEntries(Object.entries(policyFields).filter(([key]) => key !== "assetId").map(([key, schema]) => [key, schema.optional()]))).refine((v) => Object.keys(v).length > 0, "At least one policy field must be provided")
const listInsuranceSchema = z.object({
  status: z.enum(["active", "expired", "upcoming"]).optional(),
  assetId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})
module.exports = { createInsuranceSchema, updateInsuranceSchema, listInsuranceSchema }
