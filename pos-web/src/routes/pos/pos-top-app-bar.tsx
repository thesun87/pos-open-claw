import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLogoutAction } from '../../features/auth/logout'
import { useSessionStore } from '../../features/auth/session-store'
import { TableModeBadge } from '../../features/tables/components/table-mode-badge'
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
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const logout = useLogoutAction()

  async function handleLogout() {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    setIsUserMenuOpen(false)
    await logout()
  }

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
        <TableModeBadge />
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
        
        <div className="relative flex items-center gap-3 border-l border-outline-variant/30 pl-4 h-8 select-none">
          <button type="button" aria-label="Mở menu người dùng" aria-expanded={isUserMenuOpen} onClick={() => setIsUserMenuOpen((open) => !open)} className="flex items-center gap-3 rounded-full text-left focus:outline-none focus:ring-2 focus:ring-primary-container">
            <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-full bg-primary-container font-bold text-on-primary-container text-sm">
              {initial}
            </span>
            <span className="hidden md:flex flex-col text-left">
              <span className="text-sm font-semibold text-on-surface leading-none">{userName}</span>
              <span className="text-[11px] text-on-surface-variant capitalize mt-0.5">{userRole}</span>
            </span>
          </button>
          {isUserMenuOpen ? (
            <div role="menu" className="absolute right-0 top-10 z-50 min-w-40 rounded-xl border border-outline-variant/30 bg-surface p-2 shadow-lg">
              <button type="button" role="menuitem" disabled={isLoggingOut} onClick={handleLogout} className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-on-surface hover:bg-surface-container disabled:opacity-60">
                {isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
