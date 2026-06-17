export type UserRole = 'admin' | 'billing' | 'readonly'

export interface AppUser {
  id: string
  username: string
  email: string
  firstName: string
  lastName: string
  passwordHash: string
  role: UserRole
  createdAt: string
  lastLogin?: string
  active: boolean
}

export interface AuthSession {
  userId: string
  username: string
  firstName: string
  lastName: string
  email: string
  role: UserRole
  loginAt: string
}
