import { afterEach, describe, expect, it, vi } from 'vitest'
import { registerSyncTriggers } from './triggers'

afterEach(() => vi.useRealTimers())

describe('registerSyncTriggers', () => {
  it('kicks on online, visible visibilitychange, and online interval, then cleans up', () => {
    vi.useFakeTimers()
    const engine = { kick: vi.fn() }
    const cleanup = registerSyncTriggers(engine)

    window.dispatchEvent(new Event('online'))
    expect(engine.kick).toHaveBeenCalledTimes(1)

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(engine.kick).toHaveBeenCalledTimes(2)

    vi.advanceTimersByTime(60_000)
    expect(engine.kick).toHaveBeenCalledTimes(3)

    cleanup()
    window.dispatchEvent(new Event('online'))
    document.dispatchEvent(new Event('visibilitychange'))
    vi.advanceTimersByTime(60_000)
    expect(engine.kick).toHaveBeenCalledTimes(3)
  })
})
