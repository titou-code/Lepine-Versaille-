import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

let globalRefresh = null

export function useCompteurs() {
  const { user } = useAuth()
  const [compteurs, setCompteurs] = useState({ a_completer: 0, a_detruire: 0, bientot: 0 })

  const refresh = useCallback(async () => {
    if (!user) return
    try {
      const data = await api.get('/notifications/compteurs')
      setCompteurs(data)
    } catch {}
  }, [user])

  useEffect(() => {
    globalRefresh = refresh
    refresh()
    const interval = setInterval(refresh, 5 * 60 * 1000)
    return () => { clearInterval(interval); globalRefresh = null }
  }, [refresh])

  return { compteurs, refresh }
}

export function refreshCompteurs() {
  if (globalRefresh) globalRefresh()
}
