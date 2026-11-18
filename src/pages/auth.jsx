import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  PackageCheck,
  ShieldCheck,
} from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { useApp } from "../App"
import { Button, Input, Label, Spinner } from "../components/ui"
import { toast } from "sonner"
import { easeOut } from "../components/motion"
import { uamsService } from "../services/uamsService"

function AuthShell({ children, heading, description }) {
  const reduceMotion = useReducedMotion()
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#071b3e] text-white lg:grid lg:grid-cols-[minmax(390px,.94fr)_minmax(480px,1.06fr)]">
      <section className="auth-form-panel relative z-10 flex min-h-screen flex-col px-6 py-7 sm:px-10 lg:px-12 xl:px-[clamp(4rem,8vw,8rem)]" style={{ "--foreground": "#f8fafc", "--muted-foreground": "#b5c9e9", "--border": "#31558a", "--input": "#31558a" }}>
        <div className="absolute inset-0 pointer-events-none lg:hidden">
          <div className="absolute -right-24 -top-28 size-72 rounded-full bg-blue-700/15 blur-3xl" />
        </div>
        <Link to="/" className="relative z-10 inline-flex w-fit items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
          <span className="grid size-10 place-items-center rounded-xl border border-white/10 bg-white/[0.07] text-blue-300">
            <PackageCheck className="size-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold tracking-wide">FUNAAB UAMS</span>
            <span className="block text-[10px] text-slate-400">University Asset Management System</span>
          </span>
        </Link>

        <motion.div
          className="relative mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10 lg:py-12"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, ease: easeOut }}
        >
          <div className="mb-8">
            <div className="text-[11px] font-semibold uppercase tracking-[.18em] text-blue-400">Secure institutional access</div>
            <h1 className="mt-3 text-[2rem] font-semibold leading-tight tracking-tight text-white sm:text-[2.15rem]">{heading}</h1>
            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">{description}</p>
          </div>
          {children}
        </motion.div>

        <div className="relative flex items-center justify-between gap-4 text-[11px] text-slate-500">
          <span>Federal University of Agriculture, Abeokuta</span>
          <span className="hidden items-center gap-1.5 sm:inline-flex"><ShieldCheck className="size-3.5 text-emerald-400" /> Authorized access</span>
        </div>
      </section>

      <aside className="pointer-events-none absolute inset-0 z-0 min-h-screen p-0 lg:pointer-events-auto lg:relative lg:col-start-2 lg:flex lg:p-6">
        <motion.div
          className="auth-blue-panel relative isolate flex min-h-screen flex-1 flex-col overflow-hidden lg:min-h-[calc(100vh-3rem)] lg:rounded-[28px] lg:border lg:border-blue-200/25"
          initial={reduceMotion ? false : { opacity: 0, scale: .985 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: .55, ease: easeOut }}
        >
          <div className="auth-blue-dots absolute inset-0 -z-10 opacity-45" />
          <div className="absolute -left-28 top-12 -z-10 size-96 rounded-full bg-cyan-300/15 blur-[90px]" />
          <div className="absolute -right-20 top-1/3 -z-10 size-80 rounded-full bg-sky-200/15 blur-[100px]" />
          <div className="absolute bottom-0 left-1/4 -z-10 size-80 rounded-full bg-indigo-950/40 blur-[90px]" />

          <div className="relative flex flex-1 items-center justify-center overflow-hidden" aria-hidden="true">
            <motion.svg
              viewBox="0 0 800 700"
              className="absolute h-[92%] w-[112%] max-w-none"
              fill="none"
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: .7, delay: .12, ease: easeOut }}
            >
              <defs>
                <linearGradient id="uams-ribbon" x1="110" y1="120" x2="690" y2="565" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#81F5FF" />
                  <stop offset=".2" stopColor="#F9A8FF" />
                  <stop offset=".38" stopColor="#625BFF" />
                  <stop offset=".6" stopColor="#12D9F2" />
                  <stop offset=".78" stopColor="#FF83D1" />
                  <stop offset="1" stopColor="#F4F8FF" />
                </linearGradient>
                <linearGradient id="uams-ribbon-shade" x1="200" y1="90" x2="600" y2="580" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#1529C8" />
                  <stop offset=".42" stopColor="#416BFF" />
                  <stop offset=".72" stopColor="#111D96" />
                  <stop offset="1" stopColor="#32E6F1" />
                </linearGradient>
                <filter id="uams-glow" x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="sRGB">
                  <feGaussianBlur stdDeviation="14" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <path d="M-90 275C37 281 99 203 136 119C164 56 221 45 255 92C297 151 264 216 222 275C174 341 181 385 236 408" stroke="#071B9F" strokeOpacity=".48" strokeWidth="94" strokeLinecap="round" />
              <path d="M-90 275C37 281 99 203 136 119C164 56 221 45 255 92C297 151 264 216 222 275C174 341 181 385 236 408" stroke="url(#uams-ribbon)" strokeWidth="70" strokeLinecap="round" filter="url(#uams-glow)" />
              <path d="M-90 253C37 259 96 184 132 105C156 52 202 49 228 91" stroke="#FFFFFF" strokeOpacity=".8" strokeWidth="5" strokeLinecap="round" />
              <path d="M277 371C317 227 453 120 585 137C703 153 769 245 739 337C715 409 643 451 566 426C491 402 486 329 535 286C579 248 645 251 706 291" stroke="#091AAB" strokeOpacity=".5" strokeWidth="112" strokeLinecap="round" />
              <path d="M277 371C317 227 453 120 585 137C703 153 769 245 739 337C715 409 643 451 566 426C491 402 486 329 535 286C579 248 645 251 706 291" stroke="url(#uams-ribbon-shade)" strokeWidth="86" strokeLinecap="round" />
              <path d="M304 335C349 225 459 157 565 163C644 167 694 212 703 268" stroke="url(#uams-ribbon)" strokeWidth="18" strokeLinecap="round" />
              <path d="M308 330C353 231 457 169 558 171" stroke="#F9FDFF" strokeOpacity=".85" strokeWidth="5" strokeLinecap="round" />
              <path d="M535 286C579 248 645 251 706 291" stroke="#FFFFFF" strokeOpacity=".8" strokeWidth="6" strokeLinecap="round" />
            </motion.svg>
          </div>

          <div className="relative mx-8 mb-8 mt-auto hidden items-end justify-between gap-6 text-white lg:flex xl:mx-10 xl:mb-10">
            <div className="max-w-md">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl border border-white/20 bg-white/10 text-white backdrop-blur-sm"><PackageCheck className="size-5" /></span>
                <span className="text-xl font-semibold tracking-tight">FUNAAB UAMS</span>
              </div>
              <p className="mt-4 text-sm leading-6 text-blue-50/90">One trusted record for every university asset, from receipt and custody to maintenance and audit.</p>
            </div>
            <span className="hidden rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-medium tracking-wide text-white/80 xl:inline-flex">INSTITUTIONAL ASSET CONTROL</span>
          </div>
        </motion.div>
      </aside>
    </div>
  )
}

export function LoginPage() {
  const { login } = useApp()
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [show, setShow] = useState(false)
  const [stage, setStage] = useState("idle")
  const [error, setError] = useState("")
  const submit = async (e) => {
    e.preventDefault()
    setError("")
    setStage("signing")
    try {
      await login(email, password)
      setStage("success")
      toast.success("Welcome to FUNAAB UAMS")
      window.setTimeout(() => navigate("/dashboard"), 300)
    } catch (loginError) {
      setError(loginError.message || "Unable to sign in")
      setStage("idle")
    }
  }
  return (
    <AuthShell
      heading="Welcome back"
      description="Sign in with your institutional account to access your role-specific workspace."
    >
      <motion.form
        key="login-form"
        onSubmit={submit}
        className="space-y-4 sm:space-y-[1.125rem]"
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, delay: 0.22, ease: easeOut }}
      >
        <div>
          <Label htmlFor="email" className="text-xs font-semibold text-slate-200">
            Institutional email or staff number
          </Label>
          <Input
            id="email"
            icon={Mail}
            type="text"
            placeholder="Enter institutional email or staff number"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 border-[#30394a] bg-[#171e2c] text-white shadow-sm placeholder:text-slate-500 focus:border-blue-400 focus:ring-blue-400/20"
            required
          />
        </div>
        <div>
          <div className="flex justify-between">
            <Label htmlFor="password" className="text-xs font-semibold text-slate-200">
              Password
            </Label>
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-blue-300 hover:text-blue-200 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              icon={LockKeyhole}
              type={show ? "text" : "password"}
              placeholder="Enter your password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 border-[#30394a] bg-[#171e2c] pr-10 text-white shadow-sm placeholder:text-slate-500 focus:border-blue-400 focus:ring-blue-400/20"
              required
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
              aria-label={show ? "Hide password" : "Show password"}
              aria-pressed={show}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={show ? "visible" : "hidden"}
                  initial={reduceMotion ? false : { opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduceMotion ? undefined : { opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.14 }}
                  className="block"
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
        </div>
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
              role="alert"
              aria-live="polite"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>
        <Button
          className="h-11 w-full rounded-full bg-gradient-to-r from-[#39a0ff] via-[#1478ff] to-[#0754df] text-white shadow-lg shadow-blue-950/40 hover:brightness-110"
          disabled={stage !== "idle"}
        >
          {stage === "signing" ? (
            <>
              <Spinner /> Verifying account…
            </>
          ) : stage === "success" ? (
            <>
              <Check className="size-4" /> Access confirmed
            </>
          ) : (
            "Sign in to UAMS"
          )}
        </Button>
      </motion.form>
    </AuthShell>
  )
}

export function ForgotPasswordPage() {
  return (
    <AuthShell
      heading="Reset your password"
      description="Self-service password reset is not enabled for this backend."
    >
      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5 text-sm leading-6 text-slate-300">Contact your UAMS System Administrator to restore access. This application does not send password reset email or recovery tokens.</div>
      <Link
        to="/login"
        className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-blue-300 hover:text-blue-200"
      >
        <ArrowLeft className="size-4" /> Back to sign in
      </Link>
    </AuthShell>
  )
}

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [error, setError] = useState("")
  const submit = async (e) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    if (form.get("password").length < 12)
      return setError("Password must contain at least 12 characters.")
    if (form.get("password") !== form.get("confirm"))
      return setError("Passwords do not match.")
    try {
      await uamsService.apiRequest("/auth/change-password", { method: "POST", body: { currentPassword: form.get("current"), newPassword: form.get("password") } })
      toast.success("Password updated successfully")
      navigate("/dashboard")
    } catch (apiError) { setError(apiError.message) }
  }
  return (
    <AuthShell
      heading="Change your password"
      description="Sign in and provide your current password to update your account."
    >
      <form onSubmit={submit} className="space-y-5">
        <div><Label htmlFor="current-password" className="text-xs font-semibold text-slate-200">Current password</Label><Input id="current-password" name="current" icon={LockKeyhole} type="password" autoComplete="current-password" className="h-11 border-[#30394a] bg-[#171e2c] text-white shadow-sm" required /></div>
        <div>
          <Label htmlFor="new-password" className="text-xs font-semibold text-slate-200">
            New password
          </Label>
          <Input
            id="new-password"
            name="password"
            icon={LockKeyhole}
            type="password"
            autoComplete="new-password"
            className="h-11 border-[#30394a] bg-[#171e2c] text-white shadow-sm"
            required
            minLength={12}
          />
        </div>
        <div>
          <Label htmlFor="confirm-password" className="text-xs font-semibold text-slate-200">
            Confirm new password
          </Label>
          <Input
            id="confirm-password"
            name="confirm"
            icon={LockKeyhole}
            type="password"
            autoComplete="new-password"
            className="h-11 border-[#30394a] bg-[#171e2c] text-white shadow-sm"
            required
          />
        </div>
        {error && <div className="text-sm text-destructive">{error}</div>}
        <Button className="h-11 w-full shadow-lg shadow-primary/20">
          Update password
        </Button>
      </form>
    </AuthShell>
  )
}
