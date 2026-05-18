import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PosCategorySidebar } from './pos-category-sidebar'

const categories = [
  { id: 'coffee', name: 'Cà phê', sortOrder: 1, isActive: true },
  { id: 'tea', name: 'Trà', sortOrder: 2, isActive: true },
]

describe('PosCategorySidebar', () => {
  it('renders vertical active category navigation with selected page cue', () => {
    render(<PosCategorySidebar categories={categories} selectedCategoryId="coffee" onSelect={vi.fn()} />)

    const nav = screen.getByRole('navigation', { name: 'Danh mục sản phẩm' })
    expect(nav).toHaveClass('fixed', 'left-0', 'top-16', 'w-24')
    expect(screen.getByRole('button', { name: 'Cà phê' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Cà phê' })).toHaveClass('bg-primary-container')
    expect(screen.getByRole('button', { name: 'Trà' })).not.toHaveAttribute('aria-current')
  })

  it('selects categories by click and arrow-key navigation', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<PosCategorySidebar categories={categories} selectedCategoryId="coffee" onSelect={onSelect} />)

    await user.click(screen.getByRole('button', { name: 'Trà' }))
    expect(onSelect).toHaveBeenLastCalledWith('tea')

    screen.getByRole('button', { name: 'Cà phê' }).focus()
    await user.keyboard('{ArrowDown}')
    expect(onSelect).toHaveBeenLastCalledWith('tea')
    expect(screen.getByRole('button', { name: 'Trà' })).toHaveFocus()
  })
})
