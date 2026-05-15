import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import 'fake-indexeddb/auto'
import App from './App'
import AdminLayout, { AdminHome } from './routes/admin/_layout'
import { STATUS_MENU_UPDATED, STATUS_OFFLINE, STATUS_ONLINE, STATUS_PENDING } from './shared/i18n/messages'
import { useSessionStore } from './features/auth/session-store'
import { db } from './db/dexie'
import { mapProblemDetails } from './shared/lib/error-mapper'

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    offlineReady: [false, vi.fn()],
    needRefresh: [false, vi.fn()],
    updateServiceWorker: vi.fn(),
  }),
}))

async function seedSession(role: 'admin' | 'cashier' = 'cashier') {
  const session = {
    id: 'current' as const,
    accessToken: 'token',
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    lastLoginAt: Date.now(),
    userInfo: { id: 'u1', email: 'u@example.com', role, tenantId: 't1', storeId: 's1' },
  }
  await db.session.put(session)
  useSessionStore.getState().setSessionFromRecord(session)
}

function renderAt(path: string) {
  window.history.pushState({}, '', path)
  return render(<App />)
}

describe('frontend shell routes', () => {
  beforeEach(async () => {
    cleanup()
    await db.session.clear()
    useSessionStore.getState().clearSessionState()
  })

  it('renders login route', () => {
    renderAt('/login')
    expect(screen.getByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument()
    expect(screen.getByText('Online')).toBeInTheDocument()
    expect(screen.getByText('0 đơn chờ')).toBeInTheDocument()
  })

  it('renders POS two-pane semantics and unsupported mobile copy', async () => {
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState')
    await seedSession('cashier')
    renderAt('/pos')
    expect(await screen.findByRole('heading', { name: 'Menu sản phẩm' })).toBeInTheDocument()
    expect(screen.getByLabelText('Giỏ hàng và thanh toán')).toBeInTheDocument()
    expect(screen.getByText('POS hoạt động tốt nhất ở màn hình ngang hoặc laptop/tablet')).toBeInTheDocument()
    replaceStateSpy.mockRestore()
  })

  it('renders admin shell nav via route', async () => {
    await seedSession('admin')
    const router = createMemoryRouter([{ path: '/admin', element: <AdminLayout />, children: [{ index: true, element: <AdminHome /> }] }], { initialEntries: ['/admin'] })
    render(<RouterProvider router={router} />)
    expect(await screen.findByRole('heading', { name: 'Admin' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Điều hướng Admin' })).toBeInTheDocument()
  })
})

describe('status microcopy', () => {
  it('returns Vietnamese status strings', () => {
    expect(STATUS_ONLINE).toBe('Online')
    expect(STATUS_OFFLINE).toBe('Offline — vẫn bán được')
    expect(STATUS_PENDING(3)).toBe('3 đơn chờ đồng bộ')
    expect(STATUS_MENU_UPDATED).toBe('Menu đã cập nhật')
  })
})

describe('problem mapper', () => {
  it('maps problem details to safe UI error without leaking detail', () => {
    const mapped = mapProblemDetails({ type: 'https://example.test/problem', title: 'Không thể xử lý', status: 400, detail: 'stack trace or SQL detail' })
    expect(mapped).toEqual({ type: 'https://example.test/problem', status: 400, message: 'Không thể xử lý' })
    expect(mapped.message).not.toContain('stack trace')
  })
})
