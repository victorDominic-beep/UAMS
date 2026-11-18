const { z } = require("zod")

const srvLineItemSchema = z.object({
  description: z.string().trim().min(2).max(300),
  quantity: z.coerce.number().int().min(1).max(100000),
  unitCost: z.coerce.number().finite().nonnegative(),
  serialNumber: z.string().trim().max(100).optional().nullable(),
  assetCategoryId: z.string().uuid(),
  assetType: z.string().trim().min(2).max(100),
  usefulLifeYears: z.coerce.number().int().min(1).max(100).optional().nullable(),
  isDepreciable: z.boolean().default(true),
}).strict()

const createSrvSchema = z.object({
  departmentId: z.string().uuid(),
  purchaseOrderNumber: z.string().trim().min(2).max(100).optional().nullable(),
  vendorName: z.string().trim().min(2).max(200),
  invoiceNumber: z.string().trim().min(2).max(100).optional().nullable(),
  receivedDate: z.coerce.date(),
  lineItems: z.array(srvLineItemSchema).min(1).max(500),
}).strict()

const updateSrvSchema = z.object({
  purchaseOrderNumber: z.string().trim().min(2).max(100).optional().nullable(),
  vendorName: z.string().trim().min(2).max(200).optional(),
  invoiceNumber: z.string().trim().min(2).max(100).optional().nullable(),
  receivedDate: z.coerce.date().optional(),
  lineItems: z.array(srvLineItemSchema).min(1).max(500).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: "At least one field is required",
})

const listSrvSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  status: z.enum(["DRAFT", "APPROVED", "REJECTED", "CANCELLED"]).optional(),
  departmentId: z.string().uuid().optional(),
}).strict()

module.exports = { createSrvSchema, updateSrvSchema, listSrvSchema }
