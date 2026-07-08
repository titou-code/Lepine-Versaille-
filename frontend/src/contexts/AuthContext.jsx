import { createContext, useContext, useState, useEffect } from 'react'
import { api, setToken, clearToken } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)

  async function signIn(email, password) {
    const data = await api.post('/auth/login', { email, password })
    setToken(data.token)
    setUser(data.user)
    setProfile(data.user)
  }

  async function signOut() {
    try { await api.post('/auth/logout') } catch {}
    clearToken()
    setUser(null)
    setProfile(null)
  }

  function markPasswordChanged() {
    setUser(u => u ? { ...u, must_change_password: false } : u)
    setProfile(p => p ? { ...p, must_change_password: false } : p)
  }

  useEffect(() => {
    function handleExpired() { signOut() }
    window.addEventListener('auth:expired', handleExpired)
    return () => window.removeEventListener('auth:expired', handleExpired)
  }, [])

  const role = profile?.role || null
  const isSuperAdmin = role === 'super_admin'
  const isAdmin = role === 'admin' || role === 'super_admin'
  const isArchiviste = role === 'archiviste'
  const canWrite = isAdmin || isArchiviste
  const canManage = isAdmin
  const mustChangePassword = !!profile?.must_change_password

  return (
    <AuthContext.Provider value={{
      user, profile, loading, role,
      isSuperAdmin, isAdmin, isArchiviste, canWrite, canManage,
      mustChangePassword, markPasswordChanged,
      signIn, signOut
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
