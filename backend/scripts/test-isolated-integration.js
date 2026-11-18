const crypto = require("node:crypto")
const path = require("node:path")
const { spawnSync } = require("node:child_process")
const dotenv = require("dotenv")

dotenv.config({ path: path.join(__dirname, "..", ".env") })

const testSchema = `uams_phase_test_${new Date().toISOString().slice(0, 10).replaceAll("-", "")}_${crypto.randomBytes(4).toString("hex")}`
const schemaPattern = /^uams_phase_test_\d{8}_[a-z0-9]{8}$/i
const databaseUrl = process.env.DATABASE_URL

function runNode(args, env) {
  const result = spawnSync(process.execPath, args, {
    cwd: path.join(__dirname, ".."),
    env,
    stdio: "inherit",
  })
  if (result.error) throw result.error
  return result.status ?? 1
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Isolated tests cannot run with NODE_ENV=production")
  if (!databaseUrl) throw new Error("DATABASE_URL is not configured")
  if (!schemaPattern.test(testSchema)) throw new Error("Generated test schema name did not pass the safety check")

  const { PrismaClient } = require("@prisma/client")
  const admin = new PrismaClient({ datasourceUrl: databaseUrl })
  let created = false
  try {
    const existing = await admin.$queryRaw`SELECT schema_name FROM information_schema.schemata WHERE schema_name = ${testSchema}`
    if (existing.length) throw new Error("The generated isolated test schema already exists; refusing to reuse it")
    await admin.$executeRawUnsafe(`CREATE SCHEMA "${testSchema}"`)
    created = true
  } finally {
    await admin.$disconnect()
  }

  const isolatedUrl = new URL(databaseUrl)
  isolatedUrl.searchParams.set("schema", testSchema)
  const isolatedEnv = {
    ...process.env,
    NODE_ENV: "test",
    DATABASE_URL: isolatedUrl.toString(),
    UAMS_TEST_DATABASE_SCHEMA: testSchema,
  }
  const prismaCli = path.join(__dirname, "..", "node_modules", "prisma", "build", "index.js")
  let testExit = 1
  try {
    const pushExit = runNode([prismaCli, "db", "push", "--skip-generate"], isolatedEnv)
    if (pushExit !== 0) return pushExit
    testExit = runNode([path.join(__dirname, "..", "node_modules", "jest", "bin", "jest.js"), "--runInBand"], isolatedEnv)
    return testExit
  } finally {
    if (created) {
      const cleanupClient = new PrismaClient({ datasourceUrl: databaseUrl })
      try {
        const exists = await cleanupClient.$queryRaw`SELECT schema_name FROM information_schema.schemata WHERE schema_name = ${testSchema}`
        if (exists.length && schemaPattern.test(testSchema)) {
          await cleanupClient.$executeRawUnsafe(`DROP SCHEMA "${testSchema}" CASCADE`)
        }
      } finally {
        await cleanupClient.$disconnect()
      }
    }
    if (testExit !== 0) process.exitCode = testExit
  }
}

main().catch((error) => {
  console.error(`Isolated integration run failed: ${error.message}`)
  process.exitCode = 1
})
