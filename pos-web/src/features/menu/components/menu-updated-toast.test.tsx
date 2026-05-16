import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MenuUpdatedToast } from './menu-updated-toast'

describe('MenuUpdatedToast', () => {
  it('shows exact success copy then auto-dismisses', async () => {
    vi.useFakeTimers()
    render(<MenuUpdatedToast durationMs={4000} />)
    act(() => { window.dispatchEvent(new CustomEvent('menu.updated', { detail: { menuVersion: 4 } })) })
    expect(screen.getByRole('status').textContent).toBe('✓ Menu đã cập nhật')
    await act(async () => { await vi.advanceTimersByTimeAsync(4000) })
    expect(screen.queryByText('Menu đã cập nhật')).toBeNull()
    vi.useRealTimers()
  })
})
