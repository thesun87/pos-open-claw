import * as React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { createAppRouter } from './app-router'

const queryClient = new QueryClient()
import { installAppAuthInterceptor } from './features/auth/install-auth-interceptor'

export function App() {
  React.useEffect(() => {
    installAppAuthInterceptor()
  }, [])

  const router = React.useMemo(() => createAppRouter(), [])
  return <QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>
}

export default App
