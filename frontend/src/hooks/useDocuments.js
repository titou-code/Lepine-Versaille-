import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'

export function useDocuments(filters = {}) {
  const [documents, setDocuments] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(filters)) {
    if (v !== '' && v !== null && v !== undefined) params.set(k, v)
  }
  const queryString = params.toString()

  const fetchDocuments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get(`/documents?${queryString}`)
      // Nouveau format paginé : { data, total, page, pageSize }
      setDocuments(res?.data || [])
      setTotal(res?.total || 0)
    } catch {
      setDocuments([])
      setTotal(0)
    }
    setLoading(false)
  }, [queryString])

  useEffect(() => { fetchDocuments() }, [fetchDocuments])

  return { documents, total, loading, fetchDocuments }
}
