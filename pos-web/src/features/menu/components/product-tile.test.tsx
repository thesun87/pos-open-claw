import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ProductTile } from './product-tile'

const baseProduct = {
  name: 'Bạc Xỉu',
  priceVnd: 35000,
  optionGroupIds: [],
}

describe('ProductTile', () => {
  it('renders Obsidian image-card placeholder initials and accessible price label', () => {
    render(<ProductTile product={baseProduct} onSelect={vi.fn()} />)

    const tile = screen.getByRole('button', { name: 'Bạc Xỉu, 35.000 ₫' })
    expect(tile).toHaveClass('aspect-[4/4.6]', 'bg-surface-container-lowest')
    expect(screen.getByText('BX')).toBeInTheDocument()
    expect(screen.queryByText('Tùy chọn')).not.toBeInTheDocument()
  })

  it('shows Tùy chọn badge in the top-right for products with option groups', () => {
    render(<ProductTile product={{ ...baseProduct, optionGroupIds: ['og-size'] }} onSelect={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Bạc Xỉu, 35.000 ₫, có tùy chọn' })).toBeInTheDocument()
    expect(screen.getByText('Tùy chọn')).toHaveClass('absolute', 'right-3', 'top-3', 'bg-surface/95', 'text-primary')
  })

  it('calls onSelect when activated', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<ProductTile product={baseProduct} onSelect={onSelect} />)

    await user.click(screen.getByRole('button', { name: 'Bạc Xỉu, 35.000 ₫' }))

    expect(onSelect).toHaveBeenCalledTimes(1)
  })
})
