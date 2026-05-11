import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from './App'
import { STATUS_MENU_UPDATED, STATUS_OFFLINE, STATUS_ONLINE, STATUS_PENDING } from './shared/i18n/messages'
import { mapProblemDetails } from './shared/lib/error-mapper'

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    offlineReady: [false, vi.fn()],
    needRefresh: [false, vi.fn()],
    updateServiceWorker: vi.fn(),
  }),
}))

function renderAt(path: string) {
  window.history.pushState({}, '', path)
  return render(<App />)
}

describe('frontend shell routes', () => {
  it('renders login route', () => {
    renderAt('/login')
    expect(screen.getByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument()
    expect(screen.getByText('Online')).toBeInTheDocument()
    expect(screen.getByText('0 đơn chờ')).toBeInTheDocument()
  })

  it('renders POS two-pane semantics and unsupported mobile copy', () => {
    renderAt('/pos')
    expect(screen.getByText('Khu vực menu / sản phẩm')).toBeInTheDocument()
    expect(screen.getByLabelText('Giỏ hàng và thanh toán')).toBeInTheDocument()
    expect(screen.getByText('POS hoạt động tốt nhất ở màn hình ngang hoặc laptop/tablet')).toBeInTheDocument()
  })

  it('renders admin shell nav via lazy route', async () => {
    renderAt('/admin')
    expect(await screen.findByRole('heading', { name: 'Admin shell' })).toBeInTheDocument()
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
