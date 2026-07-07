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

  async function fetchAllCategories() {
    setLoading(true)
    try {
      const data = await api.get('/categories-cnil/all')
      setCategories(data || [])
    } catch {
      setCategories([])
    }
    setLoading(false)
  }

  async function createCategory(payload) {
    try {
      const data = await api.post('/categories-cnil', payload)
      fetchCategories()
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  async function updateCategory(id, payload) {
    try {
      await api.put(`/categories-cnil/${id}`, payload)
      fetchCategories()
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  async function deleteCategory(id) {
    try {
      await api.post(`/categories-cnil/${id}/delete`)
      fetchCategories()
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  useEffect(() => { fetchCategories() }, [])

  const sections = [...new Set(categories.map(c => c.section))]

  return { categories, sections, loading, fetchCategories, fetchAllCategories, createCategory, updateCategory, deleteCategory }
}
