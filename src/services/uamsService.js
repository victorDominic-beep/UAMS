const API_BASE = (
  import.meta.env.VITE_UAMS_API_URL ||
  (import.meta.env.DEV ? "http://localhost:4000/api" : "")
).replace(/\/$/, "")

export class UamsApiError extends Error {
  constructor(message, status, details) {
    super(message)
    this.name = "UamsApiError"
    this.status = status
    this.details = details
  }
}

export async function apiRequest(path, { method = "GET", body, token = localStorage.getItem("uams-token"), headers = {} } = {}) {
  if (!API_BASE) {
    throw new UamsApiError("The UAMS API URL is not configured for this deployment.", 0)
  }

  let response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  } catch {
    throw new UamsApiError("The UAMS API is unavailable. Check that the backend is running.", 0)
  }
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || payload.success === false) {
    throw new UamsApiError(payload.error || `Request failed (${response.status})`, response.status, payload.details)
  }
  return payload
}

const getData = async (path) => (await apiRequest(path)).data
const send = async (path, method, body) => (await apiRequest(path, { method, body })).data

const dateValue = (value) => value ? String(value).slice(0, 10) : ""
export function mapApiUser(user) {
  const roleKey = user.roles?.[0]?.name
  return {
    ...user,
    name: user.fullName,
    initials: (user.fullName || "UAMS")
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    roleKey,
    role: user.roles?.map((role) => role.displayName || role.name).join(", ") || "User",
    departmentName: user.department?.name || "Unassigned",
    departmentCode: user.department?.code || "",
    department: user.department?.name || "Unassigned",
  }
}

export function mapApiAsset(asset) {
  return {
    ...asset,
    code: asset.painCode,
    serial: asset.serialNumber || "—",
    category: asset.assetCategory?.name || "Unclassified",
    department: asset.department?.name || "Unassigned",
    date: dateValue(asset.acquisitionDate),
    cost: Number(asset.historicalCost),
    salvageValue: Number(asset.salvageValue),
    netBookValue: Number(asset.currentNetBookValue),
    usefulLife: asset.usefulLifeYears || 0,
    isDepreciable: asset.isDepreciable,
    depreciationStatus: asset.isDepreciable ? "CONFIGURED" : "NON_DEPRECIABLE",
    custodian: asset.custodianName || "Unassigned",
    srv: asset.srvVoucher?.voucherNumber || "—",
    siv: asset.sivVoucher?.voucherNumber || "—",
    condition: asset.status === "UNSERVICEABLE" ? "Poor" : "Good",
  }
}

export const uamsService = {
  apiRequest,
  login: async (username, password) => (await apiRequest("/auth/login", { method: "POST", body: { username, password }, token: null })).data,
  me: async () => mapApiUser((await getData("/auth/me")).user),
  logout: () => send("/auth/logout", "POST", {}),
  getAssets: async (params = {}) => {
    const query = new URLSearchParams({ page: "1", pageSize: "100", ...params })
    const data = await getData(`/assets?${query}`)
    return { ...data, items: data.items.map(mapApiAsset) }
  },
  getDepartments: () => getData("/departments"),
  getAssetCategories: () => getData("/asset-categories"),
  getUsers: async () => (await getData("/users")).map(mapApiUser),
  createUser: (data) => send("/users", "POST", data),
  updateUser: (id, data) => send(`/users/${encodeURIComponent(id)}`, "PATCH", data),
  replaceUserRoles: (id, roleNames) => send(`/users/${encodeURIComponent(id)}/roles`, "PATCH", { roleNames }),
  setUserStatus: (id, isActive) => send(`/users/${encodeURIComponent(id)}/status`, "PATCH", { isActive }),
  getAsset: async (id) => mapApiAsset(await getData(`/assets/${encodeURIComponent(id)}`)),
  confirmInscription: (id, painCode) => send(`/assets/${encodeURIComponent(id)}/inscription/confirm`, "POST", { painCode }),
  generateLabel: (id) => send(`/assets/${encodeURIComponent(id)}/label`, "POST", {}),
  getMovements: (id) => getData(`/assets/${id}/movements`),
  getAllMovements: () => getData("/assets/movements?page=1&pageSize=100"),
  recordMovement: (id, data) => send(`/assets/${id}/movements`, "POST", data),
  reportUnserviceable: (id, reason) => send(`/assets/${id}/report-unserviceable`, "POST", { reason }),
  getSRVs: async () => (await getData("/srv?page=1&pageSize=100")).items,
  createSRV: (data) => send("/srv", "POST", data),
  getSRV: (id) => getData(`/srv/${id}`),
  updateSRV: (id, data) => send(`/srv/${id}`, "PATCH", data),
  submitSRV: (id) => send(`/srv/${id}/submit`, "POST", {}),
  approveSRV: (id) => send(`/srv/${id}/approve`, "POST", {}),
  rejectSRV: (id) => send(`/srv/${id}/reject`, "POST", {}),
  createSIV: (data) => send("/siv", "POST", data),
  getSIVs: async () => (await getData("/siv?page=1&pageSize=100")).items,
  approveSIV: (id) => send(`/siv/${id}/approve`, "POST", {}),
  getPendingReceipt: () => getData("/siv/pending-receipt"),
  confirmReceipt: (id) => send(`/siv/${id}/confirm-receipt`, "POST", {}),
  getMaintenance: async (params = {}) => (await getData(`/maintenance?${new URLSearchParams({ page: "1", pageSize: "100", ...params })}`)).items,
  createMaintenance: (data) => send("/maintenance", "POST", data),
  completeMaintenance: (id) => send(`/maintenance/${id}/complete`, "POST", {}),
  getInsurance: async (params = {}) => (await getData(`/insurance?${new URLSearchParams({ page: "1", pageSize: "100", ...params })}`)).items,
  createInsurance: (data) => send("/insurance", "POST", data),
  updateInsurance: (id, data) => send(`/insurance/${id}`, "PATCH", data),
  getCapitalAdditions: async () => (await getData("/capital-additions?page=1&pageSize=100")).items,
  createCapitalAddition: (data) => send("/capital-additions", "POST", data),
  approveCapitalAddition: (id) => send(`/capital-additions/${id}/approve`, "POST", {}),
  configureDepreciation: (assetId, data) => send(`/depreciation/assets/${assetId}/config`, "PATCH", data),
  runDepreciation: (period) => send("/depreciation/batches", "POST", { period }),
  getDepreciationLedger: async () => (await getData("/depreciation/ledger?page=1&pageSize=100")).items,
  getDepreciationBatches: () => getData("/depreciation/batches?page=1&pageSize=100"),
  getSurveyDockets: async () => (await getData("/survey/dockets?page=1&pageSize=100")).items,
  createSurveyDocket: () => send("/survey/dockets", "POST", {}),
  getSurveyDocket: (id) => getData(`/survey/dockets/${id}`),
  addSurveyItem: (id, assetId) => send(`/survey/dockets/${id}/items`, "POST", { assetId }),
  assessSurveyItem: (id, data) => send(`/survey/items/${id}/assessment`, "POST", data),
  decideWriteOff: (id, role, decision) => send(`/survey/items/${id}/approvals/${role}`, "POST", { decision }),
  getWriteOffAuthorization: (id) => getData(`/survey/items/${id}/authorization`),
  getDisposals: async (params = {}) => (await getData(`/disposals?${new URLSearchParams({ page: "1", pageSize: "100", ...params })}`)).items,
  createDisposal: (data) => send("/disposals", "POST", data),
  getVerifications: async () => (await getData("/verification?page=1&pageSize=100")).items,
  createVerification: (data) => send("/verification", "POST", data),
  getAuditEvents: async () => (await getData("/audit?page=1&pageSize=100")).items,
}
