const { Prisma } = require("@prisma/client")
const prisma = require("../../../config/prisma")
const HttpError = require("../../../utils/httpError")
const { nextLockedCounter, padSequence } = require("../../../utils/identifierService")
const { canCompleteWriteOff } = require("../../../utils/separationOfDuties")
const { recordAudit } = require("../../audit/services/auditService")

const Decimal = Prisma.Decimal
const surveyInclude = { createdBy: { select: { id: true, fullName: true, staffNumber: true } }, items: { include: { asset: true, assessedBy: { select: { id: true, fullName: true, staffNumber: true } }, writeOffAuthorization: true } } }
function calculateGainOrLoss(proceeds, nbv) { return new Decimal(String(proceeds)).minus(new Decimal(String(nbv))).toDecimalPlaces(2, Decimal.ROUND_HALF_UP) }

async function createDocket(actor, ipAddress) {
  const docket = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(92471145825)`
    const year = new Date().getUTCFullYear()
    const sequence = await nextLockedCounter(tx, { prefix: "SURVEY", year, unitCode: "", categoryCode: "" })
    const docketNumber = `BOS/FUN/${year}/${padSequence(sequence)}`
    return tx.surveyDocket.create({ data: { docketNumber, createdById: actor.id, status: "DRAFT" } })
  }, { isolationLevel: "Serializable" })
  await recordAudit({ userId: actor.id, ipAddress, actionType: "CREATE", entityName: "SurveyDocket", entityId: docket.id, delta: { docketNumber: docket.docketNumber, status: docket.status } })
  return docket
}

async function listDockets(query) {
  const where = query.status ? { status: query.status } : {}
  const skip = (query.page - 1) * query.pageSize
  const [total, items] = await prisma.$transaction([
    prisma.surveyDocket.count({ where }),
    prisma.surveyDocket.findMany({ where, skip, take: query.pageSize, orderBy: { createdAt: "desc" }, include: { createdBy: { select: { id: true, fullName: true } }, _count: { select: { items: true } } } }),
  ])
  return { items, pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) } }
}

async function getDocket(id) {
  const docket = await prisma.surveyDocket.findUnique({ where: { id }, include: surveyInclude })
  if (!docket) throw new HttpError(404, "Survey docket not found")
  return docket
}

async function getWriteOffAuthorization(itemId) {
  const item = await prisma.surveyItem.findUnique({ where: { id: itemId }, include: {
    asset: { select: { id: true, painCode: true, name: true, status: true } },
    writeOffAuthorization: { include: { bursarApprover: { select: { id: true, fullName: true, staffNumber: true } }, viceChancellorApprover: { select: { id: true, fullName: true, staffNumber: true } } } },
  } })
  if (!item) throw new HttpError(404, "Survey item not found")
  return item.writeOffAuthorization
}

async function addSurveyItem(docketId, assetId, actor, ipAddress) {
  const result = await prisma.$transaction(async (tx) => {
    const docketRows = await tx.$queryRaw`SELECT "id" FROM "SurveyDocket" WHERE "id" = ${docketId}::uuid FOR UPDATE`
    if (!docketRows.length) throw new HttpError(404, "Survey docket not found")
    const docket = await tx.surveyDocket.findUnique({ where: { id: docketId } })
    if (docket.status !== "DRAFT") throw new HttpError(409, "Only draft survey dockets accept assets")
    const assetRows = await tx.$queryRaw`SELECT "id" FROM "Asset" WHERE "id" = ${assetId}::uuid FOR UPDATE`
    if (!assetRows.length) throw new HttpError(404, "Asset not found")
    const asset = await tx.asset.findUnique({ where: { id: assetId } })
    if (asset.status !== "UNSERVICEABLE") throw new HttpError(409, "Only unserviceable assets may enter survey")
    const item = await tx.surveyItem.create({ data: { docketId, assetId } })
    const authorization = await tx.writeOffAuthorization.create({ data: { surveyItemId: item.id } })
    await tx.asset.update({ where: { id: assetId }, data: { status: "UNDER_SURVEY" } })
    return { item, authorization }
  }, { isolationLevel: "Serializable", timeout: 15000 })
  await recordAudit({ userId: actor.id, ipAddress, actionType: "CREATE", entityName: "SurveyItem", entityId: result.item.id,
    delta: { docketId, assetId, status: { from: "UNSERVICEABLE", to: "UNDER_SURVEY" }, writeOffAuthorizationId: result.authorization.id } })
  return result.item
}

async function assessSurveyItem(itemId, data, actor, ipAddress) {
  const before = await prisma.surveyItem.findUnique({ where: { id: itemId }, include: { docket: true } })
  if (!before) throw new HttpError(404, "Survey item not found")
  if (before.docket.status !== "DRAFT") throw new HttpError(409, "Only draft survey items can be assessed")
  const updated = await prisma.surveyItem.update({ where: { id: itemId }, data: { ...data, reserveValue: String(data.reserveValue), assessedById: actor.id, assessedAt: new Date() } })
  await recordAudit({ userId: actor.id, ipAddress, actionType: "VERIFY", entityName: "SurveyItem", entityId: itemId,
    delta: { rating: updated.rating, conditionNotes: updated.conditionNotes, reserveValue: String(updated.reserveValue) } })
  return updated
}

async function decideWriteOff(itemId, decision, actor, ipAddress) {
  const result = await prisma.$transaction(async (tx) => {
    const itemRows = await tx.$queryRaw`SELECT "id" FROM "SurveyItem" WHERE "id" = ${itemId}::uuid FOR UPDATE`
    if (!itemRows.length) throw new HttpError(404, "Survey item not found")
    const item = await tx.surveyItem.findUnique({ where: { id: itemId }, include: { writeOffAuthorization: true } })
    if (!item.writeOffAuthorization) throw new HttpError(409, "Write-off authorization is not initialized")
    const assetRows = await tx.$queryRaw`SELECT "id" FROM "Asset" WHERE "id" = ${item.assetId}::uuid FOR UPDATE`
    if (!assetRows.length) throw new HttpError(404, "Asset not found")
    const asset = await tx.asset.findUnique({ where: { id: item.assetId } })
    const auth = item.writeOffAuthorization
    if (auth.status !== "PENDING") throw new HttpError(409, "Write-off authorization is no longer pending")
    const isBursar = decision.role === "BURSAR"
    const userField = isBursar ? "bursarApproverId" : "vcApproverId"
    const decisionField = isBursar ? "bursarDecision" : "vcDecision"
    const dateField = isBursar ? "bursarDecidedAt" : "vcDecidedAt"
    if (auth[decisionField] !== "PENDING") throw new HttpError(409, "This approval decision has already been recorded")
    const otherUser = isBursar ? auth.vcApproverId : auth.bursarApproverId
    if (otherUser && otherUser === actor.id) throw new HttpError(403, "The same user cannot provide both write-off approvals")
    if (asset.status !== "UNDER_SURVEY") throw new HttpError(409, "Only assets under survey can be considered for write-off")
    const decidedAt = new Date()
    const updated = await tx.writeOffAuthorization.update({ where: { id: auth.id }, data: {
      [userField]: actor.id, [decisionField]: decision.value, [dateField]: decidedAt,
      status: decision.value === "REJECTED" ? "REJECTED" : undefined,
    } })
    const complete = canCompleteWriteOff(updated)
    if (complete) await tx.writeOffAuthorization.update({ where: { id: auth.id }, data: { status: "APPROVED" } })
    if (complete) await tx.asset.update({ where: { id: asset.id }, data: { status: "WRITTEN_OFF" } })
    return { authorization: { ...updated, status: complete ? "APPROVED" : updated.status }, complete, assetStatus: complete ? "WRITTEN_OFF" : asset.status, assetId: asset.id }
  }, { isolationLevel: "Serializable", timeout: 15000 })
  await recordAudit({ userId: actor.id, ipAddress, actionType: decision.value === "APPROVED" ? "APPROVE" : "REJECT", entityName: "WriteOffAuthorization", entityId: result.authorization.id,
    delta: { role: decision.role, decision: decision.value, approvedBy: actor.id, status: result.authorization.status, assetStatus: result.assetStatus } })
  if (result.complete) await recordAudit({ userId: actor.id, ipAddress, actionType: "WRITE_OFF", entityName: "Asset", entityId: result.assetId,
    delta: { event: "DUAL_AUTHORIZED_WRITE_OFF", status: { from: "UNDER_SURVEY", to: "WRITTEN_OFF" }, authorizationId: result.authorization.id } })
  return result.authorization
}

async function recordDisposal(data, actor, ipAddress) {
  const result = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw`SELECT "id" FROM "Asset" WHERE "id" = ${data.assetId}::uuid FOR UPDATE`
    if (!rows.length) throw new HttpError(404, "Asset not found")
    const asset = await tx.asset.findUnique({ where: { id: data.assetId } })
    if (asset.status !== "WRITTEN_OFF") throw new HttpError(409, "Only written-off assets may be disposed")
    const nbv = new Decimal(asset.currentNetBookValue)
    const proceeds = new Decimal(String(data.proceeds))
    const record = await tx.disposalRecord.create({ data: {
      assetId: asset.id, recordedById: actor.id, auctionReference: data.auctionReference || null,
      proceeds: proceeds.toFixed(2), netBookValue: nbv.toFixed(2), gainOrLoss: calculateGainOrLoss(proceeds, nbv).toFixed(2), disposedAt: data.disposedAt,
    } })
    await tx.asset.update({ where: { id: asset.id }, data: { status: "DISPOSED" } })
    return record
  }, { isolationLevel: "Serializable", timeout: 15000 })
  await recordAudit({ userId: actor.id, ipAddress, actionType: "DISPOSE", entityName: "DisposalRecord", entityId: result.id,
    delta: { assetId: result.assetId, proceeds: String(result.proceeds), netBookValue: String(result.netBookValue), gainOrLoss: String(result.gainOrLoss), disposedAt: result.disposedAt } })
  await recordAudit({ userId: actor.id, ipAddress, actionType: "DISPOSE", entityName: "Asset", entityId: result.assetId, delta: { status: { from: "WRITTEN_OFF", to: "DISPOSED" } } })
  return result
}

async function listDisposals(query) {
  const where = query.assetId ? { assetId: query.assetId } : {}
  const skip = (query.page - 1) * query.pageSize
  const [total, items] = await prisma.$transaction([
    prisma.disposalRecord.count({ where }),
    prisma.disposalRecord.findMany({ where, skip, take: query.pageSize, orderBy: { disposedAt: "desc" }, include: { asset: { select: { id: true, painCode: true, name: true } }, recordedBy: { select: { id: true, fullName: true, staffNumber: true } } } }),
  ])
  return { items, pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) } }
}

async function recordVerification(data, actor, ipAddress) {
  const asset = await prisma.asset.findUnique({ where: { id: data.assetId }, select: { id: true } })
  if (!asset) throw new HttpError(404, "Asset not found")
  const entry = await prisma.physicalVerification.create({ data: { ...data, verifierId: actor.id, verifiedAt: data.verifiedAt || new Date() } })
  await recordAudit({ userId: actor.id, ipAddress, actionType: "VERIFY", entityName: "PhysicalVerification", entityId: entry.id,
    delta: { assetId: entry.assetId, outcome: entry.outcome, observedLocation: entry.observedLocation, verifiedAt: entry.verifiedAt } })
  return entry
}

async function listVerifications(query) {
  const where = {}
  if (query.assetId) where.assetId = query.assetId
  if (query.outcome) where.outcome = query.outcome
  const skip = (query.page - 1) * query.pageSize
  const [total, items] = await prisma.$transaction([
    prisma.physicalVerification.count({ where }),
    prisma.physicalVerification.findMany({ where, skip, take: query.pageSize, orderBy: { verifiedAt: "desc" }, include: { asset: { select: { id: true, painCode: true, name: true } }, verifier: { select: { id: true, fullName: true, staffNumber: true } } } }),
  ])
  return { items, pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) } }
}

module.exports = { calculateGainOrLoss, createDocket, listDockets, getDocket, getWriteOffAuthorization, addSurveyItem, assessSurveyItem, decideWriteOff, recordDisposal, listDisposals, recordVerification, listVerifications }
