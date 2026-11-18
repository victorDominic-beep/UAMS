const prisma = require("../../../config/prisma")
const HttpError = require("../../../utils/httpError")
const { nextSivNumber } = require("../../../utils/identifierService")
const { canApproveSiv } = require("../../../utils/separationOfDuties")
const { recordAudit } = require("../../audit/services/auditService")

const includeDetails = {
  asset: true,
  sourceDepartment: true,
  targetDepartment: true,
  creator: { select: { id: true, fullName: true, staffNumber: true } },
  approver: { select: { id: true, fullName: true, staffNumber: true } },
  receiptCustodian: { select: { id: true, fullName: true, staffNumber: true } },
}

async function createSiv(data, actor, ipAddress) {
  let result
  try {
    result = await prisma.$transaction(async (tx) => {
    // Take this before reading rows so concurrent first-use requests serialize
    // before checking eligibility and allocating the yearly counter.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(92471145824)`
    const assetRows = await tx.$queryRaw`SELECT "id" FROM "Asset" WHERE "id" = ${data.assetId}::uuid FOR UPDATE`
    if (!assetRows.length) throw new HttpError(404, "Asset not found")
    const asset = await tx.asset.findUnique({ where: { id: data.assetId }, include: { department: true } })
    if (asset.status !== "IN_STORE") throw new HttpError(409, "Only assets in store with confirmed inscription can be issued")
    const existing = await tx.sIVVoucher.findUnique({ where: { assetId: asset.id } })
    if (existing) throw new HttpError(409, "An SIV has already been created for this asset")

    const target = await tx.department.findUnique({ where: { id: data.targetDepartmentId } })
    if (!target || !target.isActive) throw new HttpError(400, "Destination department not found or inactive")
    if (!data.targetDepartmentId) throw new HttpError(400, "Destination department is required")

    const issueDate = data.issueDate || new Date()
    const voucherNumber = await nextSivNumber(tx, issueDate.getUTCFullYear())
    return tx.sIVVoucher.create({
      data: {
        voucherNumber,
        assetId: asset.id,
        sourceDepartmentId: asset.departmentId,
        targetDepartmentId: target.id,
        creatorId: actor.id,
        issueDate,
        status: "DRAFT",
      },
      include: includeDetails,
    })
    }, { isolationLevel: "ReadCommitted", timeout: 20000 })
  } catch (error) {
    await recordAudit({ userId: actor.id, ipAddress, actionType: "OTHER", entityName: "Asset", entityId: data.assetId,
      delta: { event: "SIV_CREATION_FAILED", reason: error.message } })
    throw error
  }

  await recordAudit({ userId: actor.id, ipAddress, actionType: "CREATE", entityName: "SIVVoucher", entityId: result.id,
    delta: { voucherNumber: result.voucherNumber, assetId: result.assetId, sourceDepartmentId: result.sourceDepartmentId, targetDepartmentId: result.targetDepartmentId, status: result.status } })
  return result
}

async function approveSiv(id, actor, ipAddress) {
  const existing = await prisma.sIVVoucher.findUnique({ where: { id } })
  if (!existing) throw new HttpError(404, "SIV not found")
  if (!canApproveSiv(actor.id, existing)) {
    await recordAudit({ userId: actor.id, ipAddress, actionType: "APPROVE", entityName: "SIVVoucher", entityId: id,
      delta: { result: "failed", reason: existing.creatorId === actor.id ? "creator_cannot_approve" : "already_approved", status: existing.status } })
    throw new HttpError(403, "The creator cannot approve the same SIV, and approved SIVs cannot be approved again")
  }
  if (existing.status !== "DRAFT") {
    await recordAudit({ userId: actor.id, ipAddress, actionType: "OTHER", entityName: "SIVVoucher", entityId: id,
      delta: { event: "SIV_APPROVAL_FAILED", reason: "not_draft", status: existing.status } })
    throw new HttpError(409, "Only draft SIVs can be approved")
  }

  const result = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw`SELECT "id" FROM "SIVVoucher" WHERE "id" = ${id}::uuid FOR UPDATE`
    if (!rows.length) throw new HttpError(404, "SIV not found")
    const current = await tx.sIVVoucher.findUnique({ where: { id } })
    if (!canApproveSiv(actor.id, current)) throw new HttpError(403, "The creator cannot approve the same SIV")
    if (current.status !== "DRAFT") throw new HttpError(409, "Only draft SIVs can be approved")
    return tx.sIVVoucher.update({ where: { id }, data: { status: "APPROVED", approverId: actor.id, approvedAt: new Date(), lockedAt: new Date() }, include: includeDetails })
  }, { isolationLevel: "ReadCommitted", timeout: 15000 })

  await recordAudit({ userId: actor.id, ipAddress, actionType: "APPROVE", entityName: "SIVVoucher", entityId: id,
    delta: { before: "DRAFT", after: "APPROVED", approverId: actor.id } })
  return result
}

async function listSivs(query, actor, roleNames) {
  const where = {}
  if (query.status) where.status = query.status
  if (roleNames.includes("DEPARTMENTAL_CUSTODIAN")) where.targetDepartmentId = actor.departmentId || "__none__"
  else if (query.departmentId) where.OR = [{ sourceDepartmentId: query.departmentId }, { targetDepartmentId: query.departmentId }]
  const skip = (query.page - 1) * query.pageSize
  const [total, items] = await prisma.$transaction([
    prisma.sIVVoucher.count({ where }),
    prisma.sIVVoucher.findMany({ where, skip, take: query.pageSize, orderBy: { createdAt: "desc" }, include: includeDetails }),
  ])
  return { items, pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) } }
}

async function getSiv(id, actor, roleNames) {
  const item = await prisma.sIVVoucher.findUnique({ where: { id }, include: includeDetails })
  if (!item) throw new HttpError(404, "SIV not found")
  if (roleNames.includes("DEPARTMENTAL_CUSTODIAN") && item.targetDepartmentId !== actor.departmentId) throw new HttpError(403, "This SIV is outside your department")
  return item
}

async function listPendingReceipt(actor) {
  return prisma.sIVVoucher.findMany({
    where: { targetDepartmentId: actor.departmentId || "__none__", status: "APPROVED", receiptConfirmedAt: null },
    orderBy: { approvedAt: "asc" }, include: includeDetails,
  })
}

async function confirmReceipt(id, actor, ipAddress) {
  let result
  try {
    result = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw`SELECT "id" FROM "SIVVoucher" WHERE "id" = ${id}::uuid FOR UPDATE`
    if (!rows.length) throw new HttpError(404, "SIV not found")
    const siv = await tx.sIVVoucher.findUnique({ where: { id }, include: { asset: true, targetDepartment: true } })
    if (siv.targetDepartmentId !== actor.departmentId) throw new HttpError(403, "This SIV is assigned to another department")
    if (siv.status !== "APPROVED") throw new HttpError(409, "Only approved SIVs can be acknowledged")
    if (siv.receiptConfirmedAt) throw new HttpError(409, "Receipt has already been confirmed")
    const assetRows = await tx.$queryRaw`SELECT "id" FROM "Asset" WHERE "id" = ${siv.assetId}::uuid FOR UPDATE`
    if (!assetRows.length) throw new HttpError(404, "SIV asset not found")
    const asset = await tx.asset.findUnique({ where: { id: siv.assetId } })
    if (asset.status !== "IN_STORE") throw new HttpError(409, "Asset is not awaiting initial custody receipt")
    const at = new Date()
    const updated = await tx.sIVVoucher.update({ where: { id }, data: {
      receiptCustodianId: actor.id,
      receiptConfirmedAt: at,
      receiptSignature: `AUTHENTICATED:${actor.id}`,
    }, include: includeDetails })
    const transfer = await tx.custodyTransfer.create({ data: {
      assetId: asset.id,
      fromDepartmentId: siv.sourceDepartmentId,
      toDepartmentId: siv.targetDepartmentId,
      fromLocation: asset.location,
      toLocation: siv.targetDepartment.name,
      actorId: actor.id,
      status: "APPROVED",
      reason: `Initial custody on ${siv.voucherNumber}`,
      transferredAt: at,
      immutable: true,
    } })
    const movedAsset = await tx.asset.update({ where: { id: asset.id }, data: {
      status: "IN_SERVICE", departmentId: siv.targetDepartmentId,
      inServiceDate: at,
      location: siv.targetDepartment.name, custodianName: actor.fullName,
    } })
    return { siv: updated, transfer, asset: movedAsset, at }
    }, { isolationLevel: "ReadCommitted", timeout: 20000 })
  } catch (error) {
    await recordAudit({ userId: actor.id, ipAddress, actionType: "OTHER", entityName: "SIVVoucher", entityId: id,
      delta: { event: "CUSTODIAN_RECEIPT_FAILED", reason: error.message } })
    throw error
  }

  await recordAudit({ userId: actor.id, ipAddress, actionType: "TRANSFER", entityName: "CustodyTransfer", entityId: result.transfer.id,
    delta: { assetId: result.asset.id, originDepartmentId: result.transfer.fromDepartmentId, destinationDepartmentId: result.transfer.toDepartmentId, authorizedBy: actor.id, transferredAt: result.at.toISOString(), sivId: id } })
  await recordAudit({ userId: actor.id, ipAddress, actionType: "UPDATE", entityName: "SIVVoucher", entityId: id,
    delta: { event: "CUSTODIAN_RECEIPT_CONFIRMED", receiptCustodianId: actor.id, receiptConfirmedAt: result.at.toISOString() } })
  await recordAudit({ userId: actor.id, ipAddress, actionType: "TRANSFER", entityName: "Asset", entityId: result.asset.id,
    delta: { from: "IN_STORE", to: "IN_SERVICE", departmentId: result.asset.departmentId } })
  return { siv: result.siv, transfer: result.transfer, asset: result.asset }
}

module.exports = { createSiv, approveSiv, listSivs, getSiv, listPendingReceipt, confirmReceipt }
