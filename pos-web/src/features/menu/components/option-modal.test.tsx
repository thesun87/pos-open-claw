import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../../db/dexie'
import type { MenuProductRecord } from '../../../db/schemas/menu'
import { OptionModal } from './option-modal'

const product: MenuProductRecord = { id: 'p-bac', name: 'Bạc Xỉu', categoryId: 'cat-coffee', priceVnd: 35000, isActive: true, sortOrder: 1, optionGroupIds: ['og-size', 'og-sugar', 'og-topping'] }

beforeEach(async () => {
  await db.open()
  await db.optionGroups.clear()
  await db.options.clear()
  await act(async () => {
    await db.optionGroups.bulkPut([
      { id: 'og-size', name: 'Size', isRequired: true, minSelect: 1, maxSelect: 1, sortOrder: 1, optionIds: ['o-m', 'o-l'] },
      { id: 'og-sugar', name: 'Đường', isRequired: true, minSelect: 1, maxSelect: 1, sortOrder: 2, optionIds: ['o-50', 'o-100'] },
      { id: 'og-topping', name: 'Topping', isRequired: false, minSelect: 0, maxSelect: 2, sortOrder: 3, optionIds: ['o-pearl', 'o-flan', 'o-ice'] },
    ])
    await db.options.bulkPut([
      { id: 'o-m', optionGroupId: 'og-size', label: 'M', priceDeltaVnd: 0, isDefault: true, sortOrder: 1 },
      { id: 'o-l', optionGroupId: 'og-size', label: 'L', priceDeltaVnd: 5000, isDefault: false, sortOrder: 2 },
      { id: 'o-50', optionGroupId: 'og-sugar', label: '50% đường', priceDeltaVnd: 0, isDefault: false, sortOrder: 1 },
      { id: 'o-100', optionGroupId: 'og-sugar', label: '100% đường', priceDeltaVnd: 0, isDefault: false, sortOrder: 2 },
      { id: 'o-pearl', optionGroupId: 'og-topping', label: 'Trân châu', priceDeltaVnd: 5000, isDefault: false, sortOrder: 1 },
      { id: 'o-flan', optionGroupId: 'og-topping', label: 'Flan', priceDeltaVnd: 7000, isDefault: false, sortOrder: 2 },
      { id: 'o-ice', optionGroupId: 'og-topping', label: 'Kem', priceDeltaVnd: 3000, isDefault: false, sortOrder: 3 },
    ])
  })
})

afterEach(async () => {
  await db.optionGroups.clear()
  await db.options.clear()
  db.close()
})

describe('OptionModal', () => {
  it('renders product title without prefix, one close control, and two-column option sections', async () => {
    render(<OptionModal product={product} open onOpenChange={vi.fn()} onAddToCart={vi.fn()} />)

    expect(await screen.findByRole('heading', { name: 'Bạc Xỉu' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Tùy chọn:/ })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Đóng' })).toHaveLength(1)
    await screen.findByRole('group', { name: 'Topping' })
    expect(screen.getByRole('group', { name: 'Topping' }).querySelector('.grid')).toHaveClass('grid-cols-2')
    expect(screen.getByRole('checkbox', { name: /Kem/ })).toHaveClass('col-span-2')
  })

  it('shows selected chip state, required error ring, subtotal updates, and add payload with note', async () => {
    const user = userEvent.setup()
    const onAddToCart = vi.fn()
    render(<OptionModal product={product} open onOpenChange={vi.fn()} onAddToCart={onAddToCart} />)
    await screen.findByRole('heading', { name: 'Bạc Xỉu' })
    await screen.findByRole('radio', { name: 'M' })

    expect(screen.getByRole('radio', { name: 'M' })).toHaveClass('border-2', 'border-primary', 'bg-primary-container')
    expect(screen.getByText('Chọn Đường để tiếp tục')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Đường' })).toHaveClass('ring-2', 'ring-error/40')

    await user.click(screen.getByRole('radio', { name: /L/ }))
    await user.click(screen.getByRole('radio', { name: /50% đường/ }))
    await user.click(screen.getByRole('checkbox', { name: /Trân châu/ }))
    expect(screen.getByText('45.000 ₫')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Ghi chú'), 'ít đá')
    await user.click(screen.getByRole('button', { name: /Thêm vào giỏ 45.000 ₫/ }))

    expect(onAddToCart).toHaveBeenCalledWith(expect.objectContaining({ productId: 'p-bac', note: 'ít đá', lineTotal: 45000 }))
    expect(onAddToCart.mock.calls[0]?.[0].options.map((option: { labelSnapshot: string }) => option.labelSnapshot)).toEqual(['L', '50% đường', 'Trân châu'])
  })

  it('closes on Escape through Radix Dialog', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(<OptionModal product={product} open onOpenChange={onOpenChange} onAddToCart={vi.fn()} />)
    await screen.findByRole('dialog')

    await user.keyboard('{Escape}')

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })
})
