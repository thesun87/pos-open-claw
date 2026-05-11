import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useSessionStore } from '../features/auth/session-store'
import { ConnectivityIndicator } from '../shared/components/layout/connectivity-indicator'
import { PendingCounter } from '../shared/components/layout/pending-counter'
import { PwaUpdatePrompt } from '../shared/components/layout/pwa-update-prompt'

export function RootLayout() {
  const navigate = useNavigate()
  const clearSessionState = useSessionStore((state) => state.clearSessionState)

  useEffect(() => {
    const onExpired = () => {
      clearSessionState('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
      navigate('/login', { replace: true })
    }
    window.addEventListener('auth.expired', onExpired)
    return () => window.removeEventListener('auth.expired', onExpired)
  }, [clearSessionState, navigate])

  return (
    <div className="min-h-screen bg-bg text-text-primary">
      <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
        <a href="/pos" className="text-xl font-semibold text-primary">Café POS</a>
        <div className="flex items-center gap-3"><ConnectivityIndicator /><PendingCounter /></div>
      </header>
      <main><Outlet /></main>
      <PwaUpdatePrompt />
    </div>
  )
}
