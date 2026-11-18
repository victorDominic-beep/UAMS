import { Link } from "react-router-dom"
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Boxes,
  Building2,
  CheckCircle2,
  FileCheck2,
  Fingerprint,
  History,
  LockKeyhole,
  PackageCheck,
  QrCode,
  ScanLine,
  ShieldCheck,
  Wrench,
} from "lucide-react"
import { useApp } from "../App"

const services = [
  {
    icon: PackageCheck,
    title: "Intake and control",
    description:
      "Record goods received, prepare SRVs and preserve the evidence behind every acquisition.",
  },
  {
    icon: QrCode,
    title: "Identity and custody",
    description:
      "Create PAIN records, print barcode and QR labels, issue through SIVs and track custody.",
  },
  {
    icon: Wrench,
    title: "Lifecycle management",
    description:
      "Follow maintenance, transfers, insurance and asset condition from store to service.",
  },
  {
    icon: BarChart3,
    title: "Financial accountability",
    description:
      "Reconcile invoices, calculate depreciation and retain disposal gain or loss information.",
  },
]

const lifecycle = [
  ["01", "Receive", "Goods intake and SRV"],
  ["02", "Identify", "PAIN, barcode and QR"],
  ["03", "Issue", "SIV and signed receipt"],
  ["04", "Manage", "Custody and maintenance"],
  ["05", "Account", "Depreciation and insurance"],
  ["06", "Dispose", "Survey and authorization"],
]

const roles = [
  "Store Officer",
  "Works Inspection Officer",
  "Departmental Custodian",
  "Bursary Asset Accountant",
  "Board of Survey Member",
  "Internal Auditor",
  "Bursar",
  "Vice-Chancellor",
  "System Administrator",
]

function Brand() {
  return (
    <Link
      to="/"
      className="flex items-center gap-3"
      aria-label="FUNAAB UAMS home"
    >
      <span className="grid size-10 place-items-center rounded-xl bg-primary text-white shadow-sm">
        <PackageCheck className="size-6" />
      </span>
      <span>
        <span className="block text-sm font-bold tracking-wide text-navy dark:text-white">
          FUNAAB UAMS
        </span>
        <span className="block text-[11px] text-muted-foreground">
          University Asset Management System
        </span>
      </span>
    </Link>
  )
}

function PreviewPanel() {
  return (
    <div className="relative mx-auto w-full max-w-xl">
      <div className="absolute -inset-8 rounded-full bg-primary/15 blur-3xl" />
      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/[0.07] p-3 shadow-2xl shadow-black/20 backdrop-blur sm:p-4">
        <div className="rounded-xl border border-white/10 bg-[#10243e] p-4 sm:p-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <div className="text-xs font-semibold text-blue-200">
                ASSET LIFECYCLE
              </div>
              <div className="mt-1 text-sm font-semibold text-white">
                Institutional control overview
              </div>
            </div>
            <span className="rounded-full bg-success/15 px-2.5 py-1 text-[10px] font-semibold text-emerald-300">
              ROLE CONTROLLED
            </span>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {[
              ["Registered assets", "5,282", Boxes],
              ["In service", "4,731", CheckCircle2],
              ["Audit coverage", "100%", ShieldCheck],
            ].map(([label, value, Icon]) => (
              <div
                key={label}
                className="rounded-lg border border-white/10 bg-white/[0.055] p-3"
              >
                <Icon className="size-4 text-blue-300" />
                <div className="mt-4 text-xl font-semibold text-white">
                  {value}
                </div>
                <div className="mt-1 text-[10px] text-blue-100/60">{label}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-white">
                Acquisition progress
              </div>
              <div className="font-mono text-[9px] text-blue-200">
                FUNAAB-COLPHYS-CSC-2026-00001
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1.5">
              {["SRV", "PAIN", "TAG", "STORE", "SIV", "SERVICE"].map(
                (step, index) => (
                  <div className="min-w-0 flex-1" key={step}>
                    <div
                      className={`h-1.5 rounded-full ${
                        index < 5 ? "bg-primary" : "bg-white/15"
                      }`}
                    />
                    <div className="mt-2 truncate text-center text-[8px] font-medium text-blue-100/55">
                      {step}
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3">
              <span className="grid size-9 place-items-center rounded-lg bg-primary/20 text-blue-300">
                <ScanLine className="size-4" />
              </span>
              <div>
                <div className="text-xs font-medium text-white">
                  PAIN identification
                </div>
                <div className="text-[9px] text-blue-100/55">
                  Barcode and QR ready
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3">
              <span className="grid size-9 place-items-center rounded-lg bg-emerald-400/10 text-emerald-300">
                <History className="size-4" />
              </span>
              <div>
                <div className="text-xs font-medium text-white">
                  Complete history
                </div>
                <div className="text-[9px] text-blue-100/55">
                  Every transition retained
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function LandingPage() {
  const { user } = useApp()
  const accessPath = user ? "/dashboard" : "/login"
  const accessLabel = user ? "Open dashboard" : "Sign in to UAMS"

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Brand />
          <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
            <a
              className="transition-colors hover:text-foreground"
              href="#platform"
            >
              Platform
            </a>
            <a
              className="transition-colors hover:text-foreground"
              href="#lifecycle"
            >
              Lifecycle
            </a>
            <a
              className="transition-colors hover:text-foreground"
              href="#governance"
            >
              Governance
            </a>
            <a
              className="transition-colors hover:text-foreground"
              href="#roles"
            >
              Roles
            </a>
          </nav>
          <Link
            to={accessPath}
            className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-primary px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary/90 sm:px-4"
          >
            <LockKeyhole className="size-4" />
            <span className="hidden sm:inline">{accessLabel}</span>
            <span className="sm:hidden">{user ? "Dashboard" : "Sign in"}</span>
          </Link>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-navy text-white">
          <div className="auth-pattern absolute inset-0 opacity-30" />
          <div className="absolute -left-40 top-20 size-96 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute -right-40 bottom-0 size-96 rounded-full bg-success/10 blur-3xl" />
          <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1fr_.95fr] lg:items-center lg:px-8 lg:py-24">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-blue-100">
                <BadgeCheck className="size-4 text-blue-300" />
                FUNAAB institutional asset accountability
              </div>
              <h1 className="mt-6 text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
                Every university asset,
                <span className="block text-blue-300">
                  visible and accountable.
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-blue-100/75 sm:text-lg">
                A unified system for receiving, identifying, issuing,
                maintaining, accounting for and auditing FUNAAB assets through
                their complete lifecycle.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to={accessPath}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-colors hover:bg-blue-500"
                >
                  {accessLabel} <ArrowRight className="size-4" />
                </Link>
                <a
                  href="#platform"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/[0.05] px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Explore the platform
                </a>
              </div>
              <div className="mt-9 grid max-w-lg grid-cols-3 gap-4 border-t border-white/10 pt-6">
                {[
                  ["9", "Controlled roles"],
                  ["8", "Lifecycle states"],
                  ["24", "Defined use cases"],
                ].map(([value, label]) => (
                  <div key={label}>
                    <div className="text-2xl font-semibold text-white">
                      {value}
                    </div>
                    <div className="mt-1 text-[11px] leading-4 text-blue-100/55">
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <PreviewPanel />
          </div>
        </section>

        <section id="platform" className="scroll-mt-24 py-18 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                One institutional platform
              </div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Control the full asset lifecycle
              </h2>
              <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base">
                UAMS connects operational custody, financial accountability and
                independent assurance without blurring role responsibilities.
              </p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {services.map(({ icon: Icon, title, description }) => (
                <article
                  key={title}
                  className="rounded-xl border border-border bg-card p-5 shadow-card"
                >
                  <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="mt-5 font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="lifecycle"
          className="scroll-mt-24 border-y border-border bg-card py-18 sm:py-24"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr] lg:items-end">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  Traceable by design
                </div>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                  From delivery to disposal
                </h2>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  Every handoff has a defined record, responsible role and
                  visible status. No asset enters service before inscription,
                  issue and signed receipt.
                </p>
              </div>
              <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
                {lifecycle.map(([number, title, detail]) => (
                  <div className="bg-background p-5" key={number}>
                    <div className="text-xs font-bold text-primary">
                      {number}
                    </div>
                    <div className="mt-4 font-semibold">{title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {detail}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="governance" className="scroll-mt-24 py-18 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-6 lg:grid-cols-3">
              {[
                {
                  icon: Fingerprint,
                  title: "Separation of duties",
                  text: "Voucher creators cannot approve their own SRV or SIV, and operational permissions remain role-specific.",
                },
                {
                  icon: FileCheck2,
                  title: "Controlled authorization",
                  text: "Write-off requires separate Bursar and Vice-Chancellor approval before disposal can proceed.",
                },
                {
                  icon: ShieldCheck,
                  title: "Independent assurance",
                  text: "Auditors review immutable activity history and record physical checks without changing operational records.",
                },
              ].map(({ icon: Icon, title, text }) => (
                <article
                  key={title}
                  className="rounded-2xl border border-border bg-card p-6 shadow-card"
                >
                  <Icon className="size-6 text-primary" />
                  <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {text}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="roles"
          className="scroll-mt-24 bg-navy py-18 text-white sm:py-24"
        >
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[.75fr_1.25fr] lg:px-8">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
                Purpose-built access
              </div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                The right workspace for every responsibility
              </h2>
              <p className="mt-4 text-sm leading-6 text-blue-100/65">
                Each user sees the records and actions required by their role.
                System administration never automatically grants operational
                authority.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {roles.map((role, index) => (
                <div
                  key={role}
                  className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.05] px-4 py-3"
                >
                  <span className="grid size-7 place-items-center rounded-lg bg-primary/20 text-[10px] font-bold text-blue-200">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-sm font-medium">{role}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-18 sm:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-card p-7 shadow-card sm:p-10">
              <div className="absolute right-0 top-0 size-56 rounded-full bg-primary/10 blur-3xl" />
              <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <Building2 className="size-4" /> Federal University of
                    Agriculture, Abeokuta
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                    Enter the university asset workspace
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                    Authorized staff can sign in to access their role-specific
                    dashboard, records and outstanding work.
                  </p>
                </div>
                <Link
                  to={accessPath}
                  className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary/90"
                >
                  {accessLabel} <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-7 text-xs text-muted-foreground sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <Brand />
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <span>System Design v1.0</span>
            <span>Implementation-ready prototype</span>
            <span>Authorized access only</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
