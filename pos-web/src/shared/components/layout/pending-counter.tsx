import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../../db/dexie'
import { STATUS_PENDING } from '../../i18n/messages'
import { cn } from '../../lib/cn'

interface PendingCounterProps {
  onOpenSyncPanel?: () => void
}

export function PendingCounter({ onOpenSyncPanel }: PendingCounterProps) {
  const counts = useLiveQuery(async () => {
    const [pending, failed] = await Promise.all([
      db.orders.where('status').equals('pendingSync').count(),
      db.orders.where('status').equals('syncFailed').count(),
    ])
    return { pending, failed }
  }, [], { pending: 0, failed: 0 })

  const failed = counts?.failed ?? 0
  const pending = counts?.pending ?? 0
  const hasActionableRows = failed + pending > 0
  const text = failed > 0 ? `${failed} đơn lỗi` : pending > 0 ? STATUS_PENDING(pending) : '0 đơn chờ'

  const openSyncPanel = () => {
    if (!hasActionableRows) return
    if (onOpenSyncPanel) onOpenSyncPanel()
    else window.dispatchEvent(new CustomEvent('sync.panel.open-requested'))
  }

  return (
    <button type="button" aria-live="polite" aria-label={`Đơn chờ đồng bộ: ${text}`} disabled={!hasActionableRows} onClick={openSyncPanel} className={cn('inline-flex max-w-full items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold sm:text-sm', failed > 0 ? 'border-red-300 bg-red-50 text-red-700' : pending > 0 ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-border bg-surface text-text-muted', hasActionableRows ? 'cursor-pointer hover:brightness-95' : 'cursor-default')}>
      <span aria-hidden="true" className={cn('h-2 w-2 rounded-full', failed > 0 ? 'bg-red-500' : pending > 0 ? 'bg-amber-500' : 'bg-text-muted')} />
      <span>{text}</span>
    </button>
  )
}
