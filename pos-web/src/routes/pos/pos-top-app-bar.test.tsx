import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { logout as logoutApi } from '../../features/auth/api'
import { useSessionStore } from '../../features/auth/session-store'
import { clearSession } from '../../features/auth/token-store'
import { PosTopAppBar } from './pos-top-app-bar'

vi.mock('../../features/auth/api', () => ({ logout: vi.fn() }))
vi.mock('../../features/auth/token-store', () => ({ clearSession: vi.fn() }))
vi.mock('../../shared/components/layout/connectivity-indicator', () => ({ ConnectivityIndicator: () => <span /> }))
vi.mock('../../shared/components/layout/pending-counter', () => ({ PendingCounter: () => <span /> }))

// Mock TableModeBadge to control rendering in these tests
vi.mock('../../features/tables/components/table-mode-badge', () => ({
  TableModeBadge: vi.fn(() => null),
}))

import { TableModeBadge } from '../../features/tables/components/table-mode-badge'

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location">{location.pathname}</output>
}

function renderBar() {
  return render(<MemoryRouter initialEntries={["/pos"]}><PosTopAppBar /><LocationProbe /></MemoryRouter>)
}

beforeEach(() => {
  vi.mocked(logoutApi).mockReset().mockResolvedValue(undefined)
  vi.mocked(clearSession).mockReset().mockResolvedValue(undefined)
  useSessionStore.getState().setSessionFromRecord({ id: 'current', accessToken: 'token', expiresAt: Date.now() + 1000, lastLoginAt: Date.now(), userInfo: { id: 'u1', email: 'cashier@example.com', role: 'cashier', tenantId: 't1', storeId: 's1' } })
})

describe('PosTopAppBar logout menu', () => {
  it('opens user menu and logs out via API before clearing local session and replacing to login', async () => {
    const user = userEvent.setup()
    renderBar()

    await user.click(screen.getByRole('button', { name: 'Mở menu người dùng' }))
    await user.click(screen.getByRole('menuitem', { name: 'Đăng xuất' }))

    await waitFor(() => expect(logoutApi).toHaveBeenCalledTimes(1))
    expect(clearSession).toHaveBeenCalledTimes(1)
    expect(useSessionStore.getState().isAuthenticated).toBe(false)
    expect(screen.getByTestId('location')).toHaveTextContent('/login')
  })

  it('still clears local session and redirects when logout API fails', async () => {
    vi.mocked(logoutApi).mockRejectedValueOnce(new Error('network'))
    const user = userEvent.setup()
    renderBar()

    await user.click(screen.getByRole('button', { name: 'Mở menu người dùng' }))
    await user.click(screen.getByRole('menuitem', { name: 'Đăng xuất' }))

    await waitFor(() => expect(clearSession).toHaveBeenCalledTimes(1))
    expect(useSessionStore.getState().isAuthenticated).toBe(false)
    expect(screen.getByTestId('location')).toHaveTextContent('/login')
  })
})

// Story 6.7: TableModeBadge integration in PosTopAppBar
describe('PosTopAppBar TableModeBadge integration (Story 6.7)', () => {
  it('renders TableModeBadge in the header when tableMode=true', () => {
    vi.mocked(TableModeBadge).mockReturnValue(<span data-testid="table-mode-badge">Chế độ bàn: Bật</span>)
    renderBar()
    expect(screen.getByTestId('table-mode-badge')).toBeInTheDocument()
  })

  it('renders null badge when tableMode=false', () => {
    vi.mocked(TableModeBadge).mockReturnValue(null)
    renderBar()
    expect(screen.queryByTestId('table-mode-badge')).not.toBeInTheDocument()
  })
})
