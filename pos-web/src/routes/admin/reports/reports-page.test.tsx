import '@testing-library/jest-dom/vitest'
import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AxiosError } from 'axios'
import { apiClient } from '../../../shared/lib/api-client'
import ReportsPage from './reports-page'

vi.mock('../../../shared/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}))

const mockApiGet = vi.mocked(apiClient.get)

// Fixed date: VN = 2026-05-16 (UTC+7) — set via fake timers only for date-dependent tests
const FIXED_NOW_UTC = new Date('2026-05-16T10:00:00.000Z')

function renderPage(initialUrl = '/admin/reports') {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, retryDelay: 1, gcTime: 0 },
    },
  })
  let currentLocation = initialUrl
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialUrl]}>
        <Routes>
          <Route
            path="/admin/reports"
            element={
              <>
                <ReportsPage />
                <LocationObserver onChange={(value) => { currentLocation = value }} />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { client, getLocation: () => currentLocation }
}

function LocationObserver({ onChange }: { onChange: (value: string) => void }) {
  const location = useLocation()
  useEffect(() => {
    onChange(`${location.pathname}${location.search}`)
  }, [location, onChange])
  return null
}

const successResponse = {
  revenueByDay: [{ date: '2026-05-10', revenue: 100000, orderCount: 3 }],
  totals: { totalOrders: 10, totalRevenue: 500000 },
  revenueByPaymentMethod: [
    { paymentMethod: 'cash', revenue: 300000, orderCount: 7 },
    { paymentMethod: 'transfer', revenue: 200000, orderCount: 3 },
    { paymentMethod: 'card', revenue: 0, orderCount: 0 },
  ],
  topProducts: [{ productName: 'Bạc Xỉu', totalQuantity: 5, totalRevenue: 200000 }],
}

const emptyResponse = {
  revenueByDay: [{ date: '2026-05-10', revenue: 0, orderCount: 0 }],
  totals: { totalOrders: 0, totalRevenue: 0 },
  revenueByPaymentMethod: [
    { paymentMethod: 'cash', revenue: 0, orderCount: 0 },
    { paymentMethod: 'transfer', revenue: 0, orderCount: 0 },
    { paymentMethod: 'card', revenue: 0, orderCount: 0 },
  ],
  topProducts: [],
}

function make5xxError(status = 500): AxiosError {
  const err = new AxiosError('Server Error')
  err.response = { status, data: {}, headers: {}, config: err.config!, statusText: 'Internal Server Error' }
  return err
}

beforeEach(() => {
  vi.clearAllMocks()
  // Use fake timers only when needed per-test; default real timers for async tests
})

describe('ReportsPage', () => {
  describe('Default range', () => {
    it('sets default range to last 7 days when URL has no params', () => {
      vi.useFakeTimers()
      vi.setSystemTime(FIXED_NOW_UTC)
      mockApiGet.mockResolvedValue({ data: successResponse })
      renderPage('/admin/reports')
      // Verify query is triggered with last 7 days (2026-05-10 to 2026-05-16)
      expect(mockApiGet).toHaveBeenCalledWith('/reports', {
        params: { from: '2026-05-10', to: '2026-05-16', metric: 'all' },
      })
      vi.useRealTimers()
    })

    it('renders page heading', () => {
      mockApiGet.mockResolvedValue({ data: successResponse })
      renderPage()
      expect(screen.getByRole('heading', { name: 'Báo cáo' })).toBeInTheDocument()
    })

    it('renders 4 section cards with correct titles', () => {
      mockApiGet.mockResolvedValue({ data: successResponse })
      renderPage()
      expect(screen.getByText('Doanh thu theo ngày')).toBeInTheDocument()
      expect(screen.getByText('Tổng đơn')).toBeInTheDocument()
      expect(screen.getByText('Doanh thu theo phương thức thanh toán')).toBeInTheDocument()
      expect(screen.getByText('Top sản phẩm bán chạy')).toBeInTheDocument()
    })
  })

  describe('URL params', () => {
    it('reads from/to from URL params', () => {
      mockApiGet.mockResolvedValue({ data: successResponse })
      renderPage('/admin/reports?from=2026-05-01&to=2026-05-09')
      expect(mockApiGet).toHaveBeenCalledWith('/reports', {
        params: { from: '2026-05-01', to: '2026-05-09', metric: 'all' },
      })
    })

    it('falls back to default when URL params invalid', () => {
      vi.useFakeTimers()
      vi.setSystemTime(FIXED_NOW_UTC)
      mockApiGet.mockResolvedValue({ data: successResponse })
      renderPage('/admin/reports?from=bad&to=values')
      // Falls back to last7Days
      expect(mockApiGet).toHaveBeenCalledWith('/reports', {
        params: { from: '2026-05-10', to: '2026-05-16', metric: 'all' },
      })
      vi.useRealTimers()
    })

    it('canonicalizes direct URL with reversed range before fetching', async () => {
      mockApiGet.mockResolvedValue({ data: successResponse })
      const { getLocation } = renderPage('/admin/reports?from=2026-05-16&to=2026-05-10')

      await waitFor(() => {
        expect(getLocation()).toBe('/admin/reports?from=2026-05-10&to=2026-05-16')
      })
      expect(mockApiGet).toHaveBeenCalledWith('/reports', {
        params: { from: '2026-05-10', to: '2026-05-16', metric: 'all' },
      })
      expect(mockApiGet).not.toHaveBeenCalledWith('/reports', {
        params: { from: '2026-05-16', to: '2026-05-10', metric: 'all' },
      })
    })
  })

  describe('Loading state', () => {
    it('renders loading skeleton when query is loading', () => {
      // Never resolves so stays loading
      mockApiGet.mockReturnValue(new Promise(() => undefined))
      renderPage()
      const skeletons = screen.getAllByRole('status', { name: /đang tải/i })
      expect(skeletons.length).toBeGreaterThanOrEqual(1)
    })

    it('date filter is still enabled during loading', () => {
      mockApiGet.mockReturnValue(new Promise(() => undefined))
      renderPage()
      // Preset buttons should be present and not disabled
      expect(screen.getByRole('button', { name: 'Hôm nay' })).not.toBeDisabled()
    })
  })

  describe('Error state', () => {
    it('renders ErrorState for 5xx errors', async () => {
      mockApiGet.mockRejectedValue(make5xxError(500))
      renderPage()
      expect(await screen.findByRole('alert', {}, { timeout: 5000 })).toBeInTheDocument()
      expect(screen.getByText('Không tải được báo cáo')).toBeInTheDocument()
      expect(screen.getByText('Đã có lỗi xảy ra. Vui lòng thử lại sau.')).toBeInTheDocument()
    })

    it('"Thử lại" button triggers refetch', async () => {
      // Initial request + 3 default retries fail, then manual refetch succeeds
      mockApiGet
        .mockRejectedValueOnce(make5xxError(500))
        .mockRejectedValueOnce(make5xxError(500))
        .mockRejectedValueOnce(make5xxError(500))
        .mockRejectedValueOnce(make5xxError(500))
        .mockResolvedValueOnce({ data: successResponse })
      renderPage()
      // Wait for error state to appear (after 2 failures)
      const retryBtn = await screen.findByRole('button', { name: 'Thử lại' }, { timeout: 8000 })
      expect(retryBtn).toBeInTheDocument()
      // After clicking Thử lại, verify refetch occurs (mockApiGet called again)
      const callCountBefore = mockApiGet.mock.calls.length
      await userEvent.click(retryBtn)
      await waitFor(() => {
        expect(mockApiGet).toHaveBeenCalledTimes(callCountBefore + 1)
      }, { timeout: 8000 })
    }, 20000)

    it('does not show raw error or stack', async () => {
      mockApiGet.mockRejectedValue(make5xxError(500))
      renderPage()
      await screen.findByRole('alert', {}, { timeout: 5000 })
      expect(screen.queryByText(/Internal stack trace/i)).not.toBeInTheDocument()
    })
  })

  describe('Empty state', () => {
    it('renders EmptyState in section cards when all metrics are 0', async () => {
      mockApiGet.mockResolvedValue({ data: emptyResponse })
      renderPage()
      await waitFor(() => {
        const emptyStates = screen.getAllByText('Chưa có đơn đã đồng bộ trong khoảng ngày này.')
        expect(emptyStates).toHaveLength(4)
      }, { timeout: 5000 })
    })
  })

  describe('Successful response', () => {
    it('renders 4 section cards with placeholder content after loading', async () => {
      mockApiGet.mockResolvedValue({ data: successResponse })
      renderPage()
      await waitFor(() => {
        expect(screen.getByTestId('placeholder-section-1')).toBeInTheDocument()
        expect(screen.getByTestId('placeholder-section-2')).toBeInTheDocument()
        expect(screen.getByTestId('placeholder-section-3')).toBeInTheDocument()
        expect(screen.getByTestId('placeholder-section-4')).toBeInTheDocument()
      }, { timeout: 5000 })
    })
  })

  describe('Range validation', () => {
    it('does not fire fetch when range >90 days', () => {
      // Range from 2026-01-01 to 2026-05-16 = 136 days > 90
      renderPage('/admin/reports?from=2026-01-01&to=2026-05-16')
      // Query should not fire since rangeError !== null (enabled=false)
      expect(mockApiGet).not.toHaveBeenCalled()
    })

    it('shows inline error for range >90 days', () => {
      renderPage('/admin/reports?from=2026-01-01&to=2026-05-16')
      expect(screen.getByRole('alert')).toHaveTextContent('Tối đa 90 ngày một lần')
    })

    it('does not fire fetch when to is a future date (URL-hack)', () => {
      vi.useFakeTimers()
      vi.setSystemTime(FIXED_NOW_UTC)
      renderPage('/admin/reports?from=2026-05-10&to=2099-01-01')
      expect(mockApiGet).not.toHaveBeenCalled()
      vi.useRealTimers()
    })

    it('shows inline error when to is a future date', () => {
      vi.useFakeTimers()
      vi.setSystemTime(FIXED_NOW_UTC)
      renderPage('/admin/reports?from=2026-05-10&to=2099-01-01')
      expect(screen.getByRole('alert')).toHaveTextContent('Ngày kết thúc không được là ngày tương lai')
      vi.useRealTimers()
    })
  })

  describe('TZ hint', () => {
    it('shows TZ hint in filter', () => {
      mockApiGet.mockResolvedValue({ data: successResponse })
      renderPage()
      expect(screen.getByText('Tính theo giờ Việt Nam (UTC+7)')).toBeInTheDocument()
    })
  })
})
