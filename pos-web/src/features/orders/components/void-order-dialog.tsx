import { useEffect, useRef, useState } from 'react'
import { Button } from '../../../shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../shared/components/ui/dialog'
import { Input } from '../../../shared/components/ui/input'

type VoidOrderDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (reason: string) => void
  isSubmitting?: boolean
  title?: string
  description?: string
  submitLabel?: string
}

const REQUIRED_REASON_MESSAGE = 'Vui lòng nhập lý do hủy'

export function VoidOrderDialog({
  open,
  onOpenChange,
  onConfirm,
  title = 'Hủy đơn đang trong giỏ?',
  description = 'Nhập lý do hủy để xác nhận. Hành động này chỉ áp dụng cho giỏ chưa hoàn tất.',
  isSubmitting = false,
  submitLabel = 'Hủy đơn này',
}: VoidOrderDialogProps) {
  const [reason, setReason] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const reasonInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) window.setTimeout(() => reasonInputRef.current?.focus(), 0)
  }, [open])

  function handleConfirm() {
    const trimmedReason = reason.trim()
    if (isSubmitting) return
    if (!trimmedReason) {
      setErrorMessage(REQUIRED_REASON_MESSAGE)
      reasonInputRef.current?.focus()
      return
    }

    onConfirm(trimmedReason)
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setReason('')
      setErrorMessage(null)
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent aria-describedby="void-order-description">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription id="void-order-description">{description}</DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-2">
          <label className="text-sm font-medium" htmlFor="void-order-reason">Lý do hủy</label>
          <Input
            ref={reasonInputRef}
            id="void-order-reason"
            value={reason}
            autoFocus
            aria-invalid={errorMessage ? 'true' : 'false'}
            aria-describedby={errorMessage ? 'void-order-reason-error' : undefined}
            placeholder="Ví dụ: Khách đổi ý, Hết món"
            onChange={(event) => {
              setReason(event.target.value)
              if (errorMessage) setErrorMessage(null)
            }}
          />
          {errorMessage ? <p id="void-order-reason-error" role="alert" className="text-sm text-danger">{errorMessage}</p> : null}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>Quay lại</Button>
          <Button type="button" variant="destructive" disabled={isSubmitting} onClick={handleConfirm}>{isSubmitting ? 'Đang hủy...' : submitLabel}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
