import * as DialogPrimitive from "@radix-ui/react-dialog"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { X, Search, ChevronDown } from "lucide-react"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function Button({
  className,
  variant = "default",
  size = "default",
  children,
  ...props
}) {
  const variants = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    outline:
      "border border-border bg-background hover:bg-muted text-foreground",
    ghost: "hover:bg-muted text-muted-foreground hover:text-foreground",
    danger: "bg-destructive text-white hover:bg-destructive/90",
  }
  const sizes = {
    default: "h-10 px-4",
    sm: "h-8 px-3 text-xs",
    icon: "size-10 p-0",
  }
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function Card({ className, children, ...props }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card text-card-foreground shadow-card",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
export function CardHeader({ className, children }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 p-4 pb-3 sm:gap-4 sm:p-5 sm:pb-3",
        className,
      )}
    >
      {children}
    </div>
  )
}
export function CardContent({ className, children }) {
  return (
    <div className={cn("p-4 pt-2 sm:p-5 sm:pt-2", className)}>{children}</div>
  )
}
export function CardTitle({ className, children }) {
  return (
    <div className={cn("text-base font-semibold tracking-tight", className)}>
      {children}
    </div>
  )
}
export function CardDescription({ className, children }) {
  return (
    <div className={cn("mt-1 text-sm text-muted-foreground", className)}>
      {children}
    </div>
  )
}

export function Input({ className, icon: Icon, ...props }) {
  return (
    <div className="relative">
      {Icon && (
        <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      )}
      <input
        className={cn(
          "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-all duration-200 placeholder:text-muted-foreground hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/10",
          Icon && "pl-9",
          className,
        )}
        {...props}
      />
    </div>
  )
}
export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-all duration-200 placeholder:text-muted-foreground hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/10",
        className,
      )}
      {...props}
    />
  )
}
export function Label({ children, className, ...props }) {
  return (
    <label
      className={cn(
        "mb-1.5 block text-sm font-medium text-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </label>
  )
}

export function Select({ className, children, ...props }) {
  return (
    <div className="relative">
      <select
        className={cn(
          "h-10 w-full appearance-none rounded-lg border border-input bg-background px-3 pr-9 text-sm text-foreground outline-none transition-all duration-200 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/10",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
}

const statusMap = {
  "In Service": "success",
  IN_SERVICE: "success",
  IN_STORE: "success",
  RECEIPT_CONFIRMED: "success",
  RECONCILED: "success",
  POSTED: "success",
  APPROVED: "success",
  Accepted: "success",
  Approved: "success",
  Active: "success",
  Completed: "success",
  Paid: "success",
  Verified: "success",
  Registered: "success",
  Received: "success",
  Stocked: "success",
  Successful: "success",
  "Under Review": "info",
  Submitted: "info",
  "In Progress": "info",
  "In Transit": "info",
  Assigned: "info",
  "Ready to Issue": "info",
  Scheduled: "info",
  Logged: "info",
  Pending: "warning",
  PENDING_INSCRIPTION: "warning",
  PENDING: "warning",
  DRAFT: "warning",
  UNDER_REVIEW: "info",
  AWAITING_RECEIPT: "info",
  UNDER_SURVEY: "warning",
  "Awaiting Verification": "warning",
  "Awaiting Inspection": "warning",
  "Renewal Due": "warning",
  Expiring: "warning",
  Proposed: "warning",
  "Board Review": "warning",
  "Review Required": "warning",
  Rejected: "danger",
  Exception: "danger",
  "Needs Clarification": "danger",
  "Under Maintenance": "danger",
  UNDER_MAINTENANCE: "danger",
  UNSERVICEABLE: "danger",
  WRITTEN_OFF: "danger",
  DISPOSED: "neutral",
  "Awaiting Disposal": "danger",
}
export function Badge({ children, variant }) {
  const resolved = variant || statusMap[children] || "neutral"
  const styles = {
    success: "bg-success/10 text-success",
    info: "bg-primary/10 text-primary",
    warning: "bg-warning/10 text-warning-foreground",
    danger: "bg-destructive/10 text-destructive",
    neutral: "bg-muted text-muted-foreground",
  }
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold transition-colors duration-200",
        styles[resolved],
      )}
    >
      {children}
    </span>
  )
}

export function SearchInput(props) {
  return <Input icon={Search} {...props} />
}

export function Dialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  footer,
  size = "md",
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger && (
        <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
      )}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-navy/50 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content
          className={cn(
            "dialog-content fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-card shadow-2xl outline-none",
            size === "lg" ? "max-w-3xl" : "max-w-lg",
          )}
        >
          <div className="border-b border-border p-4 pr-12 sm:p-5 sm:pr-12">
            <DialogPrimitive.Title className="text-lg font-semibold">
              {title}
            </DialogPrimitive.Title>
            {description && (
              <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">
                {description}
              </DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-3 top-3"
            >
              <X className="size-4" />
            </Button>
          </DialogPrimitive.Close>
          <div className="p-4 sm:p-5">{children}</div>
          {footer && (
            <div className="flex flex-wrap justify-end gap-2 border-t border-border p-4">
              {footer}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export const DropdownMenu = DropdownMenuPrimitive.Root
export const DropdownTrigger = DropdownMenuPrimitive.Trigger
export function DropdownContent({ className, children, align = "end" }) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        align={align}
        sideOffset={8}
        className={cn(
          "menu-content z-50 min-w-52 rounded-lg border border-border bg-popover p-1.5 text-popover-foreground shadow-xl",
          className,
        )}
      >
        {children}
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Portal>
  )
}
export function DropdownItem({ className, children, ...props }) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2 text-sm outline-none hover:bg-muted focus:bg-muted",
        className,
      )}
      {...props}
    >
      {children}
    </DropdownMenuPrimitive.Item>
  )
}
export function DropdownSeparator() {
  return <DropdownMenuPrimitive.Separator className="my-1 h-px bg-border" />
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <TabsPrimitive.Root value={active} onValueChange={onChange}>
      <TabsPrimitive.List className="flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((tab) => (
          <TabsPrimitive.Trigger
            key={tab}
            value={tab}
            className="whitespace-nowrap border-b-2 border-transparent px-4 py-3 text-sm font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-primary"
          >
            {tab}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
    </TabsPrimitive.Root>
  )
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 rounded-xl bg-muted p-3">
        <Icon className="size-6 text-muted-foreground" />
      </div>
      <div className="font-semibold">{title}</div>
      <div className="mt-1 max-w-sm text-sm text-muted-foreground">
        {description}
      </div>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Spinner() {
  return (
    <div className="size-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
  )
}
