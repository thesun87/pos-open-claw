import { Button } from '../../../shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../shared/components/ui/dialog'

type ModeTransitionConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  tableName: string
  itemCount: number
  mode: 'change-table' | 'cancel-table'
  onKeepCart: () => void
  onResetCart: () => void
}

/**
 * Confirm dialog when cashier tries to change/cancel table while cart has items.
 * Story 6.8 — UX-DR-T13: 3 options: "Giữ cart" / "Tạo cart mới" / "Hủy".
 * Esc + click outside = "Hủy" (Dialog default behavior via onOpenChange).
 * Dumb component — caller (TableContextHeader / PosShell) injects callbacks.
 */
export function ModeTransitionConfirmDialog({
  open,
  onOpenChange,
  tableName,
  itemCount,
  mode,
  onKeepCart,
  onResetCart,
}: ModeTransitionConfirmDialogProps) {
  const bodyText =
    mode === 'change-table'
      ? `Bạn đang chuyển từ Bàn ${tableName} sang chọn bàn khác. Cart sẽ làm gì với các món hiện tại?`
      : `Bạn đang hủy phục vụ Bàn ${tableName}. Cart sẽ làm gì với các món hiện tại?`

  function handleKeepCart() {
    onKeepCart()
    onOpenChange(false)
  }

  function handleResetCart() {
    onResetCart()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="pos-theme">
        <DialogHeader>
          <DialogTitle>Cart hiện có {itemCount} món</DialogTitle>
          <DialogDescription>{bodyText}</DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button type="button" variant="destructive" onClick={handleResetCart}>
            Tạo cart mới
          </Button>
          <Button type="button" onClick={handleKeepCart}>
            Giữ cart
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
