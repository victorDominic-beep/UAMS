export const ROLE_DEFINITIONS = {
  STORE_OFFICER: {
    label: "Store Officer",
    department: "Central Stores",
    navigation: ["dashboard", "assets", "intake", "tagging", "disbursement"],
    actions: [
      "intake.create",
      "srv.create",
      "srv.edit",
      "srv.approve",
      "siv.approve",
      "label.generate",
      "siv.create",
    ],
  },
  BURSARY_ASSET_ACCOUNTANT: {
    label: "Bursary Asset Accountant",
    department: "Bursary",
    navigation: [
      "dashboard",
      "assets",
      "insurance",
      "depreciation",
      "survey",
    ],
    actions: [
      "depreciation.configure",
      "depreciation.run",
      "auction.proceeds",
    ],
  },
  WORKS_INSPECTION_OFFICER: {
    label: "Works Inspection Officer",
    department: "Works & Services",
    navigation: [
      "dashboard",
      "assets",
      "tagging",
      "custody",
      "maintenance",
      "insurance",
    ],
    actions: [
      "inscription.confirm",
      "asset.transfer",
      "maintenance.create",
      "insurance.track",
      "maintenance.close",
    ],
  },
  DEPARTMENTAL_CUSTODIAN: {
    label: "Departmental Custodian",
    department: "College of Physical Sciences",
    navigation: ["dashboard", "assets", "disbursement", "custody", "survey"],
    actions: [
      "receipt.confirm",
      "unserviceable.report",
    ],
  },
  BOARD_OF_SURVEY_MEMBER: {
    label: "Board of Survey Member",
    department: "Board of Survey",
    navigation: ["dashboard", "assets", "survey"],
    actions: [
      "survey.compile",
      "survey.rate",
      "survey.reserve",
    ],
  },
  INTERNAL_AUDITOR: {
    label: "Internal Auditor",
    department: "Internal Audit",
    navigation: [
      "dashboard",
      "assets",
      "intake",
      "tagging",
      "disbursement",
      "custody",
      "maintenance",
      "insurance",
      "depreciation",
      "reconciliation",
      "survey",
      "verification",
      "audit",
    ],
    actions: ["verification.record", "audit.read"],
  },
  BURSAR: {
    label: "Bursar",
    department: "Bursary",
    navigation: ["dashboard", "assets", "maintenance", "survey"],
    actions: [
      "capital.flag",
      "writeoff.bursar",
    ],
  },
  VICE_CHANCELLOR: {
    label: "Vice-Chancellor",
    department: "Vice-Chancellor's Office",
    navigation: ["dashboard", "assets", "survey"],
    actions: [
      "writeoff.vc",
    ],
  },
  SYSTEM_ADMINISTRATOR: {
    label: "System Administrator",
    department: "ICT Directorate",
    navigation: ["dashboard", "admin"],
    actions: ["users.manage", "roles.assign", "access.manage"],
  },
}

export const ROLE_OPTIONS = Object.entries(ROLE_DEFINITIONS).map(
  ([value, definition]) => ({ value, label: definition.label }),
)
