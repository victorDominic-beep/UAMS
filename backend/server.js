const http = require("node:http")
const { validateEnv } = require("./config/env")

let env
try {
  env = validateEnv()
} catch (error) {
  console.error(error.message)
  process.exit(1)
}

process.env.PORT = String(env.PORT)
process.env.NODE_ENV = env.NODE_ENV
process.env.FRONTEND_URL = env.FRONTEND_URL

const prisma = require("./config/prisma")
const app = require("./app")

const server = http.createServer(app)

server.listen(env.PORT, () => {
  console.log(`UAMS backend listening on http://localhost:${env.PORT}`)
})

let shuttingDown = false

async function shutdown(signal) {
  if (shuttingDown) return
  shuttingDown = true

  console.log(`Received ${signal}. Shutting down gracefully...`)
  server.close(async () => {
    await prisma.$disconnect().catch(() => undefined)
    console.log("UAMS backend stopped")
    process.exit(0)
  })

  setTimeout(() => {
    prisma.$disconnect().catch(() => undefined)
    process.exit(1)
  }, 10000).unref()
}

process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("SIGINT", () => shutdown("SIGINT"))

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error)
})
