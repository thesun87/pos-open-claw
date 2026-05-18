import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export const adminFieldClassName = 'min-h-touch w-full rounded-lg border border-admin-gray-300 bg-white px-3.5 py-2.5 text-sm text-admin-gray-800 placeholder:text-admin-gray-400 transition-colors focus:border-admin-brand-500 focus:outline-none focus:ring-2 focus:ring-admin-brand-100 disabled:cursor-not-allowed disabled:bg-admin-gray-50 disabled:text-admin-gray-500'

export const AdminInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(adminFieldClassName, className)} {...props} />
))
AdminInput.displayName = 'AdminInput'
