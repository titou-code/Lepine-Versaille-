import { useState, useEffect } from 'react'
import { ClipboardList, Check, Calendar, Clock, FileCheck } from 'lucide-react'
import { api } from '../lib/api'
import { refreshCompteurs } from '../hooks/useCompteurs'
import { useCategoriesCNIL } from '../hooks/useCategoriesCNIL'
import { THEMES, categoriesForService } from '../lib/utils'
import { useToast } from '../components/ui/Toast'
import PageWrapper from '../components/layout/PageWrapper'
import Header from '../components/layout/Header'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Spinner from '../components/ui/Spinner'

function MiniForm({ doc, categories, onSave, onClose }) {
  const needsCategory = !doc.categorie_cnil_id
  const [service, setService] = useState(doc.theme || '')
  const [catId, setCatId] = useState('')
  const [dateEvenement, setDateEvenement] = useState(doc.date_evenement || '')
  const [dureeMois, setDureeMois] = useState(doc.duree_mois_saisie || '')
  const [procedureClose, setProcedureClose] = useState(doc.procedure_close || false)
  const [datePrecise, setDatePrecise] = useState(doc.date_precise || '')
  const [saving, setSaving] = useState(false)

  // Catégorie effective : sélectionnée (document sans catégorie) ou celle du document.
  const selectedCat = needsCategory ? categories.find(c => c.id === catId) : null
  const tp = needsCategory ? selectedCat?.type_precision : doc.type_precision
  const optionsDuree = needsCategory ? selectedCat?.options_duree : doc.options_duree
  const availableCats = needsCategory && service ? categoriesForService(service, categories) : []
  const showPrecision = !needsCategory || !!selectedCat

  async function handleSubmit() {
    if (needsCategory && !catId) { alert('Choisissez un service et une catégorie'); return }
    setSaving(true)
    try {
      await api.patch(`/documents/${doc.id}/completer`, {
        date_evenement: dateEvenement || null,
        duree_mois_saisie: dureeMois ? parseInt(dureeMois) : null,
        procedure_close: tp === 'fin_procedure' ? procedureClose : null,
        date_precise: datePrecise || null,
        ...(needsCategory ? { categorie_cnil_id: catId } : {}),
      })
      onSave()
    } catch (err) {
      alert(err.message)
    }
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-text-secondary mb-2">
        <strong>{doc.categorie || 'Catégorie à choisir'}</strong> — {doc.description || 'Sans description'}
      </div>

      {needsCategory && (
        <div className="space-y-3 pb-3 border-b border-border">
          <Select
            label="Service"
            value={service}
            onChange={e => { setService(e.target.value); setCatId('') }}
            placeholder="Choisir un service"
            options={THEMES.map(t => ({ value: t, label: t }))}
          />
          <Select
            label="Catégorie CNIL"
            value={catId}
            onChange={e => setCatId(e.target.value)}
            placeholder={service ? 'Choisir une catégorie' : "Choisir un service d'abord"}
            disabled={!service}
            options={availableCats.map(c => ({ value: c.id, label: `${c.categorie} (${c.section})` }))}
          />
        </div>
      )}

      {showPrecision && (<>
      {datePrecise !== undefined && (
        <Input
          label="Date précise du document"
          type="date"
          value={datePrecise}
          onChange={e => setDatePrecise(e.target.value)}
        />
      )}

      {tp === 'fin_habilitation' && (
        <Input
          label="Date de fin d'habilitation"
          type="date"
          value={dateEvenement}
          onChange={e => setDateEvenement(e.target.value)}
        />
      )}

      {tp === 'fin_mandat' && (
        <Input
          label="Date de fin de mandat"
          type="date"
          value={dateEvenement}
          onChange={e => setDateEvenement(e.target.value)}
        />
      )}

      {tp === 'fin_procedure' && (
        <>
          <Input
            label="Date de fin de procédure"
            type="date"
            value={dateEvenement}
            onChange={e => setDateEvenement(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={procedureClose}
              onChange={e => setProcedureClose(e.target.checked)}
              className="rounded border-border"
            />
            Procédure clôturée
          </label>
        </>
      )}

      {tp === 'duree_variable' && (
        <>
          {optionsDuree && optionsDuree.length > 0 && (
            <Select
              label="Durée de conservation"
              value={dureeMois}
              onChange={e => setDureeMois(e.target.value)}
              placeholder="Choisir une durée"
              options={optionsDuree
                .filter(o => o.mois !== null)
                .map(o => ({ value: String(o.mois), label: o.label }))
              }
            />
          )}
          {(!optionsDuree || optionsDuree.some(o => o.mois === null)) && (
            <Input
              label="Durée en mois (saisie libre)"
              type="number"
              value={dureeMois}
              onChange={e => setDureeMois(e.target.value)}
              placeholder="Nombre de mois"
              min="1"
            />
          )}
          <Input
            label="Date de l'événement déclencheur"
            type="date"
            value={dateEvenement}
            onChange={e => setDateEvenement(e.target.value)}
          />
        </>
      )}
      </>)}

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="ghost" onClick={onClose}>Annuler</Button>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? <Spinner size="sm" /> : <><Check size={14} /> Valider</>}
        </Button>
      </div>
    </div>
  )
}

export default function ACompleter() {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDoc, setSelectedDoc] = useState(null)
  const { categories } = useCategoriesCNIL()
  const toast = useToast()

  async function fetchDocs() {
    setLoading(true)
    try {
      const data = await api.get('/documents/a-completer')
      setDocuments(data || [])
    } catch {
      setDocuments([])
    }
    setLoading(false)
  }

  useEffect(() => { fetchDocs() }, [])

  function handleSaved() {
    toast('Document complété')
    setSelectedDoc(null)
    fetchDocs()
    refreshCompteurs()
  }

  if (loading) return <PageWrapper><div className="flex justify-center py-20"><Spinner size="lg" /></div></PageWrapper>

  return (
    <PageWrapper>
      <Header
        title="Documents à compléter"
        subtitle={`${documents.length} document(s) nécessitent des précisions pour calculer la date limite`}
      />

      {documents.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center py-10 text-text-muted">
            <FileCheck size={48} className="mb-3 text-success" />
            <p className="text-lg font-medium">Tous les documents sont complets</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {documents.map(doc => (
            <Card key={doc.id} className="cursor-pointer hover:border-accent/30 transition-colors" onClick={() => setSelectedDoc(doc)}>
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-accent">{doc.carton_numero}</span>
                    <span className="text-text-muted">|</span>
                    <span className="text-sm font-medium text-text-primary truncate">{doc.categorie || 'Catégorie à choisir'}</span>
                  </div>
                  <p className="text-xs text-text-secondary truncate">{doc.description || 'Sans description'}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-text-muted">{doc.salle_nom}</span>
                    {doc.annee_document && <span className="text-xs text-text-muted">{doc.annee_document}</span>}
                    <Badge variant="default">{doc.type_precision?.replace('_', ' ') || 'Précision requise'}</Badge>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); setSelectedDoc(doc) }}>
                  <ClipboardList size={14} /> Compléter
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!selectedDoc}
        onClose={() => setSelectedDoc(null)}
        title="Compléter le document"
      >
        {selectedDoc && (
          <MiniForm
            doc={selectedDoc}
            categories={categories}
            onSave={handleSaved}
            onClose={() => setSelectedDoc(null)}
          />
        )}
      </Modal>
    </PageWrapper>
  )
}
