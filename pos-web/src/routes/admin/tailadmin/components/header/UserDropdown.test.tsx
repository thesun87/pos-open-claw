import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { logout as logoutApi } from '../../../../../features/auth/api'
import { useSessionStore } from '../../../../../features/auth/session-store'
import { clearSession } from '../../../../../features/auth/token-store'
import UserDropdown from './UserDropdown'

vi.mock('../../../../../features/auth/api', () => ({ logout: vi.fn() }))
vi.mock('../../../../../features/auth/token-store', () => ({ clearSession: vi.fn() }))

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location">{location.pathname}</output>
}

function renderDropdown() {
  return render(<MemoryRouter initialEntries={["/admin"]}><UserDropdown /><LocationProbe /></MemoryRouter>)
}

beforeEach(() => {
  vi.mocked(logoutApi).mockReset().mockResolvedValue(undefined)
  vi.mocked(clearSession).mockReset().mockResolvedValue(undefined)
  useSessionStore.getState().setSessionFromRecord({ id: 'current', accessToken: 'token', expiresAt: Date.now() + 1000, lastLoginAt: Date.now(), userInfo: { id: 'u1', email: 'admin@example.com', role: 'admin', tenantId: 't1', storeId: 's1' } })
})

describe('Admin UserDropdown logout', () => {
  it('shows Đăng xuất and calls logout API before clearing session and replacing to login', async () => {
    const user = userEvent.setup()
    renderDropdown()

    await user.click(screen.getByRole('button'))
    await user.click(screen.getByRole('button', { name: /Đăng xuất/ }))

    await waitFor(() => expect(logoutApi).toHaveBeenCalledTimes(1))
    expect(clearSession).toHaveBeenCalledTimes(1)
    expect(useSessionStore.getState().isAuthenticated).toBe(false)
    expect(screen.getByTestId('location')).toHaveTextContent('/login')
  })

  it('still clears session and redirects if logout API fails', async () => {
    vi.mocked(logoutApi).mockRejectedValueOnce(new Error('network'))
    const user = userEvent.setup()
    renderDropdown()

    await user.click(screen.getByRole('button'))
    await user.click(screen.getByRole('button', { name: /Đăng xuất/ }))

    await waitFor(() => expect(clearSession).toHaveBeenCalledTimes(1))
    expect(useSessionStore.getState().isAuthenticated).toBe(false)
    expect(screen.getByTestId('location')).toHaveTextContent('/login')
  })
})
