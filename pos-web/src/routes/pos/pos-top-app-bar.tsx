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
    <header data-testid="pos-top-app-bar" className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-between border-b border-outline-variant/60 bg-surface/90 px-5 shadow-card backdrop-blur-xl md:px-7">
      <div className="flex items-center gap-5 flex-1 mr-4">
        <Link to="/pos" className="hidden items-center gap-2.5 whitespace-nowrap rounded-lg sm:flex">
          <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-on-primary shadow-sm">
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1, 'wght' 500" }}>local_cafe</span>
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-[16px] font-bold tracking-tight text-on-surface">Boutique Cafe POS</span>
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant/80">Điểm bán</span>
          </span>
        </Link>
        <div className="relative w-full max-w-md">
          <span aria-hidden="true" className="material-symbols-outlined absolute left-3.5 top-1/2 transform -translate-y-1/2 text-on-surface-variant/70 text-[20px]">
            search
          </span>
          <label htmlFor="product-search" className="sr-only">Tìm sản phẩm</label>
          <input
            id="product-search"
            value={search}
            onChange={(event) => onSearchChange?.(event.target.value)}
            className="h-10 w-full rounded-full border border-outline-variant/70 bg-surface-container-lowest pl-10 pr-4 text-sm text-on-surface shadow-theme-xs placeholder-on-surface-variant/60 transition-colors focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
            placeholder="Tìm kiếm món ăn..."
            type="text"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <TableModeBadge />
        <ConnectivityIndicator />
        <PendingCounter />
        <button type="button" aria-label="Mở bảng đồng bộ" onClick={openSyncPanel} className="grid h-10 w-10 place-items-center rounded-full text-on-surface-variant hover:bg-surface-container hover:text-on-surface active:scale-95 transition-all">
          <span aria-hidden="true" className="material-symbols-outlined text-[22px]">sync</span>
        </button>
        {isAdmin ? (
          <Link aria-label="Mở trang quản trị" to="/admin" className="grid h-10 w-10 place-items-center rounded-full text-on-surface-variant hover:bg-surface-container hover:text-on-surface active:scale-95 transition-all">
            <span aria-hidden="true" className="material-symbols-outlined text-[22px]">settings</span>
          </Link>
        ) : null}

        <div className="relative flex items-center gap-3 border-l border-outline-variant/60 pl-4 h-9 select-none">
          <button type="button" aria-label="Mở menu người dùng" aria-expanded={isUserMenuOpen} onClick={() => setIsUserMenuOpen((open) => !open)} className="flex items-center gap-2.5 rounded-full py-1 pr-1 text-left transition-colors hover:bg-surface-container focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 md:pl-1 md:pr-2.5">
            <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-full bg-primary-container font-bold text-on-primary-container text-sm ring-1 ring-primary/10">
              {initial}
            </span>
            <span className="hidden md:flex flex-col text-left">
              <span className="text-sm font-semibold text-on-surface leading-none">{userName}</span>
              <span className="text-[11px] text-on-surface-variant capitalize mt-0.5">{userRole}</span>
            </span>
          </button>
          {isUserMenuOpen ? (
            <div role="menu" className="absolute right-0 top-11 z-50 min-w-44 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-1.5 shadow-overlay">
              <button type="button" role="menuitem" disabled={isLoggingOut} onClick={handleLogout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-on-surface hover:bg-surface-container-low disabled:opacity-60">
                <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-on-surface-variant">logout</span>
                {isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
