import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../../../shared/lib/api-client'
import { usePosTableContextStore } from '../store'
import { FloorPlanView } from './floor-plan-view'

vi.mock('../../../shared/lib/api-client', () => ({
  apiClient: { get: vi.fn() },
}))

const mockedApi = vi.mocked(apiClient)

const mockStoreMeTableMode = { id: 's1', name: 'Store', code: 'S1', tableMode: true, createdAt: '', updatedAt: '' }

const mockAreas = [
  { id: 'area-1', name: 'Quầy chính', sortOrder: 10, isActive: true, createdAt: '', updatedAt: '' },
  { id: 'area-2', name: 'Sân ngoài', sortOrder: 20, isActive: true, createdAt: '', updatedAt: '' },
]

const mockTables = [
  { id: 'tbl-1', areaId: 'area-1', name: 'Bàn 1', capacity: 2, sortOrder: 10, isActive: true, createdAt: '', updatedAt: '' },
  { id: 'tbl-2', areaId: 'area-1', name: 'Bàn 2', capacity: 4, sortOrder: 20, isActive: true, createdAt: '', updatedAt: '' },
  { id: 'tbl-3', areaId: 'area-2', name: 'Bàn 3', capacity: 2, sortOrder: 10, isActive: true, createdAt: '', updatedAt: '' },
]

const mockStatus = [
  { tableId: 'tbl-1', status: 'empty', activeOrderCount: 0 },
  { tableId: 'tbl-2', status: 'occupied', activeOrderCount: 1 },
  { tableId: 'tbl-3', status: 'empty', activeOrderCount: 0 },
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

beforeEach(() => {
  vi.resetAllMocks()
  usePosTableContextStore.getState().reset()
})

afterEach(() => {
  usePosTableContextStore.getState().reset()
})

describe('FloorPlanView', () => {
  it('shows loading skeleton while fetching', async () => {
    mockedApi.get.mockImplementation(() => new Promise(() => {})) // never resolves
    renderFloorPlan()
    // While storeMe is loading, tableMode isLoading=true → FloorPlanView shows skeletons
    await waitFor(() =>
      expect(screen.getAllByRole('status', { name: 'Đang tải' }).length).toBeGreaterThan(0),
    )
  })

  it('shows empty state when no tables configured with "Vào Bán hàng nhanh" button', async () => {
    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/stores/me') return Promise.resolve({ data: mockStoreMeTableMode })
      if (url === '/areas') return Promise.resolve({ data: mockAreas })
      if (url === '/tables') return Promise.resolve({ data: [] }) // empty
      if (url === '/tables/status') return Promise.resolve({ data: [] })
      return Promise.reject(new Error(`Unexpected: ${url}`))
    })
    renderFloorPlan()
    expect(await screen.findByText('Chưa cấu hình bàn. Vui lòng liên hệ quản trị viên để thêm bàn cho store.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Vào Bán hàng nhanh' })).toBeInTheDocument()
  })

  it('"Vào Bán hàng nhanh" sets quickCounterMode=true', async () => {
    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/stores/me') return Promise.resolve({ data: mockStoreMeTableMode })
      if (url === '/areas') return Promise.resolve({ data: mockAreas })
      if (url === '/tables') return Promise.resolve({ data: [] })
      if (url === '/tables/status') return Promise.resolve({ data: [] })
      return Promise.reject(new Error(`Unexpected: ${url}`))
    })
    const user = userEvent.setup()
    renderFloorPlan()
    const btn = await screen.findByRole('button', { name: 'Vào Bán hàng nhanh' })
    await user.click(btn)
    await waitFor(() => expect(usePosTableContextStore.getState().quickCounterMode).toBe(true))
  })

  it('shows error card when tables fail to load with retry button', async () => {
    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/stores/me') return Promise.resolve({ data: mockStoreMeTableMode })
      if (url === '/areas') return Promise.resolve({ data: mockAreas })
      if (url === '/tables') return Promise.reject(new Error('500 Internal Server Error'))
      if (url === '/tables/status') return Promise.resolve({ data: [] })
      return Promise.reject(new Error(`Unexpected: ${url}`))
    })
    renderFloorPlan()
    expect(await screen.findByRole('heading', { name: 'Không tải được danh sách bàn' })).toBeInTheDocument()
    expect(screen.getByText('Vui lòng thử lại. Dữ liệu kỹ thuật đã được ẩn để bảo vệ hệ thống.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument()
  })

  it('shows warning banner when status query errors', async () => {
    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/stores/me') return Promise.resolve({ data: mockStoreMeTableMode })
      if (url === '/areas') return Promise.resolve({ data: mockAreas })
      if (url === '/tables') return Promise.resolve({ data: mockTables })
      if (url === '/tables/status') return Promise.reject(new Error('status error'))
      return Promise.reject(new Error(`Unexpected: ${url}`))
    })
    renderFloorPlan()
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Không cập nhật được trạng thái bàn. Sẽ tự thử lại.',
      ),
    )
  })

  it('renders floor plan with area tabs and table cards when data loads', async () => {
    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/stores/me') return Promise.resolve({ data: mockStoreMeTableMode })
      if (url === '/areas') return Promise.resolve({ data: mockAreas })
      if (url === '/tables') return Promise.resolve({ data: mockTables })
      if (url === '/tables/status') return Promise.resolve({ data: mockStatus })
      return Promise.reject(new Error(`Unexpected: ${url}`))
    })
    renderFloorPlan()
    // Area tabs
    expect(await screen.findByRole('tablist', { name: 'Khu vực' })).toBeInTheDocument()
    // Tables for auto-selected first area (area-1)
    expect(screen.getByRole('button', { name: 'Bàn Bàn 1, 2 chỗ, Trống' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bàn Bàn 2, 4 chỗ, Đang phục vụ' })).toBeInTheDocument()
  })

  it('clicking an empty table calls setSelectedTable', async () => {
    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/stores/me') return Promise.resolve({ data: mockStoreMeTableMode })
      if (url === '/areas') return Promise.resolve({ data: mockAreas })
      if (url === '/tables') return Promise.resolve({ data: mockTables })
      if (url === '/tables/status') return Promise.resolve({ data: mockStatus })
      return Promise.reject(new Error(`Unexpected: ${url}`))
    })
    const user = userEvent.setup()
    renderFloorPlan()
    await user.click(await screen.findByRole('button', { name: 'Bàn Bàn 1, 2 chỗ, Trống' }))
    expect(usePosTableContextStore.getState().selectedTableId).toBe('tbl-1')
    expect(usePosTableContextStore.getState().selectedTableName).toBe('Bàn 1')
  })

  it('auto-selects first area when selectedAreaId is null', async () => {
    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/stores/me') return Promise.resolve({ data: mockStoreMeTableMode })
      if (url === '/areas') return Promise.resolve({ data: mockAreas })
      if (url === '/tables') return Promise.resolve({ data: mockTables })
      if (url === '/tables/status') return Promise.resolve({ data: mockStatus })
      return Promise.reject(new Error(`Unexpected: ${url}`))
    })
    renderFloorPlan()
    await waitFor(() =>
      expect(usePosTableContextStore.getState().selectedAreaId).toBe('area-1'),
    )
  })
})
