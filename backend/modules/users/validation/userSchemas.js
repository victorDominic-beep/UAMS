const { z } = require("zod")
const { ROLE_NAMES } = require("../../../config/roles")

const uuidSchema = z.string().uuid()

const createUserSchema = z.object({
  staffNumber: z.string().trim().min(3).max(50),
  email: z.string().trim().email().max(254),
  fullName: z.string().trim().min(2).max(150),
  password: z.string().min(12).max(128).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/),
  departmentId: uuidSchema.optional().nullable(),
  roleNames: z.array(z.enum(ROLE_NAMES)).min(1).max(ROLE_NAMES.length),
  isActive: z.boolean().optional().default(true),
}).strict()

const patchUserSchema = z.object({
  staffNumber: z.string().trim().min(3).max(50).optional(),
  email: z.string().trim().email().max(254).optional(),
  fullName: z.string().trim().min(2).max(150).optional(),
  departmentId: uuidSchema.optional().nullable(),
  isActive: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, { message: "At least one field is required" })

const rolesSchema = z.object({
  roleNames: z.array(z.enum(ROLE_NAMES)).min(1).max(ROLE_NAMES.length),
}).strict()

const statusSchema = z.object({
  isActive: z.boolean(),
}).strict()

module.exports = { createUserSchema, patchUserSchema, rolesSchema, statusSchema, uuidSchema }
