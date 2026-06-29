import { useState } from 'react'
import { supabase } from '../lib/supabase'

export function useCartons() {
  const [loading, setLoading] = useState(false)

  async function getNextNumero(prefix) {
    const { data } = await supabase.rpc('generate_numero_carton', { prefix })
    return data
  }

  async function createCartonWithDocuments(cartonData, documents) {
    setLoading(true)
    try {
      const { data: carton, error: cartonError } = await supabase
        .from('cartons')
        .insert(cartonData)
        .select()
        .single()

      if (cartonError) throw cartonError

      if (documents.length > 0) {
        const docs = documents.map(doc => ({
          ...doc,
          carton_id: carton.id,
        }))
        const { error: docsError } = await supabase
          .from('documents')
          .insert(docs)

        if (docsError) throw docsError
      }

      return { data: carton, error: null }
    } catch (error) {
      return { data: null, error }
    } finally {
      setLoading(false)
    }
  }

  return { loading, getNextNumero, createCartonWithDocuments }
}
