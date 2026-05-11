import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { BootStatusContext } from './session-boot-context'
import { RoleAwareIndex } from './role-aware-index'
import { useSessionStore } from './session-store'
import type { SessionRecord } from './token-store-types'

function setSession(role: 'admin' | 'cashier') {
  const session: SessionRecord = {
    id: 'current',
    accessToken: 'token',
    expiresAt: Date.now() + 1000,
    lastLoginAt: Date.now(),
    userInfo: { id: 'u1', email: 'u@example.com', role, tenantId: 't1', storeId: 's1' },
  }
  useSessionStore.getState().setSessionFromRecord(session)
}

describe('RoleAwareIndex', () => {
  beforeEach(() => useSessionStore.getState().clearSessionState())

  it('routes admin and cashier by restored session role', () => {
    setSession('admin')
    render(
      <BootStatusContext.Provider value="ready">
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<RoleAwareIndex />} />
            <Route path="/admin" element={<h1>Admin destination</h1>} />
            <Route path="/pos" element={<h1>POS destination</h1>} />
          </Routes>
        </MemoryRouter>
      </BootStatusContext.Provider>,
    )
    expect(screen.getByRole('heading', { name: 'Admin destination' })).toBeInTheDocument()
  })
})
