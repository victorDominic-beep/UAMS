import { Suspense, useEffect, useMemo, useState } from "react"
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import {
  LayoutDashboard,
  ShoppingCart,
  Warehouse,
  Boxes,
  ListTree,
  ArrowLeftRight,
  Landmark,
  Wrench,
  ShieldCheck,
  Trash2,
  ScrollText,
  BarChart3,
  Users,
  Settings,
  Search,
  Bell,
  Sun,
  Moon,
  Menu,
  ChevronRight,
  LogOut,
  PackageCheck,
  PanelLeftClose,
  PanelLeftOpen,
  QrCode,
} from "lucide-react"
import { useApp } from "../App"
import { canNavigate } from "../permissions"
import {
  Button,
  DropdownMenu,
  DropdownTrigger,
  DropdownContent,
  DropdownSeparator,
  Input,
} from "./ui"
import { Skeleton } from "./motion"

const navItems = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/dashboard",
    permission: "dashboard",
  },
  {
    label: "Asset Lookup / Register",
    icon: ListTree,
    path: "/assets",
    permission: "assets",
  },
  {
    label: "Intake and SRV",
    icon: Warehouse,
    path: "/intake-srv",
    permission: "intake",
  },
  {
    label: "Tagging and PAIN",
    icon: QrCode,
    path: "/tagging-pain",
    permission: "tagging",
  },
  {
    label: "Disbursement and SIV",
    icon: PackageCheck,
    path: "/disbursement-siv",
    permission: "disbursement",
  },
  {
    label: "Custody and Transfers",
    icon: ArrowLeftRight,
    path: "/custody-transfers",
    permission: "custody",
  },
  {
    label: "Maintenance",
    icon: Wrench,
    path: "/maintenance",
    permission: "maintenance",
  },
  {
    label: "Insurance",
    icon: ShieldCheck,
    path: "/insurance",
    permission: "insurance",
  },
  {
    label: "Depreciation",
    icon: BarChart3,
    path: "/depreciation",
    permission: "depreciation",
  },
  {
    label: "Invoice Reconciliation",
    icon: Landmark,
    path: "/invoice-reconciliation",
    permission: "reconciliation",
  },
  {
    label: "Survey and Disposal",
    icon: Trash2,
    path: "/survey-disposal",
    permission: "survey",
  },
  {
    label: "Physical Verification",
    icon: ShieldCheck,
    path: "/physical-verification",
    permission: "verification",
  },
  {
    label: "Audit Trail",
    icon: ScrollText,
    path: "/audit",
    permission: "audit",
  },
  {
    label: "User and Role Management",
    icon: Users,
    path: "/users",
    permission: "admin",
  },
]

const pageTitles = {
  dashboard: ["Dashboard", "Overview"],
  assets: ["Asset Lookup / Register", "Assets"],
  "intake-srv": ["Intake and SRV", "Acquisition"],
  "tagging-pain": ["Tagging and PAIN", "Identification"],
  "disbursement-siv": ["Disbursement and SIV", "Stores Issue"],
  "custody-transfers": ["Custody and Transfers", "Asset Lifecycle"],
  maintenance: ["Maintenance", "Asset Lifecycle"],
  insurance: ["Insurance", "Asset Lifecycle"],
  depreciation: ["Depreciation", "Asset Accounting"],
  "invoice-reconciliation": ["Invoice Reconciliation", "Asset Accounting"],
  "survey-disposal": ["Survey and Disposal", "End of Life"],
  "physical-verification": ["Physical Verification", "Assurance"],
  audit: ["Audit Trail", "Compliance"],
  users: ["User and Role Management", "Administration"],
  submissions: ["Submissions", "Workflows"],
  reports: ["Reports", "Assurance"],
  settings: ["Settings", "System"],
  profile: ["My Profile", "Account"],
}

function Brand({ collapsed }) {
  return (
    <div
      className={`flex h-18 items-center gap-3 border-b border-sidebar-border transition-all ${
        collapsed ? "lg:justify-center lg:px-2" : "px-5"
      }`}
    >
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-sidebar-primary shadow-sm">
        <PackageCheck className="size-6" />
      </div>
      <div className={collapsed ? "lg:hidden" : ""}>
        <div className="text-sm font-bold tracking-wide text-white">
          FUNAAB UAMS
        </div>
        <div className="mt-0.5 text-xs text-sidebar-muted">
          Asset Management System
        </div>
      </div>
    </div>
  )
}

function Sidebar({ open, setOpen, collapsed }) {
  const { user, logout } = useApp()
  const navigate = useNavigate()
  const [drawerSearch, setDrawerSearch] = useState("")
  const allowed = useMemo(
    () => navItems.filter((item) => canNavigate(user, item.permission)),
    [user],
  )
  const runDrawerSearch = () => {
    if (!drawerSearch.trim()) return
    const destination = canNavigate(user, "assets")
      ? "/assets"
      : "/dashboard"
    navigate(`${destination}?search=${encodeURIComponent(drawerSearch.trim())}`)
    setDrawerSearch("")
    setOpen(false)
  }
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-navy/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-68 flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 lg:translate-x-0 ${
          collapsed ? "lg:w-20" : "lg:w-68"
        } ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <Brand collapsed={collapsed} />
        <div className="border-b border-sidebar-border p-3 lg:hidden">
          <Input
            icon={Search}
            value={drawerSearch}
            onChange={(event) => setDrawerSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") runDrawerSearch()
            }}
            placeholder="Search UAMS..."
            className="border-sidebar-border bg-sidebar-accent text-white placeholder:text-sidebar-muted"
          />
          <Button className="mt-2 w-full" size="sm" onClick={runDrawerSearch}>
            <Search className="size-4" /> Search UAMS
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <div
            className={`mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-sidebar-muted ${
              collapsed ? "lg:hidden" : ""
            }`}
          >
            Workspace
          </div>
          <nav className="space-y-1">
            {allowed.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                title={collapsed ? item.label : undefined}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 hover:translate-x-0.5 ${
                    collapsed
                      ? "lg:justify-center lg:px-0 lg:hover:translate-x-0"
                      : ""
                  } ${
                    isActive
                      ? "bg-sidebar-primary text-white shadow-sm"
                      : "text-sidebar-muted hover:bg-sidebar-accent hover:text-white"
                  }`
                }
              >
                <item.icon className="size-4.5 shrink-0" />
                <span
                  className={`flex-1 whitespace-nowrap ${
                    collapsed ? "lg:hidden" : ""
                  }`}
                >
                  {item.label}
                </span>
                {item.count && (
                  <span
                    className={`rounded-full bg-white/12 px-2 py-0.5 text-[11px] ${
                      collapsed ? "lg:hidden" : ""
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
        <div
          className={`border-t border-sidebar-border p-3 ${
            collapsed ? "lg:p-2" : ""
          }`}
        >
          <div className="rounded-xl bg-sidebar-accent p-2">
            <button
              onClick={() => {
                navigate("/profile")
                setOpen(false)
              }}
              className={`flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-white/5 ${
                collapsed ? "lg:justify-center lg:p-1" : ""
              }`}
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-sidebar-primary text-xs font-bold text-white">
                {user.initials}
              </span>
              <span
                className={`min-w-0 flex-1 ${collapsed ? "lg:hidden" : ""}`}
              >
                <span className="block truncate text-sm font-semibold text-white">
                  {user.name}
                </span>
                <span className="block truncate text-xs text-sidebar-muted">
                  {user.department} · {user.role}
                </span>
              </span>
              <ChevronRight
                className={`size-4 text-sidebar-muted ${
                  collapsed ? "lg:hidden" : ""
                }`}
              />
            </button>
            <Button
              variant="ghost"
              size="sm"
              className={`mt-1 w-full text-sidebar-muted hover:bg-white/5 hover:text-white ${
                collapsed ? "lg:px-0" : "justify-start"
              }`}
              onClick={logout}
            >
              <LogOut className="size-4" />{" "}
              <span className={collapsed ? "lg:hidden" : ""}>Sign out</span>
            </Button>
          </div>
        </div>
      </aside>
    </>
  )
}

function Topbar({ setSidebarOpen, collapsed, setCollapsed }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, theme, setTheme } = useApp()
  const segments = location.pathname.split("/").filter(Boolean)
  const key = segments[0] || "dashboard"
  const detailPage = segments.length > 1
  const [baseTitle, baseSection] = pageTitles[key] || ["Dashboard", "Overview"]
  const title = detailPage
    ? key === "assets"
      ? "Asset Details"
      : "Submission Details"
    : baseTitle
  const section = detailPage
    ? key === "assets"
      ? "Asset Register"
      : "Submissions"
    : baseSection
  const [globalSearch, setGlobalSearch] = useState("")
  const runSearch = () => {
    if (!globalSearch.trim()) return
    if (canNavigate(user, "assets")) {
      navigate(`/assets?search=${encodeURIComponent(globalSearch.trim())}`)
    } else {
      navigate("/dashboard")
    }
  }
  return (
    <header className="sticky top-0 z-20 flex h-18 items-center gap-1.5 border-b border-border bg-background/95 px-2 backdrop-blur sm:gap-3 sm:px-4 md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="size-9 shrink-0 sm:size-10 lg:hidden"
        onClick={() => setSidebarOpen(true)}
      >
        <Menu className="size-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="hidden lg:inline-flex"
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <PanelLeftOpen className="size-5" />
        ) : (
          <PanelLeftClose className="size-5" />
        )}
      </Button>
      <div className="min-w-0 flex-1">
        <div className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
          <span>UAMS</span>
          <ChevronRight className="size-3" />
          <button
            onClick={() =>
              detailPage &&
              navigate(key === "assets" ? "/assets" : "/submissions")
            }
            className={detailPage ? "hover:text-primary" : ""}
          >
            {section}
          </button>
          {detailPage && (
            <>
              <ChevronRight className="size-3" />
              <span>Details</span>
            </>
          )}
        </div>
        <div className="truncate text-base font-semibold text-foreground sm:text-lg">
          {title}
        </div>
      </div>
      <div className="hidden lg:block lg:w-72">
        <Input
          icon={Search}
          placeholder="Search assets and records..."
          className="bg-muted/50"
          value={globalSearch}
          onChange={(event) => setGlobalSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") runSearch()
          }}
        />
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="size-9 shrink-0 sm:size-10"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        aria-label="Toggle theme"
      >
        {theme === "dark" ? (
          <Sun className="size-5" />
        ) : (
          <Moon className="size-5" />
        )}
      </Button>
      <DropdownMenu>
        <DropdownTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative size-9 shrink-0 sm:size-10"
            aria-label="Notifications"
          >
            <Bell className="size-5" />
          </Button>
        </DropdownTrigger>
        <DropdownContent className="w-72 sm:w-80">
          <div className="px-3 py-2 font-semibold">Notifications</div>
          <DropdownSeparator />
          <div className="px-4 py-5 text-sm leading-6 text-muted-foreground">
            Notifications are not connected to the UAMS API. Review operational
            records and the audit trail for current activity.
          </div>
        </DropdownContent>
      </DropdownMenu>
    </header>
  )
}

export function AppShell() {
  const { apiError } = useApp()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("uams-sidebar-collapsed") === "true",
  )
  const location = useLocation()
  const reduceMotion = useReducedMotion()
  useEffect(() => {
    localStorage.setItem("uams-sidebar-collapsed", String(collapsed))
  }, [collapsed])
  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        collapsed={collapsed}
      />
      <div
        className={`transition-[padding] duration-300 ${
          collapsed ? "lg:pl-20" : "lg:pl-68"
        }`}
      >
        <Topbar
          setSidebarOpen={setSidebarOpen}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
        />
        {apiError && (
          <div role="status" className="mx-3 mt-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive sm:mx-4 md:mx-6">
            UAMS API: {apiError}
          </div>
        )}
        <AnimatePresence mode="wait" initial={false}>
          <motion.main
            key={location.pathname}
            initial={reduceMotion ? false : { opacity: 0, y: 7 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -3 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="min-h-[calc(100vh-4.5rem)] p-3 sm:p-4 md:p-6"
          >
            <Suspense fallback={<WorkspaceLoader />}>
              <Outlet />
            </Suspense>
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  )
}

function WorkspaceLoader() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-64 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton className="h-32 w-full" key={index} />
        ))}
      </div>
      <Skeleton className="h-80 w-full" />
    </div>
  )
}
