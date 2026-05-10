import { createBrowserRouter } from 'react-router-dom'
import { RootLayout } from './routes/_layout'
import { LoginPage } from './routes/login/login-page'
import { PosShell } from './routes/pos/pos-shell'

export function createAppRouter() {
  return createBrowserRouter([
    {
      path: '/',
      element: <RootLayout />,
      children: [
        { index: true, element: <PosShell /> },
        { path: 'login', element: <LoginPage /> },
        { path: 'pos', element: <PosShell /> },
        { path: 'admin/*', lazy: async () => ({ Component: (await import('./routes/admin/admin-shell')).default }) },
      ],
    },
  ])
}
