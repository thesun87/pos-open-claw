import { Outlet } from 'react-router-dom'
import { cn } from '../../shared/lib/cn'
import { useAdminUiStore } from '../../shared/stores/admin-ui.store'
import { AdminSidebar } from './admin-sidebar'
import { AdminTopAppBar } from './admin-top-app-bar'

function AdminHome() {
  return <div className="rounded-2xl border border-admin-gray-200 bg-white p-6 shadow-sm"><h1 className="text-title-sm font-semibold text-admin-gray-800">Admin</h1><p className="mt-2 text-sm text-admin-gray-500">Chọn một mục quản trị để bắt đầu.</p></div>
}

function PlaceholderPage({ title }: { title: string }) {
  return <div className="rounded-2xl border border-admin-gray-200 bg-white p-6 shadow-sm"><h1 className="text-title-sm font-semibold text-admin-gray-800">{title}</h1><p className="mt-2 text-sm text-admin-gray-500">CRUD chi tiết sẽ được triển khai ở các story Admin sau.</p></div>
}

export function AdminLayout() {
  const isCollapsed = useAdminUiStore((state) => state.isCollapsed)
  const mobileDrawerOpen = useAdminUiStore((state) => state.mobileDrawerOpen)
  const toggleCollapse = useAdminUiStore((state) => state.toggleCollapse)
  const setMobileDrawerOpen = useAdminUiStore((state) => state.setMobileDrawerOpen)

  return (
    <div data-admin-scope className="min-h-screen bg-admin-gray-50 font-admin text-admin-gray-800">
      <AdminSidebar isCollapsed={isCollapsed} onToggleCollapse={toggleCollapse} />
      <AdminTopAppBar isCollapsed={isCollapsed} onMobileOpen={() => setMobileDrawerOpen(true)} />
      <main className={cn('pt-16 transition-all duration-300', isCollapsed ? 'lg:pl-[90px]' : 'lg:pl-[290px]')}>
        <div className="mx-auto max-w-screen-2xl px-4 py-6 lg:px-6 lg:py-8"><Outlet /></div>
      </main>
      {mobileDrawerOpen ? <AdminSidebar variant="mobile" onMobileClose={() => setMobileDrawerOpen(false)} /> : null}
    </div>
  )
}

export default AdminLayout
export { AdminHome, PlaceholderPage }
