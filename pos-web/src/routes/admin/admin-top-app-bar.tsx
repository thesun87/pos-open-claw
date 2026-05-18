import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut, Menu } from 'lucide-react'
import { clearSession } from '../../features/auth/token-store'
import { useSessionStore } from '../../features/auth/session-store'
import { ConnectivityIndicator } from '../../shared/components/layout/connectivity-indicator'
import { PendingCounter } from '../../shared/components/layout/pending-counter'
import { cn } from '../../shared/lib/cn'
import { usePageTitle } from './_use-page-title'

type Props = { isCollapsed: boolean; onMobileOpen: () => void }

export function AdminTopAppBar({ isCollapsed, onMobileOpen }: Props) {
  const title = usePageTitle()
  const user = useSessionStore((state) => state.currentUser)
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const email = user?.email ?? 'admin@example.com'
  const initial = (email.split('@')[0]?.[0] ?? 'A').toUpperCase()

  useEffect(() => {
    const onPointer = (event: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false) }
    window.addEventListener('mousedown', onPointer)
    return () => window.removeEventListener('mousedown', onPointer)
  }, [])

  const handleLogout = async () => {
    await clearSession()
    useSessionStore.getState().clearSessionState()
    navigate('/login', { replace: true })
  }

  return (
    <header className={cn('fixed top-0 right-0 left-0 z-30 flex h-16 items-center justify-between border-b border-admin-gray-200 bg-white px-4 transition-all duration-300 lg:px-6', isCollapsed ? 'lg:left-[90px]' : 'lg:left-[290px]')}>
      <div className="flex min-w-0 items-center gap-3">
        <button type="button" aria-label="Mở điều hướng Admin" onClick={onMobileOpen} className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-lg text-admin-gray-500 hover:bg-admin-gray-50 hover:text-admin-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-brand-500 focus-visible:ring-offset-2 lg:hidden"><Menu size={20} /></button>
        <h2 className="truncate text-theme-xl font-semibold text-admin-gray-800">{title}</h2>
      </div>
      <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
        <ConnectivityIndicator />
        <PendingCounter />
        <div className="hidden h-6 w-px bg-admin-gray-200 sm:block" />
        <div className="relative" ref={menuRef}>
          <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="flex min-h-touch items-center gap-2 rounded-lg px-1.5 py-1 text-admin-gray-700 hover:bg-admin-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-brand-500 focus-visible:ring-offset-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-admin-brand-100 text-sm font-semibold text-admin-brand-600">{initial}</span>
            <span className="hidden max-w-[180px] truncate text-sm md:block">{email}</span>
            <ChevronDown aria-hidden="true" size={16} />
          </button>
          {open ? <div role="menu" className="absolute right-0 mt-2 min-w-[200px] rounded-xl border border-admin-gray-200 bg-white p-2 shadow-md"><button type="button" role="menuitem" onClick={handleLogout} className="flex min-h-touch w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-admin-gray-700 hover:bg-admin-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-brand-500"><LogOut size={16} />Đăng xuất</button></div> : null}
        </div>
      </div>
    </header>
  )
}
