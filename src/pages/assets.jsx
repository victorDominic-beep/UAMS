import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import {
  ArrowLeft,
  Boxes,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Filter,
  History,
  MapPin,
  Pencil,
  Plus,
  Printer,
  QrCode,
  Search,
  ShieldCheck,
  UserRound,
  Wrench,
  ArrowLeftRight,
  CalendarDays,
  CircleDollarSign,
} from "lucide-react"
import { toast } from "sonner"
import { useApp } from "../App"
import { can, canManageAssets, canOperateModule } from "../permissions"
import { uamsService } from "../services/uamsService"
import { ASSET_STATUSES } from "../mocks/systemData"
import { Skeleton } from "../components/motion"
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
} from "../components/ui"

const money = (value) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value)

function AssetForm({ open, onOpenChange, asset, onSave }) {
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const submit = (e) => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const next = {}
    ;["name", "category", "department", "cost"].forEach((key) => {
      if (!data.get(key)) next[key] = "Required"
    })
    setErrors(next)
    if (Object.keys(next).length) return
    const dateValue = data.get("date")
    const record = {
      ...asset,
      name: data.get("name"),
      category: data.get("category"),
      department: data.get("department"),
      cost: Number(data.get("cost")),
      date: dateValue
        ? new Date(`${dateValue}T00:00:00`).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : asset?.date || "19 Mar 2025",
      srv: data.get("srv") || "Pending",
      location: data.get("location") || "Unassigned",
      condition: data.get("condition") || asset?.condition || "Excellent",
      status: data.get("status") || asset?.status || "Awaiting Verification",
      serial: data.get("serial") || asset?.serial,
      custodian: data.get("custodian") || asset?.custodian,
    }
    setSaving(true)
    window.setTimeout(() => {
      const saved = onSave(record)
      setSaving(false)
      if (!saved) {
        toast.error("Asset changes are restricted to Asset Management")
        return
      }
      toast.success(
        asset ? "Asset record updated successfully" : "Asset record created",
      )
      onOpenChange(false)
    }, 280)
  }
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={asset ? "Edit asset record" : "Register new asset"}
      description={
        asset
          ? "Update the current asset information. Changes remain auditable."
          : "Create an asset record from verified receiving documentation."
      }
      size="lg"
    >
      <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>Asset name</Label>
          <Input
            name="name"
            defaultValue={asset?.name}
            placeholder="e.g. Dell OptiPlex 7010 Workstation"
          />
          {errors.name && (
            <span className="mt-1 text-xs text-destructive">{errors.name}</span>
          )}
        </div>
        <div>
          <Label>Category</Label>
          <Select name="category" defaultValue={asset?.category || ""}>
            <option value="">Select category</option>
            {[
              "ICT Equipment",
              "Laboratory Equipment",
              "Furniture",
              "Vehicles",
              "Power Equipment",
              "Agricultural Equipment",
              "Security Equipment",
            ].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </Select>
          {errors.category && (
            <span className="mt-1 text-xs text-destructive">
              {errors.category}
            </span>
          )}
        </div>
        <div>
          <Label>Department allocation</Label>
          <Select name="department" defaultValue={asset?.department || ""}>
            <option value="">Select department</option>
            {[
              "ICT Resource Centre",
              "Registry",
              "Works & Services",
              "College of Biosciences",
              "Veterinary Medicine",
              "Bursary",
              "College of Engineering",
              "Security Unit",
            ].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </Select>
          {errors.department && (
            <span className="mt-1 text-xs text-destructive">
              {errors.department}
            </span>
          )}
        </div>
        <div>
          <Label>Purchase cost (NGN)</Label>
          <Input
            name="cost"
            type="number"
            placeholder="0.00"
            defaultValue={asset?.cost}
          />
          {errors.cost && (
            <span className="mt-1 text-xs text-destructive">{errors.cost}</span>
          )}
        </div>
        <div>
          <Label>Acquisition date</Label>
          <Input name="date" type="date" />
        </div>
        <div>
          <Label>Source SRV reference</Label>
          <Input
            name="srv"
            placeholder="SRV/25/0000"
            defaultValue={asset?.srv}
          />
        </div>
        <div>
          <Label>Current location</Label>
          <Input
            name="location"
            placeholder="Building / room"
            defaultValue={asset?.location}
          />
        </div>
        <div>
          <Label>Condition</Label>
          <Select
            name="condition"
            defaultValue={asset?.condition || "Excellent"}
          >
            <option>Excellent</option>
            <option>Good</option>
            <option>Fair</option>
            <option>Poor</option>
          </Select>
        </div>
        <div>
          <Label>Status</Label>
          <Select
            name="status"
            defaultValue={asset?.status || "PENDING_INSCRIPTION"}
          >
            {ASSET_STATUSES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Serial number</Label>
          <Input name="serial" defaultValue={asset?.serial} />
        </div>
        <div>
          <Label>Custodian</Label>
          <Input name="custodian" defaultValue={asset?.custodian} />
        </div>
        <div className="sm:col-span-2 flex justify-end gap-2 border-t border-border pt-5">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Spinner />}
            {saving
              ? "Saving record…"
              : asset
                ? "Save changes"
                : "Create asset record"}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

export function AssetsPage() {
  const { assets, saveAsset, user } = useApp()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get("search") || "")
  const [category, setCategory] = useState("All")
  const [department, setDepartment] = useState("All")
  const [status, setStatus] = useState("All")
  const [sort, setSort] = useState("code-asc")
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 260)
    return () => window.clearTimeout(timer)
  }, [])
  useEffect(() => {
    setQuery(searchParams.get("search") || "")
    setPage(1)
  }, [searchParams])
  const filtered = useMemo(
    () =>
      assets
        .filter(
          (asset) =>
            (
              asset.name +
              asset.code +
              asset.serial +
              asset.category +
              asset.department +
              asset.status
            )
              .toLowerCase()
              .includes(query.toLowerCase()) &&
            (category === "All" || asset.category === category) &&
            (department === "All" || asset.department === department) &&
            (status === "All" || asset.status === status),
        )
        .sort((a, b) => {
          if (sort === "name-asc") return a.name.localeCompare(b.name)
          if (sort === "cost-desc") return b.cost - a.cost
          if (sort === "cost-asc") return a.cost - b.cost
          return a.code.localeCompare(b.code)
        }),
    [assets, query, category, department, status, sort],
  )
  const perPage = 6
  const pages = Math.max(1, Math.ceil(filtered.length / perPage))
  const rows = filtered.slice((page - 1) * perPage, page * perPage)
  const reset = () => {
    setQuery("")
    setCategory("All")
    setDepartment("All")
    setStatus("All")
    setSort("code-asc")
    setPage(1)
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <div className="text-2xl font-semibold tracking-tight">
            Asset register
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            Search PAIN, serial, category, unit and lifecycle status across the
            university register.
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() =>
              toast.info(
                "Export is prepared as a future API integration point.",
              )
            }
          >
            <Download className="size-4" /> Export
          </Button>
          {canManageAssets(user) && (
            <Button
              onClick={() => {
                setEditingAsset(null)
                setFormOpen(true)
              }}
            >
              <Plus className="size-4" /> Register asset
            </Button>
          )}
        </div>
      </div>
      {!canManageAssets(user) && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">
            Read-only asset access:
          </span>{" "}
          Asset records are created through approved SRVs and updated by the
          authorized lifecycle services rather than directly in the register.
        </div>
      )}
      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row">
          <SearchInput
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
            placeholder="Search asset code, name or department..."
            className="lg:w-96"
          />
          <Select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value)
              setPage(1)
            }}
            className="lg:w-52"
          >
            <option>All</option>
            <option>ICT Equipment</option>
            <option>Laboratory Equipment</option>
            <option>Furniture</option>
            <option>Vehicles</option>
            <option>Power Equipment</option>
          </Select>
          <Select
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value)
              setPage(1)
            }}
            className="lg:w-52"
          >
            <option>All</option>
            {[...new Set(assets.map((asset) => asset.department))].map(
              (item) => (
                <option key={item}>{item}</option>
              ),
            )}
          </Select>
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
            className="lg:w-48"
          >
            <option>All</option>
            {ASSET_STATUSES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </Select>
          <Select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="lg:w-48"
          >
            <option value="code-asc">Asset code</option>
            <option value="name-asc">Name A–Z</option>
            <option value="cost-desc">Highest value</option>
            <option value="cost-asc">Lowest value</option>
          </Select>
          <Button variant="ghost" onClick={reset}>
            <Filter className="size-4" /> Reset filters
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>PAIN</th>
                <th>Asset name</th>
                <th>Department</th>
                <th>Location</th>
                <th>Purchase cost</th>
                <th>Condition</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={`skeleton-${index}`}>
                    {Array.from({ length: 8 }).map((__, cell) => (
                      <td key={cell}>
                        <Skeleton
                          className={cell === 1 ? "h-8 w-44" : "h-5 w-24"}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              {!loading &&
                rows.map((asset) => (
                  <tr
                    key={asset.id}
                    onClick={() => navigate(`/assets/${asset.id}`)}
                    className="cursor-pointer"
                  >
                    <td>
                      <span className="font-medium text-primary">
                        {asset.code}
                      </span>
                    </td>
                    <td>
                      <div className="font-medium">{asset.name}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {asset.category}
                      </div>
                    </td>
                    <td>{asset.department}</td>
                    <td>{asset.location}</td>
                    <td className="font-medium">{money(asset.cost)}</td>
                    <td>
                      <Badge
                        variant={
                          asset.condition === "Poor"
                            ? "danger"
                            : asset.condition === "Fair"
                              ? "warning"
                              : "success"
                        }
                      >
                        {asset.condition}
                      </Badge>
                    </td>
                    <td>
                      <Badge>{asset.status}</Badge>
                    </td>
                    <td>
                      {canManageAssets(user) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingAsset(asset)
                            setFormOpen(true)
                          }}
                          aria-label={`Edit ${asset.name}`}
                        >
                          <Pencil className="size-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {!loading && rows.length === 0 && (
            <div className="py-16 text-center">
              <Search className="mx-auto size-8 text-muted-foreground" />
              <div className="mt-3 font-semibold">No assets found</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Adjust your filters or search terms.
              </div>
              <Button variant="outline" className="mt-4" onClick={reset}>
                Clear filters
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
          <span>
            {loading
              ? "Loading asset records…"
              : `Showing ${rows.length} of ${filtered.length} assets`}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-xs">
              Page {page} of {pages}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={page === pages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </Card>
      <AssetForm
        key={editingAsset?.id || "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        asset={editingAsset}
        onSave={saveAsset}
      />
    </div>
  )
}

function AssetDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-44" />
      <div className="flex gap-4">
        <Skeleton className="size-14" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-80 max-w-full" />
          <Skeleton className="h-4 w-52" />
        </div>
      </div>
      <Card className="p-5">
        <Skeleton className="h-10 w-full" />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton className="h-20 w-full" key={index} />
          ))}
        </div>
      </Card>
    </div>
  )
}

export function AssetDetailPage() {
  const { assets, user } = useApp()
  const { id } = useParams()
  const navigate = useNavigate()
  const asset = assets.find((item) => String(item.id) === String(id))
  const [tab, setTab] = useState("Overview")
  const [loading, setLoading] = useState(true)
  const [maintenance, setMaintenance] = useState([])
  const [movements, setMovements] = useState([])
  const [policies, setPolicies] = useState([])
  const [disposals, setDisposals] = useState([])
  const [historyError, setHistoryError] = useState("")
  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 220)
    return () => window.clearTimeout(timer)
  }, [id])
  useEffect(() => {
    if (!asset) return
    let active = true
    Promise.all([
      uamsService.getMaintenance({ assetId: asset.id }),
      uamsService.getMovements(asset.id),
      uamsService.getInsurance({ assetId: asset.id }),
      uamsService.getDisposals({ assetId: asset.id }),
    ]).then(([maintenanceRecords, movementRecords, policyRecords, disposalRecords]) => {
      if (!active) return
      const date = (value) => value ? new Date(value).toLocaleDateString() : "—"
      setMaintenance(maintenanceRecords.map((entry) => [entry.id, entry.description, date(entry.serviceDate), entry.status, money(entry.expenditure)]))
      setMovements(movementRecords.map((entry) => [entry.fromLocation || entry.fromDepartment?.name || "—", entry.toLocation || entry.toDepartment?.name || "—", date(entry.transferredAt), entry.reason || "—"]))
      setPolicies(policyRecords)
      setDisposals(disposalRecords)
      setHistoryError("")
    }).catch((error) => { if (active) setHistoryError(error.message) })
    return () => { active = false }
  }, [asset?.id])
  const canMaintain = canOperateModule(user, "maintenance")
  const canMove = canOperateModule(user, "movements")
  if (loading) return <AssetDetailSkeleton />
  if (!asset) return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Asset not found in the live register.</p>
      <Button variant="outline" onClick={() => navigate("/assets")}>Back to asset register</Button>
    </div>
  )
  const info = [
    ["Description", asset.description, FileText],
    ["Category", asset.category, Boxes],
    ["Department", asset.department, UserRound],
    ["Current location", asset.location, MapPin],
    ["Custodian", asset.custodian, UserRound],
    ["Acquisition date", asset.date, CalendarDays],
    ["Historical cost", money(asset.cost), CircleDollarSign],
    ["Salvage value", money(asset.salvageValue), CircleDollarSign],
    ["Current NBV", money(asset.netBookValue), CircleDollarSign],
    ["Useful life", `${asset.usefulLife} years`, CalendarDays],
    ["Depreciation", asset.depreciationStatus, History],
    ["Depreciable", asset.isDepreciable ? "Yes" : "No", CircleDollarSign],
    ["Asset type", asset.assetType, Boxes],
    ["Source SRV", asset.srv, FileText],
    ["Stores Issue Voucher", asset.siv, FileText],
    ["Serial number", asset.serial, QrCode],
  ]
  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        className="-ml-2"
        onClick={() => navigate("/assets")}
      >
        <ArrowLeft className="size-4" /> Back to asset register
      </Button>
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex gap-3 sm:gap-4">
          <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Boxes className="size-7" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="break-words text-xl font-semibold tracking-tight sm:text-2xl">
                {asset.name}
              </div>
              <Badge>{asset.status}</Badge>
            </div>
            <div className="mt-1 font-mono text-sm text-muted-foreground">
              {asset.code}
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span>Condition:</span>
              <Badge
                variant={
                  asset.condition === "Poor"
                    ? "danger"
                    : asset.condition === "Fair"
                      ? "warning"
                      : "success"
                }
              >
                {asset.condition}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {can(user, "label.generate") && (
            <Button variant="outline" onClick={() => navigate("/tagging-pain")}>
              <Printer className="size-4" /> Open label workflow
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setTab("Documents")}
          >
            <FileText className="size-4" /> Documents
          </Button>
          {canMove && (
            <Button
              variant="outline"
              onClick={() => navigate("/custody-transfers")}
            >
              <ArrowLeftRight className="size-4" /> Record movement
            </Button>
          )}
          {canMaintain && (
            <Button onClick={() => navigate("/maintenance")}>
              <Wrench className="size-4" /> Record maintenance
            </Button>
          )}
        </div>
      </div>
      {!canManageAssets(user) && !canMaintain && !canMove && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
          This asset profile is available for inspection only. Operational
          updates remain with the responsible department.
        </div>
      )}
      <Card>
        <Tabs
          tabs={[
            "Overview",
            "Maintenance",
            "Movements",
            "Insurance & disposal",
            "Documents",
            "Activity history",
          ]}
          active={tab}
          onChange={setTab}
        />
        <CardContent className="pt-5">
          {tab === "Overview" && (
            <div className="grid gap-6 xl:grid-cols-[1fr_19rem]">
              <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
                {info.map(([label, value, Icon]) => (
                  <div key={label} className="bg-card p-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Icon className="size-3.5" />
                      {label}
                    </div>
                    <div className="mt-2 text-sm font-semibold">{value}</div>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-border p-5">
                <div className="text-sm font-semibold">
                  Asset identification label
                </div>
                <div className="mt-4 rounded-lg border-2 border-dashed border-border p-4 text-center">
                  <div className="text-xs font-bold">FUNAAB UAMS</div>
                  <div className="mx-auto my-3 grid size-28 grid-cols-5 gap-1 rounded bg-white p-2">
                    {Array.from({ length: 25 }).map((_, i) => (
                      <span
                        key={i}
                        className={
                          (i * 7 + asset.id * 3) % 5 > 1
                            ? "bg-slate-900"
                            : "bg-white"
                        }
                      />
                    ))}
                  </div>
                  <div className="font-mono text-[10px] font-semibold">
                    {asset.code}
                  </div>
                  <div className="mt-1 truncate text-[10px] text-muted-foreground">
                    {asset.name}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="size-4 text-success" />{" "}
                  {asset.insurance} · {asset.policy}
                </div>
              </div>
            </div>
          )}
          {tab === "Maintenance" && (
            <>{historyError && <p className="mb-3 text-sm text-destructive">{historyError}</p>}<SimpleHistory rows={maintenance} headers={["Reference", "Activity", "Date", "Status", "Cost"]} /></>
          )}
          {tab === "Movements" && (
            <>{historyError && <p className="mb-3 text-sm text-destructive">{historyError}</p>}<SimpleHistory rows={movements} headers={["From", "To", "Date", "Purpose"]} /></>
          )}
          {tab === "Insurance & disposal" && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-border p-5">
                <div className="flex items-center gap-2 font-semibold">
                  <ShieldCheck className="size-4 text-primary" /> Insurance
                </div>
                <div className="mt-4 space-y-3 text-sm">
                  {policies.length === 0 && <p className="text-muted-foreground">No insurance policy recorded.</p>}
                  {policies.map((policy) => <div key={policy.id} className="rounded-md border border-border p-3"><div className="font-medium">{policy.policyNumber} · {policy.underwriter}</div><div className="text-muted-foreground">{policy.coverageScope} · expires {new Date(policy.expiryDate).toLocaleDateString()}</div></div>)}
                </div>
              </div>
              <div className="rounded-xl border border-border p-5">
                <div className="font-semibold">Disposal record</div>
                <div className="mt-3 text-sm text-muted-foreground">
                  {["UNDER_SURVEY", "WRITTEN_OFF", "DISPOSED"].includes(
                    asset.status,
                  )
                    ? disposals.length ? disposals.map((entry) => `${money(entry.proceeds)} proceeds · ${money(entry.netBookValue)} NBV at disposal · ${new Date(entry.disposedAt).toLocaleDateString()}`).join("; ") : `Lifecycle status: ${asset.status}. No disposal record is available.`
                    : "No disposal record applies to this active asset."}
                </div>
              </div>
            </div>
          )}
          {tab === "Documents" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <p className="text-sm text-muted-foreground">Document storage is not connected to the UAMS API, so no documents are listed here.</p>
            </div>
          )}
          {tab === "Activity history" && (
            <div className="space-y-5">
              {[...movements.map((entry) => `${entry[0]} → ${entry[1]}: ${entry[3]} · ${entry[2]}`), ...maintenance.map((entry) => `${entry[1]} · ${entry[2]} · ${entry[3]}`)].map((item, i) => (
                <div key={`${item}-${i}`} className="flex gap-3">
                  <div className="grid size-8 place-items-center rounded-full bg-primary/10 text-primary">
                    <History className="size-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{item}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Read-only lifecycle event
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  )
}

function SimpleHistory({ rows, headers }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="data-table">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={headers.length} className="text-muted-foreground">No records found.</td></tr>}
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>
                  {j === headers.indexOf("Status") ? (
                    <Badge>{cell}</Badge>
                  ) : (
                    cell
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
