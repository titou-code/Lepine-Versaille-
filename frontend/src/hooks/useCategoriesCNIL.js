import { useState, useEffect } from 'react'
import { api } from '../lib/api'

export function useCategoriesCNIL() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetchCategories() {
    setLoading(true)
    try {
      const data = await api.get('/categories-cnil')
      setCategories(data || [])
    } catch {
      setCategories([])
    }
    setLoading(false)
  }

  useEffect(() => { fetchCategories() }, [])

  const sections = [...new Set(categories.map(c => c.section))]

  return { categories, sections, loading, fetchCategories }
}
