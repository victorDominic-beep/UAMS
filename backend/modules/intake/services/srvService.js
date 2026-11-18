const prisma = require("../../../config/prisma")
const HttpError = require("../../../utils/httpError")
const { nextSrvNumber, nextPainCode } = require("../../../utils/identifierService")
const { recordAudit } = require("../../audit/services/auditService")

async function getSrv(id) {
  const srv = await prisma.sRVVoucher.findUnique({
    where: { id },
    include: {
      department: true,
      creator: { select: { id: true, fullName: true, staffNumber: true } },
      approver: { select: { id: true, fullName: true, staffNumber: true } },
      lineItems: true,
      assets: true,
    },
  })
  if (!srv) throw new HttpError(404, "SRV not found")
  return srv
}

async function listSrvs(query) {
  const where = {}
  if (query.status) where.status = query.status
  if (query.departmentId) where.departmentId = query.departmentId

  const skip = (query.page - 1) * query.pageSize
  const [total, items] = await prisma.$transaction([
    prisma.sRVVoucher.count({ where }),
    prisma.sRVVoucher.findMany({
      where,
      skip,
      take: query.pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        department: true,
        creator: { select: { id: true, fullName: true, staffNumber: true } },
        approver: { select: { id: true, fullName: true, staffNumber: true } },
        lineItems: true,
        assets: { select: { id: true, painCode: true, status: true } },
      },
    }),
  ])

  return {
    items,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
  }
}

async function createSrv(data, actor, ipAddress) {
  if (!actor.departmentId || actor.departmentId !== data.departmentId) {
    throw new HttpError(403, "The SRV department must match the Store Officer department")
  }

  const result = await prisma.$transaction(async (transaction) => {
    const department = await transaction.department.findUnique({
      where: { id: data.departmentId },
      select: { id: true, code: true, name: true },
    })
    if (!department) throw new HttpError(400, "Department not found")

    const categoryIds = [...new Set(data.lineItems.map((item) => item.assetCategoryId))]
    const categories = await transaction.assetCategory.findMany({
      where: { id: { in: categoryIds }, isActive: true },
      select: { id: true, code: true, name: true },
    })
    if (categories.length !== categoryIds.length) {
      throw new HttpError(400, "One or more asset categories are invalid")
    }

    await transaction.$executeRawUnsafe('SELECT pg_advisory_xact_lock(92471145822)')

    const receivedYear = data.receivedDate.getUTCFullYear()
    const voucherNumber = await nextSrvNumber(transaction, receivedYear)

    const srv = await transaction.sRVVoucher.create({
      data: {
        voucherNumber,
        departmentId: data.departmentId,
        creatorId: actor.id,
        status: "DRAFT",
        purchaseOrderNumber: data.purchaseOrderNumber || null,
        vendorName: data.vendorName,
        invoiceNumber: data.invoiceNumber || null,
        receivedDate: data.receivedDate,
        lineItems: {
          create: data.lineItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitCost: item.unitCost,
            totalCost: item.quantity * item.unitCost,
            serialNumber: item.serialNumber || null,
            assetCategoryId: item.assetCategoryId,
            assetType: item.assetType,
            usefulLifeYears: item.usefulLifeYears || null,
            isDepreciable: item.isDepreciable,
          })),
        },
      },
      include: { department: true, lineItems: true },
    })

    return srv
  // Advisory counter locking provides the serial section. ReadCommitted gives
  // each waiter a fresh snapshot after acquiring that lock and avoids an
  // avoidable serialization failure under parallel identifier creation.
  }, { isolationLevel: "ReadCommitted", timeout: 15000 })

  await recordAudit({
    userId: actor.id,
    ipAddress,
    actionType: "CREATE",
    entityName: "SRVVoucher",
    entityId: result.id,
    delta: { voucherNumber: result.voucherNumber, status: result.status },
  })

  return getSrv(result.id)
}

async function updateSrv(id, data, actor, ipAddress) {
  const srv = await getSrv(id)
  if (srv.status !== "DRAFT") {
    throw new HttpError(409, "Approved or rejected SRVs cannot be edited")
  }

  if (srv.creatorId !== actor.id) {
    throw new HttpError(403, "Only the SRV creator can edit this draft")
  }

  const result = await prisma.$transaction(async (transaction) => {
    if (data.lineItems) {
      await transaction.sRVLineItem.deleteMany({ where: { srvVoucherId: id } })
      await transaction.sRVLineItem.createMany({
        data: data.lineItems.map((item) => ({
          srvVoucherId: id,
          description: item.description,
          quantity: item.quantity,
          unitCost: item.unitCost,
          totalCost: item.quantity * item.unitCost,
          serialNumber: item.serialNumber || null,
          assetCategoryId: item.assetCategoryId,
          assetType: item.assetType,
          usefulLifeYears: item.usefulLifeYears || null,
          isDepreciable: item.isDepreciable,
        })),
      })
    }

    const updateData = {}
    for (const key of ["purchaseOrderNumber", "vendorName", "invoiceNumber", "receivedDate"]) {
      if (data[key] !== undefined) updateData[key] = data[key]
    }

    await transaction.sRVVoucher.update({
      where: { id },
      data: updateData,
    })

    return await transaction.sRVVoucher.findUnique({
      where: { id },
      include: { department: true, lineItems: true, assets: true },
    })
  }, { isolationLevel: "Serializable", timeout: 15000 })

  await recordAudit({
    userId: actor.id,
    ipAddress,
    actionType: "UPDATE",
    entityName: "SRVVoucher",
    entityId: id,
    delta: { before: srv, after: result },
  })

  return result
}

async function submitSrv(id, actor, ipAddress) {
  const srv = await getSrv(id)
  if (srv.status !== "DRAFT") throw new HttpError(409, "Only draft SRVs can be submitted")
  if (srv.creatorId !== actor.id) throw new HttpError(403, "Only the SRV creator can submit this draft")

  const result = await prisma.sRVVoucher.update({
    where: { id },
    data: { status: "DRAFT" },
  })

  await recordAudit({
    userId: actor.id,
    ipAddress,
    actionType: "UPDATE",
    entityName: "SRVVoucher",
    entityId: id,
    delta: { event: "SRV_SUBMITTED", status: result.status },
  })

  return getSrv(id)
}

async function rejectSrv(id, actor, ipAddress) {
  const srv = await getSrv(id)
  if (srv.status !== "DRAFT") throw new HttpError(409, "Only draft SRVs can be rejected")
  if (srv.creatorId === actor.id) {
    await recordAudit({
      userId: actor.id,
      ipAddress,
      actionType: "REJECT",
      entityName: "SRVVoucher",
      entityId: id,
      delta: { result: "failed", reason: "creator_cannot_reject", status: srv.status },
    })
    throw new HttpError(403, "The creator cannot reject this SRV")
  }

  const result = await prisma.sRVVoucher.update({
    where: { id },
    data: { status: "REJECTED" },
  })

  await recordAudit({
    userId: actor.id,
    ipAddress,
    actionType: "REJECT",
    entityName: "SRVVoucher",
    entityId: id,
    delta: { before: "DRAFT", after: result.status },
  })

  return getSrv(id)
}

async function approveSrv(id, actor, ipAddress) {
  const srv = await getSrv(id)
  if (srv.status === "APPROVED") return getSrv(id)
  if (srv.status !== "DRAFT") throw new HttpError(409, "Only draft SRVs can be approved")
  if (srv.creatorId === actor.id) {
    await recordAudit({
      userId: actor.id,
      ipAddress,
      actionType: "APPROVE",
      entityName: "SRVVoucher",
      entityId: id,
      delta: { result: "failed", reason: "creator_cannot_approve", status: srv.status },
    })
    throw new HttpError(403, "The SRV creator cannot approve the same voucher")
  }

  const result = await prisma.$transaction(async (transaction) => {
    const locked = await transaction.sRVVoucher.findUnique({
      where: { id },
      include: { department: true, lineItems: { include: { assetCategory: true } }, assets: true },
    })

    if (!locked) throw new HttpError(404, "SRV not found")
    if (locked.status === "APPROVED") return locked
    if (locked.status !== "DRAFT") throw new HttpError(409, "Only draft SRVs can be approved")

    await transaction.$executeRawUnsafe('SELECT pg_advisory_xact_lock(92471145823)')

    const createdAssets = []
    for (const lineItem of locked.lineItems) {
      if (!lineItem.assetCategoryId || !lineItem.assetCategory) {
        throw new HttpError(400, "Asset category is required for PAIN generation")
      }

      const existingCount = await transaction.asset.count({
        where: {
          srvVoucherId: id,
          assetCategoryId: lineItem.assetCategoryId,
          name: lineItem.description,
        },
      })
      const remainingQuantity = Math.max(0, lineItem.quantity - existingCount)

      for (let index = 0; index < remainingQuantity; index += 1) {
        const year = locked.receivedDate.getUTCFullYear()
        const unitCode = locked.department.code
          .replace(/[^A-Z0-9]/gi, "")
          .toUpperCase()
        const categoryCode = lineItem.assetCategory.code
          .replace(/[^A-Z0-9]/gi, "")
          .toUpperCase()

        const painCode = await nextPainCode(transaction, { unitCode, categoryCode, year })

        const cost = Number(lineItem.unitCost)
        const salvageValue = lineItem.isDepreciable ? cost * 0.1 : cost
        const asset = await transaction.asset.create({
          data: {
            painCode,
            serialNumber: lineItem.serialNumber || null,
            name: lineItem.description,
            description: lineItem.description,
            assetCategoryId: lineItem.assetCategoryId,
            departmentId: locked.departmentId,
            location: locked.department.name,
            acquisitionDate: locked.receivedDate,
            historicalCost: cost,
            salvageValue,
            currentNetBookValue: cost,
            usefulLifeYears: lineItem.usefulLifeYears,
            assetType: lineItem.assetType || "Movable",
            isDepreciable: lineItem.isDepreciable,
            status: "PENDING_INSCRIPTION",
            custodianName: "Unassigned",
            srvVoucherId: id,
          },
        })
        createdAssets.push(asset)
      }
    }

    const approved = await transaction.sRVVoucher.update({
      where: { id },
      data: {
        status: "APPROVED",
        approverId: actor.id,
        approvedAt: new Date(),
        lockedAt: new Date(),
      },
      include: { department: true, lineItems: true, assets: true },
    })

    return { approved, createdAssets }
  // The PAIN advisory lock serializes allocation; ReadCommitted ensures a
  // transaction waiting on it sees the preceding approval's committed counter.
  }, { isolationLevel: "ReadCommitted", timeout: 30000 })

  if (result.createdAssets) {
    for (const asset of result.createdAssets) {
      await recordAudit({
        userId: actor.id,
        ipAddress,
        actionType: "CREATE",
        entityName: "Asset",
        entityId: asset.id,
        delta: { painCode: asset.painCode, status: "PENDING_INSCRIPTION", srvVoucherId: id },
      })
    }
  }

  await recordAudit({
    userId: actor.id,
    ipAddress,
    actionType: "APPROVE",
    entityName: "SRVVoucher",
    entityId: id,
    delta: { before: "DRAFT", after: "APPROVED", assetsCreated: result.createdAssets?.length || 0 },
  })

  return getSrv(id)
}

module.exports = {
  getSrv,
  listSrvs,
  createSrv,
  updateSrv,
  submitSrv,
  rejectSrv,
  approveSrv,
}
