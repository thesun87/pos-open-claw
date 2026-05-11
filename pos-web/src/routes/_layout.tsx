import { Link, Outlet } from 'react-router-dom'
import { SessionBootProvider } from '../features/auth/session-boot-provider'
import { ConnectivityIndicator } from '../shared/components/layout/connectivity-indicator'
import { PendingCounter } from '../shared/components/layout/pending-counter'
import { PwaUpdatePrompt } from '../shared/components/layout/pwa-update-prompt'

export function RootLayout() {
  return (
    <div className="min-h-screen bg-bg text-text-primary">
      <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
        <Link to="/pos" className="text-xl font-semibold text-primary">Café POS</Link>
        <div className="flex items-center gap-3"><ConnectivityIndicator /><PendingCounter /></div>
      </header>
      <main><SessionBootProvider><Outlet /></SessionBootProvider></main>
      <PwaUpdatePrompt />
    </div>
  )
}
