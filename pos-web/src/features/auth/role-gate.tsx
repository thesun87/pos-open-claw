import { Navigate, Outlet } from 'react-router-dom'
import { useSessionStore } from './session-store'
import { AUTH_ADMIN_FORBIDDEN_MESSAGE } from '../../shared/i18n/messages'

export function AdminRoleGate() {
  const user = useSessionStore((state) => state.currentUser)
  if (user?.role !== 'admin') {
    return <Navigate to="/pos" replace state={{ message: AUTH_ADMIN_FORBIDDEN_MESSAGE }} />
  }
  return <Outlet />
}
