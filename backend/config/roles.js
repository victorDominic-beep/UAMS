const OFFICIAL_ROLES = Object.freeze({
  STORE_OFFICER: {
    name: "STORE_OFFICER",
    displayName: "Store Officer",
    permissions: [
      "assets.read",
      "intake.record",
      "srv.create",
      "srv.edit",
      "srv.approve",
      "label.print",
      "siv.create",
      "siv.approve",
    ],
  },
  BURSARY_ASSET_ACCOUNTANT: {
    name: "BURSARY_ASSET_ACCOUNTANT",
    displayName: "Bursary Asset Accountant",
    permissions: [
      "assets.read",
      "depreciation.configure",
      "depreciation.run",
      "invoice.reconcile",
      "auction.proceeds.record",
    ],
  },
  WORKS_INSPECTION_OFFICER: {
    name: "WORKS_INSPECTION_OFFICER",
    displayName: "Works Inspection Officer",
    permissions: [
      "assets.read",
      "tag.confirm",
      "assets.move",
      "maintenance.log",
      "maintenance.close",
      "insurance.track",
      "custody.read",
    ],
  },
  DEPARTMENTAL_CUSTODIAN: {
    name: "DEPARTMENTAL_CUSTODIAN",
    displayName: "Departmental Custodian",
    permissions: [
      "assets.read",
      "siv.receipt.sign",
      "asset.unserviceable.report",
      "custody.read",
    ],
  },
  BOARD_OF_SURVEY_MEMBER: {
    name: "BOARD_OF_SURVEY_MEMBER",
    displayName: "Board of Survey Member",
    permissions: [
      "assets.read",
      "survey.compile",
      "survey.rate",
      "survey.reserve_value",
    ],
  },
  INTERNAL_AUDITOR: {
    name: "INTERNAL_AUDITOR",
    displayName: "Internal Auditor",
    permissions: [
      "assets.read",
      "audit.read",
      "verification.record",
      "custody.read",
    ],
  },
  BURSAR: {
    name: "BURSAR",
    displayName: "Bursar",
    permissions: [
      "assets.read",
      "capital_addition.flag",
      "writeoff.bursar.approve",
    ],
  },
  VICE_CHANCELLOR: {
    name: "VICE_CHANCELLOR",
    displayName: "Vice-Chancellor",
    permissions: [
      "assets.read",
      "writeoff.vc.approve",
    ],
  },
  SYSTEM_ADMINISTRATOR: {
    name: "SYSTEM_ADMINISTRATOR",
    displayName: "System Administrator",
    permissions: [
      "users.manage",
      "roles.manage",
      "access.manage",
    ],
  },
})

const ROLE_NAMES = Object.keys(OFFICIAL_ROLES)

function getUserPermissions(user) {
  const names = (user?.roles || []).map((entry) => entry.role?.name || entry.name).filter(Boolean)
  const permissions = new Set()

  for (const name of names) {
    for (const permission of OFFICIAL_ROLES[name]?.permissions || []) {
      permissions.add(permission)
    }
  }

  return [...permissions]
}

function getUserRoleNames(user) {
  return (user?.roles || []).map((entry) => entry.role?.name || entry.name).filter(Boolean)
}

module.exports = {
  OFFICIAL_ROLES,
  ROLE_NAMES,
  getUserPermissions,
  getUserRoleNames,
}
