const authService = require("../services/authService")

async function login(req, res, next) {
  try {
    const result = await authService.login({
      ...req.body,
      ipAddress: req.ip,
    })
    res.status(200).json({ success: true, data: result })
  } catch (error) {
    if (error.statusCode === 401) {
      const auditService = require("../../audit/services/auditService")
      await auditService.recordAudit({
        ipAddress: req.ip,
        actionType: "LOGIN",
        entityName: "User",
        entityId: "unknown",
        delta: { result: "failure" },
      })
    }
    next(error)
  }
}

async function logout(req, res) {
  res.status(200).json({
    success: true,
    message: "Logout is stateless. Discard the bearer token on the client.",
  })
}

async function me(req, res) {
  res.status(200).json({
    success: true,
    data: { user: authService.publicUser(req.user) },
  })
}

async function changePassword(req, res, next) {
  try {
    await authService.changePassword(
      req.user.id,
      req.body.currentPassword,
      req.body.newPassword,
      req.ip,
    )
    res.status(200).json({ success: true, message: "Password changed successfully" })
  } catch (error) {
    next(error)
  }
}

module.exports = { login, logout, me, changePassword }
