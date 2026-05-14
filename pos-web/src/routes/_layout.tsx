import { useEffect, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { SessionBootProvider } from '../features/auth/session-boot-provider'
import { SyncRetryPanel } from '../features/sync/components/sync-retry-panel'
import { ConnectivityIndicator } from '../shared/components/layout/connectivity-indicator'
import { PendingCounter } from '../shared/components/layout/pending-counter'
import { ConnectivityRegistrar } from '../connectivity-registrar'
import { PwaUpdatePrompt } from '../shared/components/layout/pwa-update-prompt'

export function RootLayout() {
  const [isSyncPanelOpen, setIsSyncPanelOpen] = useState(false)

  useEffect(() => {
    const openPanel = () => setIsSyncPanelOpen(true)
    window.addEventListener('sync.panel.open-requested', openPanel)
    return () => window.removeEventListener('sync.panel.open-requested', openPanel)
  }, [])

  return (
    <div className="min-h-screen bg-bg text-text-primary">
      <ConnectivityRegistrar />
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-4 sm:px-6">
        <Link to="/pos" className="text-xl font-semibold text-primary">Café POS</Link>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 sm:gap-3"><ConnectivityIndicator /><PendingCounter /></div>
      </header>
      <main><SessionBootProvider><Outlet /></SessionBootProvider></main>
      <PwaUpdatePrompt />
      <SyncRetryPanel open={isSyncPanelOpen} onOpenChange={setIsSyncPanelOpen} />
    </div>
  )
}
