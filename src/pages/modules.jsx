import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  FileBarChart,
  FileText,
  Filter,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  Boxes,
  Tags,
  QrCode,
  MapPin,
} from "lucide-react"
import { toast } from "sonner"
import { useApp } from "../App"
import { moduleConfigs } from "../data"
import { ROLE_OPTIONS } from "../config/roles"
import {
  canManageAssets,
  canManageUsers,
  canOperateModule,
  permissionMessage,
} from "../permissions"
import { uamsService } from "../services/uamsService"
import { AnimatedNumber, MotionCard } from "../components/motion"
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  Input,
  Label,
  SearchInput,
  Select,
  Spinner,
  Tabs,
  Textarea,
} from "../components/ui"

function StatCard({ item, index }) {
  const icons = [FileText, CheckCircle2, CircleDollarSign, ShieldCheck]
  const Icon = icons[index % icons.length]
  return (
    <MotionCard delay={index * 0.05} className="p-5">
      <div className="flex justify-between gap-4">
        <div>
          <div className="text-sm text-muted-foreground">{item[0]}</div>
          <div className="mt-2 text-2xl font-semibold">
            <AnimatedNumber value={item[1]} />
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{item[2]}</div>
        </div>
        <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
      </div>
    </MotionCard>
  )
}

function WorkspaceInsight({ type }) {
  if (type === "procurement") {
    return (
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Procurement pipeline</CardTitle>
            <CardDescription>
              Current purchase requests by processing stage
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Request review", 9, "bg-primary", "w-3/4"],
              ["Sourcing", 6, "bg-violet-500", "w-1/2"],
              ["Invoice check", 4, "bg-warning", "w-1/3"],
              ["Completed", 11, "bg-success", "w-full"],
            ].map(([label, value, color, width]) => (
              <div key={label} className="rounded-lg border border-border p-4">
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="mt-2 text-xl font-semibold">{value}</div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className={`h-full rounded-full ${color} ${width}`} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }
  if (type === "stores") {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
              <Boxes className="size-5" />
            </div>
            <div>
              <div className="font-semibold">Receiving desk</div>
              <div className="text-sm text-muted-foreground">
                7 deliveries require inspection today
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              ["Awaiting", "18"],
              ["Inspected", "12"],
              ["Stocked", "26"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-muted p-3">
                <div className="font-semibold">{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-success/10 p-2.5 text-success">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <div className="font-semibold">Departmental issuing</div>
              <div className="text-sm text-muted-foreground">
                Keep receiving and issuing evidence separate
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ready to issue</span>
              <span className="font-semibold">8 requests</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Awaiting collection</span>
              <span className="font-semibold">5 requests</span>
            </div>
          </div>
        </Card>
      </div>
    )
  }
  if (type === "finance") {
    return (
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <div className="font-semibold">March payment control</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Verified acquisition commitments and contractor payments
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 text-left sm:grid-cols-3 sm:gap-6 sm:text-right">
            {[
              ["Verified", "₦108.1m"],
              ["Pending", "₦38.7m"],
              ["Exceptions", "₦5.4m"],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="font-semibold">{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-5 flex h-2 overflow-hidden rounded-full bg-muted">
          <div className="w-2/3 bg-success" />
          <div className="w-1/4 bg-warning" />
          <div className="flex-1 bg-destructive" />
        </div>
      </Card>
    )
  }
  if (type === "maintenance") {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["High priority", "6", "Generator and vehicle faults", "danger"],
          ["Scheduled", "14", "Preventive services due", "warning"],
          ["Resolved", "32", "Average resolution 3.2 days", "success"],
        ].map(([title, value, detail, variant]) => (
          <Card className="p-5" key={title}>
            <div className="flex items-center justify-between">
              <div className="font-semibold">{title}</div>
              <Badge variant={variant}>{value}</Badge>
            </div>
            <div className="mt-3 text-sm text-muted-foreground">{detail}</div>
          </Card>
        ))}
      </div>
    )
  }
  if (type === "movements") {
    return (
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Today&apos;s transport schedule</CardTitle>
            <CardDescription>
              Documented asset movements requiring custody acknowledgement
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {[
            ["09:30", "Central Stores → ICT Centre", "10 workstations"],
            ["11:15", "Stores → Veterinary Medicine", "Laboratory incubator"],
            ["14:00", "COLENG → ICT Workshop", "Projector servicing"],
          ].map(([time, route, asset]) => (
            <div key={time} className="rounded-lg border border-border p-4">
              <Badge variant="info">{time}</Badge>
              <div className="mt-3 text-sm font-semibold">{route}</div>
              <div className="mt-1 text-xs text-muted-foreground">{asset}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }
  if (type === "insurance") {
    return (
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="font-semibold">Renewal calendar</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Seven policies require action within the next 60 days
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="danger">2 within 30 days</Badge>
            <Badge variant="warning">5 within 60 days</Badge>
          </div>
        </div>
      </Card>
    )
  }
  if (type === "disposal") {
    return (
      <Card className="p-5">
        <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="font-semibold">Next disposal board sitting</div>
            <div className="mt-1 text-sm text-muted-foreground">
              28 March 2025 · 12 assets await condition evaluation and valuation
            </div>
          </div>
          <div className="rounded-xl bg-warning/10 px-5 py-3 text-center">
            <div className="text-lg font-semibold text-warning-foreground">
              ₦8.2m
            </div>
            <div className="text-xs text-muted-foreground">
              Current book value
            </div>
          </div>
        </div>
      </Card>
    )
  }
  return (
    <Card className="p-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="font-semibold">2025 physical verification</div>
          <div className="mt-1 text-sm text-muted-foreground">
            4,118 of 5,282 registered assets have been independently verified
          </div>
        </div>
        <div className="min-w-52">
          <div className="mb-2 flex justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-semibold">78%</span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div className="h-full w-4/5 rounded-full bg-primary" />
          </div>
        </div>
      </div>
    </Card>
  )
}

export function ModulePage({ type }) {
  const { user } = useApp()
  const config = moduleConfigs[type]
  const canOperate = canOperateModule(user, type)
  const [tab, setTab] = useState(config.tabs[0])
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [managedUser, setManagedUser] = useState(null)
  const [records, setRecords] = useState(config.rows)
  const [status, setStatus] = useState("All statuses")
  const [showFilters, setShowFilters] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [pendingDecision, setPendingDecision] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [savingRecord, setSavingRecord] = useState(false)
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const recordDate = (row) => {
    const candidate = row.find((cell) =>
      /^\d{1,2} [A-Z][a-z]{2} \d{4}$/.test(String(cell)),
    )
    return candidate ? new Date(candidate) : null
  }
  const filtered = records.filter(
    (row) =>
      row.join(" ").toLowerCase().includes(query.toLowerCase()) &&
      (status === "All statuses" || row[row.length - 1] === status) &&
      (!fromDate ||
        !recordDate(row) ||
        recordDate(row) >= new Date(`${fromDate}T00:00:00`)) &&
      (!toDate ||
        !recordDate(row) ||
        recordDate(row) <= new Date(`${toDate}T23:59:59`)),
  )
  const perPage = 3
  const pages = Math.max(1, Math.ceil(filtered.length / perPage))
  const rows = filtered.slice((page - 1) * perPage, page * perPage)
  const statuses = [...new Set(records.map((row) => row[row.length - 1]))]
  const workspaceFocus = {
    procurement:
      "Purchase requests remain separate from invoices and contractor records. Use the tabs to review each stage.",
    stores:
      "Receiving and departmental issuing are recorded independently to preserve custody history.",
    finance:
      "Financial verification records acquisition cost evidence without changing operational asset records.",
    maintenance:
      "Fault reports, inspections and completed service records update asset condition history.",
    movements:
      "Transportation documentation records origin, destination and custody for every movement.",
    insurance:
      "Policy records are managed as part of the asset lifecycle, including renewal exceptions.",
    disposal:
      "Completed disposal records remain historical and are communicated to Asset Management.",
    audit:
      "Audit access is read-oriented; findings and verification events are permanently logged.",
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-primary">
            {config.eyebrow}
          </div>
          <div className="mt-1 text-2xl font-semibold tracking-tight">
            {config.title}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {config.description}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={canOperate ? "success" : "neutral"}>
            {canOperate ? "Operational access" : "Read-only access"}
          </Badge>
          {canOperate && (
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4" /> {config.action}
            </Button>
          )}
        </div>
      </div>
      {!canOperate && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">
            Permission boundary:
          </span>{" "}
          {permissionMessage(user, type)}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {config.stats.map((item, i) => (
          <StatCard key={item[0]} item={item} index={i} />
        ))}
      </div>
      <WorkspaceInsight type={type} />
      <Card>
        <Tabs
          tabs={config.tabs}
          active={tab}
          onChange={(value) => {
            setLoading(true)
            setTab(value)
            setQuery("")
            setStatus("All statuses")
            setPage(1)
            window.setTimeout(() => setLoading(false), 280)
          }}
        />
        <div className="border-b border-border bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{tab}:</span>{" "}
          {workspaceFocus[type]}
        </div>
        <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row">
          <SearchInput
            className="md:w-96"
            placeholder={`Search ${tab.toLowerCase()}...`}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
          />
          <Select
            className="md:w-48"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(1)
            }}
          >
            <option>All statuses</option>
            {statuses.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </Select>
          <Button
            variant="outline"
            onClick={() => setShowFilters((current) => !current)}
          >
            <Filter className="size-4" /> More filters
          </Button>
        </div>
        {showFilters && (
          <div className="grid gap-3 border-b border-border bg-muted/40 p-4 sm:grid-cols-3">
            <div>
              <Label>From date</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(event) => {
                  setFromDate(event.target.value)
                  setPage(1)
                }}
              />
            </div>
            <div>
              <Label>To date</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(event) => {
                  setToDate(event.target.value)
                  setPage(1)
                }}
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setQuery("")
                  setStatus("All statuses")
                  setFromDate("")
                  setToDate("")
                  toast.success("Workspace filters cleared")
                }}
              >
                Clear all filters
              </Button>
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                {config.columns.map((c) => (
                  <th key={c}>{c}</th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {!loading &&
                rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j}>
                        {j === row.length - 1 ? (
                          <Badge>{cell}</Badge>
                        ) : j === 0 ? (
                          <span className="font-medium text-primary">
                            {cell}
                          </span>
                        ) : (
                          cell
                        )}
                      </td>
                    ))}
                    <td>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedRecord(row)}
                        aria-label={`Open ${row[0]}`}
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {loading && (
            <div className="flex min-h-52 items-center justify-center gap-3 text-sm text-muted-foreground">
              <Spinner /> Loading {tab.toLowerCase()}…
            </div>
          )}
          {!loading && rows.length === 0 && (
            <div className="py-16 text-center">
              <Search className="mx-auto size-8 text-muted-foreground" />
              <div className="mt-3 font-semibold">No matching records</div>
              <div className="mt-1 text-sm text-muted-foreground">
                No {tab.toLowerCase()} match the current workspace filters.
              </div>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setQuery("")
                  setStatus("All statuses")
                }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
          <span>
            Showing {rows.length} of {filtered.length} records
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={page === 1}
              onClick={() => setPage((current) => current - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="self-center">
              Page {page} of {pages}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={page === pages}
              onClick={() => setPage((current) => current + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </Card>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={config.action}
        description={`Create a new record in the ${config.title} workspace.`}
        size="lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!canOperateModule(user, type)) {
              toast.error("Your role cannot create records in this workspace")
              return
            }
            const data = new FormData(e.currentTarget)
            const reference = `${type.slice(0, 3).toUpperCase()}/2025/${String(records.length + 1).padStart(4, "0")}`
            const record = [
              reference,
              data.get("description"),
              data.get("party"),
              data.get("amount")
                ? `₦${Number(data.get("amount")).toLocaleString()}`
                : "—",
              data.get("date"),
              "Pending",
            ]
            setSavingRecord(true)
            window.setTimeout(() => {
              setRecords((current) => [record, ...current])
              setSavingRecord(false)
              setOpen(false)
              toast.success("Record created successfully")
            }, 280)
          }}
          className="grid gap-4 sm:grid-cols-2"
        >
          <div>
            <Label>Reference</Label>
            <Input placeholder="Auto-generated on save" disabled />
          </div>
          <div>
            <Label>Date</Label>
            <Input name="date" type="date" required />
          </div>
          <div className="sm:col-span-2">
            <Label>Description</Label>
            <Input
              name="description"
              placeholder="Enter a clear record description"
              required
            />
          </div>
          <div>
            <Label>Department / party</Label>
            <Input
              name="party"
              placeholder="Select or enter department"
              required
            />
          </div>
          <div>
            <Label>Amount / value (if applicable)</Label>
            <Input name="amount" type="number" placeholder="0.00" />
          </div>
          <div className="sm:col-span-2">
            <Label>Supporting notes</Label>
            <Textarea placeholder="Additional record information..." />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={savingRecord}>
              {savingRecord && <Spinner />}
              {savingRecord ? "Saving record…" : "Save record"}
            </Button>
          </div>
        </form>
      </Dialog>
      <Dialog
        open={!!selectedRecord}
        onOpenChange={() => setSelectedRecord(null)}
        title={selectedRecord?.[0] || "Record details"}
        description={`${config.title} record in the ${tab} view.`}
      >
        {selectedRecord && (
          <div className="space-y-3">
            {config.columns.map((column, index) => (
              <div
                key={column}
                className="flex items-start justify-between gap-4 border-b border-border pb-3 text-sm"
              >
                <span className="text-muted-foreground">{column}</span>
                <span className="text-right font-medium">
                  {index === config.columns.length - 1 ? (
                    <Badge>{selectedRecord[index]}</Badge>
                  ) : (
                    selectedRecord[index]
                  )}
                </span>
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setSelectedRecord(null)}>
                Close
              </Button>
              {type === "procurement" && canOperate && (
                <>
                  <Button
                    variant="danger"
                    onClick={() => {
                      setPendingDecision({
                        record: selectedRecord,
                        status: "Rejected",
                      })
                      setSelectedRecord(null)
                    }}
                  >
                    Reject request
                  </Button>
                  <Button
                    onClick={() => {
                      setPendingDecision({
                        record: selectedRecord,
                        status: "Approved",
                      })
                      setSelectedRecord(null)
                    }}
                  >
                    Approve request
                  </Button>
                </>
              )}
              {type !== "audit" && type !== "procurement" && canOperate && (
                <Button
                  onClick={() => {
                    if (!canOperateModule(user, type)) {
                      toast.error("Your role cannot complete this record")
                      return
                    }
                    setRecords((current) =>
                      current.map((row) =>
                        row[0] === selectedRecord[0]
                          ? [...row.slice(0, -1), "Completed"]
                          : row,
                      ),
                    )
                    setSelectedRecord(null)
                    toast.success("Record marked as completed")
                  }}
                >
                  Mark completed
                </Button>
              )}
            </div>
          </div>
        )}
      </Dialog>
      <Dialog
        open={!!pendingDecision}
        onOpenChange={() => setPendingDecision(null)}
        title={`${
          pendingDecision?.status === "Approved" ? "Approve" : "Reject"
        } procurement request?`}
        description={
          pendingDecision
            ? `${pendingDecision.record[0]} will be marked ${pendingDecision.status.toLowerCase()} and the action will be reflected in its record history.`
            : ""
        }
      >
        <div className="space-y-4">
          <div>
            <Label>Decision note</Label>
            <Textarea placeholder="Add a concise procurement review note..." />
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => setPendingDecision(null)}>
              Cancel
            </Button>
            <Button
              variant={
                pendingDecision?.status === "Rejected" ? "danger" : "default"
              }
              onClick={() => {
                if (!canOperateModule(user, type) || !pendingDecision) {
                  toast.error("Your role cannot review this request")
                  return
                }
                setRecords((current) =>
                  current.map((row) =>
                    row[0] === pendingDecision.record[0]
                      ? [...row.slice(0, -1), pendingDecision.status]
                      : row,
                  ),
                )
                toast.success(
                  `Procurement request ${pendingDecision.status.toLowerCase()}`,
                )
                setPendingDecision(null)
              }}
            >
              Confirm {pendingDecision?.status.toLowerCase()}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}

export function AssetManagementPage() {
  const { user } = useApp()
  const canManage = canManageAssets(user)
  const [tab, setTab] = useState("Overview")
  const cards = [
    ["Registered assets", "5,282", Boxes],
    ["Asset categories", "18", Tags],
    ["Locations tracked", "146", MapPin],
    ["Labels awaiting print", "24", QrCode],
  ]
  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-primary">
          Central record management
        </div>
        <div className="mt-1 text-2xl font-semibold">Asset Management</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Administer asset categories, identification, allocations and lifecycle
          records.
        </div>
      </div>
      {!canManage && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">
            Read-only workspace:
          </span>{" "}
          Asset classification, identification and label operations are
          restricted to Asset Management.
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, Icon]) => (
          <Card className="p-5" key={label}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">{label}</div>
                <div className="mt-2 text-2xl font-semibold">{value}</div>
              </div>
              <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                <Icon className="size-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Card>
        <Tabs
          tabs={["Overview", "Asset Categories", "Locations", "QR Labels"]}
          active={tab}
          onChange={setTab}
        />
        <CardContent className="pt-5">
          {tab === "Overview" && (
            <div className="grid gap-4 md:grid-cols-3">
              {[
                [
                  "Register and verify assets",
                  "Create records only after receiving and financial documentation is available.",
                ],
                [
                  "Manage classification",
                  "Maintain consistent categories, conditions, statuses and university locations.",
                ],
                [
                  "Preserve lifecycle history",
                  "Every movement, maintenance action and disposal event remains traceable.",
                ],
              ].map(([title, text], i) => (
                <div
                  className="rounded-xl border border-border p-5"
                  key={title}
                >
                  <div className="grid size-9 place-items-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                    0{i + 1}
                  </div>
                  <div className="mt-4 font-semibold">{title}</div>
                  <div className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {text}
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === "Asset Categories" && <CategoryTable />}
          {tab === "Locations" && (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Location</th>
                    <th>Building / area</th>
                    <th>Department</th>
                    <th>Assets</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    [
                      "ICT Server Room B",
                      "ICT Centre",
                      "ICT Resource Centre",
                      "84",
                      "Active",
                    ],
                    [
                      "Laboratory 2.14",
                      "COLBIOS",
                      "College of Biosciences",
                      "37",
                      "Active",
                    ],
                    [
                      "Transport Yard",
                      "Works Complex",
                      "Works & Services",
                      "42",
                      "Active",
                    ],
                    [
                      "Teaching Farm Plot C",
                      "Teaching Farm",
                      "Plant Science",
                      "28",
                      "Active",
                    ],
                  ].map((row) => (
                    <tr key={row[0]}>
                      {row.map((c, i) => (
                        <td key={i}>{i === 4 ? <Badge>{c}</Badge> : c}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {tab === "QR Labels" && (
            <div className="flex min-h-64 flex-col items-center justify-center text-center">
              <QrCode className="size-12 text-primary" />
              <div className="mt-4 font-semibold">24 labels ready to print</div>
              <div className="mt-1 max-w-md text-sm text-muted-foreground">
                Generate printable identification sheets for recently verified
                assets.
              </div>
              {canManage ? (
                <Button className="mt-4" onClick={() => window.print()}>
                  Print label batch
                </Button>
              ) : (
                <div className="mt-4 text-xs font-medium text-muted-foreground">
                  Label generation is restricted to Asset Management.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
function CategoryTable() {
  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Category</th>
            <th>Description</th>
            <th>Assets</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {[
            [
              "ICT",
              "ICT Equipment",
              "Computing, printing and network equipment",
              "1,842",
              "Active",
            ],
            [
              "LAB",
              "Laboratory Equipment",
              "Scientific and laboratory instruments",
              "987",
              "Active",
            ],
            [
              "FUR",
              "Furniture",
              "Office and academic furniture",
              "1,564",
              "Active",
            ],
            [
              "TRN",
              "Vehicles",
              "University fleet and utility vehicles",
              "164",
              "Active",
            ],
          ].map((row) => (
            <tr key={row[0]}>
              {row.map((c, i) => (
                <td key={i}>{i === 4 ? <Badge>{c}</Badge> : c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const reportTypes = [
  [
    "Asset register report",
    "Filter and preview authorized asset register records.",
  ],
]
export function ReportsPage() {
  const { assets } = useApp()
  const [selected, setSelected] = useState(reportTypes[0][0])
  const [generated, setGenerated] = useState(false)
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    department: "All departments",
    status: "All statuses",
  })
  const previewRows = assets
    .filter(
      (asset) =>
        filters.department === "All departments" ||
        asset.department === filters.department,
    )
    .filter(
      (asset) =>
        filters.status === "All statuses" || asset.status === filters.status,
    )
    .filter((asset) => {
      const acquired = new Date(asset.date)
      if (filters.from && acquired < new Date(`${filters.from}T00:00:00`))
        return false
      if (filters.to && acquired > new Date(`${filters.to}T23:59:59`))
        return false
      return true
    })
    .slice(0, 6)
  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold">Reports</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Generate filtered operational, financial and compliance reports.
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[20rem_1fr]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Report library</CardTitle>
              <CardDescription>Select a report to configure</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {reportTypes.map(([name]) => (
              <button
                key={name}
                onClick={() => {
                  setSelected(name)
                  setGenerated(false)
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium ${
                  selected === name ? "bg-primary text-white" : "hover:bg-muted"
                }`}
              >
                <FileBarChart className="size-4" />
                {name}
              </button>
            ))}
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>{selected}</CardTitle>
                <CardDescription>
                  {reportTypes.find((r) => r[0] === selected)?.[1]}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <Label>From date</Label>
                  <Input
                    type="date"
                    value={filters.from}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        from: event.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>To date</Label>
                  <Input
                    type="date"
                    value={filters.to}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        to: event.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Department</Label>
                  <Select
                    value={filters.department}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        department: event.target.value,
                      }))
                    }
                  >
                    <option>All departments</option>
                    {[...new Set(assets.map((asset) => asset.department))].map(
                      (department) => (
                        <option key={department}>{department}</option>
                      ),
                    )}
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={filters.status}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        status: event.target.value,
                      }))
                    }
                  >
                    <option>All statuses</option>
            <option value="IN_SERVICE">In service</option>
            <option value="UNDER_MAINTENANCE">Under maintenance</option>
            <option value="DISPOSED">Disposed</option>
                  </Select>
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setGenerated(false)
                    setFilters({
                      from: "",
                      to: "",
                      department: "All departments",
                      status: "All statuses",
                    })
                  }}
                >
                  Reset
                </Button>
                <Button
                  onClick={() => {
                    setGenerated(true)
                  }}
                >
                  <BarChart3 className="size-4" /> Preview records
                </Button>
              </div>
            </CardContent>
          </Card>
          {generated ? (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Report preview</CardTitle>
                  <CardDescription>
                    Live asset records currently loaded from the UAMS API
                  </CardDescription>
                </div>
                <p className="max-w-sm text-xs text-muted-foreground">
                  Export files are not available. This preview uses the first
                  page of assets returned to your account.
                </p>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Asset code</th>
                      <th>Asset</th>
                      <th>Department</th>
                      <th>Category</th>
                      <th>Value</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((a) => (
                      <tr key={a.id}>
                        <td className="font-medium text-primary">{a.code}</td>
                        <td>{a.name}</td>
                        <td>{a.department}</td>
                        <td>{a.category}</td>
                        <td>₦{a.cost.toLocaleString()}</td>
                        <td>
                          <Badge>{a.status}</Badge>
                        </td>
                      </tr>
                    ))}
                    {previewRows.length === 0 && (
                      <tr>
                        <td colSpan={6}>
                          <div className="py-10 text-center text-sm text-muted-foreground">
                            No assets match the selected report filters.
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <Card className="grid min-h-72 place-items-center p-8 text-center">
              <div>
                <div className="mx-auto grid size-14 place-items-center rounded-xl bg-muted">
                  <FileBarChart className="size-7 text-muted-foreground" />
                </div>
                <div className="mt-4 font-semibold">
                  Configure and generate your report
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Preview filtered asset records from the connected register.
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export function AdminPage() {
  const { user } = useApp()
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [managedUser, setManagedUser] = useState(null)
  const [users, setUsers] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const refresh = async () => {
    setLoading(true)
    setError("")
    try {
      const [userRows, departmentRows] = await Promise.all([uamsService.getUsers(), uamsService.getDepartments()])
      setUsers(userRows)
      setDepartments(departmentRows)
    } catch (apiError) {
      setError(apiError.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { refresh() }, [])
  if (!canManageUsers(user)) return <Restricted />
  const filtered = users.filter((u) =>
    (u.name + u.email + u.departmentName + u.staffNumber)
      .toLowerCase()
      .includes(query.toLowerCase()),
  )
  const createUser = async (event) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setSaving(true)
    try {
      await uamsService.createUser({ staffNumber: data.get("staffNumber"), email: data.get("email"), fullName: data.get("fullName"), password: data.get("password"), departmentId: data.get("departmentId") || null, roleNames: [data.get("role")] })
      setOpen(false)
      await refresh()
      toast.success("User account and role assignment created")
    } catch (apiError) { toast.error(apiError.message) } finally { setSaving(false) }
  }
  const saveUser = async (event) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setSaving(true)
    try {
      const roleNames = data.getAll("roleNames")
      if (!roleNames.length) throw new Error("Assign at least one official role")
      await uamsService.replaceUserRoles(managedUser.id, roleNames)
      const isActive = data.get("isActive") === "true"
      if (isActive !== managedUser.isActive) await uamsService.setUserStatus(managedUser.id, isActive)
      setManagedUser(null)
      await refresh()
      toast.success("User roles and access status updated")
    } catch (apiError) { toast.error(apiError.message); await refresh() } finally { setSaving(false) }
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="text-2xl font-semibold">User management</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Live staff accounts and role assignments from the UAMS API.
          </div>
        </div>
        <Button onClick={() => setOpen(true)}>
          <UserPlus className="size-4" /> Add user
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Active accounts", String(users.filter((item) => item.isActive).length), Users],
          ["Authoritative roles", "9", Building2],
          ["Access profiles", "9", UserCheck],
        ].map(([l, v, I]) => (
          <Card className="flex items-center gap-4 p-5" key={l}>
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
              <I className="size-5" />
            </div>
            <div>
              <div className="text-xl font-semibold">{v}</div>
              <div className="text-sm text-muted-foreground">{l}</div>
            </div>
          </Card>
        ))}
      </div>
      <Card>
        <div className="border-b border-border p-4">
          <SearchInput
            className="max-w-md"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users..."
          />
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Department</th>
                <th>Role</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={5} className="py-10 text-center text-muted-foreground"><Spinner /></td></tr> : error ? <tr><td colSpan={5} className="py-10 text-center text-destructive">{error}</td></tr> : filtered.length ? filtered.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                        {u.initials}
                      </span>
                      <span>
                        <span className="block font-medium">{u.name}</span>
                        <span className="block text-xs text-muted-foreground">{u.email} · {u.staffNumber}</span>
                      </span>
                    </div>
                  </td>
                  <td>{u.departmentName}</td>
                  <td>{u.role}</td>
                  <td>
                    <Badge variant={u.isActive ? "success" : "neutral"}>{u.isActive ? "Active" : "Suspended"}</Badge>
                  </td>
                  <td>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setManagedUser(u)}
                      aria-label={`Manage ${u.name}`}
                    >
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </td>
                </tr>
              )) : <tr><td colSpan={5} className="py-10 text-center text-muted-foreground">No staff accounts match this search.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Add staff account"
        description="Create an authorized UAMS user account."
      >
        <form onSubmit={createUser} className="space-y-4">
          <div><Label>Staff number</Label><Input name="staffNumber" minLength={3} required /></div>
          <div>
            <Label>Full name</Label>
            <Input name="fullName" required />
          </div>
          <div>
            <Label>Institutional email</Label>
            <Input name="email" type="email" required />
          </div>
          <div>
            <Label>Department</Label>
            <Select name="departmentId" defaultValue=""><option value="">Unassigned</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</Select>
          </div>
          <div>
            <Label>Role</Label>
            <Select name="role">
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div><Label>Temporary password</Label><Input name="password" type="password" minLength={12} autoComplete="new-password" required /><p className="mt-1 text-xs text-muted-foreground">Use at least 12 characters with upper and lower case, a number and a symbol.</p></div>
          <div className="flex justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>{saving ? <><Spinner /> Creating…</> : "Create account"}</Button>
          </div>
        </form>
      </Dialog>
      <Dialog
        open={!!managedUser}
        onOpenChange={() => setManagedUser(null)}
        title={`Manage ${managedUser?.name || "user account"}`}
        description="Assign an authoritative role and manage account access. Operational permissions come only from the selected role."
      >
        {managedUser && (
          <form className="space-y-4" onSubmit={saveUser}>
            <div>
              <Label>Role assignment</Label>
              <Select name="roleNames" multiple size={Math.min(5, ROLE_OPTIONS.length)} defaultValue={managedUser.roles.map((role) => role.name)}>
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>System access</Label>
              <Select name="isActive" defaultValue={String(managedUser.isActive)}>
                <option value="true">Active</option>
                <option value="false">Suspended</option>
              </Select>
            </div>
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              System Administrator access does not grant intake, maintenance,
              accounting, approval or audit operations.
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setManagedUser(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>{saving ? <><Spinner /> Saving…</> : "Save access changes"}</Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  )
}
function Restricted() {
  return (
    <Card className="grid min-h-[28rem] place-items-center p-8 text-center">
      <div>
        <div className="mx-auto grid size-14 place-items-center rounded-xl bg-destructive/10 text-destructive">
          <ShieldCheck className="size-7" />
        </div>
        <div className="mt-4 text-lg font-semibold">
          Administrator access required
        </div>
        <div className="mt-1 max-w-md text-sm text-muted-foreground">
          Your current role does not permit access to user and permission
          management.
        </div>
      </div>
    </Card>
  )
}

export function SettingsPage() {
  const { theme, setTheme } = useApp()
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <div className="text-2xl font-semibold">Settings</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Manage application preferences.
        </div>
      </div>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Choose how UAMS appears on this device
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {["light", "dark"].map((mode) => (
              <button
                key={mode}
                onClick={() => setTheme(mode)}
                className={`rounded-xl border p-4 text-left capitalize ${
                  theme === mode
                    ? "border-primary ring-2 ring-primary/10"
                    : "border-border"
                }`}
              >
                <div
                  className={`mb-3 h-20 rounded-lg border ${
                    mode === "dark"
                      ? "border-slate-700 bg-slate-900"
                      : "border-slate-200 bg-slate-50"
                  }`}
                />
                <div className="text-sm font-semibold">{mode} theme</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card className="p-5 text-sm leading-6 text-muted-foreground">
        Notification preferences are unavailable because UAMS has no notification service connected.
      </Card>
    </div>
  )
}

export function ProfilePage() {
  const { user } = useApp()
  const navigate = useNavigate()
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <div className="text-2xl font-semibold">My profile</div>
        <div className="mt-1 text-sm text-muted-foreground">
          View your account information or change your password.
        </div>
      </div>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 border-b border-border pb-6">
            <div className="grid size-16 place-items-center rounded-xl bg-primary text-lg font-bold text-white">
              {user.initials}
            </div>
            <div>
              <div className="text-lg font-semibold">{user.name}</div>
              <div className="text-sm text-muted-foreground">
                {user.role} · {user.department}
              </div>
            </div>
          </div>
          <div className="grid gap-5 pt-6 sm:grid-cols-2">
            <div>
              <Label>Full name</Label>
              <Input defaultValue={user.name} disabled />
            </div>
            <div>
              <Label>Email address</Label>
              <Input defaultValue={user.email} disabled />
            </div>
            <div>
              <Label>Department</Label>
              <Input defaultValue={user.department} disabled />
            </div>
            <div>
              <Label>Role</Label>
              <Input defaultValue={user.role} disabled />
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button onClick={() => navigate("/reset-password")}>
              Change password
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
