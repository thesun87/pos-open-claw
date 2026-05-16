import { afterEach, describe, expect, it, vi } from 'vitest'
import { installMenuSyncTriggers, triggerMenuCheck } from './triggers'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('menu sync triggers', () => {
  it('runs on boot, online, active interval, and cleans up listeners/timers', async () => {
    vi.useFakeTimers()
    const check = vi.fn().mockResolvedValue(undefined)
    const cleanup = installMenuSyncTriggers({ check, isOnline: () => true, isActive: () => true, intervalMs: 1000 })
    await Promise.resolve()
    expect(check).toHaveBeenCalledTimes(1)

    window.dispatchEvent(new Event('online'))
    await Promise.resolve()
    expect(check).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(1000)
    expect(check).toHaveBeenCalledTimes(3)

    cleanup()
    window.dispatchEvent(new Event('online'))
    await vi.advanceTimersByTimeAsync(2000)
    expect(check).toHaveBeenCalledTimes(3)
  })

  it('debounces visibility recovery by 5 seconds and checks latest active/online state', async () => {
    vi.useFakeTimers()
    let active = false
    const check = vi.fn().mockResolvedValue(undefined)
    const cleanup = installMenuSyncTriggers({ check, isOnline: () => true, isActive: () => active })

    document.dispatchEvent(new Event('visibilitychange'))
    await vi.advanceTimersByTimeAsync(4999)
    expect(check).not.toHaveBeenCalled()
    active = true
    await vi.advanceTimersByTimeAsync(1)
    expect(check).toHaveBeenCalledTimes(1)
    cleanup()
  })

  it('coalesces concurrent manual triggers', async () => {
    let resolve!: () => void
    const check = vi.fn(() => new Promise<void>((r) => { resolve = r }))
    const first = triggerMenuCheck({ check, isOnline: () => true })
    const second = triggerMenuCheck({ check, isOnline: () => true })
    expect(first).toBe(second)
    expect(check).toHaveBeenCalledTimes(1)
    resolve()
    await first
  })
})
