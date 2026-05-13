import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/dexie'
import { useDebouncedValue } from '../../features/menu/hooks'
import { useCartStore } from '../../features/orders/cart-store'
import { PosShell } from './pos-shell'

const categories = [
  { id: 'cat-coffee', name: 'Cà phê', sortOrder: 2, isActive: true },
  { id: 'cat-tea', name: 'Trà', sortOrder: 1, isActive: true },
  { id: 'cat-hidden', name: 'Ẩn', sortOrder: 0, isActive: false },
]

const products = [
  { id: 'p-hidden', name: 'Ẩn product', categoryId: 'cat-tea', priceVnd: 1000, isActive: false, sortOrder: 0, optionGroupIds: [] },
  { id: 'p-bac', name: 'Bạc Xỉu', categoryId: 'cat-coffee', priceVnd: 35000, isActive: true, sortOrder: 2, optionGroupIds: ['og-milk'] },
  { id: 'p-den', name: 'Cà phê đen', categoryId: 'cat-coffee', priceVnd: 30000, isActive: true, sortOrder: 1, optionGroupIds: [] },
  { id: 'p-tra', name: 'Trà đào', categoryId: 'cat-tea', priceVnd: 45000, isActive: true, sortOrder: 1, optionGroupIds: [] },
]

async function seedMenu() {
  await act(async () => {
    await db.categories.bulkPut(categories)
    await db.products.bulkPut(products)
  })
}

async function seedOptions() {
  await act(async () => {
    await db.optionGroups.bulkPut([
      { id: 'og-size', name: 'Size', isRequired: true, minSelect: 1, maxSelect: 1, sortOrder: 1, optionIds: ['o-m', 'o-l'] },
      { id: 'og-sugar', name: 'Đường', isRequired: true, minSelect: 1, maxSelect: 1, sortOrder: 3, optionIds: ['o-50', 'o-100'] },
      { id: 'og-topping', name: 'Topping', isRequired: false, minSelect: 0, maxSelect: 2, sortOrder: 4, optionIds: ['o-pearl', 'o-flan', 'o-ice'] },
    ])
    await db.products.update('p-bac', { optionGroupIds: ['og-topping', 'og-size', 'og-sugar'] })
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
}

function renderPosShell() {
  return render(<MemoryRouter><PosShell /></MemoryRouter>)
}

beforeEach(async () => {
  await db.open()
  await db.categories.clear()
  await db.products.clear()
  await db.optionGroups.clear()
  await db.options.clear()
  useCartStore.getState().resetCart()
})

afterEach(async () => {
  vi.useRealTimers()
  await db.categories.clear()
  await db.products.clear()
  await db.optionGroups.clear()
  await db.options.clear()
  useCartStore.getState().resetCart()
  db.close()
})

describe('PosShell product browsing', () => {
  it('selects first active sorted category by default and filters active products', async () => {
    await seedMenu(); renderPosShell()
    expect(await screen.findByRole('button', { name: 'Trà' })).toHaveAttribute('aria-current', 'true')
    const grid = await screen.findByLabelText('Lưới sản phẩm')
    expect(within(grid).getByRole('button', { name: 'Trà đào, 45.000 ₫' })).toBeInTheDocument()
    expect(screen.queryByText('Ẩn product')).not.toBeInTheDocument()
  })

  it('clicks category, sorts products, formats price, and shows option indicator', async () => {
    await seedMenu(); const user = userEvent.setup(); renderPosShell()
    await user.click(await screen.findByRole('button', { name: 'Cà phê' }))
    expect(within(screen.getByLabelText('Lưới sản phẩm')).getAllByRole('button').map((tile) => tile.textContent)).toEqual(['Cà phê đen30.000 ₫', 'Bạc Xỉu35.000 ₫Có tùy chọn'])
  })

  it('debounces search for exactly 200ms deterministically', () => {
    vi.useFakeTimers()
    function DebounceProbe({ value }: { value: string }) { return <output role="status">{useDebouncedValue(value, 200)}</output> }
    const { rerender } = render(<DebounceProbe value="" />)
    rerender(<DebounceProbe value="first" />); act(() => vi.advanceTimersByTime(199)); expect(screen.getByRole('status')).toHaveTextContent('')
    rerender(<DebounceProbe value="latest" />); act(() => vi.advanceTimersByTime(200)); expect(screen.getByRole('status')).toHaveTextContent('latest')
  })

  it('normalizes Vietnamese accents when searching products', async () => {
    await seedMenu(); const user = userEvent.setup(); renderPosShell()
    await user.click(await screen.findByRole('button', { name: 'Cà phê' }))
    await user.type(screen.getByLabelText('Tìm sản phẩm'), 'bac')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Bạc Xỉu, 35.000 ₫, có tùy chọn' })).toBeInTheDocument())
  })

  it('renders empty states for no matches and empty menu cache', async () => {
    await seedMenu(); const user = userEvent.setup(); const { unmount } = renderPosShell()
    await user.type(await screen.findByLabelText('Tìm sản phẩm'), 'khong co mon nay')
    expect(await screen.findByText('Không tìm thấy sản phẩm phù hợp.')).toBeInTheDocument()
    unmount(); await act(async () => { await db.categories.clear(); await db.products.clear() })
    renderPosShell(); expect(await screen.findByText('Chưa có dữ liệu menu. Hãy kết nối mạng để tải menu.')).toBeInTheDocument()
  })

  it('opens option modal from ProductTile keyboard activation', async () => {
    await seedMenu(); const user = userEvent.setup(); renderPosShell()
    await user.click(await screen.findByRole('button', { name: 'Cà phê' }))
    const tile = screen.getByRole('button', { name: 'Bạc Xỉu, 35.000 ₫, có tùy chọn' })
    tile.focus(); await user.keyboard('{Enter}')
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Tùy chọn: Bạc Xỉu' })).toBeInTheDocument()
  })

  it('validates groups, enforces max, previews price, note, roles, and stores cart snapshot', async () => {
    await seedMenu(); await seedOptions(); const user = userEvent.setup(); renderPosShell()
    await user.click(await screen.findByRole('button', { name: 'Cà phê' }))
    await user.click(screen.getByRole('button', { name: 'Bạc Xỉu, 35.000 ₫, có tùy chọn' }))
    expect(await screen.findByRole('heading', { name: 'Tùy chọn: Bạc Xỉu' })).toBeInTheDocument()
    expect((await screen.findAllByRole('group')).map((g) => g.getAttribute('aria-label'))).toEqual(['Size', 'Đường', 'Topping'])
    expect(screen.getByRole('radio', { name: /M/ })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('button', { name: /Thêm vào giỏ/ })).toBeDisabled()
    expect(screen.getAllByText('Chọn Đường để tiếp tục').length).toBeGreaterThan(0)
    await user.click(screen.getByRole('radio', { name: /L/ }))
    await user.click(screen.getByRole('radio', { name: /50% đường/ }))
    expect(screen.getByRole('button', { name: /40.000 ₫/ })).toBeEnabled()
    await user.click(screen.getByRole('checkbox', { name: /Trân châu/ }))
    await user.click(screen.getByRole('checkbox', { name: /Flan/ }))
    await user.click(screen.getByRole('checkbox', { name: /Kem/ }))
    expect(await screen.findByText('Tối đa 2 topping')).toBeInTheDocument()
    await user.type(screen.getByPlaceholderText('Ghi chú (tùy chọn)'), 'ít đường, không đá')
    await user.click(screen.getByRole('button', { name: /Thêm vào giỏ/ }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByRole('heading', { name: 'Bạc Xỉu' })).toBeInTheDocument()
    const [item] = useCartStore.getState().items
    expect(item).toBeDefined()
    expect(item!).toMatchObject({ productId: 'p-bac', productNameSnapshot: 'Bạc Xỉu', unitPriceSnapshot: 35000, note: 'ít đường, không đá', quantity: 1, lineTotal: 52000 })
    expect(item!.options.map((option) => option.labelSnapshot)).toEqual(['L', '50% đường', 'Trân châu', 'Flan'])
  })

  it('keeps missing option group safe and add disabled', async () => {
    await seedMenu(); const user = userEvent.setup(); renderPosShell()
    await user.click(await screen.findByRole('button', { name: 'Cà phê' }))
    await user.click(screen.getByRole('button', { name: 'Bạc Xỉu, 35.000 ₫, có tùy chọn' }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Thêm vào giỏ/ })).toBeDisabled()
  })

  it('renders cart empty state, adds direct item, updates quantity, note, discount, and total', async () => {
    await seedMenu(); const user = userEvent.setup(); renderPosShell()
    expect(await screen.findByText('Chọn món để bắt đầu đơn.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hoàn tất' })).toBeDisabled()
    await user.click(await screen.findByRole('button', { name: 'Trà đào, 45.000 ₫' }))
    expect(screen.getByRole('heading', { name: 'Trà đào' })).toBeInTheDocument()
    expect(screen.getAllByText('45.000 ₫').length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: 'Tăng Trà đào' }))
    expect(screen.getByLabelText('Số lượng hiện tại')).toHaveTextContent('2')
    expect(screen.getAllByText('90.000 ₫').length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: 'Sửa ghi chú' }))
    await user.type(screen.getByLabelText('Ghi chú món'), 'ít đá')
    await user.click(screen.getByRole('button', { name: 'Lưu ghi chú' }))
    expect(screen.getByText('Ghi chú: ít đá')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Giá trị giảm'), '10')
    await user.click(screen.getByRole('button', { name: 'Áp dụng' }))
    expect(screen.getByText('-10 ₫')).toBeInTheDocument()
    expect(screen.getByText('89.990 ₫')).toBeInTheDocument()
  })

  it('confirms removing multi-quantity lines and keeps cart snapshots across menu updates', async () => {
    await seedMenu(); const user = userEvent.setup(); renderPosShell()
    await user.click(await screen.findByRole('button', { name: 'Trà đào, 45.000 ₫' }))
    await user.click(screen.getByRole('button', { name: 'Tăng Trà đào' }))
    await act(async () => { await db.products.update('p-tra', { name: 'Trà đào mới', priceVnd: 99000 }) })
    const cartPanel = screen.getByLabelText('Giỏ hàng và thanh toán')
    expect(within(cartPanel).getByRole('heading', { name: 'Trà đào' })).toBeInTheDocument()
    expect(within(cartPanel).queryByText('Trà đào mới')).not.toBeInTheDocument()
    await user.click(within(cartPanel).getByRole('button', { name: 'Xóa Trà đào' }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Xóa dòng' }))
    await waitFor(() => expect(screen.getByText('Chọn món để bắt đầu đơn.')).toBeInTheDocument())
  })
})
