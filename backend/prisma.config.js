const path = require("node:path")
require("dotenv").config({ path: path.join(__dirname, ".env") })
const { defineConfig, env } = require("prisma/config")

module.exports = defineConfig({
  schema: path.join(__dirname, "prisma", "schema.prisma"),
  migrations: {
    path: path.join(__dirname, "prisma", "migrations"),
  },
  engine: "classic",
  datasource: {
    url: env("DATABASE_URL"),
  },
})
