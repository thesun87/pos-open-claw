import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../../../shared/lib/api-client'
import StoreConfigPage from './store-config-page'

vi.mock('../../../shared/lib/api-client', () => ({ apiClient: { get: vi.fn(), patch: vi.fn() } }))
const mockedApi = vi.mocked(apiClient)

const storeOn = { id: 's1', name: 'Cafe Demo', code: 'DEMO', tableMode: true, createdAt: '', updatedAt: '' }
const storeOff = { ...storeOn, tableMode: false }

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<MemoryRouter><QueryClientProvider client={client}><StoreConfigPage /></QueryClientProvider></MemoryRouter>)
}

function mockGets(store = storeOff, tables: unknown[] = [], status: unknown[] = []) {
  mockedApi.get.mockImplementation((url: string) => {
    if (url === '/stores/me') return Promise.resolve({ data: store })
    if (url === '/tables') return Promise.resolve({ data: tables })
    if (url === '/tables/status') return Promise.resolve({ data: status })
    return Promise.reject(new Error(`unexpected ${url}`))
  })
}

describe('StoreConfigPage', () => {
  beforeEach(() => { vi.resetAllMocks(); window.dispatchEvent = vi.fn() })

  it('renders loading skeleton', () => {
    mockedApi.get.mockImplementation(() => new Promise(() => undefined))
    renderPage()
    expect(screen.getByLabelText('Đang tải')).toBeInTheDocument()
  })

  it('renders fetch error retry without technical details', async () => {
    mockedApi.get.mockImplementation((url: string) => url === '/stores/me' ? Promise.reject(new Error('ECONNRESET traceId')) : Promise.resolve({ data: [] }))
    renderPage()
    expect(await screen.findByText('Không tải được cấu hình store')).toBeInTheDocument()
    expect(screen.queryByText(/traceId/)).not.toBeInTheDocument()
    mockedApi.get.mockImplementation((url: string) => url === '/stores/me' ? Promise.resolve({ data: storeOff }) : Promise.resolve({ data: [] }))
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByText('Cafe Demo')).toBeInTheDocument()
  })

  it('renders switch state from tableMode false and true', async () => {
    mockGets(storeOff)
    renderPage()
    const offSwitch = await screen.findByRole('switch')
    expect(offSwitch).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByText('Chế độ bàn: Tắt')).toBeInTheDocument()
  })

  it('toggles ON with empty tables and shows empty-tables toast', async () => {
    mockGets(storeOff, [], [])
    mockedApi.patch.mockResolvedValue({ data: storeOn })
    renderPage()
    await userEvent.click(await screen.findByRole('switch'))
    expect(screen.getByText('Áp dụng chế độ bàn?')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }))
    await waitFor(() => expect(mockedApi.patch).toHaveBeenCalledWith('/stores/me', { tableMode: true }))
    expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ detail: 'Đã bật chế độ bàn. Vui lòng tạo khu vực và bàn để thu ngân có thể bắt đầu phục vụ bàn.' }))
  })

  it('toggles ON with existing tables and shows default toast', async () => {
    mockGets(storeOff, [{ id: 't1' }], [])
    mockedApi.patch.mockResolvedValue({ data: storeOn })
    renderPage()
    await userEvent.click(await screen.findByRole('switch'))
    await userEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }))
    await waitFor(() => expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ detail: 'Đã bật chế độ bàn. POS sẽ áp dụng sau khi đăng xuất/đăng nhập lại.' })))
  })

  it('toggles OFF with zero occupied using apply dialog', async () => {
    mockGets(storeOn, [{ id: 't1' }], [{ tableId: 't1', status: 'empty', activeOrderCount: 0 }])
    mockedApi.patch.mockResolvedValue({ data: storeOff })
    renderPage()
    await userEvent.click(await screen.findByRole('switch'))
    expect(screen.getByText('Áp dụng chế độ counter-service?')).toBeInTheDocument()
    expect(screen.queryByText('Vẫn còn bàn chứa đơn chờ thanh toán')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }))
    await waitFor(() => expect(mockedApi.patch).toHaveBeenCalledWith('/stores/me', { tableMode: false }))
  })

  it('toggles OFF with occupied tables using warning dialog and cancel skips mutation', async () => {
    mockGets(storeOn, [{ id: 't1' }], [{ tableId: 't1', status: 'occupied', activeOrderCount: 1 }, { tableId: 't2', status: 'empty', activeOrderCount: 1 }])
    mockedApi.patch.mockResolvedValue({ data: storeOff })
    renderPage()
    await userEvent.click(await screen.findByRole('switch'))
    expect(screen.getByText('Vẫn còn bàn chứa đơn chờ thanh toán')).toBeInTheDocument()
    expect(screen.getByText(/Đang có 2 bàn/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Hủy' }))
    expect(mockedApi.patch).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('switch'))
    await userEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }))
    await waitFor(() => expect(mockedApi.patch).toHaveBeenCalledWith('/stores/me', { tableMode: false }))
  })

  it('allows OFF when table status check fails with fallback body', async () => {
    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/stores/me') return Promise.resolve({ data: storeOn })
      if (url === '/tables') return Promise.resolve({ data: [{ id: 't1' }] })
      if (url === '/tables/status') return Promise.reject(new Error('status fail'))
      return Promise.reject(new Error('unexpected'))
    })
    mockedApi.patch.mockResolvedValue({ data: storeOff })
    renderPage()
    await userEvent.click(await screen.findByRole('switch'))
    expect(await screen.findByText(/Không thể kiểm tra số bàn đang phục vụ/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }))
    await waitFor(() => expect(mockedApi.patch).toHaveBeenCalledWith('/stores/me', { tableMode: false }))
  })

  it('keeps switch state and shows generic toast on mutation failure', async () => {
    mockGets(storeOn, [{ id: 't1' }], [])
    mockedApi.patch.mockRejectedValue({ response: { data: { traceId: 'secret' } } })
    renderPage()
    const toggle = await screen.findByRole('switch')
    await userEvent.click(toggle)
    await userEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }))
    await waitFor(() => expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ detail: 'Không cập nhật được chế độ. Vui lòng thử lại.' })))
    expect(toggle).toHaveAttribute('aria-checked', 'true')
    expect(screen.queryByText('secret')).not.toBeInTheDocument()
  })

  it('closes dialog on Escape and disables switch while status is loading', async () => {
    mockGets(storeOff, [], [])
    renderPage()
    await userEvent.click(await screen.findByRole('switch'))
    expect(screen.getByText('Áp dụng chế độ bàn?')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByText('Áp dụng chế độ bàn?')).not.toBeInTheDocument())
  })
})
