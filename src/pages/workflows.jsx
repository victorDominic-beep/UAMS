import { useEffect, useMemo, useState } from "react"
import {
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  FileCheck2,
  Link2,
  LockKeyhole,
  PackageCheck,
  Plus,
  Printer,
  QrCode,
  ShieldCheck,
  Wrench,
} from "lucide-react"
import { toast } from "sonner"
import { useApp } from "../App"
import { uamsService } from "../services/uamsService"
import { can } from "../permissions"
import {
  ACQUISITION_STAGES,
  integrationPlaceholders,
} from "../mocks/systemData"
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
  Select,
  Textarea,
} from "../components/ui"

const money = (value) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value)

function Header({ eyebrow, title, description, action }) {
  return (
    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-primary">
          {eyebrow}
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      {action}
    </div>
  )
}

function AccessNote({ children }) {
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
      <span className="font-semibold text-foreground">
        Permission boundary:
      </span>{" "}
      {children}
    </div>
  )
}

function IntegrationPlaceholders({ items = integrationPlaceholders }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>External integration boundaries</CardTitle>
          <CardDescription>
            Frontend placeholders only — no external system is connected.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Badge variant="neutral" key={item}>
            <Link2 className="mr-1 size-3" /> {item}
          </Badge>
        ))}
      </CardContent>
    </Card>
  )
}

function WorkflowStrip() {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div>
          <CardTitle>Acquisition-to-service lifecycle</CardTitle>
          <CardDescription>
            Required sequence; each transition is retained in asset history.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {ACQUISITION_STAGES.map((stage, index) => (
            <div className="flex shrink-0 items-center gap-2" key={stage}>
              <div className="min-w-32 rounded-lg border border-border bg-muted/40 px-3 py-2">
                <div className="text-[10px] font-bold text-primary">
                  STEP {index + 1}
                </div>
                <div className="mt-0.5 text-xs font-medium">{stage}</div>
              </div>
              {index < ACQUISITION_STAGES.length - 1 && (
                <ArrowRight className="size-4 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function IntakeSrvPage() {
  const { user, refreshAssets } = useApp()
  const [records, setRecords] = useState([])
  const [categories, setCategories] = useState([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)
  const refresh = async () => {
    const [srvs, assetCategories] = await Promise.all([uamsService.getSRVs(), uamsService.getAssetCategories()])
    setCategories(assetCategories)
    setRecords(srvs.map((srv) => ({ ...srv, number: srv.voucherNumber, poNumber: srv.purchaseOrderNumber || "—", vendor: srv.vendorName, invoice: srv.invoiceNumber || "—", dateReceived: String(srv.receivedDate).slice(0, 10), quantity: srv.lineItems.reduce((total, item) => total + item.quantity, 0), unitCost: Number(srv.lineItems[0]?.unitCost || 0), items: srv.lineItems.map((item) => item.description), creatorId: srv.creatorId })))
  }
  useEffect(() => { refresh().catch((error) => toast.error(error.message)).finally(() => setLoading(false)) }, [])
  const createAllowed = can(user, "srv.create")
  const approve = async (record) => {
    if (
      !can(user, "srv.approve") ||
      record.status !== "DRAFT" ||
      record.creatorId === user.id
    )
      return
    if (record.creatorId === user.id) {
      toast.error(
        "Separation of duties: you cannot approve an SRV you created.",
      )
      return
    }
    try {
      await uamsService.approveSRV(record.id)
      await Promise.all([refresh(), refreshAssets()])
      toast.success(`${record.number} approved and locked; assets were registered with PAIN`)
    } catch (error) { toast.error(error.message) }
  }
  return (
    <div className="space-y-6">
      <Header
        eyebrow="Stores receiving"
        title="Intake and SRV"
        description="Record goods received and prepare Stores Receipt Vouchers with purchase order, invoice and line-item evidence."
        action={
          createAllowed && (
            <Button
              onClick={() => {
                setEditing(null)
                setOpen(true)
              }}
            >
              <Plus className="size-4" /> Record goods / create SRV
            </Button>
          )
        }
      />
      <WorkflowStrip />
      {!createAllowed && (
        <AccessNote>
          Only Store Officers can record intake or create and manage SRVs.
        </AccessNote>
      )}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Stores Receipt Vouchers</CardTitle>
            <CardDescription>
              Approved vouchers are locked. Creators cannot approve their own
              voucher.
            </CardDescription>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>SRV number</th>
                <th>PO number</th>
                <th>Vendor / invoice</th>
                <th>Line items</th>
                <th>Received</th>
                <th>Value</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan="8">Loading SRVs…</td></tr>}
              {!loading && records.length === 0 && <tr><td colSpan="8">No SRVs recorded.</td></tr>}
              {records.map((record) => (
                <tr key={record.id}>
                  <td className="font-medium text-primary">{record.number}</td>
                  <td>{record.poNumber}</td>
                  <td>
                    <div className="font-medium">{record.vendor}</div>
                    <div className="text-xs text-muted-foreground">
                      {record.invoice}
                    </div>
                  </td>
                  <td>
                    {record.items.join(", ")}
                    <div className="text-xs text-muted-foreground">
                      Qty {record.quantity} · {money(record.unitCost)} each
                    </div>
                  </td>
                  <td>{record.dateReceived}</td>
                  <td>{money(record.quantity * record.unitCost)}</td>
                  <td>
                    <Badge>{record.status}</Badge>
                  </td>
                  <td>
                    {record.status === "APPROVED" ? (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <LockKeyhole className="size-3" /> Locked
                      </span>
                    ) : record.status !== "DRAFT" ? (
                      <span className="text-xs text-muted-foreground">
                        Awaiting review
                      </span>
                    ) : record.creatorId === user.id ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!can(user, "srv.edit")}
                        onClick={() => {
                          setEditing(record)
                          setOpen(true)
                        }}
                      >
                        Edit draft
                      </Button>
                    ) : (
                      can(user, "srv.approve") && (
                        <Button size="sm" onClick={() => approve(record)}>
                          Approve
                        </Button>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <IntegrationPlaceholders
        items={["Central Store gate registry", "Bursary FMIS"]}
      />
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={
          editing
            ? `Edit ${editing.number}`
            : "Record goods and create draft SRV"
        }
        description="The backend assigns the authoritative SRV number and validates department, category and line-item details."
        size="lg"
      >
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={async (event) => {
            event.preventDefault()
            if (
              (editing &&
                (!can(user, "srv.edit") || editing.creatorId !== user.id)) ||
              (!editing && !can(user, "srv.create"))
            ) {
              toast.error("Your role cannot create or edit this SRV")
              return
            }
            const data = new FormData(event.currentTarget)
            const lineItem = { description: data.get("item"), quantity: Number(data.get("quantity")), unitCost: Number(data.get("cost")), assetCategoryId: data.get("category"), assetType: data.get("assetType"), usefulLifeYears: data.get("usefulLife") ? Number(data.get("usefulLife")) : null, isDepreciable: data.get("isDepreciable") === "on" }
            const payload = { purchaseOrderNumber: data.get("po") || null, vendorName: data.get("vendor"), invoiceNumber: data.get("invoice") || null, receivedDate: data.get("date"), lineItems: [lineItem] }
            try {
              if (editing) await uamsService.updateSRV(editing.id, payload)
              else await uamsService.createSRV({ ...payload, departmentId: user.departmentId })
              await refresh()
              setOpen(false)
              setEditing(null)
              toast.success(editing ? "Draft SRV updated" : "Draft SRV created")
            } catch (error) { toast.error(error.message) }
          }}
        >
          {[
            ["Purchase order number", "po", "text"],
            ["Vendor", "vendor", "text"],
            ["Contractor invoice", "invoice", "text"],
            ["Date received", "date", "date"],
            ["Line item", "item", "text"],
            ["Quantity", "quantity", "number"],
            ["Unit cost", "cost", "number"],
          ].map(([label, name, type]) => (
            <div key={name} className={name === "item" ? "sm:col-span-2" : ""}>
              <Label>{label}</Label>
              <Input
                name={name}
                type={type}
                required
                min={type === "number" ? (name === "cost" ? 0 : 1) : undefined}
                step={name === "cost" ? "0.01" : undefined}
                defaultValue={
                  name === "po"
                    ? editing?.poNumber
                    : name === "vendor"
                      ? editing?.vendor
                      : name === "invoice"
                        ? editing?.invoice
                        : name === "quantity"
                          ? editing?.quantity
                          : name === "cost"
                            ? editing?.unitCost
                            : name === "item"
                              ? editing?.lineItems?.[0]?.description
                              : undefined
                }
              />
            </div>
          ))}
          <div><Label>Asset category</Label><Select name="category" required defaultValue={editing?.lineItems?.[0]?.assetCategoryId || ""}><option value="" disabled>Select category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</Select></div>
          <div><Label>Asset type</Label><Input name="assetType" required defaultValue={editing?.lineItems?.[0]?.assetType || "Movable"} /></div>
          <div><Label>Useful life (years)</Label><Input name="usefulLife" type="number" min="1" max="100" defaultValue={editing?.lineItems?.[0]?.usefulLifeYears || ""} /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isDepreciable" defaultChecked={editing?.lineItems?.[0]?.isDepreciable ?? true} /> Depreciable</label>
          <div className="sm:col-span-2 flex justify-end gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editing ? "Save draft changes" : "Save draft SRV"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}

export function TaggingPainPage() {
  const { assets, user, refreshAssets } = useApp()
  const pending = assets.filter(
    (asset) => asset.status === "PENDING_INSCRIPTION",
  )
  return (
    <div className="space-y-6">
      <Header
        eyebrow="Asset identification"
        title="Tagging and PAIN"
        description="PAIN format: FUNAAB-[COLLEGE/UNIT]-[CATEGORY]-[YEAR]-[5-DIGIT SEQUENCE]. DEMO-prefixed identifiers are not backend-generated."
      />
      <WorkflowStrip />
      {!can(user, "label.generate") && !can(user, "inscription.confirm") && (
        <AccessNote>
          This role can view inscription status but cannot generate labels or
          confirm physical tags.
        </AccessNote>
      )}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Pending inscription confirmation</CardTitle>
            <CardDescription>
              Store Officers print labels; Works Inspection confirms physical
              inscription before an asset enters store.
            </CardDescription>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>PAIN / demo reference</th>
                <th>Asset</th>
                <th>Serial</th>
                <th>Category / unit</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((asset) => (
                <tr key={asset.id}>
                  <td className="font-mono text-xs font-semibold text-primary">
                    {asset.code}
                  </td>
                  <td>{asset.name}</td>
                  <td>{asset.serial}</td>
                  <td>
                    {asset.category}
                    <div className="text-xs text-muted-foreground">
                      {asset.department}
                    </div>
                  </td>
                  <td>
                    <Badge>{asset.status}</Badge>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      {can(user, "label.generate") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            uamsService.generateLabel(asset.id)
                              .then(() => toast.success("Label payload prepared; no physical printer is connected"))
                              .catch((error) => toast.error(error.message))
                          }}
                        >
                          <QrCode className="size-3.5" /> Generate / print
                        </Button>
                      )}
                      {can(user, "inscription.confirm") && (
                        <Button
                          size="sm"
                          onClick={async () => {
                            try {
                              await uamsService.confirmInscription(asset.id, asset.code)
                              await refreshAssets()
                              toast.success("Tag inscription confirmed; asset moved to IN_STORE")
                            } catch (error) { toast.error(error.message) }
                          }}
                        >
                          <CheckCircle2 className="size-3.5" /> Confirm
                          inscription
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <IntegrationPlaceholders items={["Thermal label printer"]} />
    </div>
  )
}

export function DisbursementSivPage() {
  const { assets, user, refreshAssets } = useApp()
  const [records, setRecords] = useState([])
  const [departments, setDepartments] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const refresh = async () => {
    const [sivs, units] = await Promise.all([uamsService.getSIVs(), uamsService.getDepartments()])
    setDepartments(units)
    setRecords(sivs.map((siv) => ({
      ...siv,
      number: siv.voucherNumber,
      assetId: siv.assetId,
      asset: `${siv.asset?.painCode || ""} — ${siv.asset?.name || "Asset"}`,
      targetDepartment: siv.targetDepartment?.name,
      issueDate: String(siv.issueDate || "").slice(0, 10),
      status: siv.receiptConfirmedAt ? "RECEIPT_CONFIRMED" : siv.status === "APPROVED" ? "AWAITING_RECEIPT" : siv.status,
      custodianSignature: siv.receiptSignature || "Pending",
    })))
  }
  useEffect(() => {
    refresh().catch((error) => toast.error(error.message)).finally(() => setLoading(false))
  }, [])
  const blocked = assets.filter(
    (asset) => asset.status === "PENDING_INSCRIPTION",
  )
  const approveOrIssue = async (record) => {
    if (
      !can(user, "siv.approve") ||
      record.status !== "DRAFT" ||
      record.creatorId === user.id
    ) {
      toast.error("Your role cannot approve this SIV")
      return
    }
    const asset = assets.find((item) => item.id === record.assetId)
    if (!asset || asset.status !== "IN_STORE") {
      toast.error(
        `SIV issue blocked: asset status is ${asset?.status || "unavailable"}, not IN_STORE.`,
      )
      return
    }
    try {
      await uamsService.approveSIV(record.id)
      await refresh()
      toast.success(`${record.number} approved; custodian receipt is pending`)
    } catch (error) { toast.error(error.message) }
  }
  const confirm = async (record) => {
    const asset = assets.find((item) => item.id === record.assetId)
    if (
      !can(user, "receipt.confirm") ||
      record.status !== "AWAITING_RECEIPT" ||
      !asset ||
      asset.status !== "IN_STORE" ||
      record.targetDepartment !== user.department
    ) {
      toast.error("Only the assigned custodian can confirm this receipt")
      return
    }
    try {
      await uamsService.confirmReceipt(record.id)
      await Promise.all([refresh(), refreshAssets()])
      toast.success("Receipt recorded and asset moved into service")
    } catch (error) { toast.error(error.message) }
  }
  return (
    <div className="space-y-6">
      <Header
        eyebrow="Stores issue control"
        title="Disbursement and SIV"
        description="Issue inscribed assets with Stores Issue Vouchers and capture the departmental custodian's signed receipt."
        action={
          can(user, "siv.create") && (
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4" /> Create SIV
            </Button>
          )
        }
      />
      {blocked.length > 0 && (
        <AccessNote>
          {blocked.length} asset(s) remain PENDING_INSCRIPTION. SIV issue is
          blocked until Works Inspection confirms the physical tag.
        </AccessNote>
      )}
      {!can(user, "siv.create") &&
        !can(user, "siv.approve") &&
        !can(user, "receipt.confirm") && (
          <AccessNote>
            Read-only SIV access. Issuing and receipt confirmation are limited
            to the authorized store and assigned custodian roles.
          </AccessNote>
        )}
      <Card>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>SIV number</th>
                <th>Asset</th>
                <th>Target department</th>
                <th>Issue date</th>
                <th>Custodian signature</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
            {loading ? <tr><td colSpan="7">Loading SIVs…</td></tr> : records.map((record) => (
                <tr key={record.id}>
                  <td className="font-medium text-primary">{record.number}</td>
                  <td>{record.asset}</td>
                  <td>{record.targetDepartment}</td>
                  <td>{record.issueDate}</td>
                  <td>{record.custodianSignature}</td>
                  <td>
                    <Badge>{record.status}</Badge>
                  </td>
                  <td>
                    {record.status === "DRAFT" &&
                      can(user, "siv.approve") &&
                      (record.creatorId === user.id ? (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <LockKeyhole className="size-3" /> Awaiting another
                          reviewer
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => approveOrIssue(record)}
                        >
                          Approve and issue
                        </Button>
                      ))}
                    {record.status === "AWAITING_RECEIPT" &&
                      can(user, "receipt.confirm") && (
                        <Button size="sm" onClick={() => confirm(record)}>
                          Sign and confirm receipt
                        </Button>
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Create draft Stores Issue Voucher"
        description="Only IN_STORE assets are eligible. A different authorized reviewer must issue the voucher."
      >
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault()
            if (!can(user, "siv.create")) {
              toast.error("Your role cannot create SIVs")
              return
            }
            const data = new FormData(event.currentTarget)
            const asset = assets.find((item) => String(item.id) === String(data.get("assetId")))
            if (!asset || asset.status !== "IN_STORE") {
              toast.error("Only IN_STORE assets can be added to an SIV")
              return
            }
            try {
              await uamsService.createSIV({ assetId: asset.id, targetDepartmentId: data.get("department"), issueDate: data.get("date") })
              await refresh()
              setOpen(false)
              toast.success("Draft SIV created for independent review")
            } catch (error) { toast.error(error.message) }
          }}
        >
          <div>
            <Label>Asset</Label>
            <Select name="assetId" required>
              <option value="">Select an IN_STORE asset</option>
              {assets
                .filter((asset) => asset.status === "IN_STORE")
                .map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.code} — {asset.name}
                  </option>
                ))}
            </Select>
          </div>
          <div>
            <Label>Target department</Label>
            <Select name="department" required defaultValue="">
              <option value="" disabled>Select destination department</option>
              {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
            </Select>
          </div>
          <div>
            <Label>Proposed issue date</Label>
            <Input name="date" type="date" required />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Create draft SIV</Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}

export function CustodyTransfersPage() {
  const { assets, user, refreshAssets } = useApp()
  const [open, setOpen] = useState(false)
  const [transfers, setTransfers] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const refresh = async () => {
    const [result, units] = await Promise.all([uamsService.getAllMovements(), uamsService.getDepartments()])
    setTransfers(result.items)
    setDepartments(units)
  }
  useEffect(() => { refresh().catch((error) => toast.error(error.message)).finally(() => setLoading(false)) }, [])
  const visible =
    can(user, "receipt.confirm")
      ? assets.filter((asset) => asset.department === user.department)
      : assets
  return (
    <div className="space-y-6">
      <Header
        eyebrow="Custody ledger"
        title="Custody and Transfers"
        description="Review current custodians and preserve a complete transfer and receipt history."
        action={
          can(user, "asset.transfer") && (
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4" /> Record transfer
            </Button>
          )
        }
      />
      {!can(user, "asset.transfer") && (
        <AccessNote>
          Read-only custody access. Transfers are restricted to Works
          Inspection Officers.
        </AccessNote>
      )}
      <Card>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>PAIN</th>
                <th>Asset</th>
                <th>Department</th>
                <th>Location</th>
                <th>Custodian</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((asset) => (
                <tr key={asset.id}>
                  <td className="font-mono text-xs text-primary">
                    {asset.code}
                  </td>
                  <td>{asset.name}</td>
                  <td>{asset.department}</td>
                  <td>{asset.location}</td>
                  <td>{asset.custodian}</td>
                  <td>
                    <Badge>{asset.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Custody transfer history</CardTitle>
            <CardDescription>
              Approved transfer records are retained as immutable history.
            </CardDescription>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Origin</th>
                <th>Destination</th>
                <th>Authorized by</th>
                <th>Transferred at</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan="6">Loading transfer history…</td></tr> : transfers.map((transfer) => {
                return (
                  <tr key={transfer.id}>
                    <td>{transfer.asset?.painCode || "Unavailable"}</td>
                    <td>{transfer.fromLocation || transfer.fromDepartment?.name || "—"}</td>
                    <td>{transfer.toLocation || transfer.toDepartment?.name || "—"}</td>
                    <td>{transfer.actor?.fullName || "Unavailable"}</td>
                    <td>{transfer.transferredAt ? new Date(transfer.transferredAt).toLocaleString() : "—"}</td>
                    <td>
                      <Badge>{transfer.status}</Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Record custody transfer"
        description="The approved transfer updates custody and adds an immutable asset-history event."
      >
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault()
            const data = new FormData(event.currentTarget)
            const asset = assets.find((item) => String(item.id) === String(data.get("assetId")))
            const destination = data.get("destination")
            if (!can(user, "asset.transfer") || !asset) {
              toast.error("Your role cannot record this custody transfer")
              return
            }
            try {
              await uamsService.recordMovement(asset.id, { toLocation: destination, toDepartmentId: data.get("department") || undefined, reason: `Custody movement recorded by ${user.name}` })
              await Promise.all([refresh(), refreshAssets()])
              setOpen(false)
              toast.success("Custody transfer recorded")
            } catch (error) { toast.error(error.message) }
          }}
        >
          <div>
            <Label>Asset</Label>
            <Select name="assetId" required>
              <option value="">Select asset</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.code} — {asset.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Destination</Label>
            <Input name="destination" required />
          </div>
          <div>
            <Label>Destination department (optional)</Label>
            <Select name="department" defaultValue="">
              <option value="">Keep current department</option>
              {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Record transfer</Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}

export function MaintenancePage() {
  const { assets, user, refreshAssets } = useApp()
  const [records, setRecords] = useState([])
  const [open, setOpen] = useState(false)
  const [capitalOpen, setCapitalOpen] = useState(false)
  const [capitalRecords, setCapitalRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const refresh = async () => {
    const [items, additions] = await Promise.all([uamsService.getMaintenance(), uamsService.getCapitalAdditions()])
    setRecords(items.map((item) => ({ ...item, asset: `${item.asset?.painCode || ""} — ${item.asset?.name || "Asset"}`, serviceDate: String(item.serviceDate).slice(0, 10), cost: Number(item.expenditure), costType: "OPERATING EXPENDITURE" })))
    setCapitalRecords(additions)
  }
  useEffect(() => { refresh().catch((error) => toast.error(error.message)).finally(() => setLoading(false)) }, [])
  return (
    <div className="space-y-6">
      <Header
        eyebrow="Works inspection"
        title="Maintenance"
        description="Record service date, work performed, replaced parts, cost and accounting treatment."
        action={<div className="flex gap-2">
          {can(user, "capital.flag") && <Button variant="outline" onClick={() => setCapitalOpen(true)}>Flag capital addition</Button>}
          {can(user, "maintenance.create") && (
            <Button onClick={() => setOpen(true)}>
              <Wrench className="size-4" /> Log maintenance
            </Button>
          )}
        </div>}
      />
      <AccessNote>
        Routine maintenance is operating expense and does not change historical
        cost. Only the Bursar can flag a reviewed cost as a capital addition.
      </AccessNote>
      {!can(user, "maintenance.create") && (
        <AccessNote>
          Read-only maintenance history. Only Works Inspection Officers can
          record or close maintenance work.
        </AccessNote>
      )}
      <Card>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Service date</th>
                <th>Description / parts</th>
                <th>Cost</th>
                <th>Cost type</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan="7">Loading maintenance records…</td></tr>}
              {!loading && records.length === 0 && <tr><td colSpan="7">No maintenance records found.</td></tr>}
              {records.map((record) => (
                <tr key={record.id}>
                  <td>{record.asset}</td>
                  <td>{record.serviceDate}</td>
                  <td>
                    {record.description}
                    <div className="text-xs text-muted-foreground">
                      Parts: {record.partsReplaced}
                    </div>
                  </td>
                  <td>{money(record.cost)}</td>
                  <td>
                    <Badge>{record.costType}</Badge>
                  </td>
                  <td>
                    <Badge>{record.status || "COMPLETED"}</Badge>
                  </td>
                  <td>
                    <div className="flex flex-col gap-1">
                      {record.status === "OPEN" &&
                        can(user, "maintenance.create") && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              if (!can(user, "maintenance.create")) return
                              try {
                                await uamsService.completeMaintenance(record.id)
                                await Promise.all([refresh(), refreshAssets()])
                                toast.success("Maintenance closed; asset returned to IN_SERVICE")
                              } catch (error) { toast.error(error.message) }
                            }}
                          >
                            Close maintenance
                          </Button>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card><CardHeader><div><CardTitle>Capital additions</CardTitle><CardDescription>Bursar flags and independent Bursar review are retained in the financial history.</CardDescription></div></CardHeader><div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Asset</th><th>Amount</th><th>Description</th><th>Flagged by</th><th>Status</th><th /></tr></thead><tbody>
        {capitalRecords.map((item) => <tr key={item.id}><td>{item.asset?.painCode || "—"}</td><td>{money(Number(item.amount))}</td><td>{item.description}</td><td>{item.recordedBy?.fullName || "—"}</td><td><Badge>{item.status}</Badge></td><td>{can(user, "capital.flag") && item.status === "PENDING" && item.recordedById !== user.id && <Button size="sm" onClick={async () => { try { await uamsService.approveCapitalAddition(item.id); await Promise.all([refresh(), refreshAssets()]); toast.success("Capital addition approved") } catch (error) { toast.error(error.message) } }}>Approve</Button>}</td></tr>)}
        {capitalRecords.length === 0 && <tr><td colSpan="6">No capital additions flagged.</td></tr>}
      </tbody></table></div></Card>
      <IntegrationPlaceholders items={["Works maintenance system"]} />
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Log maintenance or repair"
        description="Routine servicing remains OpEx. Capital additions require a separate Bursar flag."
      >
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault()
            if (!can(user, "maintenance.create")) {
              toast.error("Your role cannot record maintenance")
              return
            }
            const data = new FormData(event.currentTarget)
            const asset = assets.find((item) => String(item.id) === String(data.get("assetId")))
            if (!asset) return toast.error("Select an asset")
            try {
              await uamsService.createMaintenance({ assetId: asset.id, serviceDate: data.get("date"), description: data.get("description"), partsReplaced: data.get("parts") || null, expenditure: Number(data.get("cost")) })
              await Promise.all([refresh(), refreshAssets()])
              setOpen(false)
              toast.success("Maintenance record logged as operating expenditure")
            } catch (error) { toast.error(error.message) }
          }}
        >
          <div>
            <Label>Associated asset</Label>
            <Select name="assetId" required>
              <option value="">Select asset</option>
              {assets
                .filter((asset) => asset.status === "IN_SERVICE")
                .map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.code} — {asset.name}
                  </option>
                ))}
            </Select>
          </div>
          <div>
            <Label>Service date</Label>
            <Input name="date" type="date" required />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea name="description" required />
          </div>
          <div>
            <Label>Parts replaced</Label>
            <Input name="parts" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Cost</Label>
              <Input name="cost" type="number" min="0" required />
            </div>
            <div><Label>Cost type</Label><div className="mt-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">Routine maintenance · Operating expenditure</div></div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save maintenance record</Button>
          </div>
        </form>
      </Dialog>
      <Dialog open={capitalOpen} onOpenChange={setCapitalOpen} title="Flag a capital addition" description="Routine servicing remains OpEx. Only qualifying non-routine capital work belongs here."><form className="space-y-4" onSubmit={async (event) => { event.preventDefault(); const data = new FormData(event.currentTarget); try { await uamsService.createCapitalAddition({ assetId: data.get("assetId"), amount: Number(data.get("amount")), description: data.get("description") }); await refresh(); setCapitalOpen(false); toast.success("Capital addition submitted for independent Bursar review") } catch (error) { toast.error(error.message) } }}><div><Label>Asset</Label><Select name="assetId" required defaultValue=""><option value="" disabled>Select asset</option>{assets.filter((asset) => asset.status === "IN_SERVICE").map((asset) => <option key={asset.id} value={asset.id}>{asset.code} — {asset.name}</option>)}</Select></div><div><Label>Amount</Label><Input name="amount" type="number" min="0.01" step="0.01" required /></div><div><Label>Description</Label><Textarea name="description" required /></div><Button type="submit">Flag capital addition</Button></form></Dialog>
    </div>
  )
}

export function InsurancePage() {
  const { assets, user } = useApp()
  const [records, setRecords] = useState([])
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState("")
  const [loading, setLoading] = useState(true)
  const refresh = async () => {
    const items = await uamsService.getInsurance(filter ? { status: filter } : {})
    setRecords(items.map((policy) => ({ ...policy, coverage: policy.coverageScope, asset: `${policy.asset?.painCode || ""} — ${policy.asset?.name || "Asset"}`, expiry: String(policy.expiryDate).slice(0, 10) })))
  }
  useEffect(() => { refresh().catch((error) => toast.error(error.message)).finally(() => setLoading(false)) }, [filter])
  return (
    <div className="space-y-6">
      <Header
        eyebrow="Coverage register"
        title="Insurance"
        description="Track policy number, underwriter, coverage scope, renewal expiry and associated assets. No insurance approval workflow is implied."
        action={
          can(user, "insurance.track") && (
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4" /> Add policy record
            </Button>
          )
        }
      />
      {!can(user, "insurance.track") && (
        <AccessNote>Read-only insurance coverage and renewal information.</AccessNote>
      )}
      <Card>
        <div className="flex justify-end border-b border-border p-3">
          <Select aria-label="Insurance renewal filter" value={filter} onChange={(event) => setFilter(event.target.value)} className="max-w-56">
            <option value="">All policies</option><option value="active">Active</option><option value="upcoming">Renewal due within 30 days</option><option value="expired">Expired</option>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Policy number</th>
                <th>Underwriter</th>
                <th>Coverage scope</th>
                <th>Associated asset</th>
                <th>Renewal expiry</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan="5">Loading policies…</td></tr>}
              {!loading && records.length === 0 && <tr><td colSpan="5">No policies match this filter.</td></tr>}
              {records.map((policy) => (
                <tr key={policy.id}>
                  <td className="font-medium text-primary">
                    {policy.policyNumber}
                  </td>
                  <td>{policy.underwriter}</td>
                  <td>{policy.coverage}</td>
                  <td>{policy.asset}</td>
                  <td>{policy.expiry}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Add insurance policy record"
        description="This records coverage only; UAMS does not define an insurance approval workflow."
      >
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault()
            if (!can(user, "insurance.track")) {
              toast.error("Your role cannot maintain insurance records")
              return
            }
            const data = new FormData(event.currentTarget)
            try {
              await uamsService.createInsurance({ policyNumber: data.get("policyNumber"), assetId: data.get("assetId"), underwriter: data.get("underwriter"), coverageScope: data.get("coverage"), coverageAmount: Number(data.get("coverageAmount")), effectiveDate: data.get("effectiveDate"), expiryDate: data.get("expiry") })
              await refresh()
              setOpen(false)
              toast.success("Insurance policy record added")
            } catch (error) { toast.error(error.message) }
          }}
        >
          <div>
            <Label>Policy number</Label>
            <Input name="policyNumber" required />
          </div>
          <div>
            <Label>Underwriter</Label>
            <Input name="underwriter" required />
          </div>
          <div>
            <Label>Associated asset</Label>
            <Select name="assetId" required defaultValue=""><option value="" disabled>Select asset</option>{assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.code} — {asset.name}</option>)}</Select>
          </div>
          <div>
            <Label>Coverage scope</Label>
            <Textarea name="coverage" required />
          </div>
          <div><Label>Coverage amount</Label><Input name="coverageAmount" type="number" min="0.01" step="0.01" required /></div>
          <div><Label>Effective date</Label><Input name="effectiveDate" type="date" required /></div>
          <div>
            <Label>Renewal expiry</Label>
            <Input name="expiry" type="date" required />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Add policy record</Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}

export function DepreciationPage() {
  const { assets, user, refreshAssets } = useApp()
  const [batches, setBatches] = useState([])
  const [configureOpen, setConfigureOpen] = useState(false)
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7))
  const [loading, setLoading] = useState(true)
  const refreshBatches = async () => {
    const result = await uamsService.getDepreciationBatches()
    setBatches(result.map((batch) => ({ reference: `${batch.fiscalYear}-${batch.periodLabel}`, period: batch.periodLabel, assets: batch._count?._all || 0, amount: Number(batch._sum?.depreciationAmount || 0), status: "POSTED" })))
  }
  useEffect(() => { refreshBatches().catch((error) => toast.error(error.message)).finally(() => setLoading(false)) }, [])
  const rows = useMemo(
    () => assets.map((asset) => {
      const usefulLife = asset.usefulLife || 0
      const formulaAnnual = asset.isDepreciable && usefulLife > 0 ? Math.max(0, (asset.cost - asset.salvageValue) / usefulLife) : 0
      const annual = Math.min(formulaAnnual, Math.max(0, asset.netBookValue - asset.salvageValue))
      return { ...asset, usefulLife, annual, monthly: annual / 12 }
    }),
    [assets],
  )
  return (
    <div className="space-y-6">
      <Header
        eyebrow="Bursary asset accounting"
        title="Depreciation"
        description="Straight-line depreciation: (historical cost − salvage value) ÷ useful life; monthly depreciation is annual depreciation ÷ 12."
        action={
          <div className="flex flex-wrap gap-2">
            {can(user, "depreciation.configure") && (
              <Button variant="outline" onClick={() => setConfigureOpen(true)}>
                Configure rules
              </Button>
            )}
            {can(user, "depreciation.run") && (
              <div className="flex items-center gap-2">
              <Input aria-label="Depreciation period" type="month" value={period} onChange={(event) => setPeriod(event.target.value)} />
              <Button onClick={async () => {
                try {
                  const result = await uamsService.runDepreciation(period)
                  await Promise.all([refreshBatches(), refreshAssets()])
                  toast.success(`${result.processed} depreciation posting(s) committed; ${result.skipped.length} skipped`)
                } catch (error) { toast.error(error.message) }
              }}>
                <FileCheck2 className="size-4" /> Run depreciation batch
              </Button>
              </div>
            )}
          </div>
        }
      />
      {!can(user, "depreciation.configure") && !can(user, "depreciation.run") && (
        <AccessNote>
          Read-only depreciation records. Configuration and batch execution are
          limited to the Bursary Asset Accountant.
        </AccessNote>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Configuration rules</CardTitle>
              <CardDescription>
                Per-asset settings from the register
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="flex items-center justify-between rounded-lg border border-border p-3 text-sm"
              >
                <span className="font-medium">{asset.code}</span>
                <span className="text-muted-foreground">
                  {asset.usefulLife || "—"} years · {money(asset.salvageValue)} salvage
                </span>
              </div>
            ))}
            {assets.length === 0 && <div className="text-sm text-muted-foreground">No asset settings available.</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Batch history</CardTitle>
              <CardDescription>Posted monthly ledger totals</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && <div className="text-sm text-muted-foreground">Loading batch history…</div>}
            {!loading && batches.length === 0 && <div className="text-sm text-muted-foreground">No depreciation batches posted.</div>}
            {batches.map((batch) => (
              <div
                key={batch.reference}
                className="flex items-center justify-between rounded-lg border border-border p-3 text-sm"
              >
                <div>
                  <div className="font-medium">{batch.reference}</div>
                  <div className="text-xs text-muted-foreground">
                    {batch.period} · {batch.assets} assets
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{money(batch.amount)}</div>
                  <Badge>{batch.status}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>PAIN</th>
                <th>Historical cost</th>
                <th>Salvage value</th>
                <th>Useful life</th>
                <th>Annual / monthly</th>
                <th>Current NBV</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((asset) => (
                <tr key={asset.id}>
                  <td className="font-mono text-xs text-primary">
                    {asset.code}
                  </td>
                  <td>{money(asset.cost)}</td>
                  <td>{money(asset.salvageValue)}</td>
                  <td>{asset.usefulLife} years</td>
                  <td>
                    {money(asset.annual)}
                    <div className="text-xs text-muted-foreground">
                      {money(asset.monthly)} monthly
                    </div>
                  </td>
                  <td>{money(asset.netBookValue)}</td>
                  <td><Badge>{asset.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <IntegrationPlaceholders items={["Bursary FMIS"]} />
      <Dialog
        open={configureOpen}
        onOpenChange={setConfigureOpen}
        title="Configure depreciation rule"
        description="Configure useful life and salvage value for one asset."
      >
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault()
            if (!can(user, "depreciation.configure")) {
              toast.error("Your role cannot configure depreciation")
              return
            }
            const data = new FormData(event.currentTarget)
            try {
              await uamsService.configureDepreciation(data.get("assetId"), { usefulLifeYears: Number(data.get("usefulLife")), salvageValue: Number(data.get("salvageValue")), isDepreciable: data.get("isDepreciable") === "on" })
              await refreshAssets()
              setConfigureOpen(false)
              toast.success("Depreciation settings saved")
            } catch (error) { toast.error(error.message) }
          }}
        >
          <div>
            <Label>Asset</Label>
            <Select name="assetId" required defaultValue=""><option value="" disabled>Select asset</option>{assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.code} — {asset.name}</option>)}</Select>
          </div>
          <div>
            <Label>Useful life in years</Label>
            <Input name="usefulLife" type="number" min="1" required />
          </div>
          <div>
            <Label>Salvage value</Label>
            <Input name="salvageValue" type="number" min="0" step="0.01" required />
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isDepreciable" defaultChecked /> Depreciable asset</label>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfigureOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save rule</Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}

export function InvoiceReconciliationPage() {
  return (
    <div className="space-y-6">
      <Header
        eyebrow="Acquisition accounting"
        title="Invoice Reconciliation"
        description="Bursary FMIS reconciliation is not connected to this system."
      />
      <Card>
        <div className="p-6 text-sm text-muted-foreground">
          Invoice data and reconciliation actions are unavailable until an
          approved Bursary FMIS integration is configured. No invoice records
          have been imported or reconciled here.
        </div>
      </Card>
      <IntegrationPlaceholders items={["Bursary FMIS"]} />
    </div>
  )
}

export function SurveyDisposalPage() {
  const { assets, user, refreshAssets } = useApp()
  const [rows, setRows] = useState([])
  const [assessment, setAssessment] = useState(null)
  const [openSurvey, setOpenSurvey] = useState(false)
  const [openReport, setOpenReport] = useState(false)
  const [proceedsRow, setProceedsRow] = useState(null)
  const [loading, setLoading] = useState(true)
  const refresh = async () => {
    const docketList = await uamsService.getSurveyDockets()
    const dockets = await Promise.all(docketList.map((docket) => uamsService.getSurveyDocket(docket.id)))
    const flattened = dockets.flatMap((docket) => docket.items.map((item) => {
      const auth = item.writeOffAuthorization || {}
      return {
        id: item.id,
        docketId: docket.id,
        reference: docket.docketNumber,
        assetId: item.assetId,
        asset: `${item.asset?.painCode || ""} — ${item.asset?.name || "Asset"}`,
        condition: item.conditionNotes || "Assessment pending",
        rating: item.rating || "PENDING",
        reserveValue: Number(item.reserveValue || 0),
        bursarApproval: auth.bursarDecision || "PENDING",
        vcApproval: auth.vcDecision || "PENDING",
        status: item.asset?.status || auth.status || "UNDER_SURVEY",
        netBookValue: Number(item.asset?.currentNetBookValue || 0),
      }
    }))
    setRows(flattened)
  }
  useEffect(() => { refresh().catch((error) => toast.error(error.message)).finally(() => setLoading(false)) }, [])

  const reportUnserviceable = async (event) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    try {
      await uamsService.reportUnserviceable(data.get("assetId"), data.get("reason"))
      await refreshAssets()
      setOpenReport(false)
      toast.success("Unserviceable report recorded")
    } catch (error) { toast.error(error.message) }
  }

  const createDocketAndAddAsset = async (event) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    try {
      const docket = await uamsService.createSurveyDocket()
      await uamsService.addSurveyItem(docket.id, data.get("assetId"))
      await Promise.all([refresh(), refreshAssets()])
      setOpenSurvey(false)
      toast.success(`${docket.docketNumber} created and asset added`)
    } catch (error) { toast.error(error.message) }
  }

  const saveAssessment = async (event) => {
    event.preventDefault()
    if (!assessment) return
    const data = new FormData(event.currentTarget)
    try {
      await uamsService.assessSurveyItem(assessment.id, { rating: data.get("rating"), conditionNotes: data.get("condition"), reserveValue: Number(data.get("reserveValue")) })
      await refresh()
      setAssessment(null)
      toast.success("Survey assessment saved")
    } catch (error) { toast.error(error.message) }
  }

  const decide = async (row, role, decision) => {
    try {
      await uamsService.decideWriteOff(row.id, role, decision)
      await Promise.all([refresh(), refreshAssets()])
      toast.success(`${role === "bursar" ? "Bursar" : "Vice-Chancellor"} decision recorded`)
    } catch (error) { toast.error(error.message) }
  }

  const recordDisposal = async (event) => {
    event.preventDefault()
    if (!proceedsRow) return
    const data = new FormData(event.currentTarget)
    try {
      await uamsService.createDisposal({ assetId: proceedsRow.assetId, proceeds: Number(data.get("proceeds")), auctionReference: data.get("reference") || null, disposedAt: data.get("date") })
      await Promise.all([refresh(), refreshAssets()])
      setProceedsRow(null)
      toast.success("Disposal posted; asset is now DISPOSED")
    } catch (error) { toast.error(error.message) }
  }

  const unserviceable = assets.filter((asset) => asset.status === "IN_SERVICE" && asset.departmentId === user?.departmentId)
  const surveyEligible = assets.filter((asset) => asset.status === "UNSERVICEABLE")
  return (
    <div className="space-y-6">
      <Header eyebrow="End-of-life control" title="Survey and Disposal" description="Record survey assessments, separate write-off decisions, and disposal proceeds against the asset register." action={<div className="flex gap-2">{can(user, "unserviceable.report") && <Button variant="outline" onClick={() => setOpenReport(true)}><Plus className="size-4" /> Report unserviceable</Button>}{can(user, "survey.compile") && <Button onClick={() => setOpenSurvey(true)}><Plus className="size-4" /> Create survey docket</Button>}</div>} />
      <AccessNote>Assets move from UNSERVICEABLE to UNDER_SURVEY when added to a docket. Only distinct Bursar and Vice-Chancellor approvals can move an asset to WRITTEN_OFF.</AccessNote>
      <Card><div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Docket / asset</th><th>Condition</th><th>Reserve</th><th>Bursar</th><th>Vice-Chancellor</th><th>NBV</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        {loading && <tr><td colSpan="8">Loading survey records…</td></tr>}
        {!loading && rows.length === 0 && <tr><td colSpan="8">No survey items recorded.</td></tr>}
        {rows.map((row) => <tr key={row.id}><td><div className="font-medium text-primary">{row.reference}</div><div className="text-xs text-muted-foreground">{row.asset}</div></td><td>{row.condition}<div className="text-xs">{row.rating}</div></td><td>{money(row.reserveValue)}</td><td><Badge>{row.bursarApproval}</Badge></td><td><Badge>{row.vcApproval}</Badge></td><td>{money(row.netBookValue)}</td><td><Badge>{row.status}</Badge></td><td><div className="flex flex-col gap-1">
          {can(user, "survey.rate") && row.status === "UNDER_SURVEY" && <Button size="sm" variant="outline" onClick={() => setAssessment(row)}>Assess</Button>}
          {can(user, "writeoff.bursar") && row.bursarApproval === "PENDING" && row.status === "UNDER_SURVEY" && <Button size="sm" onClick={() => decide(row, "bursar", "APPROVED")}>Bursar approve</Button>}
          {can(user, "writeoff.vc") && row.vcApproval === "PENDING" && row.status === "UNDER_SURVEY" && <Button size="sm" onClick={() => decide(row, "vice-chancellor", "APPROVED")}>VC approve</Button>}
          {can(user, "auction.proceeds") && row.status === "WRITTEN_OFF" && <Button size="sm" variant="outline" onClick={() => setProceedsRow(row)}>Record disposal</Button>}
        </div></td></tr>)}
      </tbody></table></div></Card>
      <Dialog open={openReport} onOpenChange={setOpenReport} title="Report an asset as unserviceable" description="Only assets assigned to your department and currently in service are eligible."><form className="space-y-4" onSubmit={reportUnserviceable}><div><Label>Assigned asset</Label><Select name="assetId" required defaultValue=""><option value="" disabled>Select asset</option>{unserviceable.map((asset) => <option key={asset.id} value={asset.id}>{asset.code} — {asset.name}</option>)}</Select></div><div><Label>Reason</Label><Textarea name="reason" required /></div><Button type="submit">Submit report</Button></form></Dialog>
      <Dialog open={openSurvey} onOpenChange={setOpenSurvey} title="Create survey docket" description="Choose an asset already reported unserviceable."><form className="space-y-4" onSubmit={createDocketAndAddAsset}><div><Label>Unserviceable asset</Label><Select name="assetId" required defaultValue=""><option value="" disabled>Select asset</option>{surveyEligible.map((asset) => <option key={asset.id} value={asset.id}>{asset.code} — {asset.name}</option>)}</Select></div><Button type="submit">Create docket and add asset</Button></form></Dialog>
      <Dialog open={Boolean(assessment)} onOpenChange={() => setAssessment(null)} title={`Assess ${assessment?.reference || "survey item"}`} description="Store the Board of Survey findings and reserve value."><form className="space-y-4" onSubmit={saveAssessment}><div><Label>Condition findings</Label><Textarea name="condition" required defaultValue={assessment?.condition === "Assessment pending" ? "" : assessment?.condition} /></div><div><Label>Rating</Label><Select name="rating" defaultValue={assessment?.rating === "PENDING" ? "FAIR" : assessment?.rating}><option>EXCELLENT</option><option>GOOD</option><option>FAIR</option><option>POOR</option><option>BEYOND_REPAIR</option></Select></div><div><Label>Reserve value</Label><Input name="reserveValue" type="number" min="0" step="0.01" required defaultValue={assessment?.reserveValue || 0} /></div><Button type="submit">Save assessment</Button></form></Dialog>
      <Dialog open={Boolean(proceedsRow)} onOpenChange={() => setProceedsRow(null)} title="Record disposal proceeds" description={`NBV at disposal: ${money(proceedsRow?.netBookValue || 0)}. Gain/loss is calculated by the backend.`}><form className="space-y-4" onSubmit={recordDisposal}><div><Label>Auction reference (optional)</Label><Input name="reference" /></div><div><Label>Proceeds</Label><Input name="proceeds" type="number" min="0" step="0.01" required /></div><div><Label>Disposal date</Label><Input name="date" type="date" required /></div><Button type="submit">Post disposal</Button></form></Dialog>
    </div>
  )
}

export function PhysicalVerificationPage() {
  const { assets, user } = useApp()
  const [records, setRecords] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const refresh = async () => {
    const items = await uamsService.getVerifications()
    setRecords(items.map((item) => ({ ...item, reference: item.id, asset: item.asset?.painCode || "—", location: item.observedLocation || "—", date: String(item.verifiedAt).slice(0, 10) })))
  }
  useEffect(() => { refresh().catch((error) => toast.error(error.message)).finally(() => setLoading(false)) }, [])
  return (
    <div className="space-y-6">
      <Header
        eyebrow="Independent assurance"
        title="Physical Verification"
        description="Internal Auditors record physical checks without modifying operational asset records."
        action={
          can(user, "verification.record") && (
            <Button onClick={() => setOpen(true)}>
              <ClipboardCheck className="size-4" /> Record check
            </Button>
          )
        }
      />
      {!can(user, "verification.record") && (
        <AccessNote>
          Read-only verification results. Only Internal Auditors can record
          independent checks.
        </AccessNote>
      )}
      <Card>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>PAIN</th>
                <th>Observed location</th>
                <th>Outcome</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan="5">Loading verification records…</td></tr>}
              {!loading && records.length === 0 && <tr><td colSpan="5">No physical verification records.</td></tr>}
              {records.map((record) => (
                <tr key={record.reference}>
                  <td className="font-medium text-primary">
                    {record.reference}
                  </td>
                  <td>{record.asset}</td>
                  <td>{record.location}</td>
                  <td>
                    <Badge>{record.outcome}</Badge>
                  </td>
                  <td>{record.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Record physical verification"
        description="The result is an independent verification record and does not modify the operational asset."
      >
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault()
            if (!can(user, "verification.record")) {
              toast.error("Your role cannot record verification checks")
              return
            }
            const data = new FormData(event.currentTarget)
            const asset = assets.find((item) => String(item.id) === String(data.get("assetId")))
            if (!asset) return toast.error("Select an asset")
            try {
              await uamsService.createVerification({ assetId: asset.id, observedLocation: data.get("location"), outcome: data.get("outcome"), verifiedAt: data.get("date") })
              await refresh()
              setOpen(false)
              toast.success("Physical verification outcome recorded")
            } catch (error) { toast.error(error.message) }
          }}
        >
          <div>
            <Label>Asset</Label>
            <Select name="assetId" required>
              <option value="">Select asset</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.code} — {asset.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Observed location</Label>
            <Input name="location" required />
          </div>
          <div>
            <Label>Outcome</Label>
            <Select name="outcome">
              <option>VERIFIED</option>
              <option>LOCATION_VARIANCE</option>
              <option>MISSING</option>
              <option>DAMAGE_REPORTED</option>
              <option>OTHER</option>
            </Select>
          </div>
          <div>
            <Label>Verification date</Label>
            <Input name="date" type="date" required />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Record outcome</Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}

export function AuditTrailPage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  useEffect(() => {
    uamsService.getAuditEvents()
      .then(setEvents)
      .catch((reason) => setError(reason.message))
      .finally(() => setLoading(false))
  }, [])
  return (
    <div className="space-y-6">
      <Header
        eyebrow="Immutable activity history"
        title="Audit Trail"
        description="Read-only events include timestamp, user, IP where available, action type, entity and recorded changes."
      />
      <AccessNote>
        Audit records are immutable in the frontend. There are no edit or delete
        actions.
      </AccessNote>
      <Card>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User / IP</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Recorded changes</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan="5">Loading audit events…</td></tr>}
              {!loading && error && <tr><td colSpan="5" className="text-destructive">{error}</td></tr>}
              {!loading && !error && events.length === 0 && <tr><td colSpan="5">No audit events recorded.</td></tr>}
              {events.map((event) => (
                <tr key={event.id}>
                  <td>{new Date(event.timestamp).toLocaleString()}</td>
                  <td>
                    {event.user?.fullName || "System"}
                    <div className="font-mono text-xs text-muted-foreground">{event.ipAddress || "Unavailable"}</div>
                  </td>
                  <td><Badge>{event.actionType}</Badge></td>
                  <td>{event.entityName}<div className="text-xs text-muted-foreground">{event.entityId}</div></td>
                  <td className="max-w-md truncate">{JSON.stringify(event.delta ?? {})}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
