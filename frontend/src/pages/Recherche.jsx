import { useState, useCallback } from 'react'
import { Search as SearchIcon, MapPin, Package, FolderOpen } from 'lucide-react'
import { api } from '../lib/api'
import { computeStatut, formatDate } from '../lib/utils'
import PageWrapper from '../components/layout/PageWrapper'
import Header from '../components/layout/Header'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'

export default function Recherche() {
  const [query, setQuery] = useState('')
  const [annee, setAnnee] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const search = useCallback(async () => {
    if (query.trim().length < 2) return
    setLoading(true)
    setSearched(true)
    try {
      const params = new URLSearchParams({ q: query.trim() })
      if (annee) params.set('annee', annee)
      const data = await api.get(`/documents/recherche-intelligente?${params}`)
      setResults((data || []).map(d => ({ ...d, statut_calcule: computeStatut(d.date_limite_conservation) })))
    } catch {
      setResults([])
    }
    setLoading(false)
  }, [query, annee])

  function handleKeyDown(e) {
    if (e.key === 'Enter') search()
  }

  return (
    <PageWrapper>
      <Header title="Recherche intelligente" subtitle="Décrivez ce que vous cherchez en langage libre" />

      <Card className="mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <SearchIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-bg-secondary border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent text-sm"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ex : bulletins de paie 2019, dossier médical résident sorti..."
              autoFocus
            />
          </div>
          <Input
            type="number"
            value={annee}
            onChange={e => setAnnee(e.target.value)}
            placeholder="Année"
            min="1900" max="2099"
            className="w-28"
          />
          <button
            onClick={search}
            disabled={query.trim().length < 2 || loading}
            className="px-5 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
          >
            Rechercher
          </button>
        </div>
        <p className="text-xs text-text-muted mt-2">
          Recherche tolérante aux fautes dans : description, catégorie, thème, carton, salle, étagère, fondement juridique
        </p>
      </Card>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : !searched ? (
        <div className="text-center py-20 text-text-muted">
          <SearchIcon size={48} className="mx-auto mb-4 opacity-30" />
          <p>Saisissez votre recherche ci-dessus</p>
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-20 text-text-muted">
          <SearchIcon size={48} className="mx-auto mb-4 opacity-30" />
          <p>Aucun document trouvé pour « {query} »</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-text-secondary mb-4">{results.length} résultat(s) — classés par pertinence</p>
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
