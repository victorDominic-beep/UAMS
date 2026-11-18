const { z } = require("zod")

const createSivSchema = z.object({
  assetId: z.string().uuid(),
  targetDepartmentId: z.string().uuid(),
  issueDate: z.coerce.date().optional(),
})

const listSivSchema = z.object({
  status: z.enum(["DRAFT", "APPROVED", "REJECTED", "CANCELLED"]).optional(),
  departmentId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

module.exports = { createSivSchema, listSivSchema }
