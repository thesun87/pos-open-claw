import { cn } from '../../lib/cn'

type Variant = 'success' | 'error' | 'warning' | 'neutral' | 'info' | 'accent'
const variants: Record<Variant, string> = {
  success: 'bg-admin-success-50 text-admin-success-600',
  error: 'bg-admin-error-50 text-admin-error-600',
  warning: 'bg-admin-warning-50 text-admin-warning-600',
  neutral: 'bg-admin-gray-100 text-admin-gray-600',
  info: 'bg-admin-brand-50 text-admin-brand-600',
  accent: 'bg-admin-brand-50 text-admin-brand-600',
}

export function AdminStatusBadge({ label, variant = 'neutral', className }: { label: string; variant?: Variant; className?: string }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', variants[variant], className)}><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />{label}</span>
}
