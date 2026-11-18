const express = require("express")
const helmet = require("helmet")
const cors = require("cors")
const morgan = require("morgan")
const prisma = require("./config/prisma")
const authRoutes = require("./modules/auth/routes/authRoutes")
const userRoutes = require("./modules/users/routes/userRoutes")
const auditRoutes = require("./modules/audit/routes/auditRoutes")
const srvRoutes = require("./modules/intake/routes/srvRoutes")
const assetRoutes = require("./modules/assets/routes/assetRoutes")
const sivRoutes = require("./modules/siv/routes/sivRoutes")
const maintenanceRoutes = require("./modules/maintenance/routes/maintenanceRoutes")
const insuranceRoutes = require("./modules/insurance/routes/insuranceRoutes")
const capitalAdditionRoutes = require("./modules/capital-additions/routes/capitalAdditionRoutes")
const depreciationRoutes = require("./modules/depreciation/routes/depreciationRoutes")
const surveyRoutes = require("./modules/survey-disposal/routes/surveyRoutes")
const disposalRoutes = require("./modules/survey-disposal/routes/disposalRoutes")
const verificationRoutes = require("./modules/survey-disposal/routes/verificationRoutes")
const { notFound, errorHandler } = require("./middleware/errorHandler")

const app = express()

app.disable("x-powered-by")
app.use(helmet())
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }),
)
app.use(express.json({ limit: "1mb" }))
app.use(express.urlencoded({ extended: false }))
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"))

app.get("/api/health", async (req, res) => {
  let database = "disconnected"

  try {
    await prisma.$queryRaw`SELECT 1`
    database = "connected"
  } catch (error) {
    database = "disconnected"
  }

  res.status(database === "connected" ? 200 : 503).json({
    success: true,
    status: "running",
    database,
  })
})

app.get("/api/departments", require("./middleware/auth").authenticate, require("./middleware/authorize").requireAnyPermissions("assets.read", "users.manage"), async (req, res, next) => {
  try {
    const data = await prisma.department.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, code: true, name: true } })
    res.status(200).json({ success: true, data })
  } catch (error) { next(error) }
})
app.get("/api/asset-categories", require("./middleware/auth").authenticate, require("./middleware/authorize").requirePermissions("assets.read"), async (req, res, next) => {
  try {
    const data = await prisma.assetCategory.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, code: true, name: true } })
    res.status(200).json({ success: true, data })
  } catch (error) { next(error) }
})

app.use("/api/auth", authRoutes)
app.use("/api/users", userRoutes)
app.use("/api/audit", auditRoutes)
app.use("/api/srv", srvRoutes)
app.use("/api/siv", sivRoutes)
app.use("/api/maintenance", maintenanceRoutes)
app.use("/api/insurance", insuranceRoutes)
app.use("/api/capital-additions", capitalAdditionRoutes)
app.use("/api/depreciation", depreciationRoutes)
app.use("/api/survey", surveyRoutes)
app.use("/api/disposals", disposalRoutes)
app.use("/api/verification", verificationRoutes)
app.use("/api/assets", assetRoutes)

app.use("/api", (req, res, next) => {
  if (req.path === "/") {
    return res.status(200).json({
      success: true,
      status: "UAMS API foundation",
    })
  }
  next()
})

app.use(notFound)
app.use(errorHandler)

module.exports = app
