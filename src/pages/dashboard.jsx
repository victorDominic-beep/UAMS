import { useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  Clock3,
  PackageCheck,
  Wrench,
} from "lucide-react"
import { toast } from "sonner"
import { useApp } from "../App"
import { Badge, Button, Card, Spinner } from "../components/ui"
import { MotionCard } from "../components/motion"

const roleDashboards = {
  STORE_OFFICER: {
    description: "Record goods intake, manage SRVs, prepare asset labels and issue inscribed assets through SIVs.",
    destination: ["/intake-srv", "Open intake and SRV"],
  },
  WORKS_INSPECTION_OFFICER: {
    description: "Confirm tag inscription, record authorized asset movements, manage maintenance and track insurance coverage.",
    destination: ["/tagging-pain", "Review inscription"],
  },
  DEPARTMENTAL_CUSTODIAN: {
    description: "View assets assigned to your department, confirm receipt and report unserviceable items.",
    destination: ["/custody-transfers", "Review custody records"],
  },
  BURSARY_ASSET_ACCOUNTANT: {
    description: "Run depreciation batches, review financial asset history and record disposal proceeds after authorization.",
    destination: ["/depreciation", "Open depreciation"],
  },
  BURSAR: {
    description: "Flag qualifying capital additions and decide the Bursar stage of write-off authorizations.",
    destination: ["/survey-disposal", "Review survey decisions"],
  },
  VICE_CHANCELLOR: {
    description: "Provide the separate Vice-Chancellor decision for asset write-off authorizations.",
    destination: ["/survey-disposal", "Review write-off decisions"],
  },
  BOARD_OF_SURVEY_MEMBER: {
    description: "Compile survey dockets, assess asset condition and record reserve values for review.",
    destination: ["/survey-disposal", "Open survey dockets"],
  },
  INTERNAL_AUDITOR: {
    description: "Inspect authorized records, review the audit trail and record independent physical verification outcomes.",
    destination: ["/physical-verification", "Record physical verification"],
  },
  SYSTEM_ADMINISTRATOR: {
    description: "Manage user accounts, role assignments and system access without operational asset permissions.",
    destination: ["/users", "Manage users and roles"],
  },
}

const moduleLinks = {
  assets: ["Asset register", "/assets", Boxes],
  intake: ["Intake and SRV", "/intake-srv", PackageCheck],
  tagging: ["Tagging and PAIN", "/tagging-pain", PackageCheck],
  disbursement: ["Disbursement and SIV", "/disbursement-siv", PackageCheck],
  custody: ["Custody and transfers", "/custody-transfers", Boxes],
  maintenance: ["Maintenance", "/maintenance", Wrench],
  insurance: ["Insurance", "/insurance", CheckCircle2],
  depreciation: ["Depreciation", "/depreciation", CheckCircle2],
  reconciliation: ["Invoice reconciliation", "/invoice-reconciliation", Clock3],
  survey: ["Survey and disposal", "/survey-disposal", CheckCircle2],
  verification: ["Physical verification", "/physical-verification", CheckCircle2],
  audit: ["Audit trail", "/audit", CheckCircle2],
  admin: ["User and role management", "/users", CheckCircle2],
}

export function DashboardPage() {
  const { user, assets, dataLoading, apiError } = useApp()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const config = roleDashboards[user.roleKey] || roleDashboards.INTERNAL_AUDITOR

  useEffect(() => {
    if (searchParams.get("denied") === "1") {
      toast.error("This service is not available to your current role.")
    }
  }, [searchParams])

  const today = new Intl.DateTimeFormat("en-NG", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(new Date())
  const statuses = [
    ["Assets loaded", assets.length, "Current API page", Boxes],
    ["In service", assets.filter((asset) => asset.status === "IN_SERVICE").length, "Loaded records", CheckCircle2],
    ["Awaiting inscription", assets.filter((asset) => asset.status === "PENDING_INSCRIPTION").length, "Loaded records", Clock3],
    ["Under maintenance", assets.filter((asset) => asset.status === "UNDER_MAINTENANCE").length, "Loaded records", Wrench],
  ]
  const links = (user.permissions || [])
    .filter((key) => key !== "dashboard" && moduleLinks[key])
    .map((key) => moduleLinks[key])

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden border-primary/10 p-5 md:p-6">
        <div className="absolute inset-y-0 left-0 w-1 bg-primary" />
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <div className="text-xs font-medium text-muted-foreground">{today}</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Welcome, {user.name.split(" ")[1] || user.name}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{config.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="info">{user.role}</Badge>
              <Badge variant="neutral">{user.department}</Badge>
              {user.roleKey === "SYSTEM_ADMINISTRATOR" && <Badge variant="warning">No operational permissions</Badge>}
              {user.roleKey === "INTERNAL_AUDITOR" && <Badge variant="warning">Operational records read-only</Badge>}
            </div>
          </div>
          <Button onClick={() => navigate(config.destination[0])}>
            {config.destination[1]} <ArrowRight className="size-4" />
          </Button>
        </div>
      </Card>

      {apiError && <Card role="alert" className="border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{apiError}</Card>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statuses.map(([label, value, detail, Icon], index) => (
          <MotionCard className="p-5" delay={index * 0.04} key={label}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm text-muted-foreground">{label}</div>
                <div className="mt-2 text-2xl font-semibold">{dataLoading ? <Spinner /> : value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
              </div>
              <div className="rounded-xl bg-primary/10 p-2.5 text-primary"><Icon className="size-5" /></div>
            </div>
          </MotionCard>
        ))}
      </div>

      <Card className="p-5">
        <h2 className="font-semibold">Your workspaces</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          These links follow your assigned UAMS role. Current backend records are shown in each workspace.
        </p>
        {dataLoading ? (
          <div className="mt-6 flex items-center gap-3 text-sm text-muted-foreground"><Spinner /> Loading authorized records…</div>
        ) : links.length ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {links.map(([label, path, Icon]) => (
              <button key={path} onClick={() => navigate(path)} className="flex min-h-16 items-center justify-between gap-3 rounded-xl border border-border p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/40">
                <span className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" /></span><span className="text-sm font-medium">{label}</span></span>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        ) : <p className="mt-5 text-sm text-muted-foreground">No workspaces are assigned to this account.</p>}
        <div className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">
          Asset counts reflect the current authorized API page. The register is paginated; open the asset workspace to search and filter records.
        </div>
      </Card>
    </div>
  )
}
