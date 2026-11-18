const { Prisma } = require("@prisma/client")
const { monthlyBaseDepreciation, depreciationCharge, capitalAdditionMonthlyDepreciation } = require("../modules/depreciation/services/depreciationService")
const { OFFICIAL_ROLES, getUserPermissions } = require("../config/roles")

describe("Phase 8 depreciation arithmetic", () => {
  test("matches the documented annual example at the monthly rate", () => {
    const monthly = monthlyBaseDepreciation({ cost: "1200000.00", salvage: "200000.00", usefulLifeYears: 5 })
    expect(monthly.toFixed(2)).toBe("16666.67")
    expect(monthly.times(12).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP).toFixed(2)).toBe("200000.04")
  })

  test("uses exact decimal arithmetic for fractional inputs", () => {
    expect(monthlyBaseDepreciation({ cost: "1000.10", salvage: "100.10", usefulLifeYears: 3 }).toFixed(2)).toBe("25.00")
  })

  test("clamps the final posting so NBV cannot fall below salvage", () => {
    expect(depreciationCharge("200.00", "199.99", "50.00").toFixed(2)).toBe("0.01")
    expect(depreciationCharge("100.00", "200.00", "50.00").toFixed(2)).toBe("0.00")
  })

  test("depreciates approved additions prospectively over remaining months", () => {
    expect(capitalAdditionMonthlyDepreciation("12000.00", 5, new Date("2024-01-01Z"), new Date("2026-01-15Z"), "2026-01").toFixed(2)).toBe("333.33")
    expect(capitalAdditionMonthlyDepreciation("12000.00", 5, new Date("2024-01-01Z"), new Date("2026-01-15Z"), "2025-12").toFixed(2)).toBe("0.00")
  })

  test("limits depreciation permissions to the Bursary Asset Accountant role", () => {
    expect(getUserPermissions({ roles: [{ role: OFFICIAL_ROLES.BURSARY_ASSET_ACCOUNTANT }] })).toEqual(expect.arrayContaining(["depreciation.configure", "depreciation.run"]))
    expect(getUserPermissions({ roles: [{ role: OFFICIAL_ROLES.SYSTEM_ADMINISTRATOR }] })).not.toEqual(expect.arrayContaining(["depreciation.configure", "depreciation.run"]))
  })
})
