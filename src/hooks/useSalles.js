import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useSalles() {
  const [salles, setSalles] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetchSalles() {
    setLoading(true)
    const { data, error } = await supabase
      .from('salles')
      .select('*, etageres(*)')
      .eq('actif', true)
      .order('nom')
    if (!error) setSalles(data || [])
    setLoading(false)
    return { data, error }
  }

  async function createSalle(nom) {
    const { data, error } = await supabase
      .from('salles')
      .insert({ nom })
      .select()
      .single()
    if (!error) fetchSalles()
    return { data, error }
  }

  async function updateSalle(id, updates) {
    const { error } = await supabase.from('salles').update(updates).eq('id', id)
    if (!error) fetchSalles()
    return { error }
  }

  async function createEtagere(salle_id, nom, description = '') {
    const { data, error } = await supabase
      .from('etageres')
      .insert({ salle_id, nom, description })
      .select()
      .single()
    if (!error) fetchSalles()
    return { data, error }
  }

  async function updateEtagere(id, updates) {
    const { error } = await supabase.from('etageres').update(updates).eq('id', id)
    if (!error) fetchSalles()
    return { error }
  }

  useEffect(() => { fetchSalles() }, [])

  return { salles, loading, fetchSalles, createSalle, updateSalle, createEtagere, updateEtagere }
}
