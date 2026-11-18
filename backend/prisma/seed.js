const prisma = require("../config/prisma")
const { OFFICIAL_ROLES } = require("../config/roles")

async function seed() {
  for (const role of Object.values(OFFICIAL_ROLES)) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.displayName, isActive: true },
      create: { name: role.name, description: role.displayName, isActive: true },
    })
  }
  console.log(`Seeded ${Object.keys(OFFICIAL_ROLES).length} official UAMS roles`)
}

seed()
  .catch((error) => {
    console.error("Role seed failed:", error.message)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
