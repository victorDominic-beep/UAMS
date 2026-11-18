const testSchema = process.env.UAMS_TEST_DATABASE_SCHEMA || ""
let urlSchema = ""
try { urlSchema = new URL(process.env.DATABASE_URL).searchParams.get("schema") || "" } catch {}
const safeTestSchema = /^uams_phase_test_\d{8}_[a-z0-9]{8}$/i.test(testSchema)
const integrationEnabled = safeTestSchema && urlSchema === testSchema

if (!integrationEnabled) {
  test.skip("PostgreSQL lifecycle integration suite requires an isolated UAMS_TEST_DATABASE_SCHEMA", () => {})
} else {
  require("../config/env").validateEnv()
  const request = require("supertest")
  const bcrypt = require("bcrypt")
  const jwt = require("jsonwebtoken")
  const prisma = require("../config/prisma")
  const app = require("../app")
  const { verifyAuditChain } = require("../modules/audit/services/auditService")

  let department, destination, category
  const people = {}
  const tokens = {}
  let asset, srv, siv, maintenance, policy, docket, item

  const userSpecs = [
    ["storeCreator", "STORE_OFFICER", "UAMS_TEST_STORE_1"],
    ["storeApprover", "STORE_OFFICER", "UAMS_TEST_STORE_2"],
    ["works", "WORKS_INSPECTION_OFFICER", "UAMS_TEST_WORKS"],
    ["custodian", "DEPARTMENTAL_CUSTODIAN", "UAMS_TEST_CUSTODIAN"],
    ["board", "BOARD_OF_SURVEY_MEMBER", "UAMS_TEST_BOARD"],
    ["accountant", "BURSARY_ASSET_ACCOUNTANT", "UAMS_TEST_ACCOUNTANT"],
    ["bursar1", "BURSAR", "UAMS_TEST_BURSAR_1"],
    ["bursar2", "BURSAR", "UAMS_TEST_BURSAR_2"],
    ["vc", "VICE_CHANCELLOR", "UAMS_TEST_VC"],
    ["auditor", "INTERNAL_AUDITOR", "UAMS_TEST_AUDITOR"],
    ["admin", "SYSTEM_ADMINISTRATOR", "UAMS_TEST_ADMIN"],
  ]

  const auth = (key) => `Bearer ${tokens[key]}`

  describe("Phase 7–11 PostgreSQL asset lifecycle and authentication", () => {
    beforeAll(async () => {
      department = await prisma.department.create({ data: { code: "ITEST", name: "Integration Test Store" } })
      destination = await prisma.department.create({ data: { code: "ITDEST", name: "Integration Test Department" } })
      category = await prisma.assetCategory.create({ data: { code: "ITCAT", name: "Integration Test Equipment" } })
      const roleRows = {}
      for (const [, roleName] of userSpecs) {
        roleRows[roleName] ||= await prisma.role.create({ data: { name: roleName, description: roleName } })
      }
      const passwordHash = await bcrypt.hash("IntegrationPass@123", 4)
      for (const [key, roleName, staffNumber] of userSpecs) {
        const user = await prisma.user.create({ data: {
          staffNumber,
          email: `${staffNumber.toLowerCase()}@example.invalid`,
          passwordHash,
          fullName: staffNumber,
          departmentId: key === "custodian" ? destination.id : department.id,
          roles: { create: { roleId: roleRows[roleName].id } },
        } })
        people[key] = user
        tokens[key] = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: "10m" })
      }
    })

    afterAll(async () => {
      await prisma.$disconnect()
      const schema = process.env.UAMS_TEST_DATABASE_SCHEMA
      if (/^uams_phase_test_\d{8}_[a-z0-9]{8}$/i.test(schema || "") && new URL(process.env.DATABASE_URL).searchParams.get("schema") === schema) {
        const { PrismaClient } = require("@prisma/client")
        const baseUrl = new URL(process.env.DATABASE_URL)
        baseUrl.searchParams.delete("schema")
        const base = new PrismaClient({ datasourceUrl: baseUrl.toString() })
        try { await base.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`) } finally { await base.$disconnect() }
      }
    })

    test("executes acquisition, inscription, SIV, receipt, maintenance, insurance, depreciation, survey, dual approval, disposal and verification against PostgreSQL", async () => {
      const createdSrv = await request(app).post("/api/srv").set("Authorization", auth("storeCreator")).send({
        departmentId: department.id,
        vendorName: "Integration Supplier",
        receivedDate: "2026-11-18",
        lineItems: [{ description: "Integration Workstation", quantity: 1, unitCost: 1200000, assetCategoryId: category.id, assetType: "Movable", usefulLifeYears: 5, isDepreciable: true }],
      }).expect(201)
      srv = createdSrv.body.data

      await request(app).post(`/api/srv/${srv.id}/approve`).set("Authorization", auth("storeCreator")).expect(403)
      const approvedSrv = await request(app).post(`/api/srv/${srv.id}/approve`).set("Authorization", auth("storeApprover")).expect(200)
      expect(approvedSrv.body.data.status).toBe("APPROVED")
      asset = approvedSrv.body.data.assets[0]
      expect(asset.status).toBe("PENDING_INSCRIPTION")
      expect(asset.painCode).toMatch(/^FUNAAB-ITEST-ITCAT-2026-\d{5}$/)

      await request(app).post(`/api/assets/${asset.id}/inscription/confirm`).set("Authorization", auth("works")).send({ painCode: asset.painCode }).expect(200)
      await request(app).post(`/api/assets/${asset.id}/inscription/confirm`).set("Authorization", auth("storeApprover")).send({ painCode: asset.painCode }).expect(403)

      const createdSiv = await request(app).post("/api/siv").set("Authorization", auth("storeCreator")).send({ assetId: asset.id, targetDepartmentId: destination.id, issueDate: "2026-11-18" }).expect(201)
      siv = createdSiv.body.data
      expect(siv.voucherNumber).toMatch(/^SIV\/FUN\/2026\/\d{5}$/)
      await request(app).post(`/api/siv/${siv.id}/approve`).set("Authorization", auth("storeCreator")).expect(403)
      await request(app).post(`/api/siv/${siv.id}/approve`).set("Authorization", auth("storeApprover")).expect(200)
      await request(app).post(`/api/siv/${siv.id}/confirm-receipt`).set("Authorization", auth("storeCreator")).expect(403)
      const receipt = await request(app).post(`/api/siv/${siv.id}/confirm-receipt`).set("Authorization", auth("custodian")).send({}).expect(200)
      expect(receipt.body.data.asset.status).toBe("IN_SERVICE")
      expect(receipt.body.data.asset.inServiceDate).toBeTruthy()
      await request(app).get(`/api/assets/${asset.id}`).set("Authorization", auth("custodian")).expect(200)
      const scopedAssets = await request(app).get(`/api/assets?departmentId=${department.id}&page=1&pageSize=10`).set("Authorization", auth("custodian")).expect(200)
      expect(scopedAssets.body.data.items.every((entry) => entry.departmentId === destination.id)).toBe(true)
      const openingCost = Number(receipt.body.data.asset.historicalCost)
      const opened = await request(app).post("/api/maintenance").set("Authorization", auth("works")).send({ assetId: asset.id, serviceDate: "2026-11-18", description: "Routine service", partsReplaced: "Filter", expenditure: 12500 }).expect(201)
      maintenance = opened.body.data
      expect((await prisma.asset.findUnique({ where: { id: asset.id } })).status).toBe("UNDER_MAINTENANCE")
      expect(Number((await prisma.asset.findUnique({ where: { id: asset.id } })).historicalCost)).toBe(openingCost)
      await request(app).post(`/api/maintenance/${maintenance.id}/complete`).set("Authorization", auth("works")).expect(200)
      expect((await prisma.asset.findUnique({ where: { id: asset.id } })).status).toBe("IN_SERVICE")

      const policyResponse = await request(app).post("/api/insurance").set("Authorization", auth("works")).send({ policyNumber: "ITEST-POLICY-1", assetId: asset.id, underwriter: "Test Underwriter", coverageScope: "Equipment", coverageAmount: 1500000, effectiveDate: "2026-01-01", expiryDate: "2027-01-01" }).expect(201)
      policy = policyResponse.body.data
      await request(app).get("/api/insurance?status=active").set("Authorization", auth("accountant")).expect(200)

      const flagged = await request(app).post("/api/capital-additions").set("Authorization", auth("bursar1")).send({ assetId: asset.id, amount: 12000, description: "Capacity upgrade" }).expect(201)
      await request(app).post(`/api/capital-additions/${flagged.body.data.id}/approve`).set("Authorization", auth("bursar1")).expect(403)
      await request(app).post(`/api/capital-additions/${flagged.body.data.id}/approve`).set("Authorization", auth("bursar2")).expect(200)

      const period = new Date().toISOString().slice(0, 7)
      const batch = await request(app).post("/api/depreciation/batches").set("Authorization", auth("accountant")).send({ period }).expect(201)
      expect(batch.body.data.processed).toBeGreaterThanOrEqual(1)
      expect(batch.body.data.failed).toEqual([])
      const duplicateBatch = await request(app).post("/api/depreciation/batches").set("Authorization", auth("accountant")).send({ period }).expect(201)
      expect(duplicateBatch.body.data.skipped.some((entry) => entry.reason === "ALREADY_POSTED")).toBe(true)

      await request(app).post(`/api/assets/${asset.id}/report-unserviceable`).set("Authorization", auth("custodian")).send({ reason: "Beyond economical repair" }).expect(200)
      const docketResponse = await request(app).post("/api/survey/dockets").set("Authorization", auth("board")).send({}).expect(201)
      docket = docketResponse.body.data
      const itemResponse = await request(app).post(`/api/survey/dockets/${docket.id}/items`).set("Authorization", auth("board")).send({ assetId: asset.id }).expect(201)
      item = itemResponse.body.data
      await request(app).post(`/api/survey/items/${item.id}/assessment`).set("Authorization", auth("board")).send({ rating: "BEYOND_REPAIR", conditionNotes: "Failed inspection", reserveValue: 1000 }).expect(200)
      await request(app).post(`/api/survey/items/${item.id}/approvals/bursar`).set("Authorization", auth("bursar1")).send({ decision: "APPROVED" }).expect(200)
      expect((await prisma.asset.findUnique({ where: { id: asset.id } })).status).toBe("UNDER_SURVEY")
      await request(app).post(`/api/survey/items/${item.id}/approvals/vice-chancellor`).set("Authorization", auth("bursar1")).send({ decision: "APPROVED" }).expect(403)
      await request(app).post(`/api/survey/items/${item.id}/approvals/vice-chancellor`).set("Authorization", auth("vc")).send({ decision: "APPROVED" }).expect(200)
      expect((await prisma.asset.findUnique({ where: { id: asset.id } })).status).toBe("WRITTEN_OFF")

      await request(app).post("/api/verification").set("Authorization", auth("auditor")).send({ assetId: asset.id, outcome: "VERIFIED", observedLocation: "Test store", verifiedAt: "2026-11-18" }).expect(201)
      await request(app).post("/api/verification").set("Authorization", auth("admin")).send({ assetId: asset.id, outcome: "VERIFIED" }).expect(403)
      const disposal = await request(app).post("/api/disposals").set("Authorization", auth("accountant")).send({ assetId: asset.id, proceeds: 900, auctionReference: "TEST-AUCTION", disposedAt: "2026-11-18" }).expect(201)
      expect(Number(disposal.body.data.gainOrLoss)).toBe(900 - Number(disposal.body.data.netBookValue))
      expect((await prisma.asset.findUnique({ where: { id: asset.id } })).status).toBe("DISPOSED")
      expect(await prisma.maintenanceRecord.count({ where: { assetId: asset.id } })).toBe(1)
      expect(await prisma.insurancePolicy.count({ where: { id: policy.id } })).toBe(1)
      expect(await prisma.custodyTransfer.count({ where: { assetId: asset.id } })).toBe(1)
      const auditVerification = await verifyAuditChain()
      expect(auditVerification).toEqual(expect.objectContaining({ valid: true }))
    })

    test("returns conflict on duplicate issue and rolls back a failing depreciation batch", async () => {
      await request(app).post("/api/siv").set("Authorization", auth("storeCreator")).send({ assetId: asset.id, targetDepartmentId: destination.id, issueDate: "2026-11-18" }).expect(409)
      const inService = await prisma.asset.create({ data: {
        painCode: "FUNAAB-ITEST-ITCAT-2026-99991", name: "Rollback fixture", assetCategoryId: category.id,
        departmentId: destination.id, acquisitionDate: new Date("2026-01-01"), historicalCost: "5000.00", salvageValue: "500.00",
        currentNetBookValue: "5000.00", usefulLifeYears: 5, assetType: "Movable", isDepreciable: true, status: "IN_SERVICE", inServiceDate: new Date("2026-01-01"),
      } })
      const schema = process.env.UAMS_TEST_DATABASE_SCHEMA.replace(/[^a-z0-9_]/gi, "")
      await prisma.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION "${schema}"."phase8_fail_asset_update"() RETURNS trigger AS $$ BEGIN IF NEW."id" = '${inService.id}'::uuid THEN RAISE EXCEPTION 'integration rollback check'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql`)
      await prisma.$executeRawUnsafe(`CREATE TRIGGER "phase8_fail_asset_update" BEFORE UPDATE OF "currentNetBookValue" ON "Asset" FOR EACH ROW EXECUTE FUNCTION "${schema}"."phase8_fail_asset_update"()`)
      const period = "2098-07"
      await request(app).post("/api/depreciation/batches").set("Authorization", auth("accountant")).send({ period }).expect(409)
      expect(await prisma.depreciationLedger.count({ where: { fiscalYear: 2098, periodLabel: period } })).toBe(0)
      expect(Number((await prisma.asset.findUnique({ where: { id: inService.id } })).currentNetBookValue)).toBe(5000)
      await prisma.$executeRawUnsafe('DROP TRIGGER "phase8_fail_asset_update" ON "Asset"')
      await prisma.$executeRawUnsafe(`DROP FUNCTION "${schema}"."phase8_fail_asset_update"()`)
    })

    test("authenticates users, rejects invalid credentials and tokens, changes password, and disposes the client session on logout", async () => {
      const login = await request(app).post("/api/auth/login").send({ username: people.storeCreator.staffNumber, password: "IntegrationPass@123" }).expect(200)
      expect(login.body.data.user.roles.map((role) => role.name)).toContain("STORE_OFFICER")
      expect(login.body.data.token).toBeTruthy()
      await request(app).post("/api/auth/login").send({ username: people.storeCreator.email, password: "WrongPass@123" }).expect(401)
      await request(app).post("/api/auth/login").send({ username: people.storeCreator.email }).expect(400)
      await request(app).get("/api/auth/me").set("Authorization", `Bearer ${login.body.data.token}`).expect(200)
      await request(app).get("/api/auth/me").set("Authorization", "Bearer invalid-token").expect(401)
      const expired = jwt.sign({ sub: people.storeCreator.id }, process.env.JWT_SECRET, { expiresIn: -1 })
      await request(app).get("/api/auth/me").set("Authorization", `Bearer ${expired}`).expect(401)
      await request(app).post("/api/auth/change-password").set("Authorization", `Bearer ${login.body.data.token}`).send({ currentPassword: "WrongPass@123", newPassword: "ChangedPass@456" }).expect(400)
      await request(app).post("/api/auth/change-password").set("Authorization", `Bearer ${login.body.data.token}`).send({ currentPassword: "IntegrationPass@123", newPassword: "ChangedPass@456" }).expect(200)
      await request(app).post("/api/auth/login").send({ username: people.storeCreator.staffNumber, password: "IntegrationPass@123" }).expect(401)
      await request(app).post("/api/auth/login").send({ username: people.storeCreator.staffNumber, password: "ChangedPass@456" }).expect(200)
      await request(app).post("/api/auth/logout").set("Authorization", `Bearer ${login.body.data.token}`).expect(200)
    })

    test("enforces the nine-role access boundary, including administrator and auditor restrictions", async () => {
      for (const [key, roleName] of Object.entries({
        storeCreator: "STORE_OFFICER",
        works: "WORKS_INSPECTION_OFFICER",
        custodian: "DEPARTMENTAL_CUSTODIAN",
        board: "BOARD_OF_SURVEY_MEMBER",
        accountant: "BURSARY_ASSET_ACCOUNTANT",
        bursar1: "BURSAR",
        vc: "VICE_CHANCELLOR",
        auditor: "INTERNAL_AUDITOR",
        admin: "SYSTEM_ADMINISTRATOR",
      })) {
        const assetsStatus = roleName === "SYSTEM_ADMINISTRATOR" ? 403 : 200
        const usersStatus = roleName === "SYSTEM_ADMINISTRATOR" ? 200 : 403
        const auditStatus = ["INTERNAL_AUDITOR", "BURSAR", "VICE_CHANCELLOR"].includes(roleName) ? 200 : 403
        await request(app).get("/api/assets?page=1&pageSize=1").set("Authorization", auth(key)).expect(assetsStatus)
        await request(app).get("/api/users").set("Authorization", auth(key)).expect(usersStatus)
        await request(app).get("/api/audit?page=1&pageSize=1").set("Authorization", auth(key)).expect(auditStatus)
      }
      await request(app).get("/api/departments").set("Authorization", auth("admin")).expect(200)
    })

    test("generates unique SRV numbers and PAIN identifiers and unique SIV numbers under concurrent requests", async () => {
      const makeSrv = () => request(app).post("/api/srv").set("Authorization", auth("storeCreator")).send({
        departmentId: department.id,
        vendorName: "Concurrent Integration Supplier",
        receivedDate: "2026-11-18",
        lineItems: [{ description: "Concurrent test asset", quantity: 1, unitCost: 2500, assetCategoryId: category.id, assetType: "Movable", usefulLifeYears: 5, isDepreciable: true }],
      }).expect(201)
      const drafts = await Promise.all([makeSrv(), makeSrv()])
      expect(drafts[0].body.data.voucherNumber).not.toBe(drafts[1].body.data.voucherNumber)
      const approved = await Promise.all(drafts.map(({ body }) => request(app).post(`/api/srv/${body.data.id}/approve`).set("Authorization", auth("storeApprover")).expect(200)))
      const painCodes = approved.flatMap(({ body }) => body.data.assets.map((entry) => entry.painCode))
      expect(new Set(painCodes).size).toBe(painCodes.length)

      const inStoreAssets = await Promise.all([1, 2].map((n) => prisma.asset.create({ data: {
        painCode: `FUNAAB-ITEST-ITCAT-2026-9900${n}`, name: `Concurrent SIV ${n}`, assetCategoryId: category.id,
        departmentId: department.id, acquisitionDate: new Date("2026-11-18"), historicalCost: "2500.00",
        salvageValue: "0.00", currentNetBookValue: "2500.00", usefulLifeYears: 5, assetType: "Movable",
        isDepreciable: true, status: "IN_STORE",
      } })))
      const issues = await Promise.all(inStoreAssets.map((entry) => request(app).post("/api/siv").set("Authorization", auth("storeCreator")).send({ assetId: entry.id, targetDepartmentId: destination.id, issueDate: "2026-11-18" }).expect(201)))
      expect(issues[0].body.data.voucherNumber).not.toBe(issues[1].body.data.voucherNumber)
    })

    test("serializes concurrent depreciation batches and leaves one posting per asset and period", async () => {
      const period = new Date().toISOString().slice(0, 7)
      const [year] = period.split("-")
      const fixture = await prisma.asset.create({ data: {
        painCode: `FUNAAB-ITEST-ITCAT-${year}-99992`, name: "Concurrent depreciation fixture", assetCategoryId: category.id,
        departmentId: destination.id, acquisitionDate: new Date(), historicalCost: "12000.00", salvageValue: "2000.00",
        currentNetBookValue: "12000.00", usefulLifeYears: 5, assetType: "Movable", isDepreciable: true,
        status: "IN_SERVICE", inServiceDate: new Date(),
      } })
      const results = await Promise.all([
        request(app).post("/api/depreciation/batches").set("Authorization", auth("accountant")).send({ period }),
        request(app).post("/api/depreciation/batches").set("Authorization", auth("accountant")).send({ period }),
      ])
      for (const result of results) expect([201, 409]).toContain(result.status)
      expect(await prisma.depreciationLedger.count({ where: { assetId: fixture.id, fiscalYear: Number(year), periodLabel: period } })).toBe(1)
      expect(Number((await prisma.asset.findUnique({ where: { id: fixture.id } })).currentNetBookValue)).toBeGreaterThanOrEqual(2000)
    })

    test("keeps the hash chained audit trail valid after authentication and denied role attempts", async () => {
      expect(await verifyAuditChain()).toEqual(expect.objectContaining({ valid: true }))
    })
  })
}
