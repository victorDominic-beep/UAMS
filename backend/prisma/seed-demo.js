const bcrypt = require("bcrypt")
require("../config/env").validateEnv()
const prisma = require("../config/prisma")
const { OFFICIAL_ROLES } = require("../config/roles")
const { recordAudit } = require("../modules/audit/services/auditService")

const schema = process.env.UAMS_DEMO_DATABASE_SCHEMA || ""
const actualSchema = (() => {
  try { return new URL(process.env.DATABASE_URL).searchParams.get("schema") || "public" } catch { return "" }
})()

function assertSafeTarget() {
  if (process.env.NODE_ENV === "production") throw new Error("Demo seeding is disabled in production")
  if (process.env.UAMS_SEED_DEMO !== "1") throw new Error("Set UAMS_SEED_DEMO=1 to confirm demo seeding")
  if (!/^uams_demo_[a-z0-9_]{1,40}$/i.test(schema) || actualSchema !== schema) {
    throw new Error("DATABASE_URL schema must exactly match UAMS_DEMO_DATABASE_SCHEMA (uams_demo_*)")
  }
  if (!process.env.UAMS_DEMO_PASSWORD || process.env.UAMS_DEMO_PASSWORD.length < 12) {
    throw new Error("Set UAMS_DEMO_PASSWORD to a private password of at least 12 characters")
  }
}

const accounts = [
  ["DEMO-STORE", "stores.demo@example.invalid", "Demonstration Store Officer", "STORE_OFFICER", "DEMO"],
  ["DEMO-STORE-APPROVER", "stores.approver.demo@example.invalid", "Demonstration Store Approver", "STORE_OFFICER", "DEMO"],
  ["DEMO-ACCOUNTANT", "accountant.demo@example.invalid", "Demonstration Asset Accountant", "BURSARY_ASSET_ACCOUNTANT", "DEMO"],
  ["DEMO-WORKS", "works.demo@example.invalid", "Demonstration Works Officer", "WORKS_INSPECTION_OFFICER", "DEMO"],
  ["DEMO-CUSTODIAN", "custodian.demo@example.invalid", "Demonstration Department Custodian", "DEPARTMENTAL_CUSTODIAN", "DEMOENG"],
  ["DEMO-BOARD", "board.demo@example.invalid", "Demonstration Board Member", "BOARD_OF_SURVEY_MEMBER", "DEMO"],
  ["DEMO-AUDITOR", "auditor.demo@example.invalid", "Demonstration Internal Auditor", "INTERNAL_AUDITOR", "DEMO"],
  ["DEMO-BURSAR", "bursar.demo@example.invalid", "Demonstration Bursar", "BURSAR", "DEMO"],
  ["DEMO-BURSAR-APPROVER", "bursar.approver.demo@example.invalid", "Demonstration Bursar Approver", "BURSAR", "DEMO"],
  ["DEMO-VC", "vc.demo@example.invalid", "Demonstration Vice-Chancellor", "VICE_CHANCELLOR", "DEMO"],
  ["DEMO-ADMIN", "admin.demo@example.invalid", "Demonstration System Administrator", "SYSTEM_ADMINISTRATOR", "DEMO"],
]

async function ensureRole(name) {
  const definition = OFFICIAL_ROLES[name]
  return prisma.role.upsert({
    where: { name },
    update: { description: definition.displayName, isActive: true },
    create: { name, description: definition.displayName, isActive: true },
  })
}

async function seedDemo() {
  assertSafeTarget()
  for (const name of Object.keys(OFFICIAL_ROLES)) await ensureRole(name)
  const central = await prisma.department.upsert({ where: { code: "DEMO" }, update: { name: "UAMS Demonstration Stores", isActive: true }, create: { code: "DEMO", name: "UAMS Demonstration Stores" } })
  const destination = await prisma.department.upsert({ where: { code: "DEMOENG" }, update: { name: "UAMS Demonstration Engineering", isActive: true }, create: { code: "DEMOENG", name: "UAMS Demonstration Engineering" } })
  const it = await prisma.department.upsert({ where: { code: "DEMOICT" }, update: { name: "UAMS Demonstration ICT", isActive: true }, create: { code: "DEMOICT", name: "UAMS Demonstration ICT" } })
  const category = await prisma.assetCategory.upsert({ where: { code: "DEMOEQ" }, update: { name: "Demonstration Equipment", isActive: true }, create: { code: "DEMOEQ", name: "Demonstration Equipment" } })
  const roleRows = Object.fromEntries(await Promise.all(Object.keys(OFFICIAL_ROLES).map(async (name) => [name, await prisma.role.findUniqueOrThrow({ where: { name } })])))
  const passwordHash = await bcrypt.hash(process.env.UAMS_DEMO_PASSWORD, 12)
  const users = {}
  for (const [staffNumber, email, fullName, roleName, departmentCode] of accounts) {
    const departmentId = ({ DEMO: central.id, DEMOENG: destination.id, DEMOICT: it.id })[departmentCode]
    const user = await prisma.user.upsert({
      where: { staffNumber },
      update: { email, fullName, departmentId, isActive: true, passwordHash },
      create: { staffNumber, email, fullName, departmentId, passwordHash, isActive: true },
    })
    const role = roleRows[roleName]
    const assignment = await prisma.userRole.findFirst({ where: { userId: user.id, roleId: role.id, revokedAt: null } })
    if (!assignment) await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } })
    users[staffNumber] = user
  }

  const year = new Date().getFullYear()
  const date = (month, day = 15) => new Date(Date.UTC(year, month - 1, day))
  const srv = await prisma.sRVVoucher.upsert({
    where: { voucherNumber: `SRV/FUN/${year}/99001` },
    update: {},
    create: {
      voucherNumber: `SRV/FUN/${year}/99001`, departmentId: central.id,
      creatorId: users["DEMO-STORE"].id, approverId: users["DEMO-STORE-APPROVER"].id,
      status: "APPROVED", vendorName: "Demonstration Supplier", purchaseOrderNumber: "DEMO-PO-001",
      invoiceNumber: "DEMO-INV-001", receivedDate: date(1), approvedAt: date(1), lockedAt: date(1),
    },
  })
  if (!await prisma.sRVLineItem.findFirst({ where: { srvVoucherId: srv.id, description: "Demonstration ICT equipment" } })) {
    await prisma.sRVLineItem.create({ data: { srvVoucherId: srv.id, description: "Demonstration ICT equipment", quantity: 7, unitCost: "1200000.00", totalCost: "8400000.00", assetCategoryId: category.id, assetType: "Movable", usefulLifeYears: 5, isDepreciable: true } })
  }

  const assetSpecs = [
    ["PENDING", "Awaiting tag inscription", "PENDING_INSCRIPTION", central.id, "1200000.00", "1200000.00"],
    ["STORE", "Tagged laptop in store", "IN_STORE", central.id, "1200000.00", "1200000.00"],
    ["SERVICE", "Engineering workstation", "IN_SERVICE", destination.id, "1230000.00", "1213333.33"],
    ["MAINT", "Workshop generator", "UNDER_MAINTENANCE", destination.id, "2500000.00", "2400000.00"],
    ["SURVEY", "Unserviceable projector", "UNDER_SURVEY", destination.id, "450000.00", "90000.00"],
    ["WRITEOFF", "Written-off pump", "WRITTEN_OFF", destination.id, "800000.00", "80000.00"],
    ["DISPOSED", "Disposed laboratory unit", "DISPOSED", destination.id, "350000.00", "35000.00"],
  ]
  const assets = {}
  for (const [suffix, name, status, departmentId, cost, nbv] of assetSpecs) {
    assets[suffix] = await prisma.asset.upsert({
      where: { painCode: `FUNAAB-DEMO-DEMOEQ-${year}-99${String(assetSpecs.findIndex((row) => row[0] === suffix) + 1).padStart(3, "0")}` },
      update: { name, description: "Non-production UAMS demonstration data" },
      create: {
        painCode: `FUNAAB-DEMO-DEMOEQ-${year}-99${String(assetSpecs.findIndex((row) => row[0] === suffix) + 1).padStart(3, "0")}`,
        name, description: "Non-production UAMS demonstration data", assetCategoryId: category.id, departmentId,
        location: "Demonstration building", acquisitionDate: date(1), historicalCost: cost,
        salvageValue: "20000.00", currentNetBookValue: nbv, usefulLifeYears: 5,
        assetType: "Movable", isDepreciable: true, inServiceDate: ["SERVICE", "MAINT", "SURVEY", "WRITEOFF", "DISPOSED"].includes(suffix) ? date(2) : null,
        status, custodianName: suffix === "PENDING" || suffix === "STORE" ? null : "Demonstration Custodian", srvVoucherId: srv.id,
      },
    })
  }

  for (const [suffix, serial] of [["SERVICE", "DEMO-SIV-001"], ["MAINT", "DEMO-SIV-002"]]) {
    const asset = assets[suffix]
    const transferDate = date(3)
    await prisma.sIVVoucher.upsert({
      where: { voucherNumber: `SIV/FUN/${year}/${suffix === "SERVICE" ? "99001" : "99002"}` },
      update: {},
      create: {
        voucherNumber: `SIV/FUN/${year}/${suffix === "SERVICE" ? "99001" : "99002"}`,
        assetId: asset.id, sourceDepartmentId: central.id, targetDepartmentId: destination.id,
        creatorId: users["DEMO-STORE"].id, approverId: users["DEMO-STORE-APPROVER"].id,
        receiptCustodianId: users["DEMO-CUSTODIAN"].id, status: "APPROVED", issueDate: transferDate,
        approvedAt: transferDate, receiptConfirmedAt: transferDate, receiptSignature: "DEMO-RECEIPT", lockedAt: transferDate,
      },
    })
    if (!await prisma.custodyTransfer.findFirst({ where: { assetId: asset.id, reason: "UAMS Phase 11 demonstration seed" } })) {
      await prisma.custodyTransfer.create({ data: { assetId: asset.id, fromDepartmentId: central.id, toDepartmentId: destination.id, fromLocation: "Demonstration Stores", toLocation: "Engineering demonstration lab", actorId: users["DEMO-WORKS"].id, approverId: users["DEMO-CUSTODIAN"].id, status: "APPROVED", reason: "UAMS Phase 11 demonstration seed", transferredAt: transferDate, approvedAt: transferDate, immutable: true } })
    }
  }

  const serviceAsset = assets.SERVICE
  if (!await prisma.maintenanceRecord.findFirst({ where: { assetId: serviceAsset.id, description: "Demonstration preventive service" } })) {
    await prisma.maintenanceRecord.create({ data: { assetId: serviceAsset.id, recordedById: users["DEMO-WORKS"].id, serviceDate: date(4), description: "Demonstration preventive service", partsReplaced: "Dust filter", expenditure: "12500.00", isCapitalAddition: false, status: "COMPLETED" } })
  }
  if (!await prisma.maintenanceRecord.findFirst({ where: { assetId: assets.MAINT.id, description: "Demonstration open repair" } })) {
    await prisma.maintenanceRecord.create({ data: { assetId: assets.MAINT.id, recordedById: users["DEMO-WORKS"].id, serviceDate: date(5), description: "Demonstration open repair", partsReplaced: "Bearing assembly", expenditure: "45000.00", isCapitalAddition: false, status: "OPEN" } })
  }
  await prisma.insurancePolicy.upsert({ where: { policyNumber: "UAMS-DEMO-POLICY-001" }, update: {}, create: { policyNumber: "UAMS-DEMO-POLICY-001", assetId: serviceAsset.id, underwriter: "Demonstration Mutual (sample)", coverageScope: "Equipment demonstration coverage", coverageAmount: "1500000.00", effectiveDate: date(1), expiryDate: date(12), createdById: users["DEMO-WORKS"].id } })
  if (!await prisma.capitalAddition.findFirst({ where: { assetId: serviceAsset.id, description: "Demonstration memory upgrade" } })) {
    await prisma.capitalAddition.create({ data: { assetId: serviceAsset.id, recordedById: users["DEMO-BURSAR"].id, approvedById: users["DEMO-BURSAR-APPROVER"].id, amount: "30000.00", description: "Demonstration memory upgrade", status: "APPROVED", approvedAt: date(6) } })
  }
  await prisma.depreciationLedger.upsert({
    where: { assetId_fiscalYear_periodLabel: { assetId: serviceAsset.id, fiscalYear: year, periodLabel: `${year}-06` } },
    update: {},
    create: { assetId: serviceAsset.id, fiscalYear: year, periodLabel: `${year}-06`, openingNBV: "1230000.00", depreciationAmount: "16666.67", endingNBV: "1213333.33", processedById: users["DEMO-ACCOUNTANT"].id, processedAt: date(6) },
  })

  const docket = await prisma.surveyDocket.upsert({ where: { docketNumber: `SUR/DEMO/${year}/99001` }, update: {}, create: { docketNumber: `SUR/DEMO/${year}/99001`, status: "UNDER_SURVEY", createdById: users["DEMO-BOARD"].id } })
  const surveyItems = {}
  for (const suffix of ["SURVEY", "WRITEOFF", "DISPOSED"]) {
    surveyItems[suffix] = await prisma.surveyItem.upsert({
      where: { docketId_assetId: { docketId: docket.id, assetId: assets[suffix].id } },
      update: {},
      create: { docketId: docket.id, assetId: assets[suffix].id, assessedById: users["DEMO-BOARD"].id, conditionNotes: "Demonstration condition assessment", rating: "BEYOND_REPAIR", reserveValue: "20000.00", assessedAt: date(7) },
    })
  }
  for (const suffix of ["WRITEOFF", "DISPOSED"]) {
    const item = surveyItems[suffix]
    await prisma.writeOffAuthorization.upsert({ where: { surveyItemId: item.id }, update: {}, create: { surveyItemId: item.id, bursarApproverId: users["DEMO-BURSAR"].id, bursarDecision: "APPROVED", bursarDecidedAt: date(8), vcApproverId: users["DEMO-VC"].id, vcDecision: "APPROVED", vcDecidedAt: date(9), status: "APPROVED" } })
  }
  const disposalAsset = assets.DISPOSED
  await prisma.disposalRecord.upsert({ where: { assetId: disposalAsset.id }, update: {}, create: { assetId: disposalAsset.id, recordedById: users["DEMO-ACCOUNTANT"].id, auctionReference: "DEMO-ONLY-NO-AUCTION-INTEGRATION", proceeds: "42000.00", netBookValue: "35000.00", gainOrLoss: "7000.00", disposedAt: date(10) } })
  if (!await prisma.physicalVerification.findFirst({ where: { assetId: serviceAsset.id, verifierId: users["DEMO-AUDITOR"].id, findings: "UAMS Phase 11 demonstration seed" } })) {
    await prisma.physicalVerification.create({ data: { assetId: serviceAsset.id, verifierId: users["DEMO-AUDITOR"].id, observedLocation: "Engineering demonstration lab", outcome: "VERIFIED", findings: "UAMS Phase 11 demonstration seed", verifiedAt: date(11) } })
  }
  if (!await prisma.auditTrail.findFirst({ where: { entityName: "DemoDataset", entityId: "phase11" } })) {
    await recordAudit({ userId: users["DEMO-ADMIN"].id, actionType: "OTHER", entityName: "DemoDataset", entityId: "phase11", delta: { seeded: true, source: "repeatable non-production seed" } })
  }
  console.log(`UAMS demo data is ready: ${accounts.length} accounts across ${Object.keys(OFFICIAL_ROLES).length} official roles; 7 assets and lifecycle records.`)
}

seedDemo().catch((error) => {
  console.error(`Demo seed failed: ${error.message}`)
  process.exitCode = 1
}).finally(() => prisma.$disconnect())
