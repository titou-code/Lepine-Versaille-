import { useState } from 'react'
import { supabase } from '../lib/supabase'

export function useDestructions() {
  const [loading, setLoading] = useState(false)

  async function marquerDetruit({ document_id, date_destruction, effectue_par, methode, notes }) {
    setLoading(true)
    const { error } = await supabase
      .from('destructions')
      .insert({ document_id, date_destruction, effectue_par, methode, notes })
    setLoading(false)
    return { error }
  }

  return { loading, marquerDetruit }
}
