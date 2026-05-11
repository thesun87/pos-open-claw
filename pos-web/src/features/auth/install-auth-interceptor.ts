import { apiClient } from '../../shared/lib/api-client'
import { clearSession, getCurrentSession, saveRefreshedAccessToken } from './token-store'
import { installAuthInterceptor } from './interceptor'

let isInstalled = false

export function installAppAuthInterceptor(): void {
  if (isInstalled) return
  installAuthInterceptor(apiClient, { getCurrentSession, clearSession, saveRefreshedAccessToken })
  isInstalled = true
}
