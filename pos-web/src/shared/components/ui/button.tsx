import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/cn'

const buttonVariants = cva(
  'inline-flex min-h-touch min-w-touch items-center justify-center gap-2 rounded-md border border-transparent px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-white hover:bg-primary-hover',
        secondary: 'bg-surface-muted text-text-primary hover:bg-border',
        outline: 'border-border bg-surface text-text-primary hover:bg-surface-muted',
        ghost: 'text-text-primary hover:bg-surface-muted',
        destructive: 'bg-danger text-white hover:opacity-90',
      },
      size: {
        default: 'min-h-touch px-4 py-2',
        sm: 'min-h-touch px-3 py-1.5 text-sm',
        lg: 'min-h-cta px-6 py-3 text-base',
        icon: 'h-11 w-11 p-0',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button'
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
})
Button.displayName = 'Button'
