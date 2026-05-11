import { Navigate } from 'react-router-dom'
import { useSessionStore } from './session-store'
import { getRoleRoute } from './session-lifecycle'
import { useBootStatus } from './use-boot-status'

export function RoleAwareIndex() {
  const bootStatus = useBootStatus()
  const currentUser = useSessionStore((state) => state.currentUser)

  if (bootStatus === 'loading') return <div className="p-6 text-sm text-text-secondary">Đang kiểm tra phiên đăng nhập…</div>
  return <Navigate to={getRoleRoute(currentUser?.role)} replace />
}
