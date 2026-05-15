import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { clearSession } from '../../features/auth/token-store'
import { useSessionStore } from '../../features/auth/session-store'
import { Button } from '../../shared/components/ui/button'
import { StatusBadge } from '../../shared/components/ui/status-badge'
import { cn } from '../../shared/lib/cn'

const sections = [
  { title: 'Quản lý Menu', items: [
    { label: 'Danh mục', to: '/admin/menu/categories' },
    { label: 'Sản phẩm', to: '/admin/menu/products' },
    { label: 'Nhóm tùy chọn', to: '/admin/menu/option-groups' },
  ] },
  { title: 'Báo cáo', items: [{ label: 'Báo cáo', to: '/admin/reports' }] },
]

function AdminNavigation({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Điều hướng Admin" className="rounded-lg border border-border bg-surface p-4">
      {sections.map((section) => (
        <section key={section.title} className="mb-5 last:mb-0" aria-labelledby={`admin-section-${section.title}`}>
          <h2 id={`admin-section-${section.title}`} className="font-semibold text-primary">{section.title}</h2>
          <ul className="mt-2 space-y-1">
            {section.items.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} onClick={onNavigate} className={({ isActive }) => cn('block min-h-touch rounded-md border border-transparent px-3 py-2 text-sm font-medium text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary', isActive && 'border-primary bg-primary/10 text-primary underline underline-offset-4')}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  )
}

function AdminHome() {
  return <div className="rounded-lg border border-border bg-surface p-6"><h1 className="text-2xl font-semibold">Admin</h1><p className="mt-2 text-text-secondary">Chọn một mục quản trị để bắt đầu.</p></div>
}

function PlaceholderPage({ title }: { title: string }) {
  return <div className="rounded-lg border border-border bg-surface p-6"><h1 className="text-2xl font-semibold">{title}</h1><p className="mt-2 text-text-secondary">CRUD chi tiết sẽ được triển khai ở các story Admin sau.</p></div>
}

export function AdminLayout() {
  const [open, setOpen] = useState(false)
  const user = useSessionStore((state) => state.currentUser)
  const navigate = useNavigate()
  const identity = user?.email ?? 'Admin'

  const handleLogout = async () => {
    await clearSession()
    useSessionStore.getState().clearSessionState()
    navigate('/login', { replace: true })
  }

  return (
    <section className="grid gap-6 p-4 lg:grid-cols-[260px_1fr] lg:p-6">
      <div className="lg:hidden">
        <Button type="button" variant="outline" aria-expanded={open} aria-controls="admin-mobile-nav" aria-label="Mở điều hướng Admin" onClick={() => setOpen((value) => !value)}><Menu aria-hidden="true" size={18} /> Menu</Button>
        {open ? <div id="admin-mobile-nav" className="mt-3"><AdminNavigation onNavigate={() => setOpen(false)} /></div> : null}
      </div>
      <aside className="hidden lg:block"><AdminNavigation /></aside>
      <main className="min-w-0 space-y-4">
        <header className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-sm text-text-secondary">Đang đăng nhập</p><p className="font-semibold text-text-primary">{identity}</p></div>
          <div className="flex flex-wrap items-center gap-2"><StatusBadge variant="accent" label="Admin" /><Button type="button" variant="outline" onClick={handleLogout}>Đăng xuất</Button></div>
        </header>
        <Outlet />
      </main>
    </section>
  )
}

export default AdminLayout
export { AdminHome, PlaceholderPage }
