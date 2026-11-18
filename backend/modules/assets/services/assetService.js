const prisma = require("../../../config/prisma")

async function listAssets(query, actor, roleNames = []) {
  const where = {}
  if (query.status) where.status = query.status
  if (query.departmentId) where.departmentId = query.departmentId
  if (query.assetCategoryId) where.assetCategoryId = query.assetCategoryId
  if (roleNames.includes("DEPARTMENTAL_CUSTODIAN")) {
    where.departmentId = actor.departmentId || "__unassigned__"
  }
  if (query.search) where.OR = [
    { painCode: { contains: query.search, mode: "insensitive" } },
    { serialNumber: { contains: query.search, mode: "insensitive" } },
    { name: { contains: query.search, mode: "insensitive" } },
    { description: { contains: query.search, mode: "insensitive" } },
  ]
  const skip = (query.page - 1) * query.pageSize
  const [total, items] = await prisma.$transaction([
    prisma.asset.count({ where }),
    prisma.asset.findMany({ where, skip, take: query.pageSize, orderBy: { createdAt: "desc" }, include: {
      department: true,
      assetCategory: true,
      srvVoucher: { select: { id: true, voucherNumber: true } },
      sivVoucher: { select: { id: true, voucherNumber: true, status: true } },
    } }),
  ])
  return { items, pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) } }
}

module.exports = { listAssets }
