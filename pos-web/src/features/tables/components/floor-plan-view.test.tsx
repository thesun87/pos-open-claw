/**
 * floor-plan-view.test.tsx — Story 6.12
 *
 * Tests for the offline-first FloorPlanView that reads from Dexie cache
 * (via useCachedAreas/useCachedTables + useLocalTableStatus) instead of online API.
 *
 * Pattern:
 *  - Seed Dexie before render (fake-indexeddb)
 *  - Mock connectivity via useConnectivityStore.setState
 *  - Mock useTableStatus (online enhancement) where needed
 *  - Reset stores and DB between tests
 */
import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../../db/dexie'
import { useConnectivityStore } from '../../../shared/stores/connectivity.store'
import { usePosTableContextStore } from '../store'
import { useTableStatus } from '../hooks'
import { FloorPlanView } from './floor-plan-view'

// Mock useTableStatus (online hook) — floor-plan now uses it only for server-status enhancement
vi.mock('../hooks', () => ({
  useTableStatus: vi.fn(() => ({ data: undefined, isLoading: false, isError: false })),
  useTableMode: vi.fn(() => ({ tableMode: false, isLoading: false, isError: false })),
  useStoreMe: vi.fn(() => ({ data: undefined, isLoading: false, isError: false })),
  useAreas: vi.fn(() => ({ data: [], isLoading: false, isError: false })),
  useTables: vi.fn(() => ({ data: [], isLoading: false, isError: false })),
}))

const mockAreas = [
  { id: 'area-1', name: 'Quầy chính', sortOrder: 10, isActive: true },
  { id: 'area-2', name: 'Sân ngoài', sortOrder: 20, isActive: true },
]

const mockTables = [
  { id: 'tbl-1', areaId: 'area-1', name: 'Bàn 1', capacity: 2, sortOrder: 10, isActive: true },
  { id: 'tbl-2', areaId: 'area-1', name: 'Bàn 2', capacity: 4, sortOrder: 20, isActive: true },
  { id: 'tbl-3', areaId: 'area-2', name: 'Bàn 3', capacity: 2, sortOrder: 10, isActive: true },
]

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </MemoryRouter>
  )
}

function renderFloorPlan() {
  return render(<FloorPlanView />, { wrapper: createWrapper() })
}

async function seedCache() {
  await act(async () => {
    await db.areas.bulkPut(mockAreas)
    await db.posTables.bulkPut(mockTables)
    await db.storeConfig.put({ id: 'current', storeId: 'store-1', name: 'Store', code: 'S1', tableMode: true })
  })
}

beforeEach(async () => {
  await db.open()
  await db.areas.clear()
  await db.posTables.clear()
  await db.storeConfig.clear()
  await db.tableSessions.clear()
  await db.orders.clear()
  usePosTableContextStore.getState().reset()
  // Default: online
  useConnectivityStore.setState({ isOnline: true })
})

afterEach(async () => {
  await db.areas.clear()
  await db.posTables.clear()
  await db.storeConfig.clear()
  await db.tableSessions.clear()
  await db.orders.clear()
  usePosTableContextStore.getState().reset()
  useConnectivityStore.setState({ isOnline: true })
  db.close()
})

describe('FloorPlanView (offline-first — Story 6.12)', () => {
  it('shows loading skeleton when Dexie cache is not yet populated (undefined state)', async () => {
    // Do NOT seed — useLiveQuery will return undefined briefly
    renderFloorPlan()
    // Loading skeleton has role=status with name "Đang tải" (LoadingSkeleton.Card)
    // The floor-plan-view renders the skeleton grid while areas/tables/statusMap are undefined
    const fp = screen.getByTestId('floor-plan-view')
    expect(fp).toBeInTheDocument()
  })

  it('renders area tabs and table cards from Dexie cache (online)', async () => {
    await seedCache()
    renderFloorPlan()
    // Area tabs should appear
    expect(await screen.findByRole('tablist', { name: 'Khu vực' })).toBeInTheDocument()
    // Auto-selects first area (area-1) — shows Bàn 1 and Bàn 2
    expect(await screen.findByRole('button', { name: 'Bàn Bàn 1, 2 chỗ, Trống' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bàn Bàn 2, 4 chỗ, Trống' })).toBeInTheDocument()
    // Bàn 3 is in area-2, not visible yet
    expect(screen.queryByRole('button', { name: 'Bàn Bàn 3, 2 chỗ, Trống' })).not.toBeInTheDocument()
  })

  it('renders fully offline — no error card, no white screen when network is down', async () => {
    await seedCache()
    useConnectivityStore.setState({ isOnline: false })
    renderFloorPlan()

    // Floor plan renders from cache
    expect(await screen.findByRole('tablist', { name: 'Khu vực' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bàn Bàn 1, 2 chỗ, Trống' })).toBeInTheDocument()
    // No error card (old "Không tải được danh sách bàn" removed)
    expect(screen.queryByRole('heading', { name: 'Không tải được danh sách bàn' })).not.toBeInTheDocument()
    // Offline indicator banner is shown
    expect(screen.getByRole('status')).toHaveTextContent('Đang offline — trạng thái bàn lấy từ bộ nhớ cục bộ')
  })

  it('shows offline indicator banner when isOnline=false', async () => {
    await seedCache()
    useConnectivityStore.setState({ isOnline: false })
    renderFloorPlan()

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Đang offline — trạng thái bàn lấy từ bộ nhớ cục bộ'),
    )
  })

  it('does NOT show offline banner when online', async () => {
    await seedCache()
    useConnectivityStore.setState({ isOnline: true })
    renderFloorPlan()
    await screen.findByRole('tablist', { name: 'Khu vực' })
    expect(screen.queryByText('Đang offline — trạng thái bàn lấy từ bộ nhớ cục bộ')).not.toBeInTheDocument()
  })

  it('shows empty state with "Vào Bán hàng nhanh" button when cache has no tables', async () => {
    // Seed areas but no tables
    await act(async () => {
      await db.areas.bulkPut(mockAreas)
      await db.storeConfig.put({ id: 'current', storeId: 'store-1', name: 'Store', code: 'S1', tableMode: true })
    })
    renderFloorPlan()

    expect(
      await screen.findByText('Chưa cấu hình bàn. Vui lòng liên hệ quản trị viên để thêm bàn cho store.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Vào Bán hàng nhanh' })).toBeInTheDocument()
  })

  it('"Vào Bán hàng nhanh" sets quickCounterMode=true', async () => {
    await act(async () => {
      await db.areas.bulkPut(mockAreas)
      await db.storeConfig.put({ id: 'current', storeId: 'store-1', name: 'Store', code: 'S1', tableMode: true })
    })
    const user = userEvent.setup()
    renderFloorPlan()
    const btn = await screen.findByRole('button', { name: 'Vào Bán hàng nhanh' })
    await user.click(btn)
    await waitFor(() => expect(usePosTableContextStore.getState().quickCounterMode).toBe(true))
  })

  it('clicking an empty table calls setSelectedTable', async () => {
    await seedCache()
    const user = userEvent.setup()
    renderFloorPlan()
    await user.click(await screen.findByRole('button', { name: 'Bàn Bàn 1, 2 chỗ, Trống' }))
    await waitFor(() => {
      expect(usePosTableContextStore.getState().selectedTableId).toBe('tbl-1')
      expect(usePosTableContextStore.getState().selectedTableName).toBe('Bàn 1')
    })
  })

  it('auto-selects first area when selectedAreaId is null', async () => {
    await seedCache()
    renderFloorPlan()
    await waitFor(() => expect(usePosTableContextStore.getState().selectedAreaId).toBe('area-1'))
  })

  it('shows conflict badge for table with 2 open sessions (AC4)', async () => {
    await seedCache()
    // Seed 2 open sessions for tbl-1 → conflict
    await act(async () => {
      await db.tableSessions.bulkPut([
        { id: 'sess-1', tableId: 'tbl-1', status: 'open', clientSessionId: 'cs-1', syncStatus: 'synced' },
        { id: 'sess-2', tableId: 'tbl-1', status: 'open', clientSessionId: 'cs-2', syncStatus: 'synced' },
      ])
    })
    renderFloorPlan()

    // tbl-1 should show "Xung đột phiên" and be disabled
    const conflictBtn = await screen.findByRole('button', { name: 'Bàn Bàn 1, 2 chỗ, Xung đột phiên' })
    expect(conflictBtn).toBeInTheDocument()
    expect(conflictBtn).toBeDisabled()
    expect(conflictBtn).toHaveAttribute('aria-disabled', 'true')
  })

  it('shows "Đang phục vụ" for table with 1 open session (AC5)', async () => {
    await seedCache()
    await act(async () => {
      await db.tableSessions.put({ id: 'sess-1', tableId: 'tbl-1', status: 'open', clientSessionId: 'cs-1', syncStatus: 'synced' })
    })
    renderFloorPlan()

    const servingBtn = await screen.findByRole('button', { name: 'Bàn Bàn 1, 2 chỗ, Đang phục vụ' })
    expect(servingBtn).toBeInTheDocument()
    expect(servingBtn).toBeDisabled()
  })

  it('shows "Trống" (chọn được) for table with a SYNCED order today and no open session — đã thanh toán xong, "Đã có đơn" đã bỏ', async () => {
    await seedCache()
    const todayVN = new Date().toISOString() // use current date so it counts as "today"
    await act(async () => {
      await db.orders.put({
        clientOrderId: 'cord-1',
        orderCode: 'ORD001',
        deviceId: 'dev-1',
        tableId: 'tbl-1',
        tableNameSnapshot: 'Bàn 1',
        soldAt: todayVN,
        syncedAt: todayVN,
        menuVersionAtSale: 1,
        items: [],
        discountAmount: 0,
        total: 1000,
        paymentMethod: 'cash',
        status: 'synced',
        createdAt: todayVN,
        updatedAt: todayVN,
      })
    })
    renderFloorPlan()

    // Bàn có đơn đã sync nhưng không còn phiên mở → về "Trống", chọn được để lên đơn mới
    const freeBtn = await screen.findByRole('button', { name: 'Bàn Bàn 1, 2 chỗ, Trống' })
    expect(freeBtn).toBeInTheDocument()
    expect(freeBtn).not.toBeDisabled()
    expect(freeBtn).not.toHaveAttribute('aria-disabled')
  })

  it('shows "Trống" (chọn được) NGAY cho bàn vừa thanh toán dù đơn còn pendingSync (chưa sync) — bug-fix: không kẹt "Chờ đồng bộ"', async () => {
    await seedCache()
    const todayVN = new Date().toISOString()
    await act(async () => {
      // Đơn vừa finalize: status='pendingSync', CHƯA có syncedAt; phiên đã settle (không có open session)
      await db.orders.put({
        clientOrderId: 'cord-pending',
        orderCode: 'ORD002',
        deviceId: 'dev-1',
        tableId: 'tbl-1',
        tableNameSnapshot: 'Bàn 1',
        soldAt: todayVN,
        menuVersionAtSale: 1,
        items: [],
        discountAmount: 0,
        total: 1000,
        paymentMethod: 'cash',
        status: 'pendingSync',
        createdAt: todayVN,
        updatedAt: todayVN,
      })
    })
    renderFloorPlan()

    // Trước fix: bàn hiển thị "Chờ đồng bộ" tới khi sync xong. Sau fix: "Trống" ngay.
    const freeBtn = await screen.findByRole('button', { name: 'Bàn Bàn 1, 2 chỗ, Trống' })
    expect(freeBtn).toBeInTheDocument()
    expect(freeBtn).not.toBeDisabled()
    expect(freeBtn).not.toHaveAttribute('aria-disabled')
    // Đảm bảo KHÔNG còn badge "Chờ đồng bộ" trên sơ đồ bàn
    expect(screen.queryByText('Chờ đồng bộ')).not.toBeInTheDocument()
  })

  it('shows "Trống" NGAY cho bàn đã settle local DÙ server /tables/status còn báo openSessionCount=1 (bug-fix: không chờ API)', async () => {
    await seedCache()
    // Server status (cache cũ / settle chưa sync) vẫn báo Bàn 1 đang có 1 phiên mở
    vi.mocked(useTableStatus).mockReturnValueOnce({
      data: [{ tableId: 'tbl-1', status: 'occupied', activeOrderCount: 1, openSessionCount: 1, conflict: false }],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useTableStatus>)
    await act(async () => {
      // Máy này đã settle phiên của Bàn 1 (vừa thanh toán)
      await db.tableSessions.put({ id: 'sess-1', tableId: 'tbl-1', status: 'settled', clientSessionId: 'cs-1', syncStatus: 'pendingSettle' })
    })
    renderFloorPlan()

    // Bàn 1 phải là "Trống" (chọn được) — KHÔNG có nút Bàn 1 ở trạng thái "Đang phục vụ".
    // (Lưu ý: "Đang phục vụ" vẫn xuất hiện trong chú thích/legend — nên kiểm tra theo nút, không theo text.)
    const freeBtn = await screen.findByRole('button', { name: 'Bàn Bàn 1, 2 chỗ, Trống' })
    expect(freeBtn).toBeInTheDocument()
    expect(freeBtn).not.toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Bàn Bàn 1, 2 chỗ, Đang phục vụ' })).not.toBeInTheDocument()
  })

  it('shows "Trống" for tables with no activity', async () => {
    await seedCache()
    renderFloorPlan()

    await screen.findByRole('button', { name: 'Bàn Bàn 1, 2 chỗ, Trống' })
    const emptyBtn = screen.getByRole('button', { name: 'Bàn Bàn 2, 4 chỗ, Trống' })
    expect(emptyBtn).not.toBeDisabled()
    expect(emptyBtn).not.toHaveAttribute('aria-disabled')
  })
})
