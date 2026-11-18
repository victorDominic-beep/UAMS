import { createContext, lazy, useContext, useEffect, useState } from "react"
import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom"
import { Toaster } from "sonner"
import { submissions as initialSubmissions, submissionHistory } from "./data"
import { ROLE_DEFINITIONS } from "./config/roles"
import { mapApiAsset, mapApiUser, uamsService } from "./services/uamsService"
import { AppShell } from "./components/layout"
import { LoginPage, ForgotPasswordPage, ResetPasswordPage } from "./pages/auth"
import { canNavigate } from "./permissions"
import {
  canCreateSubmission,
  canManageAssets,
  canRespondToSubmission,
  canReviewSubmission,
} from "./permissions"

const lazyNamed = (loader, name) =>
  lazy(() => loader().then((module) => ({ default: module[name] })))

const DashboardPage = lazyNamed(
  () => import("./pages/dashboard"),
  "DashboardPage",
)
const AssetsPage = lazyNamed(() => import("./pages/assets"), "AssetsPage")
const AssetDetailPage = lazyNamed(
  () => import("./pages/assets"),
  "AssetDetailPage",
)
const SubmissionsPage = lazyNamed(
  () => import("./pages/submissions"),
  "SubmissionsPage",
)
const SubmissionDetailPage = lazyNamed(
  () => import("./pages/submissions"),
  "SubmissionDetailPage",
)
const ModulePage = lazyNamed(() => import("./pages/modules"), "ModulePage")
const ReportsPage = lazyNamed(() => import("./pages/modules"), "ReportsPage")
const AdminPage = lazyNamed(() => import("./pages/modules"), "AdminPage")
const SettingsPage = lazyNamed(() => import("./pages/modules"), "SettingsPage")
const ProfilePage = lazyNamed(() => import("./pages/modules"), "ProfilePage")
const AssetManagementPage = lazyNamed(
  () => import("./pages/modules"),
  "AssetManagementPage",
)
const IntakeSrvPage = lazyNamed(
  () => import("./pages/workflows"),
  "IntakeSrvPage",
)
const TaggingPainPage = lazyNamed(
  () => import("./pages/workflows"),
  "TaggingPainPage",
)
const DisbursementSivPage = lazyNamed(
  () => import("./pages/workflows"),
  "DisbursementSivPage",
)
const CustodyTransfersPage = lazyNamed(
  () => import("./pages/workflows"),
  "CustodyTransfersPage",
)
const MaintenancePage = lazyNamed(
  () => import("./pages/workflows"),
  "MaintenancePage",
)
const InsurancePage = lazyNamed(
  () => import("./pages/workflows"),
  "InsurancePage",
)
const DepreciationPage = lazyNamed(
  () => import("./pages/workflows"),
  "DepreciationPage",
)
const InvoiceReconciliationPage = lazyNamed(
  () => import("./pages/workflows"),
  "InvoiceReconciliationPage",
)
const SurveyDisposalPage = lazyNamed(
  () => import("./pages/workflows"),
  "SurveyDisposalPage",
)
const PhysicalVerificationPage = lazyNamed(
  () => import("./pages/workflows"),
  "PhysicalVerificationPage",
)
const AuditTrailPage = lazyNamed(
  () => import("./pages/workflows"),
  "AuditTrailPage",
)

const AppContext = createContext(null)
export const useApp = () => useContext(AppContext)

function AppProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("uams-session")
    return localStorage.getItem("uams-token") && saved ? JSON.parse(saved) : null
  })
  const [theme, setTheme] = useState(
    () => localStorage.getItem("uams-theme") || "light",
  )
  const [assets, setAssets] = useState([])
  const [dataLoading, setDataLoading] = useState(false)
  const [apiError, setApiError] = useState("")
  const [assetHistories, setAssetHistories] = useState(() => {
    const saved = localStorage.getItem("uams-asset-histories-v2")
    return saved ? JSON.parse(saved) : {}
  })
  const [submissions, setSubmissions] = useState(() => {
    const saved = localStorage.getItem("uams-submissions")
    return saved ? JSON.parse(saved) : initialSubmissions
  })
  const [submissionHistories, setSubmissionHistories] = useState(() => {
    const saved = localStorage.getItem("uams-submission-histories")
    return saved
      ? JSON.parse(saved)
      : Object.fromEntries(
          initialSubmissions.map((item) => [item.id, submissionHistory]),
        )
  })

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
    localStorage.setItem("uams-theme", theme)
  }, [theme])

  const refreshAssets = async () => {
    setDataLoading(true)
    try {
      const result = await uamsService.getAssets()
      setAssets(result.items.map(mapApiAsset))
      setApiError("")
      return result
    } catch (error) {
      setApiError(error.message)
      throw error
    } finally {
      setDataLoading(false)
    }
  }

  useEffect(() => {
    if (!localStorage.getItem("uams-token")) return
    let active = true
    setDataLoading(true)
    uamsService.me()
      .then(async (currentUser) => {
        if (!active) return
        const role = ROLE_DEFINITIONS[currentUser.roleKey]
        const normalizedUser = { ...currentUser, ...(role ? { actions: role.actions, permissions: role.navigation } : {}) }
        setUser(normalizedUser)
        localStorage.setItem("uams-session", JSON.stringify(normalizedUser))
        try {
          const assetResult = await uamsService.getAssets()
          if (!active) return
          setAssets(assetResult.items.map(mapApiAsset))
          setApiError("")
        } catch (error) {
          if (!active) return
          if (error.status === 403) {
            setAssets([])
            setApiError("")
          } else {
            setApiError(error.message)
          }
        }
      })
      .catch((error) => {
        if (!active) return
        setApiError(error.message)
        if (error.status === 401) {
          localStorage.removeItem("uams-token")
          localStorage.removeItem("uams-session")
          setUser(null)
        }
      })
      .finally(() => active && setDataLoading(false))
    return () => { active = false }
  }, [])

  const login = async (username, password) => {
    const result = await uamsService.login(username, password)
    localStorage.setItem("uams-token", result.token)
    const currentUser = mapApiUser(result.user)
    const role = ROLE_DEFINITIONS[currentUser.roleKey]
    const normalizedUser = { ...currentUser, ...(role ? { actions: role.actions, permissions: role.navigation } : {}) }
    setUser(normalizedUser)
    localStorage.setItem("uams-session", JSON.stringify(normalizedUser))
    setDataLoading(true)
    try {
      const assetResult = await uamsService.getAssets()
      setAssets(assetResult.items.map(mapApiAsset))
      setApiError("")
    } catch (error) {
      if (error.status === 403) {
        setAssets([])
        setApiError("")
      } else setApiError(error.message)
    } finally { setDataLoading(false) }
    return normalizedUser
  }
  const logout = async () => {
    await uamsService.logout().catch(() => undefined)
    setUser(null)
    setAssets([])
    localStorage.removeItem("uams-token")
    localStorage.removeItem("uams-session")
  }
  const switchUser = () => false
  const saveAsset = () => false
  const transitionAsset = () => false
  const updateAssetCustody = () => false
  const registerAssetFromSrv = () => false
  const createSubmission = (record) => {
    if (!canCreateSubmission(user)) return false
    const nextId = Math.max(...submissions.map((item) => item.id), 0) + 1
    const created = {
      ...record,
      id: nextId,
      ref: `SUB/${record.from.slice(0, 4).toUpperCase()}/2025/${String(nextId).padStart(4, "0")}`,
      date: "19 Mar 2025",
      status: "Draft",
      reviewer: "Unassigned",
    }
    setSubmissions((current) => [created, ...current])
    setSubmissionHistories((current) => ({
      ...current,
      [nextId]: [
        {
          title: "Submission created",
          detail: `Draft created by ${user.name}`,
          time: "19 Mar 2025, just now",
        },
      ],
    }))
    return created
  }
  const updateSubmissionStatus = (id, status, comment) => {
    const submission = submissions.find((item) => item.id === Number(id))
    const senderSubmitting =
      submission?.status === "Draft" &&
      status === "Submitted" &&
      canRespondToSubmission(user, submission)
    const reviewer = canReviewSubmission(user, submission)
    const validReviewTransition =
      reviewer &&
      ((submission?.status === "Submitted" && status === "Under Review") ||
        (submission?.status === "Under Review" &&
          ["Needs Clarification", "Rejected", "Accepted"].includes(status)) ||
        (submission?.status === "Accepted" &&
          status === "Registered" &&
          canManageAssets(user)))
    if (!senderSubmitting && !validReviewTransition) {
      return false
    }
    setSubmissions((current) =>
      current.map((item) =>
        item.id === Number(id)
          ? {
              ...item,
              status,
              reviewer: status === "Submitted" ? "Unassigned" : user.name,
            }
          : item,
      ),
    )
    setSubmissionHistories((current) => ({
      ...current,
      [id]: [
        ...(current[id] || []),
        {
          title:
            status === "Needs Clarification"
              ? "Clarification requested"
              : status === "Submitted"
                ? "Submitted for review"
                : status === "Under Review"
                  ? "Review started"
                  : `Status changed to ${status}`,
          detail: comment || `Action completed by ${user.name}`,
          time: "19 Mar 2025, just now",
        },
      ],
    }))
    return true
  }
  const addSubmissionComment = (id, comment) => {
    const submission = submissions.find((item) => item.id === Number(id))
    if (
      submission?.status !== "Needs Clarification" ||
      !canRespondToSubmission(user, submission)
    )
      return false
    setSubmissionHistories((current) => ({
      ...current,
      [id]: [
        ...(current[id] || []),
        {
          title: "Clarification response added",
          detail: `${comment} — ${user.name}`,
          time: "19 Mar 2025, just now",
        },
      ],
    }))
    setSubmissions((current) =>
      current.map((item) =>
        item.id === Number(id) ? { ...item, status: "Submitted" } : item,
      ),
    )
    return true
  }
  return (
    <AppContext.Provider
      value={{
        user,
        login,
        logout,
        switchUser,
        refreshAssets,
        dataLoading,
        apiError,
        theme,
        setTheme,
        assets,
        assetHistories,
        saveAsset,
        transitionAsset,
        updateAssetCustody,
        registerAssetFromSrv,
        submissions,
        submissionHistories,
        createSubmission,
        updateSubmissionStatus,
        addSubmissionComment,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

function ProtectedRoute() {
  const { user } = useApp()
  return user ? <AppShell /> : <Navigate to="/login" replace />
}

function PasswordChangeRoute() {
  const { user } = useApp()
  return user ? <ResetPasswordPage /> : <Navigate to="/login" replace />
}

function PermissionRoute({ permission, children }) {
  const { user } = useApp()
  const allowed = canNavigate(user, permission)
  return allowed ? (
    children
  ) : (
    <div className="mx-auto max-w-2xl rounded-xl border border-destructive/20 bg-card p-8 text-center shadow-card">
      <h1 className="text-xl font-semibold">Access denied</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Your {user.role} role does not have access to this workspace.
      </p>
      <Link
        to="/dashboard"
        className="mt-5 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
      >
        Return to dashboard
      </Link>
    </div>
  )
}

const permit = (permission, element) => (
  <PermissionRoute permission={permission}>{element}</PermissionRoute>
)

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<PasswordChangeRoute />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route
              path="/submissions"
              element={permit("submissions", <SubmissionsPage />)}
            />
            <Route
              path="/submissions/:id"
              element={permit("submissions", <SubmissionDetailPage />)}
            />
            <Route
              path="/procurement"
              element={<Navigate to="/intake-srv" replace />}
            />
            <Route
              path="/central-stores"
              element={<Navigate to="/intake-srv" replace />}
            />
            <Route
              path="/asset-management"
              element={<Navigate to="/assets" replace />}
            />
            <Route path="/assets" element={permit("assets", <AssetsPage />)} />
            <Route
              path="/assets/:id"
              element={permit("assets", <AssetDetailPage />)}
            />
            <Route
              path="/intake-srv"
              element={permit("intake", <IntakeSrvPage />)}
            />
            <Route
              path="/tagging-pain"
              element={permit("tagging", <TaggingPainPage />)}
            />
            <Route
              path="/disbursement-siv"
              element={permit("disbursement", <DisbursementSivPage />)}
            />
            <Route
              path="/custody-transfers"
              element={permit("custody", <CustodyTransfersPage />)}
            />
            <Route
              path="/movements"
              element={<Navigate to="/custody-transfers" replace />}
            />
            <Route
              path="/maintenance"
              element={permit("maintenance", <MaintenancePage />)}
            />
            <Route
              path="/insurance"
              element={permit("insurance", <InsurancePage />)}
            />
            <Route
              path="/depreciation"
              element={permit("depreciation", <DepreciationPage />)}
            />
            <Route
              path="/invoice-reconciliation"
              element={permit("reconciliation", <InvoiceReconciliationPage />)}
            />
            <Route
              path="/survey-disposal"
              element={permit("survey", <SurveyDisposalPage />)}
            />
            <Route
              path="/disposal"
              element={<Navigate to="/survey-disposal" replace />}
            />
            <Route
              path="/physical-verification"
              element={permit("verification", <PhysicalVerificationPage />)}
            />
            <Route
              path="/audit"
              element={permit("audit", <AuditTrailPage />)}
            />
            <Route
              path="/finance"
              element={<Navigate to="/depreciation" replace />}
            />
            <Route path="/reports" element={permit("assets", <ReportsPage />)} />
            <Route path="/users" element={permit("admin", <AdminPage />)} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        <Toaster richColors position="top-right" />
      </AppProvider>
    </BrowserRouter>
  )
}
