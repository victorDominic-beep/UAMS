const path = require("node:path")
const dotenv = require("dotenv")
const { z } = require("zod")

dotenv.config({ path: path.join(__dirname, "..", ".env") })

const envSchema = z
  .object({
    PORT: z.coerce.number().int().positive().default(4000),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().url().min(1, "DATABASE_URL is required"),
    JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
    JWT_EXPIRES_IN: z.string().min(1, "JWT_EXPIRES_IN is required").default("8h"),
    FRONTEND_URL: z.string().url("FRONTEND_URL must be a valid URL"),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV === "production") {
      const insecure = ["replace-with", "development-only", "test-jwt-secret", "secret"]
      if (insecure.some((marker) => value.JWT_SECRET.toLowerCase().includes(marker))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["JWT_SECRET"],
          message: "JWT_SECRET must not contain a development placeholder in production",
        })
      }
    }
  })

function validateEnv() {
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ")
    throw new Error(`Invalid environment configuration: ${details}`)
  }
  return parsed.data
}

module.exports = { validateEnv }
