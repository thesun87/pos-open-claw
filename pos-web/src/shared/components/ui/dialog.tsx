import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as React from 'react'
import { cn } from '../../lib/cn'

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Overlay>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay ref={ref} data-radix-dialog-overlay className={cn('fixed inset-0 z-50 bg-inverse-surface/45 backdrop-blur-sm', className)} {...props} />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      data-radix-dialog-content
      className={cn('fixed left-1/2 top-1/2 z-50 w-[min(92vw,32rem)] -translate-x-1/2 -translate-y-1/2 rounded-[28px] border border-outline-variant/40 bg-surface p-6 text-text-primary shadow-overlay', className)}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn('flex flex-col space-y-2 text-left', className)} {...props} />
const DialogTitle = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Title>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn('text-lg font-semibold', className)} {...props} />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName
const DialogDescription = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Description>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn('text-sm text-text-secondary', className)} {...props} />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger }
