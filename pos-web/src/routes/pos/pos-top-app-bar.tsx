import { Link } from 'react-router-dom'
import { useSessionStore } from '../../features/auth/session-store'
import { ConnectivityIndicator } from '../../shared/components/layout/connectivity-indicator'
import { PendingCounter } from '../../shared/components/layout/pending-counter'

function openSyncPanel() { window.dispatchEvent(new CustomEvent('sync.panel.open-requested')) }

export function PosTopAppBar() {
  const user = useSessionStore((state) => state.currentUser)
  const initial = user?.email?.[0]?.toLocaleUpperCase('vi') ?? 'U'
  const isAdmin = user?.role === 'admin'
  return (
    <header data-testid="pos-top-app-bar" className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-between border-b border-outline-variant/20 bg-surface/90 px-7 shadow-sm backdrop-blur-xl">
      <Link to="/pos" className="text-[22px] font-semibold tracking-tight text-primary">Café POS</Link>
      <div className="flex items-center gap-3">
        <ConnectivityIndicator />
        <PendingCounter />
        <button type="button" aria-label="Mở bảng đồng bộ" onClick={openSyncPanel} className="grid h-10 w-10 place-items-center rounded-lg text-on-surface-variant hover:bg-surface-container">
          <span aria-hidden="true" className="material-symbols-outlined">sync</span>
        </button>
        {isAdmin ? <Link aria-label="Mở trang quản trị" to="/admin" className="grid h-10 w-10 place-items-center rounded-lg text-on-surface-variant hover:bg-surface-container"><span aria-hidden="true" className="material-symbols-outlined">settings</span></Link> : null}
        <div aria-label="Người dùng hiện tại" className="grid h-10 w-10 place-items-center rounded-full bg-primary-container font-bold text-on-primary-container">{initial}</div>
      </div>
    </header>
  )
}
