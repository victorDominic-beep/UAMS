jest.mock("../config/prisma", () => ({ $transaction: jest.fn() }))
jest.mock("../modules/audit/services/auditService", () => ({
  appendAuditInTransaction: jest.fn(),
}))

const prisma = require("../config/prisma")
const { appendAuditInTransaction } = require("../modules/audit/services/auditService")
const { OFFICIAL_ROLES } = require("../config/roles")
const { bootstrapInitialAdministrator } = require("../modules/auth/services/authService")

const BOOTSTRAP_SECRET = "one-time-presentation-bootstrap-secret-89e12"
const adminRole = { id: "role-admin", name: "SYSTEM_ADMINISTRATOR", description: "System Administrator" }

function buildTransaction() {
  return {
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn().mockResolvedValue([{ databaseName: "uams_presentation", schemaName: "public" }]),
    userRole: { findFirst: jest.fn().mockResolvedValue(null) },
    role: {
      upsert: jest.fn(async ({ where }) => ({
        id: where.name === "SYSTEM_ADMINISTRATOR" ? adminRole.id : `role-${where.name}`,
        name: where.name,
        description: OFFICIAL_ROLES[where.name].displayName,
      })),
    },
    user: {
      create: jest.fn(async ({ data }) => ({
        id: "initial-admin-id",
        staffNumber: data.staffNumber,
        email: data.email,
        fullName: data.fullName,
        passwordHash: data.passwordHash,
        isActive: data.isActive,
        department: null,
        roles: [{ role: adminRole }],
      })),
    },
    department: { create: jest.fn(async ({ data }) => ({ id: `department-${data.code}`, ...data })) },
    assetCategory: { create: jest.fn(async ({ data }) => ({ id: `category-${data.code}`, ...data })) },
    auditTrail: { findFirst: jest.fn(), create: jest.fn() },
  }
}

describe("one-time production administrator bootstrap", () => {
  let originalEnv

  beforeEach(() => {
    originalEnv = {
      NODE_ENV: process.env.NODE_ENV,
      UAMS_ADMIN_BOOTSTRAP_SECRET: process.env.UAMS_ADMIN_BOOTSTRAP_SECRET,
      UAMS_PRESENTATION_DATABASE_NAME: process.env.UAMS_PRESENTATION_DATABASE_NAME,
    }
    process.env.NODE_ENV = "production"
    process.env.UAMS_ADMIN_BOOTSTRAP_SECRET = BOOTSTRAP_SECRET
    process.env.UAMS_PRESENTATION_DATABASE_NAME = "uams_presentation"
    prisma.$transaction.mockReset()
    appendAuditInTransaction.mockReset().mockResolvedValue({ id: "audit-id" })
  })

  afterEach(() => {
    if (originalEnv.NODE_ENV === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = originalEnv.NODE_ENV
    if (originalEnv.UAMS_ADMIN_BOOTSTRAP_SECRET === undefined) delete process.env.UAMS_ADMIN_BOOTSTRAP_SECRET
    else process.env.UAMS_ADMIN_BOOTSTRAP_SECRET = originalEnv.UAMS_ADMIN_BOOTSTRAP_SECRET
    if (originalEnv.UAMS_PRESENTATION_DATABASE_NAME === undefined) delete process.env.UAMS_PRESENTATION_DATABASE_NAME
    else process.env.UAMS_PRESENTATION_DATABASE_NAME = originalEnv.UAMS_PRESENTATION_DATABASE_NAME
  })

  test("requires the explicit configured secret before opening a transaction", async () => {
    await expect(bootstrapInitialAdministrator({
      secret: "wrong-bootstrap-secret-xxxxxxxxxxxx",
      staffNumber: "PRES-ADMIN",
      email: "presentation-admin@example.invalid",
      fullName: "Presentation Administrator",
      password: "AdminPassword@2026",
    })).rejects.toMatchObject({ statusCode: 401 })
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  test("creates the initial admin, seeds all nine roles, and writes audit in the same transaction", async () => {
    const transaction = buildTransaction()
    transaction.userRole.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValue({ id: "initial-admin-role-assignment" })
    prisma.$transaction.mockImplementation(async (callback) => callback(transaction))

    const result = await bootstrapInitialAdministrator({
      secret: BOOTSTRAP_SECRET,
      staffNumber: "PRES-ADMIN",
      email: "presentation-admin@example.invalid",
      fullName: "Presentation Administrator",
      password: "AdminPassword@2026",
      ipAddress: "127.0.0.1",
    })

    expect(transaction.$executeRaw).toHaveBeenCalledTimes(1)
    expect(transaction.role.upsert).toHaveBeenCalledTimes(9)
    expect(transaction.department.create).toHaveBeenCalledTimes(3)
    expect(transaction.assetCategory.create).toHaveBeenCalledTimes(1)
    expect(transaction.user.create).toHaveBeenCalledTimes(1)
    expect(transaction.user.create.mock.calls[0][0].data.passwordHash).not.toBe("AdminPassword@2026")
    expect(result).toMatchObject({ staffNumber: "PRES-ADMIN", roles: [{ name: "SYSTEM_ADMINISTRATOR" }] })
    expect(result).not.toHaveProperty("passwordHash")
    expect(appendAuditInTransaction).toHaveBeenCalledWith(transaction, expect.objectContaining({
      entityName: "InitialAdministrator",
      entityId: "initial-admin-id",
      delta: expect.objectContaining({ roles: ["SYSTEM_ADMINISTRATOR"] }),
    }))
    expect(JSON.stringify(appendAuditInTransaction.mock.calls)).not.toContain(BOOTSTRAP_SECRET)
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "ReadCommitted",
      timeout: 20000,
    })

    await expect(bootstrapInitialAdministrator({
      secret: BOOTSTRAP_SECRET,
      staffNumber: "PRES-ADMIN",
      email: "presentation-admin@example.invalid",
      fullName: "Presentation Administrator",
      password: "AdminPassword@2026",
    })).rejects.toMatchObject({ statusCode: 409 })
    expect(transaction.user.create).toHaveBeenCalledTimes(1)
  })

  test("refuses a second bootstrap once any administrator assignment exists", async () => {
    const transaction = buildTransaction()
    transaction.userRole.findFirst.mockResolvedValue({ id: "prior-admin-role-assignment" })
    prisma.$transaction.mockImplementation(async (callback) => callback(transaction))

    const request = {
      secret: BOOTSTRAP_SECRET,
      staffNumber: "PRES-ADMIN-2",
      email: "second-admin@example.invalid",
      fullName: "Second Administrator",
      password: "AnotherPassword@2026",
    }
    await expect(bootstrapInitialAdministrator(request)).rejects.toMatchObject({ statusCode: 409 })
    await expect(bootstrapInitialAdministrator(request)).rejects.toMatchObject({ statusCode: 409 })
    expect(transaction.user.create).not.toHaveBeenCalled()
    expect(transaction.role.upsert).not.toHaveBeenCalled()
  })

  test("cannot run outside production or after the bootstrap secret is removed", async () => {
    process.env.NODE_ENV = "development"
    await expect(bootstrapInitialAdministrator({ secret: BOOTSTRAP_SECRET, password: "AdminPassword@2026" }))
      .rejects.toMatchObject({ statusCode: 404 })

    process.env.NODE_ENV = "production"
    delete process.env.UAMS_ADMIN_BOOTSTRAP_SECRET
    await expect(bootstrapInitialAdministrator({ secret: BOOTSTRAP_SECRET, password: "AdminPassword@2026" }))
      .rejects.toMatchObject({ statusCode: 404 })
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  test("refuses to bootstrap unless the database identity matches the dedicated presentation database", async () => {
    const transaction = buildTransaction()
    transaction.$queryRaw.mockResolvedValue([{ databaseName: "university_production", schemaName: "public" }])
    prisma.$transaction.mockImplementation(async (callback) => callback(transaction))

    await expect(bootstrapInitialAdministrator({
      secret: BOOTSTRAP_SECRET,
      staffNumber: "PRES-ADMIN",
      email: "presentation-admin@example.invalid",
      fullName: "Presentation Administrator",
      password: "AdminPassword@2026",
    })).rejects.toMatchObject({ statusCode: 403 })
    expect(transaction.role.upsert).not.toHaveBeenCalled()
    expect(transaction.user.create).not.toHaveBeenCalled()
  })
})
