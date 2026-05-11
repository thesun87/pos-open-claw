import axios, { type AxiosError, type AxiosInstance, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'
import type { SessionRecord } from './token-store-types'

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean }

type AuthInterceptorDeps = {
  getCurrentSession: () => Promise<SessionRecord | undefined>
  clearSession: () => Promise<void>
  saveRefreshedAccessToken: (token: string) => Promise<SessionRecord | undefined>
  onAuthExpired?: () => void
  locationAssign?: (url: string) => void
  now?: () => number
}

function isAuthPath(url = ''): boolean {
  return url.includes('/auth/login') || url.includes('/auth/refresh')
}

export function getCookieValue(name: string, cookie = typeof document === 'undefined' ? '' : document.cookie): string | undefined {
  return cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.split('=').slice(1).join('=')
}

function expire(deps: AuthInterceptorDeps) {
  void deps.clearSession()
  deps.onAuthExpired?.()
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('auth.expired'))
  if (deps.locationAssign) {
    deps.locationAssign('/login')
  } else if (typeof window !== 'undefined') {
    window.location.assign('/login')
  }
}

export function installAuthInterceptor(client: AxiosInstance, deps: AuthInterceptorDeps): void {
  const now = deps.now ?? Date.now

  client.interceptors.request.use(async (config) => {
    if (isAuthPath(config.url)) return config
    const session = await deps.getCurrentSession()
    if (!session) return config
    if (session.expiresAt <= now()) {
      expire(deps)
      return Promise.reject(new axios.CanceledError('Phiên đăng nhập đã hết hạn.'))
    }
    if (!config.headers.Authorization) config.headers.Authorization = `Bearer ${session.accessToken}`
    return config
  })

  client.interceptors.response.use(undefined, async (error: AxiosError) => {
    const config = error.config as RetryConfig | undefined

    if (!error.response) {
      const session = await deps.getCurrentSession()
      if (session && session.expiresAt <= now()) expire(deps)
      return Promise.reject(error)
    }

    if (error.response.status !== 401 || !config || config._retry || isAuthPath(config.url)) return Promise.reject(error)

    config._retry = true
    try {
      const csrfToken = getCookieValue('csrf_token')
      const refreshConfig: AxiosRequestConfig = { withCredentials: true }
      if (csrfToken) refreshConfig.headers = { 'X-CSRF-Token': csrfToken }
      const response = await client.post<{ accessToken: string }>('/auth/refresh', undefined, refreshConfig)
      const updated = await deps.saveRefreshedAccessToken(response.data.accessToken)
      config.headers.Authorization = `Bearer ${updated?.accessToken ?? response.data.accessToken}`
      return client(config)
    } catch (refreshError) {
      expire(deps)
      return Promise.reject(refreshError)
    }
  })
}
