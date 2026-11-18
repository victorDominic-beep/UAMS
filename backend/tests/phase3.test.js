jest.mock("../config/prisma", () => ({
  user: {
    findUnique: jest.fn(),
  },
  auditTrail: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
}))

const jwt = require("jsonwebtoken")
const { OFFICIAL_ROLES, ROLE_NAMES, getUserPermissions, getUserRoleNames } = require("../config/roles")
const { authenticate } = require("../middleware/auth")
const { requireRoles, requirePermissions } = require("../middleware/authorize")
const { canApproveSrv, canApproveSiv, canCompleteWriteOff, canProvideWriteOffApproval } = require("../utils/separationOfDuties")

process.env.JWT_SECRET = "test-jwt-secret-that-is-at-least-32-characters"

describe("official role permissions", () => {
  test("contains exactly nine official roles", () => {
    expect(ROLE_NAMES).toEqual([
      "STORE_OFFICER",
      "BURSARY_ASSET_ACCOUNTANT",
      "WORKS_INSPECTION_OFFICER",
      "DEPARTMENTAL_CUSTODIAN",
      "BOARD_OF_SURVEY_MEMBER",
      "INTERNAL_AUDITOR",
      "BURSAR",
      "VICE_CHANCELLOR",
      "SYSTEM_ADMINISTRATOR",
    ])
  })

  test("System Administrator has no operational asset permissions", () => {
    const admin = { roles: [{ role: OFFICIAL_ROLES.SYSTEM_ADMINISTRATOR }] }
    const permissions = getUserPermissions(admin)
    expect(permissions).toContain("users.manage")
    expect(permissions).not.toContain("srv.create")
    expect(permissions).not.toContain("maintenance.log")
    expect(permissions).not.toContain("writeoff.vc.approve")
  })

  test("Internal Auditor cannot modify operational assets", () => {
    const auditor = { roles: [{ role: OFFICIAL_ROLES.INTERNAL_AUDITOR }] }
    const permissions = getUserPermissions(auditor)
    expect(permissions).toContain("assets.read")
    expect(permissions).toContain("verification.record")
    expect(permissions).not.toContain("srv.create")
    expect(permissions).not.toContain("assets.move")
  })

  test("each role receives its documented permission boundary", () => {
    expect(getUserPermissions({ roles: [{ role: OFFICIAL_ROLES.STORE_OFFICER }] })).toContain("srv.create")
    expect(getUserPermissions({ roles: [{ role: OFFICIAL_ROLES.BURSARY_ASSET_ACCOUNTANT }] })).toContain("depreciation.run")
    expect(getUserPermissions({ roles: [{ role: OFFICIAL_ROLES.WORKS_INSPECTION_OFFICER }] })).toContain("assets.move")
    expect(getUserPermissions({ roles: [{ role: OFFICIAL_ROLES.DEPARTMENTAL_CUSTODIAN }] })).toContain("siv.receipt.sign")
    expect(getUserPermissions({ roles: [{ role: OFFICIAL_ROLES.BOARD_OF_SURVEY_MEMBER }] })).toContain("survey.reserve_value")
    expect(getUserPermissions({ roles: [{ role: OFFICIAL_ROLES.BURSAR }] })).toContain("writeoff.bursar.approve")
    expect(getUserPermissions({ roles: [{ role: OFFICIAL_ROLES.VICE_CHANCELLOR }] })).toContain("writeoff.vc.approve")
  })
})

describe("JWT authentication middleware", () => {
  test("rejects malformed bearer tokens", async () => {
    const req = { get: () => "Bearer invalid-token" }
    const next = jest.fn()
    await authenticate(req, {}, next)
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }))
  })

  test("accepts a valid token for an active user", async () => {
    const prisma = require("../config/prisma")
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      isActive: true,
      passwordHash: "hidden",
      department: null,
      roles: [],
    })
    const token = jwt.sign({ sub: "user-1" }, process.env.JWT_SECRET)
    const req = { get: () => `Bearer ${token}` }
    const next = jest.fn()
    await authenticate(req, {}, next)
    expect(req.user.id).toBe("user-1")
    expect(req.user.passwordHash).toBeUndefined()
    expect(next).toHaveBeenCalled()
  })
})

describe("separation of duties", () => {
  test("voucher creator cannot approve own SRV", () => {
    expect(canApproveSrv("user-1", { creatorId: "user-1", status: "DRAFT" })).toBe(false)
  })

  test("another authorized actor can approve an SRV", () => {
    expect(canApproveSrv("user-2", { creatorId: "user-1", status: "DRAFT" })).toBe(true)
  })

  test("SIV creator cannot approve own SIV", () => {
    expect(canApproveSiv("user-1", { creatorId: "user-1", status: "DRAFT" })).toBe(false)
  })

  test("write-off requires both distinct approvals", () => {
    expect(canCompleteWriteOff({
      bursarDecision: "APPROVED",
      vcDecision: "APPROVED",
      bursarApproverId: "bursar-1",
      vcApproverId: "vc-1",
    })).toBe(true)
    expect(canCompleteWriteOff({
      bursarDecision: "APPROVED",
      vcDecision: "PENDING",
      bursarApproverId: "bursar-1",
      vcApproverId: null,
    })).toBe(false)
  })

  test("only matching role can provide each write-off approval", () => {
    expect(canProvideWriteOffApproval(["BURSAR"], "BURSAR")).toBe(true)
    expect(canProvideWriteOffApproval(["VICE_CHANCELLOR"], "BURSAR")).toBe(false)
  })
})

describe("authorization middleware", () => {
  test("rejects System Administrator for operational permission", () => {
    const req = { user: { id: "admin", roles: [{ role: OFFICIAL_ROLES.SYSTEM_ADMINISTRATOR }] }, originalUrl: "/api/assets/1" }
    const next = jest.fn()
    requirePermissions("srv.create")(req, {}, next)
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }))
  })

  test("allows System Administrator for user management", () => {
    const req = { user: { id: "admin", roles: [{ role: OFFICIAL_ROLES.SYSTEM_ADMINISTRATOR }] } }
    const next = jest.fn()
    requireRoles("SYSTEM_ADMINISTRATOR")(req, {}, next)
    expect(next).toHaveBeenCalled()
  })
})
