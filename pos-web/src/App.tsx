import * as React from 'react'
import { RouterProvider } from 'react-router-dom'
import { createAppRouter } from './app-router'
import { installAppAuthInterceptor } from './features/auth/install-auth-interceptor'

export function App() {
  React.useEffect(() => {
    installAppAuthInterceptor()
  }, [])

  const router = React.useMemo(() => createAppRouter(), [])
  return <RouterProvider router={router} />
}

export default App
