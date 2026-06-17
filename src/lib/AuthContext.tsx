'use client'
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import type { AppUser, AuthSession, UserRole } from './authTypes'

const USERS_KEY   = 'app_users_v1'
const SESSION_KEY = 'app_session_v1'

async function hashPassword(password: string): Promise<string> {
  const enc  = new TextEncoder()
  const hash = await crypto.subtle.digest('SHA-256', enc.encode(password))
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

interface AuthStore {
  session:        AuthSession | null
  users:          AppUser[]
  isLoaded:       boolean
  login:          (username: string, password: string) => Promise<'ok' | 'invalid' | 'inactive'>
  logout:         () => void
  addUser:        (data: { firstName: string; lastName: string; username: string; email: string; role: UserRole; password: string; active: boolean }) => Promise<{ ok: boolean; error?: string }>
  updateUser:     (id: string, updates: Partial<Omit<AppUser, 'id' | 'passwordHash'>>) => void
  changePassword: (id: string, newPassword: string) => Promise<void>
  removeUser:     (id: string) => void
}

const Ctx = createContext<AuthStore | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users,    setUsers]    = useState<AppUser[]>([])
  const [session,  setSession]  = useState<AuthSession | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  const saveUsers = useCallback((u: AppUser[]) => {
    try { localStorage.setItem(USERS_KEY, JSON.stringify(u)) } catch {}
  }, [])

  useEffect(() => {
    async function init() {
      let stored: AppUser[] = []
      try { stored = JSON.parse(localStorage.getItem(USERS_KEY) ?? '[]') } catch {}

      if (stored.length === 0) {
        const hash = await hashPassword('Admin1234')
        stored = [{
          id: 'user-admin-default',
          username: 'admin',
          email: 'admin@company.com',
          firstName: 'Admin',
          lastName: 'User',
          passwordHash: hash,
          role: 'admin',
          createdAt: new Date().toISOString(),
          active: true,
        }]
        localStorage.setItem(USERS_KEY, JSON.stringify(stored))
      }
      setUsers(stored)

      try {
        const sess: AuthSession | null = JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null')
        if (sess && stored.find(u => u.id === sess.userId && u.active)) setSession(sess)
      } catch {}

      setIsLoaded(true)
    }
    init()
  }, [])

  const login = useCallback(async (username: string, password: string): Promise<'ok' | 'invalid' | 'inactive'> => {
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase())
    if (!user) return 'invalid'
    if (!user.active) return 'inactive'
    const hash = await hashPassword(password)
    if (hash !== user.passwordHash) return 'invalid'

    const sess: AuthSession = {
      userId: user.id, username: user.username,
      firstName: user.firstName, lastName: user.lastName, email: user.email,
      role: user.role, loginAt: new Date().toISOString(),
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(sess))
    const updated = users.map(u => u.id === user.id ? { ...u, lastLogin: new Date().toISOString() } : u)
    setUsers(updated); saveUsers(updated); setSession(sess)
    return 'ok'
  }, [users, saveUsers])

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY)
    setSession(null)
  }, [])

  const addUser = useCallback(async (data: { firstName: string; lastName: string; username: string; email: string; role: UserRole; password: string; active: boolean }): Promise<{ ok: boolean; error?: string }> => {
    if (users.some(u => u.username.toLowerCase() === data.username.toLowerCase())) {
      return { ok: false, error: 'Username already taken' }
    }
    const hash = await hashPassword(data.password)
    const newUser: AppUser = {
      id: `user-${Date.now()}`,
      username: data.username, email: data.email,
      firstName: data.firstName, lastName: data.lastName,
      passwordHash: hash, role: data.role,
      createdAt: new Date().toISOString(), active: data.active,
    }
    setUsers(prev => { const next = [...prev, newUser]; saveUsers(next); return next })
    return { ok: true }
  }, [users, saveUsers])

  const updateUser = useCallback((id: string, updates: Partial<Omit<AppUser, 'id' | 'passwordHash'>>) => {
    setUsers(prev => { const next = prev.map(u => u.id === id ? { ...u, ...updates } : u); saveUsers(next); return next })
    setSession(prev => {
      if (!prev || prev.userId !== id) return prev
      const updated = { ...prev, ...updates }
      localStorage.setItem(SESSION_KEY, JSON.stringify(updated))
      return updated
    })
  }, [saveUsers])

  const changePassword = useCallback(async (id: string, newPassword: string) => {
    const hash = await hashPassword(newPassword)
    setUsers(prev => { const next = prev.map(u => u.id === id ? { ...u, passwordHash: hash } : u); saveUsers(next); return next })
  }, [saveUsers])

  const removeUser = useCallback((id: string) => {
    setUsers(prev => { const next = prev.filter(u => u.id !== id); saveUsers(next); return next })
  }, [saveUsers])

  return (
    <Ctx.Provider value={{ session, users, isLoaded, login, logout, addUser, updateUser, changePassword, removeUser }}>
      {children}
    </Ctx.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
