import { apiClient } from '../../shared/lib/api-client'
import { getCookieValue } from './interceptor'
import type { BackendUser } from './token-store-types'

export type LoginResponse = { accessToken: string; user: BackendUser }
export type RefreshResponse = { accessToken: string }

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>('/auth/login', { email, password }, { withCredentials: true })
  return response.data
}

function getCsrfConfig() {
  const csrfToken = getCookieValue('csrf_token')
  return csrfToken
    ? { withCredentials: true, headers: { 'X-CSRF-Token': csrfToken } }
    : { withCredentials: true }
}

export async function refresh(): Promise<RefreshResponse> {
  const response = await apiClient.post<RefreshResponse>('/auth/refresh', undefined, getCsrfConfig())
  return response.data
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout', undefined, getCsrfConfig())
}
