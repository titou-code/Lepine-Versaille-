import { useState, useEffect, useCallback } from 'react'
import { Plus, Save, ArrowUpDown, MapPin, Pencil } from 'lucide-react'
import { api } from '../lib/api'
import { useSalles } from '../hooks/useSalles'
import { useCategoriesCNIL } from '../hooks/useCategoriesCNIL'
import { useToast } from '../components/ui/Toast'
import { refreshCompteurs } from '../hooks/useCompteurs'
import { computeDateReference, computeDateLimite, cn } from '../lib/utils'
import PageWrapper from '../components/layout/PageWrapper'
import Header from '../components/layout/Header'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Select from '../components/ui/Select'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import Spinner from '../components/ui/Spinner'
import BlocDocuments, { emptyBloc } from '../components/BlocDocuments'

// Seuil « presque vide » (constante ajustable) : 0 = Vide, 1..SEUIL = Presque vide.
const SEUIL_PRESQUE_VIDE = 2

function etatCarton(n) {
  if (n === 0) return { label: 'Vide', cls: 'text-danger bg-danger/10 border-danger/30' }
  if (n <= SEUIL_PRESQUE_VIDE) return { label: 'Presque vide', cls: 'text-warning bg-warning/10 border-warning/30' }
  return null
}

// Ajout de documents à un carton EXISTANT — réutilise les blocs de la saisie (BlocDocuments/LigneDocument).
// Chaque document est enregistré via POST /cartons/:id/documents (le carton n'est pas recréé).
function AjouterDocumentsModal({ carton, open, onClose, onSaved, categories }) {
  const toast = useToast()
  const [blocs, setBlocs] = useState([emptyBloc()])
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (open) setBlocs([emptyBloc()]) }, [open, carton])

  function updateBloc(i, updated) { setBlocs(prev => prev.map((b, idx) => (idx === i ? updated : b))) }
  function addBloc() { setBlocs(prev => [...prev, emptyBloc()]) }
  function removeBloc(i) { if (blocs.length > 1) setBlocs(prev => prev.filter((_, idx) => idx !== i)) }

  async function handleSave() {
    const payloads = []
    for (const bloc of blocs) {
      if (!bloc.service || !bloc.categorie_cnil_id) continue
      const cat = categories.find(c => c.id === bloc.categorie_cnil_id)
      for (const ligne of bloc.lignes) {
        const isEmpty = !ligne.description && !ligne.annee_document && !ligne.date_precise
          && !ligne.date_evenement && !ligne.duree_mois_saisie && !ligne.manualDateRef
        if (isEmpty) continue
        const dateRef = cat
          ? (cat.type_date_reference === 'Date du document'
              ? computeDateReference('Date du document', ligne.annee_document)
              : (ligne.manualDateRef || null))
          : null
        const dateLimite = dateRef && cat?.duree_archivage_mois ? computeDateLimite(dateRef, cat.duree_archivage_mois) : null
        payloads.push({
          theme: bloc.service, categorie_cnil_id: bloc.categorie_cnil_id,
          description: ligne.description || null,
          annee_document: ligne.annee_document ? parseInt(ligne.annee_document) : null,
          type_date: cat?.type_date_reference || null, date_reference: dateRef,
          date_limite_conservation: dateLimite,
          date_precise: ligne.useDatePrecise && ligne.date_precise ? ligne.date_precise : null,
          date_evenement: ligne.date_evenement || null,
          duree_mois_saisie: ligne.duree_mois_saisie ? parseInt(ligne.duree_mois_saisie) : null,
          procedure_close: ligne.procedure_close || null,
        })
      }
    }
    if (payloads.length === 0) { toast('Ajoutez au moins un document valide', 'error'); return }
    setSaving(true)
    try {
      for (const p of payloads) await api.post(`/cartons/${carton.id}/documents`, p)
      toast(`${payloads.length} document(s) ajouté(s) au carton ${carton.numero}`)
      refreshCompteurs()
      onSaved()
    } catch (err) {
      toast(`Erreur : ${err.message}`, 'error')
    }
    setSaving(false)
  }

  if (!open || !carton) return null

  return (
    <Modal open={open} onClose={onClose} title={`Ajouter des documents — ${carton.numero}`} footer={
      <>
        <Button variant="ghost" onClick={onClose}>Annuler</Button>
        <Button onClick={handleSave} disabled={saving}>{saving ? <Spinner size="sm" /> : <><Save size={16} /> Enregistrer</>}</Button>
      </>
    }>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        <div className="bg-bg-secondary rounded-lg p-3 border border-border text-sm">
          <span className="text-text-muted">Carton cible : </span>
          <span className="font-mono font-bold text-accent">{carton.numero}</span>
          <span className="text-text-secondary"> — {carton.salle_nom}{carton.etagere_nom ? ` — ${carton.etagere_nom}` : ''}{carton.emplacement ? ` — ${carton.emplacement}` : ''}</span>
        </div>
        {blocs.map((bloc, index) => (
          <BlocDocuments key={bloc.key} bloc={bloc} index={index} canRemove={blocs.length > 1}
            categories={categories} onChange={u => updateBloc(index, u)} onRemove={() => removeBloc(index)} />
        ))}
        <Button variant="outline" onClick={addBloc}><Plus size={16} /> Ajouter un bloc</Button>
      </div>
    </Modal>
  )
}

// Modification de l'emplacement d'un carton (salle / étagère / rangée) via PATCH /cartons/:id.
function ModifierEmplacementModal({ carton, open, onClose, onSaved, salles }) {
  const toast = useToast()
  const [salleId, setSalleId] = useState('')
  const [etagereId, setEtagereId] = useState('')
  const [emplacement, setEmplacement] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (carton) {
      setSalleId(carton.salle_id || '')
      setEtagereId(carton.etagere_id || '')
      setEmplacement(carton.emplacement || '')
    }
  }, [carton])

  const selectedSalle = salles.find(s => s.id === salleId)
  const etageres = selectedSalle?.etageres?.filter(e => e.actif) || []
  const selectedEtagere = etageres.find(e => e.id === etagereId)
  const nbRangees = selectedEtagere?.nombre_rangees || 0

  async function handleSave() {
    if (!salleId) { toast('Sélectionnez une salle', 'error'); return }
    setSaving(true)
    try {
      await api.patch(`/cartons/${carton.id}`, {
        salle_id: salleId,
        etagere_id: etagereId || null,
        emplacement: emplacement || null,
      })
      toast('Emplacement du carton modifié')
      refreshCompteurs()
      onSaved()
    } catch (err) {
      toast(`Erreur : ${err.message}`, 'error')
    }
    setSaving(false)
  }

  if (!open || !carton) return null

  return (
    <Modal open={open} onClose={onClose} title={`Modifier l'emplacement — ${carton.numero}`} footer={
      <>
        <Button variant="ghost" onClick={onClose}>Annuler</Button>
        <Button onClick={handleSave} disabled={saving}>{saving ? <Spinner size="sm" /> : <><Save size={16} /> Enregistrer</>}</Button>
      </>
    }>
      <div className="space-y-4">
        <Select label="Salle" value={salleId} onChange={e => { setSalleId(e.target.value); setEtagereId(''); setEmplacement('') }} placeholder="Sélectionner une salle" options={salles.map(s => ({ value: s.id, label: s.nom }))} />
        <Select label="Étagère" value={etagereId} onChange={e => { setEtagereId(e.target.value); setEmplacement('') }} placeholder={etageres.length ? 'Sélectionner une étagère' : 'Aucune étagère'} options={etageres.map(e => ({ value: e.id, label: e.nom }))} disabled={!salleId} />
        {etagereId && nbRangees > 0 ? (
          <Select label="Emplacement (rangée)" value={emplacement} onChange={e => setEmplacement(e.target.value)} placeholder="Sélectionner une rangée" options={Array.from({ length: nbRangees }, (_, i) => ({ value: `Rangée ${i + 1}`, label: `Rangée ${i + 1}` }))} />
        ) : (
          <Input label="Emplacement (rangée/niveau)" value={emplacement} onChange={e => setEmplacement(e.target.value)} placeholder="Ex : Rangée 3, Niveau 2" />
        )}
      </div>
    </Modal>
  )
}

export default function Cartons() {
  const { salles } = useSalles()
  const { categories } = useCategoriesCNIL()
  const [salleId, setSalleId] = useState('')
  const [etagereId, setEtagereId] = useState('')
  const [onlyPlace, setOnlyPlace] = useState(false)
  const [sortCol, setSortCol] = useState('numero')
  const [sortDir, setSortDir] = useState('asc')
  const [page, setPage] = useState(1)
  const [cartons, setCartons] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [addTarget, setAddTarget] = useState(null)
  const [editTarget, setEditTarget] = useState(null)
  const pageSize = 50

  const selectedSalle = salles.find(s => s.id === salleId)
  const etageres = selectedSalle?.etageres?.filter(e => e.actif) || []

  const fetchCartons = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (salleId) params.set('salle_id', salleId)
    if (etagereId) params.set('etagere_id', etagereId)
    if (onlyPlace) params.set('max_docs', String(SEUIL_PRESQUE_VIDE))
    params.set('sort', sortCol)
    params.set('dir', sortDir)
    params.set('page', String(page))
    params.set('pageSize', String(pageSize))
    try {
      const res = await api.get(`/cartons?${params}`)
      setCartons(res?.data || [])
      setTotal(res?.total || 0)
    } catch { setCartons([]); setTotal(0) }
    setLoading(false)
  }, [salleId, etagereId, onlyPlace, sortCol, sortDir, page])

  useEffect(() => { fetchCartons() }, [fetchCartons])
  useEffect(() => { setEtagereId(''); setPage(1) }, [salleId])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  function toggleSort(col) {
    if (sortCol === col) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortCol(col); setSortDir('asc') }
    setPage(1)
  }

  const SortHeader = ({ col, children, className = '' }) => (
    <th onClick={() => toggleSort(col)} className={cn('px-3 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider cursor-pointer hover:text-text-secondary whitespace-nowrap', className)}>
      <span className="inline-flex items-center gap-1">{children}<ArrowUpDown size={12} className={sortCol === col ? 'text-accent' : 'opacity-30'} /></span>
    </th>
  )

  return (
    <PageWrapper>
      <Header title="Cartons" subtitle={`${total} carton(s) — repérez où il reste de la place`} />

      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select value={salleId} onChange={e => setSalleId(e.target.value)} placeholder="Toutes les salles" options={salles.map(s => ({ value: s.id, label: s.nom }))} />
          <Select value={etagereId} onChange={e => { setEtagereId(e.target.value); setPage(1) }} placeholder={etageres.length ? 'Toutes les étagères' : "Choisir une salle d'abord"} options={etageres.map(e => ({ value: e.id, label: e.nom }))} disabled={!salleId} />
          <label className="flex items-center gap-2 text-sm cursor-pointer px-1">
            <input type="checkbox" checked={onlyPlace} onChange={e => { setOnlyPlace(e.target.checked); setPage(1) }} className="rounded border-border" />
            Cartons avec de la place (≤ {SEUIL_PRESQUE_VIDE} doc.)
          </label>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <div className="overflow-x-auto border border-border rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-bg-secondary">
              <tr>
                <SortHeader col="numero">N° Carton</SortHeader>
                <SortHeader col="salle_nom">Salle</SortHeader>
                <SortHeader col="etagere_nom">Étagère</SortHeader>
                <th className="px-3 py-3 text-left text-xs font-medium text-text-muted uppercase whitespace-nowrap">Emplacement</th>
                <SortHeader col="nb_documents_actifs">Documents actifs</SortHeader>
                <th className="px-3 py-3 text-left text-xs font-medium text-text-muted uppercase whitespace-nowrap">État</th>
                <th className="px-3 py-3 text-center text-xs font-medium text-text-muted uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cartons.map(c => {
                const etat = etatCarton(c.nb_documents_actifs)
                return (
                  <tr key={c.id} className={cn('hover:bg-bg-hover transition-colors', c.nb_documents_actifs === 0 ? 'bg-danger/5' : c.nb_documents_actifs <= SEUIL_PRESQUE_VIDE ? 'bg-warning/5' : '')}>
                    <td className="px-3 py-2.5 font-mono font-medium text-accent whitespace-nowrap">{c.numero}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap"><span className="inline-flex items-center gap-1"><MapPin size={12} className="text-accent" /> {c.salle_nom || '—'}</span></td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{c.etagere_nom || '—'}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-text-secondary">{c.emplacement || '—'}</td>
                    <td className="px-3 py-2.5 text-center font-medium">{c.nb_documents_actifs}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {etat ? <span className={cn('inline-flex items-center text-xs font-medium border rounded-full px-2 py-0.5', etat.cls)}>{etat.label}</span> : <span className="text-xs text-text-muted">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center whitespace-nowrap">
                      <div className="inline-flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setAddTarget(c)}><Plus size={14} /> Ajouter des documents</Button>
                        <Button variant="ghost" size="sm" onClick={() => setEditTarget(c)} title="Modifier l'emplacement du carton"><Pencil size={14} className="text-accent" /> Emplacement</Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {cartons.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-text-muted">Aucun carton</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && total > 0 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-text-muted">{total} carton(s) — page {page} / {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Précédent</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Suivant</Button>
          </div>
        </div>
      )}

      <AjouterDocumentsModal
        carton={addTarget}
        open={!!addTarget}
        onClose={() => setAddTarget(null)}
        onSaved={() => { setAddTarget(null); fetchCartons() }}
        categories={categories}
      />

      <ModifierEmplacementModal
        carton={editTarget}
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={() => { setEditTarget(null); fetchCartons() }}
        salles={salles}
      />
    </PageWrapper>
  )
}
