import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSessionStore } from './session-store'
import { useBootStatus } from './use-boot-status'

export function ProtectedRoute() {
  const bootStatus = useBootStatus()
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated)
  const location = useLocation()

  if (bootStatus === 'loading') return <div className="p-6 text-sm text-text-secondary">Đang kiểm tra phiên đăng nhập…</div>
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}
