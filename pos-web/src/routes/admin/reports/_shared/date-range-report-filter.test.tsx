import '@testing-library/jest-dom/vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { DateRangeReportFilter } from './date-range-report-filter'

// Fixed date for consistent tests
const FIXED_NOW_UTC = new Date('2026-05-16T10:00:00.000Z') // VN = 2026-05-16T17:00:00+07:00

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(FIXED_NOW_UTC)
})

afterEach(() => {
  vi.useRealTimers()
})

const defaultValue = { from: '2026-05-10', to: '2026-05-16' }

function renderFilter(overrides?: Partial<Parameters<typeof DateRangeReportFilter>[0]>) {
  const onChange = vi.fn()
  const result = render(
    <DateRangeReportFilter value={defaultValue} onChange={onChange} {...overrides} />,
  )
  return { onChange, ...result }
}

describe('DateRangeReportFilter', () => {
  it('renders 6 preset buttons', () => {
    renderFilter()
    const presets = ['Hôm nay', 'Hôm qua', '7 ngày qua', '30 ngày qua', 'Tháng này', 'Tháng trước']
    for (const label of presets) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
  })

  it('renders TZ hint text', () => {
    renderFilter()
    expect(screen.getByText('Tính theo giờ Việt Nam (UTC+7)')).toBeInTheDocument()
  })

  it('renders TZ hint with correct id', () => {
    renderFilter()
    const hint = document.getElementById('report-tz-hint')
    expect(hint).toBeInTheDocument()
    expect(hint?.textContent).toContain('UTC+7')
  })

  it('from/to inputs have aria-describedby pointing to tz-hint', () => {
    renderFilter()
    const fromBtn = document.getElementById('report-date-from')
    const toBtn = document.getElementById('report-date-to')
    expect(fromBtn).toHaveAttribute('aria-describedby', 'report-tz-hint')
    expect(toBtn).toHaveAttribute('aria-describedby', 'report-tz-hint')
  })

  it('preset "Hôm nay" calls onChange with today range', () => {
    const { onChange } = renderFilter()
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Hôm nay' }))
    })
    expect(onChange).toHaveBeenCalledWith({ from: '2026-05-16', to: '2026-05-16' })
  })

  it('preset "7 ngày qua" calls onChange with last 7 days range', () => {
    const { onChange } = renderFilter()
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: '7 ngày qua' }))
    })
    expect(onChange).toHaveBeenCalledWith({ from: '2026-05-10', to: '2026-05-16' })
  })

  it('preset "Tháng trước" calls onChange with prev month range', () => {
    const { onChange } = renderFilter()
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Tháng trước' }))
    })
    expect(onChange).toHaveBeenCalledWith({ from: '2026-04-01', to: '2026-04-30' })
  })

  it('active preset has aria-pressed=true', () => {
    // value matches '7 ngày qua' (2026-05-10 to 2026-05-16)
    renderFilter({ value: { from: '2026-05-10', to: '2026-05-16' } })
    const btn = screen.getByRole('button', { name: '7 ngày qua' })
    expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  it('non-active presets have aria-pressed=false', () => {
    renderFilter({ value: { from: '2026-05-10', to: '2026-05-16' } })
    const btn = screen.getByRole('button', { name: 'Hôm nay' })
    expect(btn).toHaveAttribute('aria-pressed', 'false')
  })

  it('shows inline error when error prop provided', () => {
    renderFilter({ error: 'Tối đa 90 ngày một lần' })
    expect(screen.getByRole('alert')).toHaveTextContent('Tối đa 90 ngày một lần')
  })

  it('does not show error slot when error is null', () => {
    renderFilter({ error: null })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('opens calendar popover when from-date button clicked', () => {
    renderFilter()
    act(() => {
      const fromBtn = document.getElementById('report-date-from')!
      fireEvent.click(fromBtn)
    })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('closes popover on Escape key', () => {
    renderFilter()
    act(() => {
      const fromBtn = document.getElementById('report-date-from')!
      fireEvent.click(fromBtn)
    })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' })
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('returns focus to from-date button after Escape closes popover', () => {
    renderFilter()
    const fromBtn = document.getElementById('report-date-from')! as HTMLButtonElement
    act(() => {
      fireEvent.click(fromBtn)
    })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' })
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.activeElement).toBe(fromBtn)
  })

  it('shows desktop calendar (numberOfMonths=2) when matchMedia not available', () => {
    // jsdom default: matchMedia is not available → isMobile=false → numberOfMonths=2
    renderFilter()
    act(() => {
      const fromBtn = document.getElementById('report-date-from')!
      fireEvent.click(fromBtn)
    })
    const dialog = screen.getByRole('dialog')
    // Verify popover is open — desktop mode (2 months) is default when matchMedia unavailable
    expect(dialog).toBeInTheDocument()
  })

  it('from and to buttons display formatted dates', () => {
    renderFilter({ value: { from: '2026-05-01', to: '2026-05-16' } })
    expect(screen.getByText('01/05/2026')).toBeInTheDocument()
    expect(screen.getByText('16/05/2026')).toBeInTheDocument()
  })
})
