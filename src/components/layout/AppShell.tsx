'use client'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Eye, EyeOff, Zap, LogIn } from 'lucide-react'
import Sidebar from './Sidebar'
import { AuthProvider, useAuth } from '@/lib/AuthContext'
import { COMPANY_NAME } from '@/lib/demoData'

function LoginScreen() {
  const { login, users } = useAuth()
  const [username,    setUsername]    = useState('')
  const [password,    setPassword]    = useState('')
  const [showPw,      setShowPw]      = useState(false)
  const [error,       setError]       = useState('')
  const [loading,     setLoading]     = useState(false)

  const isFirstLogin = users.length === 1 && !users[0].lastLogin

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username || !password) { setError('Enter your username and password'); return }
    setLoading(true); setError('')
    const result = await login(username, password)
    setLoading(false)
    if (result === 'invalid') setError('Incorrect username or password')
    else if (result === 'inactive') setError('Your account has been deactivated — contact your administrator')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-600/30">
            <Zap size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">{COMPANY_NAME}</h1>
          <p className="text-slate-400 text-sm mt-1">CFO Cockpit — sign in to continue</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="px-7 py-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Username</label>
                <input
                  type="text" autoComplete="username" autoFocus
                  value={username} onChange={e => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'} autoComplete="current-password"
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow" />
                  <button type="button" onClick={() => setShowPw(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-2.5 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors mt-2">
                <LogIn size={15} />
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          </div>

          {/* Default credentials hint for first run */}
          {isFirstLogin && (
            <div className="border-t border-slate-100 bg-indigo-50 px-7 py-4">
              <p className="text-xs text-indigo-700 font-semibold mb-1">First-time setup</p>
              <p className="text-xs text-indigo-600">Default credentials: <span className="font-mono font-bold">admin</span> / <span className="font-mono font-bold">Admin1234</span></p>
              <p className="text-xs text-indigo-500 mt-1">Change your password in Settings → Users after signing in.</p>
            </div>
          )}
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          {COMPANY_NAME} · Secure local session
        </p>
      </div>
    </div>
  )
}

function AppContent({ children }: { children: React.ReactNode }) {
  const { session, isLoaded } = useAuth()
  const pathname = usePathname()

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Loading…</div>
      </div>
    )
  }

  // Portal and connect pages are public
  const isPublic = pathname.startsWith('/portal') || pathname.startsWith('/connect')
  if (isPublic) return <>{children}</>

  if (!session) return <LoginScreen />

  const showSidebar = !pathname.startsWith('/portal') && !pathname.startsWith('/connect')
  if (!showSidebar) return <>{children}</>

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden" style={{ marginLeft: 'var(--nav-width)' }}>
        {children}
      </main>
    </div>
  )
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppContent>{children}</AppContent>
    </AuthProvider>
  )
}
