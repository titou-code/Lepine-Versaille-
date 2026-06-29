import { useState, useMemo } from 'react'
import { Search as SearchIcon, MapPin, Package, FolderOpen } from 'lucide-react'
import { useDocuments } from '../hooks/useDocuments'
import { useSalles } from '../hooks/useSalles'
import { useCategoriesCNIL } from '../hooks/useCategoriesCNIL'
import { computeStatut, formatDate, THEMES } from '../lib/utils'
import PageWrapper from '../components/layout/PageWrapper'
import Header from '../components/layout/Header'
import Card from '../components/ui/Card'
import Select from '../components/ui/Select'
import Input from '../components/ui/Input'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'

export default function Recherche() {
  const [filters, setFilters] = useState({
    salle_id: '', etagere_id: '', theme: '', annee: '', carton_numero: ''
  })
  const [catFilter, setCatFilter] = useState('')

  const { documents, loading } = useDocuments(filters)
  const { salles } = useSalles()
  const { categories } = useCategoriesCNIL()

  const selectedSalle = salles.find(s => s.id === filters.salle_id)
  const etageres = selectedSalle?.etageres?.filter(e => e.actif) || []

  const results = useMemo(() => {
    let data = documents
    if (catFilter) data = data.filter(d => d.categorie_cnil_id === catFilter)
    return data.map(d => ({ ...d, statut_calcule: computeStatut(d.date_limite_conservation) }))
  }, [documents, catFilter])

  return (
    <PageWrapper>
      <Header title="Recherche" subtitle="Localiser un document dans les archives" />

      <Card className="mb-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Select
            value={filters.salle_id}
            onChange={e => setFilters(f => ({ ...f, salle_id: e.target.value, etagere_id: '' }))}
            placeholder="Toutes les salles"
            options={salles.map(s => ({ value: s.id, label: s.nom }))}
          />
          <Select
            value={filters.etagere_id}
            onChange={e => setFilters(f => ({ ...f, etagere_id: e.target.value }))}
            placeholder="Toutes les étagères"
            options={etageres.map(e => ({ value: e.id, label: e.nom }))}
            disabled={!filters.salle_id}
          />
          <Select
            value={filters.theme}
            onChange={e => setFilters(f => ({ ...f, theme: e.target.value }))}
            placeholder="Tous les thèmes"
            options={THEMES.map(t => ({ value: t, label: t }))}
          />
          <Select
            value={catFilter}
            onChange={e => setCatFilter(e.target.value)}
            placeholder="Toutes catégories"
            options={categories.map(c => ({ value: c.id, label: c.categorie }))}
          />
          <Input
            type="number"
            value={filters.annee}
            onChange={e => setFilters(f => ({ ...f, annee: e.target.value }))}
            placeholder="Année"
          />
          <Input
            value={filters.carton_numero}
            onChange={e => setFilters(f => ({ ...f, carton_numero: e.target.value }))}
            placeholder="N° Carton"
          />
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : results.length === 0 ? (
        <div className="text-center py-20 text-text-muted">
          <SearchIcon size={48} className="mx-auto mb-4 opacity-30" />
          <p>Aucun document trouvé</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-text-secondary mb-4">{results.length} résultat(s)</p>
          {results.map(doc => (
            <Card key={doc.id} className="hover:border-accent/30 transition-colors">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={doc.obligatoire ? 'obligatoire' : 'recommande'} />
                    {doc.statut_calcule && <Badge variant={doc.statut_calcule} />}
                    <span className="text-sm text-text-muted">{doc.theme}</span>
                  </div>
                  <h3 className="font-medium mb-1">{doc.categorie}</h3>
                  {doc.description && <p className="text-sm text-text-secondary">{doc.description}</p>}
                  <div className="flex gap-4 mt-2 text-xs text-text-muted">
                    <span>Année : {doc.annee_document || '—'}</span>
                    <span>Limite : {formatDate(doc.date_limite_conservation)}</span>
                  </div>
                </div>

                <div className="lg:w-64 flex-shrink-0 bg-bg-primary rounded-lg p-4 border border-border">
                  <p className="text-xs text-text-muted mb-2 font-medium uppercase tracking-wider">Localisation</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin size={14} className="text-accent" />
                      <span className="font-medium">{doc.salle_nom}</span>
                    </div>
                    {doc.etagere_nom && (
                      <div className="flex items-center gap-2 text-sm">
                        <FolderOpen size={14} className="text-text-muted" />
                        <span>{doc.etagere_nom}</span>
                      </div>
                    )}
                    {doc.emplacement && (
                      <div className="flex items-center gap-2 text-sm text-text-secondary">
                        <span className="w-3.5" />
                        <span>{doc.emplacement}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Package size={14} className="text-accent" />
                      <span className="font-mono font-bold text-accent">{doc.carton_numero}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageWrapper>
  )
}
