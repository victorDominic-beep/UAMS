import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  FileText,
  MessageSquare,
  Plus,
  Reply,
  Send,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"
import { useApp } from "../App"
import {
  canCreateSubmission,
  canManageAssets,
  canRespondToSubmission,
  canReviewSubmission,
} from "../permissions"
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
  Textarea,
} from "../components/ui"

function NewSubmission({ open, onOpenChange, onCreate, user }) {
  const [step, setStep] = useState(1)
  const [draft, setDraft] = useState({
    title: "",
    to: "",
    description: "",
    documents: 0,
  })
  const [saving, setSaving] = useState(false)
  const create = (e) => {
    e.preventDefault()
    setSaving(true)
    window.setTimeout(() => {
      const created = onCreate({
        ...draft,
        from: user.department,
      })
      setSaving(false)
      if (!created) {
        toast.error("Your role cannot create departmental submissions")
        return
      }
      toast.success("Submission saved as draft")
      onOpenChange(false)
      setStep(1)
      setDraft({ title: "", to: "", description: "", documents: 0 })
    }, 280)
  }
  const next = () => {
    if (step === 1 && (!draft.title || !draft.to || !draft.description)) {
      toast.error("Complete the required submission details to continue")
      return
    }
    setStep((current) => current + 1)
  }
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create submission"
      description="Send a documented record to another authorized department."
      size="lg"
    >
      <form onSubmit={create} className="space-y-5">
        <div className="grid grid-cols-3 gap-1 sm:gap-2">
          {[
            ["Details", "Submission details"],
            ["Files", "Documents"],
            ["Review", "Review"],
          ].map(([mobileLabel, item], i) => (
            <div
              key={item}
              className={`rounded-lg px-1 py-2 text-center text-[10px] font-medium sm:px-3 sm:text-xs ${
                step === i + 1
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}. <span className="sm:hidden">{mobileLabel}</span>
              <span className="hidden sm:inline">{item}</span>
            </div>
          ))}
        </div>
        {step === 1 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Submission title</Label>
              <Input
                value={draft.title}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                required
                placeholder="Brief descriptive title"
              />
            </div>
            <div>
              <Label>Receiving department</Label>
              <Select
                required
                value={draft.to}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    to: event.target.value,
                  }))
                }
              >
                <option value="" disabled>
                  Select department
                </option>
                <option>Asset Management</option>
                <option>Procurement</option>
                <option>Central Stores</option>
                <option>Bursary</option>
                <option>Works & Services</option>
              </Select>
            </div>
            <div>
              <Label>Reference type</Label>
              <Select>
                <option>General submission</option>
                <option>Procurement record</option>
                <option>Asset receiving record</option>
                <option>Maintenance report</option>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Description</Label>
              <Textarea
                required
                placeholder="Describe the records and purpose of this submission..."
                value={draft.description}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="rounded-xl border-2 border-dashed border-border p-10 text-center">
            <FileText className="mx-auto size-8 text-primary" />
            <div className="mt-3 text-sm font-semibold">
              Attach supporting documents
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              PDF, DOCX, XLSX or image files. Each file becomes part of the
              permanent submission history.
            </div>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => {
                setDraft((current) => ({
                  ...current,
                  documents: current.documents + 1,
                }))
                toast.success("Document added to this draft")
              }}
            >
              {draft.documents
                ? `${draft.documents} document${
                    draft.documents > 1 ? "s" : ""
                  } attached`
                : "Choose documents"}
            </Button>
          </div>
        )}
        {step === 3 && (
          <div className="rounded-xl bg-muted p-5">
            <div className="font-semibold">Ready to create draft</div>
            <div className="mt-1 text-sm leading-relaxed text-muted-foreground">
              The submission will remain editable while in Draft. After
              submission, future changes are preserved as new history entries.
            </div>
          </div>
        )}
        <div className="flex justify-between border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            disabled={step === 1}
            onClick={() => setStep(step - 1)}
          >
            Back
          </Button>
          {step < 3 ? (
            <Button type="button" onClick={next}>
              Continue
            </Button>
          ) : (
            <Button type="submit" disabled={saving}>
              {saving && <Spinner />}
              {saving ? "Saving draft…" : "Save draft"}
            </Button>
          )}
        </div>
      </form>
    </Dialog>
  )
}

export function SubmissionsPage() {
  const { submissions, createSubmission, user } = useApp()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get("search") || "")
  const [status, setStatus] = useState("All")
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(1)
  useEffect(() => {
    setQuery(searchParams.get("search") || "")
    setPage(1)
  }, [searchParams])
  const filtered = useMemo(
    () =>
      submissions.filter(
        (item) =>
          (item.ref + item.title + item.from + item.to)
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          (status === "All" || item.status === status),
      ),
    [submissions, query, status],
  )
  const perPage = 4
  const pages = Math.max(1, Math.ceil(filtered.length / perPage))
  const rows = filtered.slice((page - 1) * perPage, page * perPage)
  const statusCount = (value) =>
    submissions.filter((item) => item.status === value).length
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <div className="text-2xl font-semibold tracking-tight">
            Submission management
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            Create, review and track documented cross-departmental workflows.
          </div>
        </div>
        {canCreateSubmission(user) && (
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" /> New submission
          </Button>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Drafts", statusCount("Draft"), "neutral"],
          ["Under review", statusCount("Under Review"), "info"],
          ["Needs clarification", statusCount("Needs Clarification"), "danger"],
          ["Accepted", statusCount("Accepted"), "success"],
        ].map(([label, value, variant]) => (
          <Card key={label} className="p-5">
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="mt-2 flex items-end justify-between">
              <span className="text-2xl font-semibold">{value}</span>
              <Badge variant={variant}>Current</Badge>
            </div>
          </Card>
        ))}
      </div>
      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row">
          <SearchInput
            className="md:w-96"
            placeholder="Search reference, title or department..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
          />
          <Select
            className="md:w-52"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
          >
            <option>All</option>
            <option>Draft</option>
            <option>Submitted</option>
            <option>Under Review</option>
            <option>Accepted</option>
            <option>Needs Clarification</option>
            <option>Rejected</option>
            <option>Registered</option>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference & submission</th>
                <th>From</th>
                <th>To</th>
                <th>Submitted</th>
                <th>Documents</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr
                  key={item.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/submissions/${item.id}`)}
                >
                  <td>
                    <div className="font-medium text-primary">{item.ref}</div>
                    <div className="mt-1 max-w-sm text-xs text-muted-foreground">
                      {item.title}
                    </div>
                  </td>
                  <td>{item.from}</td>
                  <td>{item.to}</td>
                  <td>{item.date}</td>
                  <td>
                    <span className="inline-flex items-center gap-1.5">
                      <FileText className="size-3.5 text-muted-foreground" />
                      {item.documents}
                    </span>
                  </td>
                  <td>
                    <Badge>{item.status}</Badge>
                  </td>
                  <td>
                    <Button variant="ghost" size="sm">
                      Open
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <div className="py-16 text-center">
              <FileText className="mx-auto size-8 text-muted-foreground" />
              <div className="mt-3 font-semibold">No submissions found</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Try a different search term or status filter.
              </div>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setQuery("")
                  setStatus("All")
                }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
          <span>
            Showing {rows.length} of {filtered.length} submissions
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
            <span className="self-center text-xs">
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
      <NewSubmission
        open={open}
        onOpenChange={setOpen}
        onCreate={createSubmission}
        user={user}
      />
    </div>
  )
}

export function SubmissionDetailPage() {
  const {
    submissions,
    submissionHistories,
    updateSubmissionStatus,
    addSubmissionComment,
    user,
  } = useApp()
  const { id } = useParams()
  const navigate = useNavigate()
  const item = submissions.find((s) => s.id === Number(id)) || submissions[0]
  const [dialog, setDialog] = useState(null)
  const [comment, setComment] = useState("")
  const history = submissionHistories[item.id] || []
  const canReview = canReviewSubmission(user, item)
  const isSender = canRespondToSubmission(user, item)
  const action = (next) => {
    if (dialog === "respond") {
      if (!comment.trim()) {
        toast.error("Enter a clarification response")
        return
      }
      const allowed = addSubmissionComment(item.id, comment)
      if (!allowed) {
        toast.error("This response belongs to the sending department")
        return
      }
    } else {
      if (
        ["Needs Clarification", "Rejected"].includes(next) &&
        !comment.trim()
      ) {
        toast.error("A comment is required for this action")
        return
      }
      const allowed = updateSubmissionStatus(item.id, next, comment)
      if (!allowed) {
        toast.error("This action belongs to the responsible department")
        return
      }
    }
    setDialog(null)
    setComment("")
    toast.success(`Submission status updated to ${next}`)
  }
  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        className="-ml-2"
        onClick={() => navigate("/submissions")}
      >
        <ArrowLeft className="size-4" /> Back to submissions
      </Button>
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <div className="min-w-0 flex flex-wrap items-center gap-2">
            <div className="break-words text-xl font-semibold tracking-tight sm:text-2xl">
              {item.title}
            </div>
            <Badge>{item.status}</Badge>
          </div>
          <div className="mt-1 font-mono text-sm text-muted-foreground">
            {item.ref}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {item.status === "Draft" && isSender && (
            <Button onClick={() => action("Submitted")}>
              <Send className="size-4" /> Submit for review
            </Button>
          )}
          {item.status === "Submitted" && canReview && (
            <Button onClick={() => action("Under Review")}>
              <CheckCircle2 className="size-4" /> Start review
            </Button>
          )}
          {item.status === "Under Review" && canReview && (
            <>
              <Button
                variant="outline"
                onClick={() => setDialog("clarification")}
              >
                <MessageSquare className="size-4" /> Request clarification
              </Button>
              <Button variant="danger" onClick={() => setDialog("reject")}>
                <XCircle className="size-4" /> Reject
              </Button>
              <Button onClick={() => setDialog("accept")}>
                <CheckCircle2 className="size-4" /> Accept
              </Button>
            </>
          )}
          {item.status === "Needs Clarification" && isSender && (
            <Button onClick={() => setDialog("respond")}>
              <Reply className="size-4" /> Respond to clarification
            </Button>
          )}
          {item.status === "Accepted" && canReview && canManageAssets(user) && (
            <Button onClick={() => action("Registered")}>
              <CheckCircle2 className="size-4" /> Mark as registered
            </Button>
          )}
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Submission details</CardTitle>
                <CardDescription>
                  Record information and routing
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
                {[
                  ["Sending department", item.from],
                  ["Receiving department", item.to],
                  ["Submission date", item.date],
                  ["Reviewer", item.reviewer],
                ].map(([k, v]) => (
                  <div key={k} className="bg-card p-4">
                    <div className="text-xs text-muted-foreground">{k}</div>
                    <div className="mt-1.5 text-sm font-semibold">{v}</div>
                  </div>
                ))}
              </div>
              <div className="mt-5">
                <div className="text-sm font-medium">Description</div>
                <div className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Submitted documents</CardTitle>
                <CardDescription>
                  Previous files remain immutable after submission
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                "Purchase Invoice — INV-2448.pdf",
                "Local Purchase Order.pdf",
                "Delivery Schedule.xlsx",
                "Contractor Compliance.pdf",
              ]
                .slice(0, item.documents > 4 ? 4 : item.documents)
                .map((doc, i) => (
                  <div
                    key={doc}
                    className="flex items-center gap-3 rounded-lg border border-border p-3"
                  >
                    <div className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="size-4" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{doc}</div>
                      <div className="text-xs text-muted-foreground">
                        Uploaded {item.date} · {(1.4 + i * 0.7).toFixed(1)} MB
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        toast.success(`${doc} opened in demo mode`)
                      }
                      aria-label={`Open ${doc}`}
                    >
                      <Download className="size-4" />
                    </Button>
                  </div>
                ))}
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Submission history</CardTitle>
              <CardDescription>Permanent chronological record</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {history.map((event, i) => (
                <div key={event.title} className="relative flex gap-3">
                  {i < history.length - 1 && (
                    <span className="absolute left-4 top-8 h-12 w-px bg-border" />
                  )}
                  <div className="relative z-10 grid size-8 shrink-0 place-items-center rounded-full border border-border bg-card">
                    <Clock3 className="size-3.5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{event.title}</div>
                    <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {event.detail}
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {event.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <Dialog
        open={!!dialog}
        onOpenChange={() => setDialog(null)}
        title={
          dialog === "accept"
            ? "Accept submission"
            : dialog === "reject"
              ? "Reject submission"
              : dialog === "respond"
                ? "Respond to clarification"
                : "Request clarification"
        }
        description="This action will be added to the permanent submission history."
      >
        <div className="space-y-4">
          {dialog !== "accept" && (
            <div>
              <Label>
                {dialog === "reject"
                  ? "Reason for rejection"
                  : dialog === "respond"
                    ? "Clarification response"
                    : "Clarification required"}
              </Label>
              <Textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Provide a clear comment for the other department..."
              />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              variant={dialog === "reject" ? "danger" : "default"}
              onClick={() =>
                action(
                  dialog === "accept"
                    ? "Accepted"
                    : dialog === "reject"
                      ? "Rejected"
                      : dialog === "respond"
                        ? "Submitted"
                        : "Needs Clarification",
                )
              }
            >
              Confirm action
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
