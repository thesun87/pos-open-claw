import { describe, expect, it } from 'vitest'
import { getRetryDelay, shouldPauseAfterAttempt, SYNC_RETRY_DELAYS_MS } from './retry'

describe('sync retry utilities', () => {
  it('exposes the exponential delay sequence', () => {
    expect(SYNC_RETRY_DELAYS_MS).toEqual([1000, 2000, 4000, 8000, 16000])
  })

  it('returns bounded retry delays', () => {
    expect([0, 1, 2, 3, 4].map(getRetryDelay)).toEqual([1000, 2000, 4000, 8000, 16000])
    expect(getRetryDelay(-1)).toBe(1000)
    expect(getRetryDelay(99)).toBe(16000)
  })

  it('pauses after the fifth attempt', () => {
    expect(shouldPauseAfterAttempt(4)).toBe(false)
    expect(shouldPauseAfterAttempt(5)).toBe(true)
  })
})
