import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

type AdminButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost'
type AdminButtonSize = 'sm' | 'md' | 'lg'

export type AdminButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: AdminButtonVariant; size?: AdminButtonSize }

const variants: Record<AdminButtonVariant, string> = {
  primary: 'bg-admin-brand-500 text-white hover:bg-admin-brand-600 disabled:bg-admin-gray-300',
  secondary: 'border border-admin-gray-300 bg-white text-admin-gray-700 hover:bg-admin-gray-50 disabled:text-admin-gray-400',
  destructive: 'bg-admin-error-500 text-white hover:bg-admin-error-600 disabled:bg-admin-gray-300',
  ghost: 'text-admin-gray-700 hover:bg-admin-gray-100 disabled:text-admin-gray-400',
}

const sizes: Record<AdminButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'min-h-touch px-4 py-2.5 text-sm',
  lg: 'min-h-touch px-5 py-3 text-base',
}

export const AdminButton = forwardRef<HTMLButtonElement, AdminButtonProps>(({ className, variant = 'primary', size = 'md', type = 'button', ...props }, ref) => (
  <button ref={ref} type={type} className={cn('inline-flex items-center justify-center gap-2 rounded-lg font-medium shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed', variants[variant], sizes[size], className)} {...props} />
))
AdminButton.displayName = 'AdminButton'
