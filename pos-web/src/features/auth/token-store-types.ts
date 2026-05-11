export type UserRole = 'admin' | 'cashier'

export type AuthUser = {
  id: string
  email: string
  role: UserRole
  tenantId: string
  storeId: string
}

export type BackendUser = Omit<AuthUser, 'role'> & { role: string }

export type SessionRecord = {
  id: 'current'
  accessToken: string
  expiresAt: number
  userInfo: AuthUser
  lastLoginAt: number
}
