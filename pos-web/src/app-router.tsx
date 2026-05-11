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
              children: [{ path: 'admin/*', lazy: async () => ({ Component: (await import('./routes/admin/admin-shell')).default }) }],
            },
          ],
        },
      ],
    },
  ])
}
