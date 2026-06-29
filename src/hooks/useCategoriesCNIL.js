import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useCategoriesCNIL() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetchCategories() {
    setLoading(true)
    const { data, error } = await supabase
      .from('categories_cnil')
      .select('*')
      .order('section')
      .order('categorie')
    if (!error) setCategories(data || [])
    setLoading(false)
    return { data, error }
  }

  useEffect(() => { fetchCategories() }, [])

  const sections = [...new Set(categories.map(c => c.section))]

  return { categories, sections, loading, fetchCategories }
}
