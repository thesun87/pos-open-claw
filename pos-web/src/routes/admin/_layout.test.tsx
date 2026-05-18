import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import 'fake-indexeddb/auto'
import AdminLayout, { AdminHome, PlaceholderPage } from './_layout'
import { AdminRoleGate } from '../../features/auth/role-gate'
import { useSessionStore } from '../../features/auth/session-store'
import { db } from '../../db/dexie'
import type { SessionRecord } from '../../features/auth/token-store-types'

async function seedSession(role: 'admin' | 'cashier' = 'admin') {
  const session: SessionRecord = { id: 'current', accessToken: 'token', expiresAt: Date.now() + 1000, lastLoginAt: Date.now(), userInfo: { id: 'u1', email: 'admin@example.com', role, tenantId: 't1', storeId: 's1' } }
  await db.session.put(session)
  useSessionStore.getState().setSessionFromRecord(session)
}

function renderAdmin(path = '/admin/menu/categories') {
  const router = createMemoryRouter([{ path: '/login', element: <h1>Login</h1> }, { path: '/admin', element: <AdminLayout />, children: [
    { index: true, element: <AdminHome /> },
    { path: 'menu/categories', element: <PlaceholderPage title="Danh mục" /> },
    { path: 'menu/products', element: <PlaceholderPage title="Sản phẩm" /> },
    { path: 'menu/option-groups', element: <PlaceholderPage title="Nhóm tùy chọn" /> },
    { path: 'reports', element: <PlaceholderPage title="Báo cáo" /> },
  ] }], { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

describe('AdminLayout', () => {
  beforeEach(async () => {
    await db.session.clear()
    useSessionStore.getState().clearSessionState()
  })

  it('renders sectioned Vietnamese nav and active NavLink state', async () => {
    await seedSession()
    renderAdmin()
    expect(screen.getByRole('navigation', { name: 'Điều hướng Admin' })).toBeInTheDocument()
    expect(screen.getByText('Quản lý Menu')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Báo cáo' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Danh mục' })).toHaveAttribute('aria-current', 'page')
  })

  it('renders current user, Admin status badge, mobile disclosure, and logs out', async () => {
    await seedSession()
    const router = renderAdmin('/admin')
    expect(screen.getByText('admin@example.com')).toBeInTheDocument()
    expect(screen.getAllByText('Admin').length).toBeGreaterThan(0)
    await userEvent.click(screen.getByRole('button', { name: 'Mở điều hướng Admin' }))
    expect(screen.getAllByRole('navigation', { name: 'Điều hướng Admin' }).length).toBeGreaterThan(0)
    await userEvent.click(screen.getByRole('button', { name: /admin@example.com/i }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Đăng xuất' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(await db.session.get('current')).toBeUndefined()
    expect(useSessionStore.getState().currentUser).toBeNull()
  })

  it('keeps cashier forbidden redirect in AdminRoleGate', async () => {
    await seedSession('cashier')
    const router = createMemoryRouter([{ element: <AdminRoleGate />, children: [{ path: '/admin', element: <h1>Admin</h1> }] }, { path: '/pos', element: <h1>POS</h1> }], { initialEntries: ['/admin'] })
    render(<RouterProvider router={router} />)
    expect(await screen.findByRole('heading', { name: 'POS' })).toBeInTheDocument()
  })
})
