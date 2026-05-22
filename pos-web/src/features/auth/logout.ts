import { useNavigate } from 'react-router-dom'
import { logout } from './api'
import { useSessionStore } from './session-store'
import { clearSession } from './token-store'

export async function logoutAndRedirect(replace: (path: string) => void): Promise<void> {
  try {
    await logout()
  } catch (error) {
    console.warn('[auth] Logout API failed; cleared local session only', error)
    window.dispatchEvent(new CustomEvent('toast', { detail: 'Đã đăng xuất khỏi thiết bị này. Không thể xác nhận với máy chủ.' }))
  } finally {
    await clearSession()
    useSessionStore.getState().clearSessionState()
    replace('/login')
  }
}

export function useLogoutAction() {
  const navigate = useNavigate()
  return () => logoutAndRedirect((path) => navigate(path, { replace: true }))
}
