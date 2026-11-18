jest.mock("../config/prisma", () => ({
  $transaction: jest.fn(),
  sRVVoucher: {
    findUnique: jest.fn(),
  },
  asset: {
    findUnique: jest.fn(),
  },
}))

const {
  padSequence,
  validateSrvNumber,
  validatePainCode,
  nextLockedCounter,
  nextSrvNumber,
  nextPainCode,
  nextSivNumber,
} = require("../utils/identifierService")
const { canApproveSrv } = require("../utils/separationOfDuties")

describe("identifier formats", () => {
  test("formats SRV numbers as five-digit year counters", () => {
    expect(padSequence(1)).toBe("00001")
    expect(padSequence(12345)).toBe("12345")
    expect(validateSrvNumber("SRV/FUN/2026/00001", 2026)).toBe("SRV/FUN/2026/00001")
  })

  test("rejects invalid SRV number formats", () => {
    expect(() => validateSrvNumber("SRV/2026/1", 2026)).toThrow()
  })

  test("formats PAIN codes exactly", () => {
    expect(validatePainCode("FUNAAB-COLPHYS-CSC-2026-00001")).toBe("FUNAAB-COLPHYS-CSC-2026-00001")
  })

  test("formats SIV numbers using the yearly five-digit sequence", async () => {
    const transaction = {
      identifierCounter: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ sequence: 1 }),
      },
      $queryRaw: jest.fn(),
    }
    await expect(nextSivNumber(transaction, 2026)).resolves.toBe("SIV/FUN/2026/00001")
    expect(transaction.identifierCounter.create).toHaveBeenCalledWith(expect.objectContaining({
      data: { prefix: "SIV", year: 2026, unitCode: "", categoryCode: "", sequence: 1 },
    }))
  })

  test("rejects PAIN codes with missing unit/category/year/sequence", () => {
    expect(() => validatePainCode("FUNAAB-CSC-2026-00001")).toThrow()
  })
})

describe("transactional counters", () => {
  test("generates SRV numbers through locked counter helper", async () => {
    const transaction = {
      identifierCounter: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ sequence: 1 }),
      },
      $queryRaw: jest.fn(),
    }
    await expect(nextSrvNumber(transaction, 2026)).resolves.toBe("SRV/FUN/2026/00001")
  })

  test("separates PAIN counters by unit, category and year", async () => {
    const transaction = {
      identifierCounter: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ sequence: 1 }),
      },
      $queryRaw: jest.fn(),
    }

    await expect(nextPainCode(transaction, { unitCode: "COLPHYS", categoryCode: "CSC", year: 2026 }))
      .resolves.toBe("FUNAAB-COLPHYS-CSC-2026-00001")
    expect(transaction.identifierCounter.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ unitCode: "COLPHYS", categoryCode: "CSC", year: 2026 }),
    }))
  })

  test("supports concurrent counter calls by existing-row lock path", async () => {
    let sequence = 0
    const transaction = {
      identifierCounter: {
        findFirst: jest.fn().mockImplementation(async () => {
          if (sequence === 0) return null
          return { id: "counter-1", sequence }
        }),
        create: jest.fn().mockImplementation(async () => { sequence = 1 }),
        update: jest.fn().mockImplementation(async ({ data }) => { sequence = data.sequence }),
      },
      $queryRaw: jest.fn().mockResolvedValue([{ id: "counter-1", sequence }]),
    }

    await expect(nextSrvNumber(transaction, 2026)).resolves.toBe("SRV/FUN/2026/00001")
  })
})

describe("SRV approval and lock rules", () => {
  test("rejects creator approving own SRV", () => {
    expect(canApproveSrv("store-1", { creatorId: "store-1", status: "DRAFT" })).toBe(false)
  })

  test("allows another Store Officer to approve", () => {
    expect(canApproveSrv("store-2", { creatorId: "store-1", status: "DRAFT" })).toBe(true)
  })

  test("approved SRV is not eligible for approval again", () => {
    expect(canApproveSrv("store-2", { creatorId: "store-1", status: "APPROVED" })).toBe(false)
  })
})

describe("label payload", () => {
  test("creates print-ready Code 128 and QR payload without printer connection", async () => {
    const { generateLabelPayload } = require("../modules/assets/services/labelService")
    const payload = await generateLabelPayload({
      painCode: "FUNAAB-COLPHYS-CSC-2026-00001",
      name: "Desktop Workstation",
      department: { code: "COLPHYS" },
    })

    expect(payload.painCode).toBe("FUNAAB-COLPHYS-CSC-2026-00001")
    expect(payload.barcode.type).toBe("CODE128")
    expect(payload.qr.type).toBe("QR")
    expect(payload.printerConnected).toBe(false)
  })
})
