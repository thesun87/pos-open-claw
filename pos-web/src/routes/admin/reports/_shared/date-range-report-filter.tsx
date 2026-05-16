import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { DayPicker, type DateRange } from 'react-day-picker'
import { vi as viLocale } from 'date-fns/locale'
import { Calendar } from 'lucide-react'
import { formatDmyDisplay, formatYmdInVietnam, computePreset, type PresetId } from '../../../../shared/lib/date'

type DateRange2 = {
  from: string
  to: string
}

type DateRangeReportFilterProps = {
  value: DateRange2
  onChange: (range: DateRange2) => void
  error?: string | null
}

const PRESETS: { id: PresetId; label: string }[] = [
  { id: 'today', label: 'Hôm nay' },
  { id: 'yesterday', label: 'Hôm qua' },
  { id: 'last7Days', label: '7 ngày qua' },
  { id: 'last30Days', label: '30 ngày qua' },
  { id: 'thisMonth', label: 'Tháng này' },
  { id: 'lastMonth', label: 'Tháng trước' },
]

function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => undefined
      const mq = window.matchMedia(query)
      mq.addEventListener('change', cb)
      return () => mq.removeEventListener('change', cb)
    },
    () => {
      if (typeof window === 'undefined' || !window.matchMedia) return false
      return window.matchMedia(query).matches
    },
    () => false, // SSR / test-env snapshot
  )
}

function ymdToDate(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000Z`)
}

function isPresetActive(preset: PresetId, value: DateRange2): boolean {
  try {
    const computed = computePreset(preset)
    return computed.from === value.from && computed.to === value.to
  } catch {
    return false
  }
}

export function DateRangeReportFilter({ value, onChange, error }: DateRangeReportFilterProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const fromInputRef = useRef<HTMLButtonElement>(null)
  const isMobile = useMediaQuery('(max-width: 768px)')

  function closePopover() {
    setOpen(false)
    // AC 12: return focus to "Từ ngày" input after popover closes
    fromInputRef.current?.focus()
  }

  // Click outside to close popover
  useEffect(() => {
    if (!open) return

    function handleOutsideClick(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closePopover()
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('touchstart', handleOutsideClick)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('touchstart', handleOutsideClick)
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closePopover()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  const todayInVN = ymdToDate(formatYmdInVietnam(new Date()))

  const handleSelect = useCallback(
    (range: DateRange | undefined) => {
      if (!range) return
      if (range.from && range.to) {
        let fromDate = range.from
        let toDate = range.to
        // Swap if from > to (defensive — DayPicker range mode usually handles this)
        if (fromDate > toDate) {
          ;[fromDate, toDate] = [toDate, fromDate]
        }
        const newFrom = formatYmdInVietnam(new Date(fromDate.getTime() + 7 * 60 * 60 * 1000))
        const newTo = formatYmdInVietnam(new Date(toDate.getTime() + 7 * 60 * 60 * 1000))
        onChange({ from: newFrom, to: newTo })
        closePopover()
      } else if (range.from && !range.to) {
        // Partial selection — keep popover open
        const ymd = formatYmdInVietnam(new Date(range.from.getTime() + 7 * 60 * 60 * 1000))
        onChange({ from: ymd, to: ymd })
      }
    },
    [onChange],
  )

  const handlePreset = useCallback(
    (presetId: PresetId) => {
      const range = computePreset(presetId)
      onChange(range)
      closePopover()
    },
    [onChange], // closePopover is defined in render scope; stable via ref — no dep needed
  )

  const selectedRange: DateRange = {
    from: ymdToDate(value.from),
    to: ymdToDate(value.to),
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Preset buttons */}
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Chọn nhanh khoảng ngày">
        {PRESETS.map((preset) => {
          const active = isPresetActive(preset.id, value)
          return (
            <button
              key={preset.id}
              type="button"
              aria-pressed={active}
              className="min-h-touch rounded-full border border-border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:text-primary"
              onClick={() => handlePreset(preset.id)}
            >
              {preset.label}
            </button>
          )
        })}
      </div>

      {/* Date inputs */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="report-date-from" className="text-sm font-medium text-text-primary">
            Từ ngày
          </label>
          <button
            id="report-date-from"
            ref={fromInputRef}
            type="button"
            aria-describedby="report-tz-hint"
            aria-haspopup="dialog"
            aria-expanded={open}
            className="flex min-h-touch items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            onClick={() => setOpen((v) => !v)}
          >
            <Calendar size={14} aria-hidden="true" />
            {formatDmyDisplay(value.from)}
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="report-date-to" className="text-sm font-medium text-text-primary">
            Đến ngày
          </label>
          <button
            id="report-date-to"
            type="button"
            aria-describedby="report-tz-hint"
            aria-haspopup="dialog"
            aria-expanded={open}
            className="flex min-h-touch items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            onClick={() => setOpen((v) => !v)}
          >
            <Calendar size={14} aria-hidden="true" />
            {formatDmyDisplay(value.to)}
          </button>
        </div>
      </div>

      {/* TZ hint */}
      <span id="report-tz-hint" className="mt-1 block text-xs text-text-secondary">
        Tính theo giờ Việt Nam (UTC+7)
      </span>

      {/* Inline error */}
      {error ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {/* Calendar popover */}
      {open ? (
        <div
          role="dialog"
          aria-label="Chọn khoảng ngày"
          className="absolute left-0 top-full z-50 mt-2 overflow-auto rounded-lg border border-border bg-surface p-4 shadow-lg"
        >
          <DayPicker
            mode="range"
            locale={viLocale}
            weekStartsOn={1}
            numberOfMonths={isMobile ? 1 : 2}
            disabled={{ after: todayInVN }}
            selected={selectedRange}
            onSelect={handleSelect}
          />
        </div>
      ) : null}
    </div>
  )
}
