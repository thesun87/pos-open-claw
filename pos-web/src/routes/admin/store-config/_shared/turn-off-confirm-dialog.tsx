import { AdminButton } from '../../../../shared/components/admin'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../../shared/components/ui/dialog'

type TurnOffConfirmDialogProps = {
  open: boolean
  occupiedCount: number | null
  isPending?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function TurnOffConfirmDialog({ open, occupiedCount, isPending = false, onOpenChange, onConfirm }: TurnOffConfirmDialogProps) {
  const body = occupiedCount === null
    ? 'Không thể kiểm tra số bàn đang phục vụ. Tắt chế độ bàn vẫn an toàn — các đơn cũ truy cập được qua danh sách đơn admin. Tiếp tục?'
    : `Đang có ${occupiedCount} bàn chứa order chờ thanh toán. Tắt chế độ bàn sẽ ẩn sơ đồ bàn trên POS — các đơn đó vẫn truy cập được qua danh sách đơn admin. Tiếp tục?`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl border border-admin-gray-200 bg-white p-6 shadow-xl">
        <DialogHeader>
          <DialogTitle>Vẫn còn bàn chứa đơn chờ thanh toán</DialogTitle>
          <DialogDescription>{body}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <AdminButton variant="ghost" disabled={isPending} onClick={() => onOpenChange(false)}>Hủy</AdminButton>
          <AdminButton variant="destructive" disabled={isPending} onClick={onConfirm}>{isPending ? 'Đang áp dụng...' : 'Tiếp tục'}</AdminButton>
        </div>
      </DialogContent>
    </Dialog>
  )
}
