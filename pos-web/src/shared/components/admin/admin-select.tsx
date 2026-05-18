import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'
import { adminFieldClassName } from './admin-input'

export const AdminSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...props }, ref) => (
  <select ref={ref} className={cn(adminFieldClassName, className)} {...props} />
))
AdminSelect.displayName = 'AdminSelect'
