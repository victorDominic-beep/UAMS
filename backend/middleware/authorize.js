const HttpError = require("../utils/httpError")
const { getUserPermissions, getUserRoleNames } = require("../config/roles")

function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    const roleNames = getUserRoleNames(req.user)
    if (!allowedRoles.some((role) => roleNames.includes(role))) {
      const { recordAudit } = require("../modules/audit/services/auditService")
      recordAudit({
        userId: req.user?.id || null,
        ipAddress: req.ip,
        actionType: "OTHER",
        entityName: "Authorization",
        entityId: req.originalUrl,
        delta: { result: "denied", allowedRoles, roleNames },
      }).catch(() => undefined)
      return next(new HttpError(403, "You do not have permission to perform this action"))
    }
    next()
  }
}

function requirePermissions(...requiredPermissions) {
  return (req, res, next) => {
    const permissions = getUserPermissions(req.user)
    if (!requiredPermissions.every((permission) => permissions.includes(permission))) {
      const { recordAudit } = require("../modules/audit/services/auditService")
      recordAudit({
        userId: req.user?.id || null,
        ipAddress: req.ip,
        actionType: "OTHER",
        entityName: "Authorization",
        entityId: req.originalUrl,
        delta: { result: "denied", requiredPermissions, permissions },
      }).catch(() => undefined)
      return next(new HttpError(403, "You do not have permission to perform this action"))
    }
    next()
  }
}

function requireAnyPermissions(...allowedPermissions) {
  return (req, res, next) => {
    const permissions = getUserPermissions(req.user)
    if (!allowedPermissions.some((permission) => permissions.includes(permission))) {
      const { recordAudit } = require("../modules/audit/services/auditService")
      recordAudit({
        userId: req.user?.id || null,
        ipAddress: req.ip,
        actionType: "OTHER",
        entityName: "Authorization",
        entityId: req.originalUrl,
        delta: { result: "denied", allowedPermissions, permissions },
      }).catch(() => undefined)
      return next(new HttpError(403, "You do not have permission to perform this action"))
    }
    next()
  }
}

function requireSameDepartment(paramName = "departmentId") {
  return (req, res, next) => {
    const expected = req.params[paramName] || req.body?.[paramName]
    if (!req.user.departmentId || expected !== req.user.departmentId) {
      return next(new HttpError(403, "This resource is outside your department"))
    }
    next()
  }
}

module.exports = { requireRoles, requirePermissions, requireAnyPermissions, requireSameDepartment }
