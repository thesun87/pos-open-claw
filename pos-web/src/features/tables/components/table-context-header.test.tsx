import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TableContextHeader } from './table-context-header'

function renderHeader(props: Partial<React.ComponentProps<typeof TableContextHeader>> = {}) {
  const defaults = {
    tableName: '3',
    areaName: 'Quầy chính',
    onChangeTable: vi.fn(),
    onCancelTable: vi.fn(),
  }
  render(<TableContextHeader {...defaults} {...props} />)
  return { ...defaults, ...props }
}

describe('TableContextHeader', () => {
  it('renders tableName and areaName correctly (AC2)', () => {
    renderHeader()
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Bàn 3')
    expect(screen.getByText('Quầy chính')).toBeInTheDocument()
  })

  it('has role=banner with aria-label containing table name (AC2)', () => {
    renderHeader()
    expect(screen.getByRole('banner')).toHaveAttribute('aria-label', 'Đang phục vụ Bàn 3')
  })

  it('renders "Đổi bàn" and "Hủy chọn bàn" buttons (AC2)', () => {
    renderHeader()
    expect(screen.getByRole('button', { name: 'Đổi bàn' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hủy chọn bàn' })).toBeInTheDocument()
  })

  it('calls onChangeTable when "Đổi bàn" is clicked (AC9)', async () => {
    const onChangeTable = vi.fn()
    const user = userEvent.setup()
    renderHeader({ onChangeTable })
    await user.click(screen.getByRole('button', { name: 'Đổi bàn' }))
    expect(onChangeTable).toHaveBeenCalledTimes(1)
  })

  it('calls onCancelTable when "Hủy chọn bàn" is clicked (AC10)', async () => {
    const onCancelTable = vi.fn()
    const user = userEvent.setup()
    renderHeader({ onCancelTable })
    await user.click(screen.getByRole('button', { name: 'Hủy chọn bàn' }))
    expect(onCancelTable).toHaveBeenCalledTimes(1)
  })

  it('applies sticky class to header element (AC2)', () => {
    renderHeader()
    const header = screen.getByRole('banner')
    expect(header.className).toContain('sticky')
  })

  it('renders different tableName when prop changes (AC2)', () => {
    renderHeader({ tableName: '7', areaName: 'Tầng 2' })
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Bàn 7')
    expect(screen.getByText('Tầng 2')).toBeInTheDocument()
    expect(screen.getByRole('banner')).toHaveAttribute('aria-label', 'Đang phục vụ Bàn 7')
  })
})
