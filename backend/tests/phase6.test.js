const { canApproveSiv } = require("../utils/separationOfDuties")
const { getUserPermissions, OFFICIAL_ROLES } = require("../config/roles")

describe("Phase 6 SIV separation of duties", () => {
  test("rejects approval by the SIV creator", () => {
    expect(canApproveSiv("store-1", { creatorId: "store-1", status: "DRAFT" })).toBe(false)
  })

  test("allows a different Store Officer to approve a draft", () => {
    expect(canApproveSiv("store-2", { creatorId: "store-1", status: "DRAFT" })).toBe(true)
  })

  test("prevents duplicate approval", () => {
    expect(canApproveSiv("store-2", { creatorId: "store-1", status: "APPROVED" })).toBe(false)
  })

  test("keeps inscription, issuance and receipt permissions on their documented roles", () => {
    expect(OFFICIAL_ROLES.WORKS_INSPECTION_OFFICER.permissions).toContain("tag.confirm")
    expect(OFFICIAL_ROLES.STORE_OFFICER.permissions).toContain("siv.create")
    expect(OFFICIAL_ROLES.STORE_OFFICER.permissions).toContain("siv.approve")
    expect(OFFICIAL_ROLES.DEPARTMENTAL_CUSTODIAN.permissions).toContain("siv.receipt.sign")
    expect(getUserPermissions({ roles: [{ role: OFFICIAL_ROLES.SYSTEM_ADMINISTRATOR }] }))
      .not.toEqual(expect.arrayContaining(["tag.confirm", "siv.create", "siv.approve", "siv.receipt.sign"]))
  })
})
