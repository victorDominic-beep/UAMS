const { Prisma } = require("@prisma/client")
const { calculateGainOrLoss } = require("../modules/survey-disposal/services/surveyDisposalService")
const { canCompleteWriteOff } = require("../utils/separationOfDuties")
const { OFFICIAL_ROLES, getUserPermissions } = require("../config/roles")

describe("Phase 9 dual authorization and disposal", () => {
  test("requires both Bursar and Vice-Chancellor approvals by different users", () => {
    expect(canCompleteWriteOff({ bursarDecision: "APPROVED", vcDecision: "PENDING", bursarApproverId: "b1", vcApproverId: null })).toBe(false)
    expect(canCompleteWriteOff({ bursarDecision: "APPROVED", vcDecision: "APPROVED", bursarApproverId: "same", vcApproverId: "same" })).toBe(false)
    expect(canCompleteWriteOff({ bursarDecision: "APPROVED", vcDecision: "APPROVED", bursarApproverId: "b1", vcApproverId: "v1" })).toBe(true)
  })

  test("calculates gain or loss using decimal arithmetic", () => {
    expect(calculateGainOrLoss("1000.10", "725.25").toFixed(2)).toBe("274.85")
    expect(calculateGainOrLoss("600.00", "725.25").toFixed(2)).toBe("-125.25")
    expect(calculateGainOrLoss(new Prisma.Decimal("0.30"), new Prisma.Decimal("0.10")).toFixed(2)).toBe("0.20")
  })

  test("limits write-off decisions to the exact official role", () => {
    expect(getUserPermissions({ roles: [{ role: OFFICIAL_ROLES.BURSAR }] })).toContain("writeoff.bursar.approve")
    expect(getUserPermissions({ roles: [{ role: OFFICIAL_ROLES.VICE_CHANCELLOR }] })).toContain("writeoff.vc.approve")
    expect(getUserPermissions({ roles: [{ role: OFFICIAL_ROLES.SYSTEM_ADMINISTRATOR }] })).not.toEqual(expect.arrayContaining(["writeoff.bursar.approve", "writeoff.vc.approve"]))
  })
})
