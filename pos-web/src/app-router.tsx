import { createBrowserRouter } from 'react-router-dom'
import { RootLayout } from './routes/_layout'
import { LoginPage } from './routes/login/login-page'
import { PosShell } from './routes/pos/pos-shell'
import { ProtectedRoute } from './features/auth/protected-route'
import { AdminRoleGate } from './features/auth/role-gate'
import { RoleAwareIndex } from './features/auth/role-aware-index'

export function createAppRouter() {
  return createBrowserRouter([
    {
      path: '/',
      element: <RootLayout />,
      children: [
        { index: true, element: <RoleAwareIndex /> },
        { path: 'login', element: <LoginPage /> },
        {
          element: <ProtectedRoute />,
          children: [
            { path: 'pos', element: <PosShell /> },
            {
              element: <AdminRoleGate />,
              children: [{
                path: 'admin',
                lazy: async () => { const m = await import('./routes/admin/_layout'); return { Component: m.default } },
                children: [
                  { index: true, lazy: async () => { const m = await import('./routes/admin/_layout'); return { Component: m.AdminHome } } },
                  { path: 'orders', lazy: async () => { const m = await import('./routes/admin/orders/orders-page'); return { Component: m.default } } },
                  { path: 'menu/categories', lazy: async () => { const m = await import('./routes/admin/menu/categories-page'); return { Component: m.default } } },
                  { path: 'menu/products', lazy: async () => { const m = await import('./routes/admin/menu/products-page'); return { Component: m.default } } },
                  { path: 'menu/option-groups', lazy: async () => { const m = await import('./routes/admin/menu/option-groups-page'); return { Component: m.default } } },
                  { path: 'tables/areas', lazy: async () => { const m = await import('./routes/admin/tables/areas-page'); return { Component: m.default } } },
                  { path: 'tables/tables', lazy: async () => { const m = await import('./routes/admin/tables/tables-page'); return { Component: m.default } } },
                  { path: 'store-config', lazy: async () => { const m = await import('./routes/admin/store-config/store-config-page'); return { Component: m.default } } },
                  { path: 'reports', lazy: async () => { const m = await import('./routes/admin/reports/reports-page'); return { Component: m.default } } },
                ],
              }],
            },
          ],
        },
      ],
    },
  ])
}
