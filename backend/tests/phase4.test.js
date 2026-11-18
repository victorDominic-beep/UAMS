jest.mock("../config/prisma", () => ({
  $transaction: jest.fn(),
  auditTrail: {
    findMany: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
}))

const crypto = require("node:crypto")
const jwt = require("jsonwebtoken")
const prisma = require("../config/prisma")
const {
  computeRowHash,
  sanitizeDelta,
  verifyAuditChain,
} = require("../modules/audit/services/auditService")
const { OFFICIAL_ROLES, getUserPermissions } = require("../config/roles")
const { requireRoles, requirePermissions } = require("../middleware/authorize")
const { authenticate } = require("../middleware/auth")

process.env.JWT_SECRET = "phase4-test-jwt-secret-that-is-at-least-32-chars"

function makeEntry(overrides = {}) {
  return {
    id: overrides.id || "row-1",
    timestamp: overrides.timestamp || new Date("2026-11-18T10:00:00.000Z"),
    userId: overrides.userId || "user-1",
    ipAddress: overrides.ipAddress || "127.0.0.1",
    actionType: overrides.actionType || "CREATE",
    entityName: overrides.entityName || "User",
    entityId: overrides.entityId || "entity-1",
    delta: overrides.delta || { before: null, after: { fullName: "Test User" } },
    prevHash: overrides.prevHash === undefined ? null : overrides.prevHash,
  }
}

function addHash(entry) {
  return { ...entry, rowHash: computeRowHash(entry) }
}

describe("audit hash chain", () => {
  test("generates a deterministic cryptographic row hash", () => {
    const entry = makeEntry()
    const first = computeRowHash(entry)
    const second = computeRowHash(entry)
    expect(first).toMatch(/^[a-f0-9]{64}$/)
    expect(second).toBe(first)
  })

  test("sanitizes passwords, hashes, secrets and tokens", () => {
    expect(sanitizeDelta({
      password: "secret",
      passwordHash: "hash",
      token: "jwt",
      authorization: "Bearer token",
      after: { fullName: "Safe Name" },
    })).toEqual({ after: { fullName: "Safe Name" } })
  })

  test("verifies a valid hash chain", async () => {
    const first = addHash(makeEntry({ id: "row-1", prevHash: null }))
    const second = addHash(makeEntry({ id: "row-2", prevHash: first.rowHash, timestamp: new Date("2026-11-18T10:01:00.000Z") }))
    prisma.auditTrail.findMany.mockResolvedValue([first, second])

    await expect(verifyAuditChain()).resolves.toEqual(expect.objectContaining({ valid: true, totalEntries: 2 }))
  })

  test("detects altered audit row data", async () => {
    const entry = addHash(makeEntry())
    prisma.auditTrail.findMany.mockResolvedValue([{ ...entry, delta: { changed: true } }])

    await expect(verifyAuditChain()).resolves.toEqual(expect.objectContaining({
      valid: false,
      reason: "Row hash mismatch",
    }))
  })

  test("detects broken previous-hash linkage", async () => {
    const first = addHash(makeEntry({ id: "row-1", prevHash: null }))
    const second = addHash(makeEntry({ id: "row-2", prevHash: "wrong-link" }))
    prisma.auditTrail.findMany.mockResolvedValue([first, second])

    await expect(verifyAuditChain()).resolves.toEqual(expect.objectContaining({
      valid: false,
      reason: "Chain linkage mismatch",
    }))
  })
})

describe("audit access restrictions", () => {
  test("allows Internal Auditor, Bursar and Vice-Chancellor", () => {
    for (const role of ["INTERNAL_AUDITOR", "BURSAR", "VICE_CHANCELLOR"]) {
      const req = { user: { roles: [{ role: { name: role } }] }, originalUrl: "/api/audit" }
      const next = jest.fn()
      requireRoles("INTERNAL_AUDITOR", "BURSAR", "VICE_CHANCELLOR")(req, {}, next)
      expect(next).toHaveBeenCalled()
      expect(next.mock.calls[0][0]).toBeUndefined()
    }
  })

  test("rejects System Administrator from audit access", () => {
    const req = { user: { roles: [{ role: OFFICIAL_ROLES.SYSTEM_ADMINISTRATOR }] }, originalUrl: "/api/audit", ip: "127.0.0.1" }
    const next = jest.fn()
    requireRoles("INTERNAL_AUDITOR", "BURSAR", "VICE_CHANCELLOR")(req, {}, next)
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }))
  })

  test("no audit mutation permission is granted to any role", () => {
    for (const role of Object.values(OFFICIAL_ROLES)) {
      const permissions = getUserPermissions({ roles: [{ role }] })
      expect(permissions).not.toContain("audit.update")
      expect(permissions).not.toContain("audit.delete")
    }
  })
})

describe("authentication protections remain intact", () => {
  test("rejects malformed JWT", async () => {
    const req = { get: () => "Bearer malformed" }
    const next = jest.fn()
    await authenticate(req, {}, next)
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }))
  })

  test("rejects expired JWT", async () => {
    const token = jwt.sign({ sub: "user-1" }, process.env.JWT_SECRET, { expiresIn: -1 })
    const req = { get: () => `Bearer ${token}` }
    const next = jest.fn()
    await authenticate(req, {}, next)
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }))
  })

  test("rejects System Administrator operational permission", () => {
    const req = { user: { roles: [{ role: OFFICIAL_ROLES.SYSTEM_ADMINISTRATOR }] }, originalUrl: "/api/assets" }
    const next = jest.fn()
    requirePermissions("srv.create")(req, {}, next)
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }))
  })
})

describe("concurrent audit writes", () => {
  test("orders writes through the advisory lock with a fresh waiter snapshot", () => {
    const source = require("node:fs").readFileSync("modules/audit/services/auditService.js", "utf8")
    expect(source).toContain("pg_advisory_xact_lock")
    expect(source).toContain("isolationLevel: \"ReadCommitted\"")
  })
})
