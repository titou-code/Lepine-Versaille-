import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useDocuments(filters = {}) {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchDocuments = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('v_documents_complets').select('*')

    if (filters.salle_id) query = query.eq('salle_id', filters.salle_id)
    if (filters.theme) query = query.eq('theme', filters.theme)
    if (filters.annee) query = query.eq('annee_document', filters.annee)
    if (filters.carton_numero) query = query.ilike('carton_numero', `%${filters.carton_numero}%`)
    if (filters.etagere_id) query = query.eq('etagere_id', filters.etagere_id)
    if (filters.search) {
      query = query.or(`description.ilike.%${filters.search}%,categorie.ilike.%${filters.search}%,carton_numero.ilike.%${filters.search}%`)
    }

    const { data, error } = await query.order('created_at', { ascending: false })
    if (!error) setDocuments(data || [])
    setLoading(false)
    return { data, error }
  }, [filters.salle_id, filters.theme, filters.annee, filters.carton_numero, filters.etagere_id, filters.search])

  useEffect(() => { fetchDocuments() }, [fetchDocuments])

  return { documents, loading, fetchDocuments }
}
