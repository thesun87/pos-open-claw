import * as React from 'react'
import { cn } from '../../lib/cn'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      'flex min-h-touch w-full rounded-lg border border-border bg-surface px-3 py-2 text-base text-text-primary transition-colors placeholder:text-text-secondary/70 focus-visible:outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    ref={ref}
    {...props}
  />
))
Input.displayName = 'Input'
