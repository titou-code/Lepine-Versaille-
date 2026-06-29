import { useState, useMemo } from 'react'
import { BookOpen } from 'lucide-react'
import { useCategoriesCNIL } from '../hooks/useCategoriesCNIL'
import PageWrapper from '../components/layout/PageWrapper'
import Header from '../components/layout/Header'
import Card from '../components/ui/Card'
import Select from '../components/ui/Select'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'

export default function Referentiel() {
  const { categories, sections, loading } = useCategoriesCNIL()
  const [sectionFilter, setSectionFilter] = useState('')
  const [obligatoireFilter, setObligatoireFilter] = useState('')

  const filtered = useMemo(() => {
    let data = categories
    if (sectionFilter) data = data.filter(c => c.section === sectionFilter)
    if (obligatoireFilter === 'true') data = data.filter(c => c.obligatoire)
    if (obligatoireFilter === 'false') data = data.filter(c => !c.obligatoire)
    return data
  }, [categories, sectionFilter, obligatoireFilter])

  if (loading) return <PageWrapper><div className="flex justify-center py-20"><Spinner size="lg" /></div></PageWrapper>

  return (
    <PageWrapper>
      <Header title="Référentiel CNIL" subtitle="Durées de conservation réglementaires" />

      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select
            value={sectionFilter}
            onChange={e => setSectionFilter(e.target.value)}
            placeholder="Toutes les sections"
            options={sections.map(s => ({ value: s, label: s }))}
          />
          <Select
            value={obligatoireFilter}
            onChange={e => setObligatoireFilter(e.target.value)}
            placeholder="Obligatoire / Recommandé"
            options={[
              { value: 'true', label: 'Obligatoire' },
              { value: 'false', label: 'Recommandé' },
            ]}
          />
          <div className="flex items-center text-sm text-text-muted">
            {filtered.length} catégorie(s)
          </div>
        </div>
      </Card>

      <div className="overflow-x-auto border border-border rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-bg-secondary">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-text-muted uppercase">Section</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-text-muted uppercase">Catégorie</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-text-muted uppercase">Durée base active</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-text-muted uppercase">Durée archivage</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-text-muted uppercase">Type date</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-text-muted uppercase">Obligation</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-text-muted uppercase">Fondement</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map(cat => (
              <tr key={cat.id} className="hover:bg-bg-hover transition-colors">
                <td className="px-3 py-2.5 whitespace-nowrap text-text-secondary">{cat.section}</td>
                <td className="px-3 py-2.5 max-w-[300px]">{cat.categorie}</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-text-secondary">{cat.duree_base_active || '—'}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  {cat.duree_archivage_mois
                    ? cat.duree_archivage_mois >= 12
                      ? `${Math.floor(cat.duree_archivage_mois / 12)} an(s)`
                      : `${cat.duree_archivage_mois} mois`
                    : '—'}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap text-xs text-text-muted">{cat.type_date_reference}</td>
                <td className="px-3 py-2.5"><Badge variant={cat.obligatoire ? 'obligatoire' : 'recommande'} /></td>
                <td className="px-3 py-2.5 text-xs text-text-muted max-w-[250px]">{cat.fondement_juridique}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageWrapper>
  )
}
