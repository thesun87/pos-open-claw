import { describe, expect, it, vi, afterEach } from 'vitest'
import { generateOrderCode, localOrderDatePart } from './order-code'

afterEach(() => vi.useRealTimers())

describe('generateOrderCode', () => {
  it('formats local date, device id, and zero-padded sequence', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 4, 9, 10, 30, 0))
    expect(generateOrderCode('POS01', 42)).toBe('20260509-POS01-0042')
  })

  it('uses client local date part', () => {
    const date = new Date(2026, 0, 2, 23, 59, 0)
    expect(localOrderDatePart(date)).toBe('20260102')
  })
})
