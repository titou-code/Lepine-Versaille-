import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'

export function useDocuments(filters = {}) {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchDocuments = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.salle_id) params.set('salle_id', filters.salle_id)
    if (filters.theme) params.set('theme', filters.theme)
    if (filters.annee) params.set('annee', filters.annee)
    if (filters.carton_numero) params.set('carton_numero', filters.carton_numero)
    if (filters.etagere_id) params.set('etagere_id', filters.etagere_id)
    if (filters.search) params.set('search', filters.search)

    try {
      const data = await api.get(`/documents?${params}`)
      setDocuments(data || [])
    } catch {
      setDocuments([])
    }
    setLoading(false)
  }, [filters.salle_id, filters.theme, filters.annee, filters.carton_numero, filters.etagere_id, filters.search])

  useEffect(() => { fetchDocuments() }, [fetchDocuments])

  return { documents, loading, fetchDocuments }
}
