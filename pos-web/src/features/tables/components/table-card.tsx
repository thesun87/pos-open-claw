import { useEffect, useState, type ReactNode } from 'react'
import { Clock, Coffee, DoorOpen, Lock, ShoppingBag, TriangleAlert, Users } from 'lucide-react'
import { StatusBadge, type StatusBadgeVariant } from '../../../shared/components/ui/status-badge'
import { cn } from '../../../shared/lib/cn'
import { formatVnd } from '../../../shared/lib/format-vnd'
import type { TableDisplayStatus } from '../api'

/** "Mở HH:MM" theo giờ Việt Nam từ openedAt ISO. null khi thiếu/không hợp lệ. */
function formatOpenTime(openedAt: string | undefined): string | null {
  if (!openedAt) return null
  const date = new Date(openedAt)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Ho_Chi_Minh',
  })
}

/** Định dạng khoảng thời gian "Xh YYm" / "Ym" từ số phút. */
function formatElapsed(mins: number): string {
  const safe = Math.max(0, mins)
  const h = Math.floor(safe / 60)
  const m = safe % 60
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`
}

/**
 * Thời gian bàn đang có đơn, cập nhật mỗi 30s. Trả về null khi không có openedAt.
 * Effect luôn chạy (không vi phạm rules-of-hooks) nhưng chỉ đặt interval khi có openedAt.
 */
function useElapsedLabel(openedAt: string | undefined): string | null {
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    if (!openedAt) return
    const id = setInterval(() => setNowMs(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [openedAt])
  if (!openedAt) return null
  const startMs = new Date(openedAt).getTime()
  if (Number.isNaN(startMs)) return null
  return formatElapsed(Math.floor((nowMs - startMs) / 60_000))
}

/** Minimal table shape used by TableCard — satisfied by both TableDto and TableRecord (Dexie) */
type TableShape = {
  id: string
  name: string
  capacity: number
}

type StatusMeta = {
  label: string
  variant: StatusBadgeVariant
  icon: ReactNode
  disabled: boolean
  /** Status accent stripe down the left edge of the card */
  stripe: string
  /** Status-tinted card background */
  card: string
  /** Short helper line shown at the bottom of the card */
  hint: string
}

const STATUS_META: Record<TableDisplayStatus, StatusMeta> = {
  empty: {
    label: 'Trống',
    variant: 'success',
    icon: <Coffee className="size-4" />,
    disabled: false,
    stripe: 'bg-success',
    card: 'bg-white',
    hint: 'Sẵn sàng phục vụ',
  },
  opening: {
    label: 'Đang mở',
    variant: 'accent',
    icon: <DoorOpen className="size-4" />,
    disabled: true,
    stripe: 'bg-accent',
    card: 'bg-accent/5',
    hint: 'Đang chờ chọn món',
  },
  serving: {
    label: 'Đang có đơn',
    variant: 'warning',
    icon: <Users className="size-4" />,
    disabled: true,
    stripe: 'bg-warning',
    card: 'bg-warning/5',
    hint: 'Đang phục vụ',
  },
  conflict: {
    label: 'Xung đột phiên',
    variant: 'danger',
    icon: <TriangleAlert className="size-4" />,
    disabled: true,
    stripe: 'bg-danger',
    card: 'bg-danger/5',
    hint: 'Cần kiểm tra phiên',
  },
  inactive: {
    label: 'Tạm tắt',
    variant: 'neutral',
    icon: <Lock className="size-4" />,
    disabled: true,
    stripe: 'bg-border',
    card: 'bg-surface-container',
    hint: 'Tạm ngưng',
  },
}

type TableCardProps = {
  table: TableShape
  status: TableDisplayStatus
  onSelect: (table: TableShape) => void
  /**
   * Story 6.13: When true, this table has a local draft (items saved on this device).
   * Overrides the status-based `disabled` flag so cashier can re-open and reload items (AC9).
   * Tables with drafts show a "Tiếp tục" badge (optional visual cue).
   * An 'opening' table (open session, no local draft — incl. cross-device opens) stays disabled
   * (Epic 7 handles cross-device reopen); a 'serving' table always has a local draft → reopenable.
   */
  hasLocalDraft?: boolean
  /** Tổng tiền đơn đang giữ ở bàn (sau chiết khấu) — hiển thị cho bàn "Đang có đơn". */
  orderTotal?: number
  /** Tổng số lượng món trong đơn đang giữ ở bàn. */
  itemCount?: number
  /** Thời điểm mở phiên (ISO 8601 UTC) — hiển thị giờ mở bàn + thời gian đang phục vụ. */
  openedAt?: string
}

export function TableCard({
  table,
  status,
  onSelect,
  hasLocalDraft = false,
  orderTotal = 0,
  itemCount = 0,
  openedAt,
}: TableCardProps) {
  const meta = STATUS_META[status]
  // Story 6.13 (AC9): tables with a local draft override the status-based disabled flag.
  // disabled = status says disabled AND no local draft (cannot reopen cross-device tables).
  const isDisabled = meta.disabled && !hasLocalDraft
  const ariaLabel = `Bàn ${table.name}, ${table.capacity} chỗ, ${meta.label}${hasLocalDraft ? ' — Tiếp tục' : ''}`

  const openTime = formatOpenTime(openedAt)
  const elapsed = useElapsedLabel(openedAt)
  const isServing = status === 'serving'
  const isOpening = status === 'opening'

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={isDisabled}
      aria-disabled={isDisabled ? 'true' : undefined}
      onClick={() => onSelect(table)}
      className={cn(
        'group relative min-h-[88px] min-w-[88px] overflow-hidden rounded-2xl border border-border p-4 pl-5',
        'flex flex-col gap-3 items-start text-left transition-all',
        'active:scale-[0.99] hover:-translate-y-0.5 hover:shadow-theme-lg',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        'disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-none',
        meta.card,
      )}
    >
      {/* Status accent stripe */}
      <span aria-hidden="true" className={cn('absolute inset-y-0 left-0 w-1.5', meta.stripe)} />

      <div className="flex w-full items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="block text-2xl font-bold leading-tight text-on-surface">{table.name}</span>
          <span className="mt-1 inline-flex items-center gap-1.5 text-sm text-on-surface-variant">
            <Users aria-hidden="true" className="size-3.5" />
            {table.capacity} chỗ
          </span>
        </div>
        <StatusBadge variant={meta.variant} label={meta.label} icon={meta.icon} />
      </div>

      {isServing ? (
        /* "Đang có đơn": tổng tiền, số món, giờ mở bàn, thời gian đang phục vụ (theo design tables.html) */
        <div className="mt-auto w-full">
          <div className="text-lg font-bold leading-tight tabular-nums text-on-surface">
            {formatVnd(orderTotal)}
          </div>
          <div className="mt-1.5 flex w-full items-center justify-between gap-2 text-xs font-medium text-on-surface-variant">
            <span className="inline-flex items-center gap-1">
              <ShoppingBag aria-hidden="true" className="size-3.5" />
              {itemCount} món
            </span>
            {hasLocalDraft ? (
              <span className="inline-flex items-center rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning">
                Tiếp tục
              </span>
            ) : null}
          </div>
          {openTime ? (
            <div className="mt-1 flex w-full items-center justify-between gap-2 text-xs text-on-surface-variant">
              <span>Mở {openTime}</span>
              {elapsed ? (
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <Clock aria-hidden="true" className="size-3" />
                  {elapsed}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : isOpening ? (
        /* "Đang mở": chờ chọn món, kèm giờ mở + thời gian chờ */
        <div className="mt-auto w-full">
          <span className="text-xs font-medium text-on-surface-variant">{meta.hint}</span>
          {elapsed ? (
            <div className="mt-0.5 text-lg font-bold leading-tight tabular-nums text-on-surface">{elapsed}</div>
          ) : null}
          {openTime ? <div className="mt-0.5 text-xs text-on-surface-variant">Mở {openTime}</div> : null}
        </div>
      ) : (
        <div className="mt-auto flex w-full items-center justify-between gap-2">
          <span className="text-xs font-medium text-on-surface-variant">{meta.hint}</span>
          {/* Story 6.13 (AC9): optional visual cue for tables with a local draft */}
          {hasLocalDraft ? (
            <span className="inline-flex items-center rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning">
              Tiếp tục
            </span>
          ) : null}
        </div>
      )}
    </button>
  )
}
