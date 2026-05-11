import { apiClient } from '../../shared/lib/api-client'
import { getCookieValue } from './interceptor'
import type { BackendUser } from './token-store-types'

export type LoginResponse = { accessToken: string; user: BackendUser }
export type RefreshResponse = { accessToken: string }

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>('/auth/login', { email, password }, { withCredentials: true })
  return response.data
}

export async function refresh(): Promise<RefreshResponse> {
  const csrfToken = getCookieValue('csrf_token')
  const config = csrfToken
    ? { withCredentials: true, headers: { 'X-CSRF-Token': csrfToken } }
    : { withCredentials: true }
  const response = await apiClient.post<RefreshResponse>('/auth/refresh', undefined, config)
  return response.data
}
