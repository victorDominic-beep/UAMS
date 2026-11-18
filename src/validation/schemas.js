import { z } from "zod"

export const srvSchema = z.object({
  poNumber: z.string().min(3, "Purchase order number is required"),
  vendor: z.string().min(2, "Vendor name is required"),
  invoice: z.string().min(3, "Contractor invoice is required"),
  quantity: z.coerce.number().int().positive(),
  unitCost: z.coerce.number().positive(),
})

export const maintenanceSchema = z.object({
  serviceDate: z.string().min(1, "Service date is required"),
  description: z.string().min(5, "Describe the maintenance activity"),
  partsReplaced: z.string().optional(),
  cost: z.coerce.number().nonnegative(),
  costType: z.enum(["ROUTINE_MAINTENANCE", "CAPITAL_ADDITION_REVIEW"]),
})
