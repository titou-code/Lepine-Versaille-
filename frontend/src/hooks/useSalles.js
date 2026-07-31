import { useState, useEffect } from 'react'
import { api } from '../lib/api'

export function useSalles() {
  const [salles, setSalles] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetchSalles() {
    setLoading(true)
    try {
      const data = await api.get('/salles')
      setSalles(data || [])
    } catch {
      setSalles([])
    }
    setLoading(false)
  }

  async function createSalle(nom, prefixe) {
    try {
      const data = await api.post('/salles', { nom, prefixe })
      fetchSalles()
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  async function updateSalle(id, updates) {
    try {
      await api.patch(`/salles/${id}`, updates)
      fetchSalles()
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  async function deleteSalle(id) {
    try {
      await api.post(`/salles/${id}/delete`)
      fetchSalles()
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  async function createEtagere(salle_id, nom, description = '', nombre_rangees = 5) {
    try {
      const data = await api.post('/salles/etageres', { salle_id, nom, description, nombre_rangees })
      fetchSalles()
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  async function updateEtagere(id, updates) {
    try {
      await api.patch(`/salles/etageres/${id}`, updates)
      fetchSalles()
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  async function deleteEtagere(id) {
    try {
      await api.post(`/salles/etageres/${id}/delete`)
      fetchSalles()
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  useEffect(() => { fetchSalles() }, [])

  return { salles, loading, fetchSalles, createSalle, updateSalle, deleteSalle, createEtagere, updateEtagere, deleteEtagere }
}
