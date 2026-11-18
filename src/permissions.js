import { ROLE_DEFINITIONS } from "./config/roles"

export const roleDefinitionFor = (user) =>
  ROLE_DEFINITIONS[user?.roleKey] || null

export const can = (user, action) =>
  Boolean(roleDefinitionFor(user)?.actions.includes(action))

export const canNavigate = (user, permission) =>
  Boolean(roleDefinitionFor(user)?.navigation.includes(permission))

export const canAccess = canNavigate

export const canManageAssets = (user) => can(user, "asset.manage")

export const canCreateSubmission = (user) => can(user, "submission.create")

export const canReviewSubmission = (user, submission) =>
  can(user, "submission.review") && submission?.to === user.department

export const canRespondToSubmission = (user, submission) =>
  can(user, "submission.respond") &&
  submission?.from === user.department &&
  ["Draft", "Needs Clarification"].includes(submission?.status)

export const canManageUsers = (user) => can(user, "users.manage")

export const canOperateModule = (user, module) => {
  const actions = {
    assets: "asset.manage",
    stores: "srv.create",
    tagging: "inscription.confirm",
    disbursement: "siv.create",
    custody: "asset.transfer",
    movements: "asset.transfer",
    maintenance: "maintenance.create",
    insurance: "insurance.track",
    depreciation: "depreciation.run",
    reconciliation: "invoice.reconcile",
    survey: "survey.compile",
    verification: "verification.record",
  }
  return Boolean(actions[module] && can(user, actions[module]))
}

export const permissionMessage = (user, module) =>
  `${user?.role || "This role"} has read-only access to ${module}. Actions are limited by the UAMS separation-of-duties matrix.`

export const isReadOnlyForModule = (user, module) =>
  canNavigate(user, module) && !canOperateModule(user, module)
