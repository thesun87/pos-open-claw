import { AdminButton } from '../../../../shared/components/admin'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../../shared/components/ui/dialog'

type ApplyChangeConfirmDialogProps = {
  open: boolean
  nextMode: boolean
  isPending?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function ApplyChangeConfirmDialog({ open, nextMode, isPending = false, onOpenChange, onConfirm }: ApplyChangeConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl border border-admin-gray-200 bg-white p-6 shadow-xl">
        <DialogHeader>
          <DialogTitle>Áp dụng chế độ {nextMode ? 'bàn' : 'counter-service'}?</DialogTitle>
          <DialogDescription>
            Thay đổi áp dụng cho POS sau khi thu ngân đăng xuất/đăng nhập lại (NFR18). Tiếp tục?
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <AdminButton variant="ghost" disabled={isPending} onClick={() => onOpenChange(false)}>Hủy</AdminButton>
          <AdminButton disabled={isPending} onClick={onConfirm}>{isPending ? 'Đang áp dụng...' : 'Tiếp tục'}</AdminButton>
        </div>
      </DialogContent>
    </Dialog>
  )
}
