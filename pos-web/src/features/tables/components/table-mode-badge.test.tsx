import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../../../shared/lib/api-client'
import { useSessionStore } from '../../auth/session-store'
import { TableModeBadge } from './table-mode-badge'

vi.mock('../../../shared/lib/api-client', () => ({
  apiClient: { get: vi.fn() },
}))

const mockedApi = vi.mocked(apiClient)

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </MemoryRouter>
  )
}

function setSession(role: 'admin' | 'cashier') {
  useSessionStore.getState().setSessionFromRecord({
    id: 'current',
    accessToken: 'token',
    expiresAt: Date.now() + 1000,
    lastLoginAt: Date.now(),
    userInfo: { id: 'u1', email: `${role}@test.com`, role, tenantId: 't1', storeId: 's1' },
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  useSessionStore.getState().clearSessionState()
})

describe('TableModeBadge', () => {
  it('renders nothing when tableMode=false', async () => {
    setSession('cashier')
    mockedApi.get.mockResolvedValue({
      data: { id: 's1', name: 'Store', code: 'S1', tableMode: false, createdAt: '', updatedAt: '' },
    })
    const { container } = render(<TableModeBadge />, { wrapper: createWrapper() })
    await waitFor(() => expect(mockedApi.get).toHaveBeenCalledWith('/stores/me'))
    // Should be empty — null rendered
    expect(container.firstChild).toBeNull()
  })

  it('renders static badge with tooltip for cashier when tableMode=true', async () => {
    setSession('cashier')
    mockedApi.get.mockResolvedValue({
      data: { id: 's1', name: 'Store', code: 'S1', tableMode: true, createdAt: '', updatedAt: '' },
    })
    render(<TableModeBadge />, { wrapper: createWrapper() })
    const badge = await screen.findByText('Chế độ bàn: Bật')
    expect(badge).toBeInTheDocument()
    const wrapper = badge.closest('span[title]')
    expect(wrapper).toHaveAttribute('title', 'Liên hệ admin để đổi chế độ')
    // No link for cashier
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('renders link to /admin/store-config for admin when tableMode=true', async () => {
    setSession('admin')
    mockedApi.get.mockResolvedValue({
      data: { id: 's1', name: 'Store', code: 'S1', tableMode: true, createdAt: '', updatedAt: '' },
    })
    render(<TableModeBadge />, { wrapper: createWrapper() })
    await screen.findByText('Chế độ bàn: Bật')
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/admin/store-config')
  })

  it('renders loading state (null badge) when query is pending', () => {
    setSession('cashier')
    mockedApi.get.mockImplementation(() => new Promise(() => {})) // never resolves
    const { container } = render(<TableModeBadge />, { wrapper: createWrapper() })
    // While loading, tableMode defaults to false → null
    expect(container.firstChild).toBeNull()
  })
})
