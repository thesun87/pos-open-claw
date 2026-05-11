import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/dexie'
import { useDebouncedValue } from '../../features/menu/hooks'
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

function renderPosShell() {
  return render(
    <MemoryRouter>
      <PosShell />
    </MemoryRouter>,
  )
}

beforeEach(async () => {
  await db.open()
  await db.categories.clear()
  await db.products.clear()
})

afterEach(async () => {
  vi.useRealTimers()
  await db.categories.clear()
  await db.products.clear()
  db.close()
})

describe('PosShell product browsing', () => {
  it('selects first active sorted category by default and filters active products', async () => {
    await seedMenu()
    renderPosShell()

    const teaCategory = await screen.findByRole('button', { name: 'Trà' })
    expect(teaCategory).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('button', { name: 'Cà phê' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ẩn' })).not.toBeInTheDocument()

    const grid = await screen.findByLabelText('Lưới sản phẩm')
    expect(within(grid).getByRole('button', { name: 'Trà đào, 45.000 ₫' })).toBeInTheDocument()
    expect(screen.queryByText('Ẩn product')).not.toBeInTheDocument()
  })

  it('clicks category, sorts products, formats price, and shows option indicator', async () => {
    await seedMenu()
    const user = userEvent.setup()
    renderPosShell()

    await user.click(await screen.findByRole('button', { name: 'Cà phê' }))

    const tiles = within(screen.getByLabelText('Lưới sản phẩm')).getAllByRole('button')
    expect(tiles.map((tile) => tile.textContent)).toEqual(['Cà phê đen30.000 ₫', 'Bạc Xỉu35.000 ₫Có tùy chọn'])
    expect(screen.getByText('Có tùy chọn')).toBeInTheDocument()
  })

  it('debounces search for exactly 200ms deterministically', () => {
    vi.useFakeTimers()

    function DebounceProbe({ value }: { value: string }) {
      return <output role="status">{useDebouncedValue(value, 200)}</output>
    }

    const { rerender } = render(<DebounceProbe value="" />)
    rerender(<DebounceProbe value="first" />)
    act(() => {
      vi.advanceTimersByTime(199)
    })
    expect(screen.getByRole('status')).toHaveTextContent('')

    rerender(<DebounceProbe value="latest" />)
    act(() => {
      vi.advanceTimersByTime(199)
    })
    expect(screen.getByRole('status')).toHaveTextContent('')

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(screen.getByRole('status')).toHaveTextContent('latest')
  })

  it('normalizes Vietnamese accents when searching products', async () => {
    await seedMenu()
    const user = userEvent.setup()
    renderPosShell()

    await user.click(await screen.findByRole('button', { name: 'Cà phê' }))
    await user.type(screen.getByLabelText('Tìm sản phẩm'), 'bac')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Bạc Xỉu, 35.000 ₫, có tùy chọn' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Cà phê đen, 30.000 ₫' })).not.toBeInTheDocument()
    })
  })

  it('renders empty states for no matches and empty menu cache', async () => {
    await seedMenu()
    const user = userEvent.setup()
    const { unmount } = renderPosShell()

    await user.type(await screen.findByLabelText('Tìm sản phẩm'), 'khong co mon nay')
    expect(await screen.findByText('Không tìm thấy sản phẩm phù hợp.')).toBeInTheDocument()

    unmount()
    await act(async () => {
      await db.categories.clear()
      await db.products.clear()
    })
    renderPosShell()
    expect(await screen.findByText('Chưa có dữ liệu menu. Hãy kết nối mạng để tải menu.')).toBeInTheDocument()
  })

  it('supports ProductTile keyboard activation and option placeholder seam', async () => {
    await seedMenu()
    const user = userEvent.setup()
    renderPosShell()

    await user.click(await screen.findByRole('button', { name: 'Cà phê' }))
    const tile = screen.getByRole('button', { name: 'Bạc Xỉu, 35.000 ₫, có tùy chọn' })
    tile.focus()
    await user.keyboard('{Enter}')

    expect(await screen.findByText('Tùy chọn cho Bạc Xỉu sẽ được cấu hình ở Story 2.3.')).toBeInTheDocument()
  })
})
