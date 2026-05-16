import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

const VN_TZ = 'Asia/Ho_Chi_Minh'

/**
 * Format a Date object as YYYY-MM-DD using Vietnam local timezone.
 * NEVER use toISOString().substring(0,10) — off-by-one bug in TZ ≠ +07:00 (Story 4.1 lesson).
 */
export function formatYmdInVietnam(date: Date): string {
  // Using Intl.DateTimeFormat with 'en-CA' locale returns YYYY-MM-DD format
  return new Intl.DateTimeFormat('en-CA', { timeZone: VN_TZ }).format(date)
}

/**
 * Get current Date object representing today in Vietnam timezone.
 * The returned Date is constructed by parsing today's YYYY-MM-DD as midnight UTC
 * (used for day picker disabled logic — not for TZ arithmetic).
 */
export function getTodayInVietnam(): Date {
  const ymd = formatYmdInVietnam(new Date())
  // Parse the local date string as a JS Date at midnight UTC for day picker usage
  return new Date(`${ymd}T00:00:00.000Z`)
}

/**
 * Format a YYYY-MM-DD string as dd/MM/yyyy using date-fns with Vietnamese locale.
 */
export function formatDmyDisplay(ymd: string): string {
  // Parse as UTC midnight to avoid DST issues
  const date = new Date(`${ymd}T00:00:00.000Z`)
  return format(date, 'dd/MM/yyyy', { locale: vi })
}

/**
 * Add N days to a YYYY-MM-DD string. Returns YYYY-MM-DD string.
 * Works purely with UTC-midnight arithmetic to avoid timezone DST issues.
 */
function addDaysToYmd(ymd: string, days: number): string {
  const ms = new Date(`${ymd}T00:00:00.000Z`).getTime() + days * 24 * 60 * 60 * 1000
  const d = new Date(ms)
  const yyyy = d.getUTCFullYear().toString().padStart(4, '0')
  const mm = (d.getUTCMonth() + 1).toString().padStart(2, '0')
  const dd = d.getUTCDate().toString().padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/**
 * Return last day of a month given its year and month (1-12).
 */
function lastDayOfMonth(year: number, month: number): string {
  // Day 0 of next month = last day of current month
  const d = new Date(Date.UTC(year, month, 0))
  const yyyy = d.getUTCFullYear().toString().padStart(4, '0')
  const mm = (d.getUTCMonth() + 1).toString().padStart(2, '0')
  const dd = d.getUTCDate().toString().padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export type PresetId = 'today' | 'yesterday' | 'last7Days' | 'last30Days' | 'thisMonth' | 'lastMonth'

/**
 * Compute from/to YYYY-MM-DD range for a preset using Vietnam timezone.
 * All arithmetic is done on YYYY-MM-DD strings to avoid timezone DST off-by-one issues.
 */
export function computePreset(preset: PresetId): { from: string; to: string } {
  const todayYmd = formatYmdInVietnam(new Date())

  switch (preset) {
    case 'today':
      return { from: todayYmd, to: todayYmd }

    case 'yesterday': {
      const ymd = addDaysToYmd(todayYmd, -1)
      return { from: ymd, to: ymd }
    }

    case 'last7Days':
      return { from: addDaysToYmd(todayYmd, -6), to: todayYmd }

    case 'last30Days':
      return { from: addDaysToYmd(todayYmd, -29), to: todayYmd }

    case 'thisMonth': {
      // Start of current month in VN: replace DD with 01
      const startYmd = `${todayYmd.substring(0, 7)}-01`
      return { from: startYmd, to: todayYmd }
    }

    case 'lastMonth': {
      // Parse current YYYY-MM from Vietnam today
      const year = parseInt(todayYmd.substring(0, 4))
      const month = parseInt(todayYmd.substring(5, 7))

      // Calculate previous month
      const prevMonth = month === 1 ? 12 : month - 1
      const prevYear = month === 1 ? year - 1 : year

      const fromYmd = `${prevYear.toString().padStart(4, '0')}-${prevMonth.toString().padStart(2, '0')}-01`
      const toYmd = lastDayOfMonth(prevYear, prevMonth)
      return { from: fromYmd, to: toYmd }
    }

    default:
      return { from: addDaysToYmd(todayYmd, -6), to: todayYmd }
  }
}
