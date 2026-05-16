import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { formatYmdInVietnam, formatDmyDisplay, computePreset, getTodayInVietnam } from './date'

describe('formatYmdInVietnam', () => {
  it('formats a UTC date as YYYY-MM-DD in VN timezone', () => {
    // 2026-05-01T00:00:00+07:00 = 2026-04-30T17:00:00Z
    const dateUtc = new Date('2026-04-30T17:00:00.000Z')
    expect(formatYmdInVietnam(dateUtc)).toBe('2026-05-01')
  })

  it('handles timezone shift — UTC date in next day in VN', () => {
    // 2026-05-01T23:59:00+07:00 = 2026-05-01T16:59:00Z
    const dateUtc = new Date('2026-05-01T16:59:00.000Z')
    expect(formatYmdInVietnam(dateUtc)).toBe('2026-05-01')
  })

  it('returns YYYY-MM-DD format', () => {
    const date = new Date('2026-01-15T10:00:00.000Z')
    const result = formatYmdInVietnam(date)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('formatDmyDisplay', () => {
  it('formats YYYY-MM-DD as dd/MM/yyyy', () => {
    expect(formatDmyDisplay('2026-05-01')).toBe('01/05/2026')
  })

  it('formats with correct day/month padding', () => {
    expect(formatDmyDisplay('2026-01-09')).toBe('09/01/2026')
  })
})

describe('computePreset', () => {
  const FIXED_NOW_UTC = new Date('2026-05-16T10:00:00.000Z') // = 2026-05-16T17:00:00+07:00 (VN)

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW_UTC)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('today: from=to=today VN', () => {
    const result = computePreset('today')
    expect(result.from).toBe('2026-05-16')
    expect(result.to).toBe('2026-05-16')
  })

  it('yesterday: from=to=yesterday VN', () => {
    const result = computePreset('yesterday')
    expect(result.from).toBe('2026-05-15')
    expect(result.to).toBe('2026-05-15')
  })

  it('last7Days: from = today - 6 days, to = today', () => {
    const result = computePreset('last7Days')
    expect(result.from).toBe('2026-05-10')
    expect(result.to).toBe('2026-05-16')
  })

  it('last30Days: from = today - 29 days, to = today', () => {
    const result = computePreset('last30Days')
    expect(result.from).toBe('2026-04-17')
    expect(result.to).toBe('2026-05-16')
  })

  it('thisMonth: from = 1st day of current month, to = today', () => {
    const result = computePreset('thisMonth')
    expect(result.from).toBe('2026-05-01')
    expect(result.to).toBe('2026-05-16')
  })

  it('lastMonth: from = 1st day of prev month, to = last day of prev month', () => {
    const result = computePreset('lastMonth')
    expect(result.from).toBe('2026-04-01')
    expect(result.to).toBe('2026-04-30')
  })

  it('lastMonth boundary: January → December of prev year', () => {
    // Set date to Jan 15 2026
    vi.setSystemTime(new Date('2026-01-15T10:00:00.000Z'))
    const result = computePreset('lastMonth')
    expect(result.from).toBe('2025-12-01')
    expect(result.to).toBe('2025-12-31')
  })
})

describe('getTodayInVietnam', () => {
  it('returns a Date object at midnight UTC representing today VN', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-16T10:00:00.000Z'))
    const today = getTodayInVietnam()
    // Should be parsed from VN date 2026-05-16 as midnight UTC
    expect(today.toISOString()).toBe('2026-05-16T00:00:00.000Z')
    vi.useRealTimers()
  })
})
