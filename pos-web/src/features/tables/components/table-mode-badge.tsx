import { Armchair } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSessionStore } from '../../auth/session-store'
import { StatusBadge } from '../../../shared/components/ui/status-badge'
import { useTableMode } from '../hooks'

export function TableModeBadge() {
  const { tableMode } = useTableMode()
  const currentUser = useSessionStore((s) => s.currentUser)

  if (!tableMode) return null

  const isAdmin = currentUser?.role === 'admin'

  if (isAdmin) {
    return (
      <Link
        to="/admin/store-config"
        title="Mở Cấu hình store"
        aria-label="Chế độ bàn: Bật — Mở Cấu hình store"
        className="cursor-pointer"
      >
        <StatusBadge
          variant="accent"
          label="Chế độ bàn: Bật"
          icon={<Armchair className="size-4" />}
          className="cursor-pointer"
        />
      </Link>
    )
  }

  return (
    <span title="Liên hệ admin để đổi chế độ" aria-label="Chế độ bàn: Bật">
      <StatusBadge
        variant="accent"
        label="Chế độ bàn: Bật"
        icon={<Armchair className="size-4" />}
      />
    </span>
  )
}
