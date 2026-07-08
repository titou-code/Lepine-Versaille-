import { useState } from 'react'
import { api } from '../lib/api'

export function useCartons() {
  const [loading, setLoading] = useState(false)

  async function getNextNumero(prefix) {
    const data = await api.get(`/cartons/numero/preview?prefix=${encodeURIComponent(prefix)}`)
    return data.numero
  }

  async function createCartonWithDocuments(cartonData, documents) {
    setLoading(true)
    try {
      const carton = await api.post('/cartons', { carton: cartonData, documents })
      return { data: carton, error: null }
    } catch (error) {
      return { data: null, error }
    } finally {
      setLoading(false)
    }
  }

  return { loading, getNextNumero, createCartonWithDocuments }
}
