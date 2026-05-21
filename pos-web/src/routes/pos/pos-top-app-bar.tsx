import { Link } from 'react-router-dom'
import { useSessionStore } from '../../features/auth/session-store'
import { ConnectivityIndicator } from '../../shared/components/layout/connectivity-indicator'
import { PendingCounter } from '../../shared/components/layout/pending-counter'

function openSyncPanel() { window.dispatchEvent(new CustomEvent('sync.panel.open-requested')) }

type Props = {
  search?: string
  onSearchChange?: (value: string) => void
}

export function PosTopAppBar({ search = '', onSearchChange }: Props) {
  const user = useSessionStore((state) => state.currentUser)
  const initial = user?.email?.[0]?.toLocaleUpperCase('vi') ?? 'U'
  const isAdmin = user?.role === 'admin'
  const userName = user?.email?.split('@')[0] ?? 'Nhân viên'
  const userRole = user?.role === 'admin' ? 'Quản trị viên' : 'Thu ngân 1'

  return (
    <header data-testid="pos-top-app-bar" className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-between border-b border-outline-variant/30 bg-surface/90 px-7 shadow-sm backdrop-blur-xl">
      <div className="flex items-center gap-4 flex-1 mr-4">
        <Link to="/pos" className="text-[20px] font-bold tracking-tight text-primary whitespace-nowrap hidden sm:block">
          Boutique Cafe POS
        </Link>
        <div className="relative w-full max-w-md">
          <span aria-hidden="true" className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-on-surface-variant text-[20px]">
            search
          </span>
          <label htmlFor="product-search" className="sr-only">Tìm sản phẩm</label>
          <input
            id="product-search"
            value={search}
            onChange={(event) => onSearchChange?.(event.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface-container-low border border-outline-variant/40 rounded-full text-sm text-on-surface placeholder-on-surface-variant/60 focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-colors"
            placeholder="Tìm kiếm món ăn..."
            type="text"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <ConnectivityIndicator />
        <PendingCounter />
        <button type="button" aria-label="Mở bảng đồng bộ" onClick={openSyncPanel} className="grid h-10 w-10 place-items-center rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors">
          <span aria-hidden="true" className="material-symbols-outlined">sync</span>
        </button>
        {isAdmin ? (
          <Link aria-label="Mở trang quản trị" to="/admin" className="grid h-10 w-10 place-items-center rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors">
            <span aria-hidden="true" className="material-symbols-outlined">settings</span>
          </Link>
        ) : null}
        
        <div className="flex items-center gap-3 border-l border-outline-variant/30 pl-4 h-8 select-none">
          <div aria-label="Người dùng hiện tại" className="grid h-8 w-8 place-items-center rounded-full bg-primary-container font-bold text-on-primary-container text-sm">
            {initial}
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-sm font-semibold text-on-surface leading-none">{userName}</span>
            <span className="text-[11px] text-on-surface-variant capitalize mt-0.5">{userRole}</span>
          </div>
        </div>
      </div>
    </header>
  )
}
