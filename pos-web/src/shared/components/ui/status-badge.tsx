import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type StatusBadgeVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'accent'

type StatusBadgeProps = {
  variant: StatusBadgeVariant
  label: string
  icon?: ReactNode
  className?: string
}

const variantClasses: Record<StatusBadgeVariant, string> = {
  success: 'border-success/30 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  danger: 'border-danger/30 bg-danger/10 text-danger',
  neutral: 'border-border bg-surface-muted text-text-secondary',
  accent: 'border-accent/30 bg-accent/10 text-accent',
}

export function StatusBadge({ variant, label, icon, className }: StatusBadgeProps) {
  return (
    <span className={cn('inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold', variantClasses[variant], className)}>
      {icon ? <span aria-hidden="true" className="inline-flex shrink-0">{icon}</span> : null}
      <span>{label}</span>
    </span>
  )
}
