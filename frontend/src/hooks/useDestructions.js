import { useState } from 'react'
import { api } from '../lib/api'

export function useDestructions() {
  const [loading, setLoading] = useState(false)

  async function marquerDetruit({ document_id, date_destruction, effectue_par, methode, notes }) {
    setLoading(true)
    try {
      await api.post('/destructions', { document_id, date_destruction, methode, notes })
      return { error: null }
    } catch (error) {
      return { error }
    } finally {
      setLoading(false)
    }
  }

  return { loading, marquerDetruit }
}
