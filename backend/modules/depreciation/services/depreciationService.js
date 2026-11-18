const { Prisma } = require("@prisma/client")
const prisma = require("../../../config/prisma")
const HttpError = require("../../../utils/httpError")
const { recordAudit } = require("../../audit/services/auditService")

const Decimal = Prisma.Decimal
const ZERO = new Decimal(0)
const CENT = new Decimal("0.01")

function roundMoney(value) { return new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP) }
function monthIndex(date) { return date.getUTCFullYear() * 12 + date.getUTCMonth() }
function periodDate(period) { return new Date(`${period}-01T00:00:00.000Z`) }
function remainingMonths(usefulLifeYears, inServiceDate, asOf) {
  const total = usefulLifeYears * 12
  const elapsed = Math.max(0, monthIndex(asOf) - monthIndex(inServiceDate))
  return Math.max(0, total - elapsed)
}
function monthlyBaseDepreciation({ cost, salvage, usefulLifeYears }) {
  if (!usefulLifeYears || usefulLifeYears <= 0) throw new HttpError(400, "Useful life must be configured before depreciation")
  const depreciableBase = new Decimal(cost).minus(salvage)
  if (depreciableBase.lessThanOrEqualTo(ZERO)) return ZERO
  return roundMoney(depreciableBase.dividedBy(usefulLifeYears).dividedBy(12))
}
function depreciationCharge(openingNBV, salvageValue, monthlyAmount) {
  const remaining = new Decimal(openingNBV).minus(salvageValue)
  return remaining.lessThanOrEqualTo(ZERO) ? ZERO : roundMoney(Decimal.min(monthlyAmount, remaining))
}
function capitalAdditionMonthlyDepreciation(amount, usefulLifeYears, inServiceDate, approvedAt, period) {
  if (monthIndex(periodDate(period)) < monthIndex(approvedAt)) return ZERO
  const remaining = remainingMonths(usefulLifeYears, inServiceDate, approvedAt)
  return remaining > 0 ? roundMoney(new Decimal(amount).dividedBy(remaining)) : ZERO
}

async function configureAsset(assetId, data, actor, ipAddress) {
  const before = await prisma.asset.findUnique({ where: { id: assetId } })
  if (!before) throw new HttpError(404, "Asset not found")
  const salvageValue = data.salvageValue === undefined ? new Decimal(before.salvageValue) : new Decimal(String(data.salvageValue))
  if (salvageValue.greaterThan(before.historicalCost)) throw new HttpError(400, "Salvage value cannot exceed historical cost")
  const after = await prisma.asset.update({ where: { id: assetId }, data: { ...data, ...(data.salvageValue === undefined ? {} : { salvageValue: salvageValue.toFixed(2) }) } })
  await recordAudit({ userId: actor.id, ipAddress, actionType: "UPDATE", entityName: "AssetDepreciationConfig", entityId: assetId,
    delta: { before: { usefulLifeYears: before.usefulLifeYears, salvageValue: String(before.salvageValue), isDepreciable: before.isDepreciable }, after: { usefulLifeYears: after.usefulLifeYears, salvageValue: String(after.salvageValue), isDepreciable: after.isDepreciable } } })
  return after
}

async function runBatch(period, actor, ipAddress) {
  const date = periodDate(period)
  const fiscalYear = date.getUTCFullYear()
  const monthEnd = new Date(Date.UTC(fiscalYear, date.getUTCMonth() + 1, 0, 23, 59, 59, 999))
  const skipped = []
  let ledgers
  try {
    ledgers = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`uams-depreciation-${period}`})::bigint)`
      const assets = await tx.asset.findMany({ where: { status: "IN_SERVICE" }, orderBy: { id: "asc" }, select: {
        id: true, painCode: true, historicalCost: true, salvageValue: true, currentNetBookValue: true,
        usefulLifeYears: true, isDepreciable: true, inServiceDate: true,
      } })
      const posted = []
      for (const candidate of assets) {
        const lock = await tx.$queryRaw`SELECT "id" FROM "Asset" WHERE "id" = ${candidate.id}::uuid FOR UPDATE`
        if (!lock.length) throw new Error(`Asset ${candidate.id} disappeared during depreciation`)
        const asset = await tx.asset.findUnique({ where: { id: candidate.id } })
        const skip = (reason) => skipped.push({ assetId: asset.id, painCode: asset.painCode, reason })
        if (!asset.isDepreciable) { skip("NON_DEPRECIABLE"); continue }
        if (!asset.inServiceDate) { skip("IN_SERVICE_DATE_REQUIRED"); continue }
        if (!asset.usefulLifeYears || asset.usefulLifeYears <= 0) { skip("USEFUL_LIFE_REQUIRED"); continue }
        if (monthIndex(date) < monthIndex(asset.inServiceDate)) { skip("PERIOD_BEFORE_SERVICE"); continue }
        const duplicate = await tx.depreciationLedger.findFirst({ where: { assetId: asset.id, fiscalYear, periodLabel: period }, select: { id: true } })
        if (duplicate) { skip("ALREADY_POSTED"); continue }

        const opening = new Decimal(asset.currentNetBookValue)
        const salvage = new Decimal(asset.salvageValue)
        if (opening.lessThanOrEqualTo(salvage)) { skip("AT_OR_BELOW_SALVAGE"); continue }
        let monthlyCharge = monthlyBaseDepreciation({
          cost: asset.historicalCost,
          salvage: asset.salvageValue,
          usefulLifeYears: asset.usefulLifeYears,
        })
        const additions = await tx.capitalAddition.findMany({ where: { assetId: asset.id, status: "APPROVED", approvedAt: { lte: monthEnd } } })
        for (const addition of additions) {
          const remaining = remainingMonths(asset.usefulLifeYears, asset.inServiceDate, addition.approvedAt)
          if (remaining > 0 && monthIndex(date) >= monthIndex(addition.approvedAt)) {
            monthlyCharge = monthlyCharge.plus(capitalAdditionMonthlyDepreciation(addition.amount, asset.usefulLifeYears, asset.inServiceDate, addition.approvedAt, period))
          }
        }
        const charge = depreciationCharge(opening, salvage, monthlyCharge)
        if (charge.lessThanOrEqualTo(ZERO)) { skip("NO_DEPRECIATION_DUE"); continue }
        const ending = roundMoney(opening.minus(charge))
        const entry = await tx.depreciationLedger.create({ data: {
          assetId: asset.id,
          fiscalYear,
          periodLabel: period,
          openingNBV: opening.toFixed(2),
          depreciationAmount: charge.toFixed(2),
          endingNBV: ending.toFixed(2),
          processedById: actor.id,
        } })
        await tx.asset.update({ where: { id: asset.id }, data: { currentNetBookValue: ending.toFixed(2) } })
        posted.push(entry)
      }
      return posted
    }, { isolationLevel: "Serializable", timeout: 60000 })
  } catch (error) {
    await recordAudit({ userId: actor.id, ipAddress, actionType: "OTHER", entityName: "DepreciationBatch", entityId: period,
      delta: { result: "rolled_back", failed: [{ message: "Batch transaction failed; no depreciation postings were committed" }] } })
    throw new HttpError(409, "Depreciation batch rolled back; no postings were committed", { period, processed: 0, skipped, failed: [{ message: "A database operation failed; correct the underlying asset or database issue and retry" }] })
  }

  for (const entry of ledgers) {
    await recordAudit({ userId: actor.id, ipAddress, actionType: "UPDATE", entityName: "DepreciationLedger", entityId: entry.id,
      delta: { assetId: entry.assetId, period, openingNBV: String(entry.openingNBV), depreciationAmount: String(entry.depreciationAmount), endingNBV: String(entry.endingNBV) } })
  }
  await recordAudit({ userId: actor.id, ipAddress, actionType: "CREATE", entityName: "DepreciationBatch", entityId: period,
    delta: { processed: ledgers.length, skipped: skipped.length, period } })
  return { period, processed: ledgers.length, skipped, failed: [], ledgerIds: ledgers.map((entry) => entry.id) }
}

async function listLedger(query) {
  const where = {}
  if (query.assetId) where.assetId = query.assetId
  if (query.fiscalYear) where.fiscalYear = query.fiscalYear
  const skip = (query.page - 1) * query.pageSize
  const [total, items] = await prisma.$transaction([
    prisma.depreciationLedger.count({ where }),
    prisma.depreciationLedger.findMany({ where, skip, take: query.pageSize, orderBy: [{ fiscalYear: "desc" }, { periodLabel: "desc" }, { createdAt: "desc" }], include: { asset: { select: { id: true, painCode: true, name: true } }, processedBy: { select: { id: true, fullName: true, staffNumber: true } } } }),
  ])
  return { items, pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) } }
}

async function listAssetHistory(assetId) {
  const asset = await prisma.asset.findUnique({ where: { id: assetId }, select: { id: true } })
  if (!asset) throw new HttpError(404, "Asset not found")
  return prisma.depreciationLedger.findMany({ where: { assetId }, orderBy: [{ fiscalYear: "asc" }, { periodLabel: "asc" }] })
}

async function listBatches(query) {
  return prisma.depreciationLedger.groupBy({
    by: ["fiscalYear", "periodLabel"],
    where: query.fiscalYear ? { fiscalYear: query.fiscalYear } : undefined,
    _count: { _all: true },
    _sum: { depreciationAmount: true },
    orderBy: [{ fiscalYear: "desc" }, { periodLabel: "desc" }],
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
  })
}

module.exports = { monthlyBaseDepreciation, remainingMonths, depreciationCharge, capitalAdditionMonthlyDepreciation, configureAsset, runBatch, listLedger, listAssetHistory, listBatches }
