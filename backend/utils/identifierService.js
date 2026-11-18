const crypto = require("node:crypto")

function padSequence(sequence) {
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 99999) {
    throw new Error("Identifier sequence is outside the supported 00001–99999 range")
  }
  return String(sequence).padStart(5, "0")
}

function validateSrvNumber(value, year) {
  const pattern = new RegExp(`^SRV/FUN/${year}/\\d{5}$`)
  if (!pattern.test(value)) throw new Error("Generated SRV number is invalid")
  return value
}

function validatePainCode(value) {
  const pattern = /^FUNAAB-[A-Z0-9]+-[A-Z0-9]+-\d{4}-\d{5}$/
  if (!pattern.test(value)) throw new Error("Generated PAIN code is invalid")
  return value
}

async function nextLockedCounter(transaction, { prefix, year, unitCode = null, categoryCode = null }) {
  const existing = await transaction.identifierCounter.findFirst({
    where: { prefix, year, unitCode, categoryCode },
  })

  if (existing) {
    const locked = await transaction.$queryRaw`
      SELECT "id", "sequence"
      FROM "IdentifierCounter"
      WHERE "id" = ${existing.id}::uuid
      FOR UPDATE
    `
    if (!locked[0]) throw new Error("Identifier counter could not be locked")

    const next = Number(locked[0].sequence) + 1
    await transaction.identifierCounter.update({
      where: { id: existing.id },
      data: { sequence: next },
    })
    return next
  }

  try {
    await transaction.identifierCounter.create({
      data: { prefix, year, unitCode, categoryCode, sequence: 1 },
    })
  } catch (error) {
    if (error.code !== "P2002") throw error
    const concurrent = await transaction.identifierCounter.findFirst({
      where: { prefix, year, unitCode, categoryCode },
    })
    if (!concurrent) throw error
    const locked = await transaction.$queryRaw`
      SELECT "id", "sequence"
      FROM "IdentifierCounter"
      WHERE "id" = ${concurrent.id}::uuid
      FOR UPDATE
    `
    const next = Number(locked[0].sequence) + 1
    await transaction.identifierCounter.update({
      where: { id: concurrent.id },
      data: { sequence: next },
    })
    return next
  }

  return 1
}

async function nextSrvNumber(transaction, year) {
  const sequence = await nextLockedCounter(transaction, { prefix: "SRV", year })
  return validateSrvNumber(`SRV/FUN/${year}/${padSequence(sequence)}`, year)
}

async function nextSivNumber(transaction, year) {
  // Empty strings make the yearly SIV key fully unique in PostgreSQL, where
  // NULL values in a composite unique index would otherwise be distinct.
  const sequence = await nextLockedCounter(transaction, {
    prefix: "SIV",
    year,
    unitCode: "",
    categoryCode: "",
  })
  const value = `SIV/FUN/${year}/${padSequence(sequence)}`
  if (!new RegExp(`^SIV/FUN/${year}/\\d{5}$`).test(value)) {
    throw new Error("Generated SIV number is invalid")
  }
  return value
}

async function nextPainCode(transaction, { unitCode, categoryCode, year }) {
  if (!unitCode || !categoryCode) {
    throw new Error("Department/unit code and asset category code are required for PAIN generation")
  }
  const sequence = await nextLockedCounter(transaction, {
    prefix: "PAIN",
    year,
    unitCode,
    categoryCode,
  })
  return validatePainCode(`FUNAAB-${unitCode}-${categoryCode}-${year}-${padSequence(sequence)}`)
}

function stableIdempotencyKey(value) {
  return crypto.createHash("sha256").update(value).digest("hex")
}

module.exports = {
  padSequence,
  validateSrvNumber,
  validatePainCode,
  nextLockedCounter,
  nextSrvNumber,
  nextSivNumber,
  nextPainCode,
  stableIdempotencyKey,
}
