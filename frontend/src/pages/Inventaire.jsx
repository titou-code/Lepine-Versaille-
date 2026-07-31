import { useState, useEffect } from 'react'
import { Download, Search, ArrowUpDown, Pencil, AlertTriangle, Plus } from 'lucide-react'
import { useDocuments } from '../hooks/useDocuments'
import { useSalles } from '../hooks/useSalles'
import { useCategoriesCNIL } from '../hooks/useCategoriesCNIL'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/ui/Toast'
import { refreshCompteurs } from '../hooks/useCompteurs'
import { computeStatut, computeDateReference, computeDateLimite, formatDate, THEMES, cn } from '../lib/utils'
import { api } from '../lib/api'
import PageWrapper from '../components/layout/PageWrapper'
import Header from '../components/layout/Header'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Spinner from '../components/ui/Spinner'
import FormDocument from '../components/FormDocument'
import EmpruntActions, { EmpruntBadge } from '../components/EmpruntActions'

function EditDocModal({ doc, open, onClose, onSaved, salles, categories }) {
  const toast = useToast()
  const [form, setForm] = useState(null)
  const [locMode, setLocMode] = useState('keep')
  const [cartonSalleId, setCartonSalleId] = useState('')
  const [cartonEtagereId, setCartonEtagereId] = useState('')
  const [cartonEmplacement, setCartonEmplacement] = useState('')
  const [confirmCarton, setConfirmCarton] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (doc) {
      setForm({
        ...doc,
        useDatePrecise: !!doc.date_precise,
        manualDateRef: doc.date_reference || '',
        _themeManuel: false,
      })
      setLocMode('keep')
      setCartonSalleId(doc.salle_id || '')
      setCartonEtagereId(doc.etagere_id || '')
      setCartonEmplacement(doc.emplacement || '')
    }
  }, [doc])

  if (!open || !doc) return null
  if (!form) return null

  const selectedSalle = salles.find(s => s.id === cartonSalleId)
  const etageres = selectedSalle?.etageres?.filter(e => e.actif) || []

  async function handleSave() {
    if (locMode === 'update_carton' && !confirmCarton) {
      setConfirmCarton(true)
      return
    }

    setSaving(true)
    try {
      const payload = {
        theme: form.theme,
        categorie_cnil_id: form.categorie_cnil_id,
        description: form.description || null,
        annee_document: form.annee_document ? parseInt(form.annee_document) : null,
        date_precise: form.useDatePrecise && form.date_precise ? form.date_precise : null,
        date_evenement: form.date_evenement || null,
        duree_mois_saisie: form.duree_mois_saisie ? parseInt(form.duree_mois_saisie) : null,
        procedure_close: form.procedure_close || null,
      }

      if (locMode === 'update_carton') {
        payload.update_carton_location = true
        payload.carton_salle_id = cartonSalleId
        payload.carton_etagere_id = cartonEtagereId || null
        payload.carton_emplacement = cartonEmplacement || null
      }

      await api.put(`/documents/${doc.id}`, payload)
      toast('Document modifié')
      refreshCompteurs()
      onSaved()
    } catch (err) {
      toast(`Erreur : ${err.message}`, 'error')
    }
    setSaving(false)
    setConfirmCarton(false)
  }

  return (
    <>
      <Modal open={open && !confirmCarton} onClose={onClose} size="lg" title="Modifier le document" footer={
        <>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Spinner size="sm" /> : 'Enregistrer les modifications'}
          </Button>
        </>
      }>
        <div className="space-y-6">
          <div className="bg-bg-secondary rounded-lg p-3 border border-border">
            <p className="text-xs text-text-muted mb-1">Carton actuel</p>
            <p className="font-mono font-bold text-accent">{doc.carton_numero}</p>
            <p className="text-xs text-text-secondary">{doc.salle_nom} {doc.etagere_nom ? `— ${doc.etagere_nom}` : ''} {doc.emplacement ? `— ${doc.emplacement}` : ''}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Localisation</p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="locMode" checked={locMode === 'keep'} onChange={() => setLocMode('keep')} />
                Garder l'emplacement actuel
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="locMode" checked={locMode === 'update_carton'} onChange={() => setLocMode('update_carton')} />
                Modifier l'emplacement du carton
              </label>
            </div>

            {locMode === 'update_carton' && (
              <div className="mt-3 p-3 bg-warning/5 border border-warning/20 rounded-lg space-y-3">
                <div className="flex items-start gap-2 text-xs text-warning">
                  <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                  Cette modification s'appliquera à tous les documents du carton {doc.carton_numero}
                </div>
                <Select label="Salle" value={cartonSalleId} onChange={e => { setCartonSalleId(e.target.value); setCartonEtagereId('') }} options={salles.map(s => ({ value: s.id, label: s.nom }))} />
                <Select label="Étagère" value={cartonEtagereId} onChange={e => setCartonEtagereId(e.target.value)} placeholder="Sélectionner" options={etageres.map(e => ({ value: e.id, label: e.nom }))} disabled={!cartonSalleId} />
                {(() => {
                  const eta = etageres.find(e => e.id === cartonEtagereId)
                  const nbRangees = eta?.nombre_rangees || 0
                  if (cartonEtagereId && nbRangees > 0) {
                    return <Select label="Emplacement (rangée)" value={cartonEmplacement} onChange={e => setCartonEmplacement(e.target.value)} placeholder="Sélectionner une rangée" options={Array.from({ length: nbRangees }, (_, i) => ({ value: `Rangée ${i + 1}`, label: `Rangée ${i + 1}` }))} />
                  }
                  return <Input label="Emplacement" value={cartonEmplacement} onChange={e => setCartonEmplacement(e.target.value)} placeholder="Rangée, Niveau..." />
                })()}
              </div>
            )}
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-sm font-medium text-text-secondary mb-3">Informations du document</p>
            <FormDocument doc={form} onChange={setForm} categories={categories} />
          </div>
        </div>
      </Modal>

      <Modal open={confirmCarton} onClose={() => setConfirmCarton(false)} title="Confirmer le déplacement" footer={
        <>
          <Button variant="ghost" onClick={() => setConfirmCarton(false)}>Annuler</Button>
          <Button variant="danger" onClick={handleSave} disabled={saving}>
            {saving ? <Spinner size="sm" /> : 'Confirmer'}
          </Button>
        </>
      }>
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-warning flex-shrink-0" size={24} />
          <div>
            <p className="text-sm font-medium">Modifier l'emplacement du carton {doc.carton_numero} ?</p>
            <p className="text-sm text-text-secondary mt-1">
              Cette action impactera <strong>tous les documents</strong> rattachés à ce carton, pas seulement celui-ci.
            </p>
          </div>
        </div>
      </Modal>
    </>
  )
}

function AddDocToCartonModal({ carton, open, onClose, onSaved, categories }) {
  const toast = useToast()
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (carton) {
      setForm({
        theme: '', categorie_cnil_id: '', description: '', annee_document: '',
        date_reference: '', manualDateRef: '', useDatePrecise: false, date_precise: '',
        date_evenement: '', duree_mois_saisie: '', procedure_close: false,
        _themeManuel: false,
      })
      api.get(`/cartons/${carton.carton_id}/dernier-document`).then(lastDoc => {
        if (lastDoc) {
          setForm(prev => prev ? {
            ...prev,
            theme: lastDoc.theme || '',
            categorie_cnil_id: lastDoc.categorie_cnil_id || '',
            _themeManuel: !!lastDoc.theme,
          } : prev)
        }
      }).catch(() => {})
    }
  }, [carton])

  if (!open || !carton || !form) return null

  async function handleSave() {
    if (!form.theme || !form.categorie_cnil_id) {
      toast('Service et catégorie requis', 'error')
      return
    }
    setSaving(true)
    try {
      const cat = categories.find(c => c.id === form.categorie_cnil_id)
      const dateRef = form.date_reference || null
      const dateLimite = dateRef && cat?.duree_archivage_mois ? computeDateLimite(dateRef, cat.duree_archivage_mois) : null

      await api.post(`/cartons/${carton.carton_id}/documents`, {
        theme: form.theme,
        categorie_cnil_id: form.categorie_cnil_id,
        description: form.description || null,
        annee_document: form.annee_document ? parseInt(form.annee_document) : null,
        type_date: cat?.type_date_reference || null,
        date_reference: dateRef,
        date_limite_conservation: dateLimite,
        date_precise: form.useDatePrecise && form.date_precise ? form.date_precise : null,
        date_evenement: form.date_evenement || null,
        duree_mois_saisie: form.duree_mois_saisie ? parseInt(form.duree_mois_saisie) : null,
        procedure_close: form.procedure_close || null,
      })
      toast('Document ajouté au carton')
      refreshCompteurs()
      onSaved()
    } catch (err) {
      toast(`Erreur : ${err.message}`, 'error')
    }
    setSaving(false)
  }

  return (
    <Modal open={open} onClose={onClose} title="Ajouter un document au carton" footer={
      <>
        <Button variant="ghost" onClick={onClose}>Annuler</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Spinner size="sm" /> : 'Ajouter le document'}
        </Button>
      </>
    }>
      <div className="space-y-6 max-h-[70vh] overflow-y-auto">
        <div className="bg-bg-secondary rounded-lg p-3 border border-border">
          <p className="text-xs text-text-muted mb-1">Carton</p>
          <p className="font-mono font-bold text-accent">{carton.carton_numero}</p>
          <p className="text-xs text-text-secondary">{carton.salle_nom} {carton.etagere_nom ? `— ${carton.etagere_nom}` : ''} {carton.emplacement ? `— ${carton.emplacement}` : ''}</p>
        </div>
        <FormDocument doc={form} onChange={setForm} categories={categories} />
      </div>
    </Modal>
  )
}

export default function Inventaire() {
  const [filters, setFilters] = useState({ salle_id: '', theme: '', search: '', annee: '' })
  const [statusFilter, setStatusFilter] = useState('')
  const [obligatoireFilter, setObligatoireFilter] = useState('')
  const [sortCol, setSortCol] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(1)
  const [editDoc, setEditDoc] = useState(null)
  const [addToCarton, setAddToCarton] = useState(null)
  const pageSize = 50

  const serverParams = {
    ...filters,
    statut: statusFilter,
    obligatoire: obligatoireFilter,
    sort: sortCol,
    dir: sortDir,
    page,
    pageSize,
  }

  const { documents, total, loading, fetchDocuments } = useDocuments(serverParams)
  const { salles } = useSalles()
  const { categories } = useCategoriesCNIL()
  const { canWrite } = useAuth()

  const rows = documents.map(doc => ({ ...doc, statut_calcule: computeStatut(doc.date_limite_conservation) }))
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  function setFilter(patch) { setFilters(f => ({ ...f, ...patch })); setPage(1) }
  function setStatus(v) { setStatusFilter(v); setPage(1) }
  function setObligatoire(v) { setObligatoireFilter(v); setPage(1) }

  function toggleSort(col) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
    setPage(1)
  }

  async function exportCSV() {
    // On exporte l'ensemble FILTRÉ (all=true), pas seulement la page affichée
    const params = new URLSearchParams()
    const exportFilters = { ...filters, statut: statusFilter, obligatoire: obligatoireFilter, sort: sortCol, dir: sortDir, all: 'true' }
    for (const [k, v] of Object.entries(exportFilters)) {
      if (v !== '' && v !== null && v !== undefined) params.set(k, v)
    }
    let data = []
    try {
      const res = await api.get(`/documents?${params}`)
      data = res?.data || []
    } catch { data = [] }

    const headers = ['N° Carton', 'Salle', 'Étagère', 'Emplacement', 'Service', 'Catégorie CNIL', 'Description', 'Année', 'Date limite', 'Statut', 'Obligatoire']
    const csvRows = data.map(d => [
      d.carton_numero, d.salle_nom, d.etagere_nom || '', d.emplacement || '',
      d.theme, d.categorie || '', d.description || '', d.annee_document || '',
      d.date_limite_conservation || '', computeStatut(d.date_limite_conservation) || '',
      d.obligatoire ? 'Obligatoire' : 'Recommandé'
    ])
    const csv = [headers, ...csvRows].map(r => r.map(c => `"${(c ?? '').toString().replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `inventaire_${new Date().toISOString().split('T')[0]}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  function rowColor(statut) {
    if (statut === 'a_detruire') return 'bg-danger/5'
    if (statut === 'bientot') return 'bg-warning/5'
    return ''
  }

  const SortHeader = ({ col, children, className = '' }) => (
    <th onClick={() => toggleSort(col)} className={cn('px-3 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider cursor-pointer hover:text-text-secondary whitespace-nowrap', className)}>
      <span className="inline-flex items-center gap-1">
        {children}
        <ArrowUpDown size={12} className={sortCol === col ? 'text-accent' : 'opacity-30'} />
      </span>
    </th>
  )

  return (
    <PageWrapper>
      <Header title="Inventaire" subtitle={`${total} document(s)`} actions={
        <Button variant="outline" onClick={exportCSV} disabled={total === 0}>
          <Download size={16} /> Export CSV
        </Button>
      } />

      <Card className="mb-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Select value={filters.salle_id} onChange={e => setFilter({ salle_id: e.target.value })} placeholder="Toutes les salles" options={salles.map(s => ({ value: s.id, label: s.nom }))} />
          <Select value={filters.theme} onChange={e => setFilter({ theme: e.target.value })} placeholder="Tous les services" options={THEMES.map(t => ({ value: t, label: t }))} />
          <Select value={statusFilter} onChange={e => setStatus(e.target.value)} placeholder="Tous les statuts" options={[
            { value: 'ok', label: 'OK' }, { value: 'bientot', label: 'Bientôt' }, { value: 'a_detruire', label: 'À détruire' },
          ]} />
          <Select value={obligatoireFilter} onChange={e => setObligatoire(e.target.value)} placeholder="Oblig. / Reco." options={[
            { value: 'true', label: 'Obligatoire' }, { value: 'false', label: 'Recommandé' },
          ]} />
          <Input type="number" value={filters.annee} onChange={e => setFilter({ annee: e.target.value })} placeholder="Année" min="1900" max="2099" />
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input className="w-full pl-9 pr-3 py-2 rounded-lg bg-bg-secondary border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent text-sm"
              value={filters.search} onChange={e => setFilter({ search: e.target.value })} placeholder="Rechercher..." />
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <div className="overflow-x-auto border border-border rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-bg-secondary">
              <tr>
                <SortHeader col="carton_numero">N° Carton</SortHeader>
                <SortHeader col="salle_nom">Salle</SortHeader>
                <SortHeader col="etagere_nom">Étagère</SortHeader>
                <SortHeader col="theme">Service</SortHeader>
                <SortHeader col="categorie">Catégorie</SortHeader>
                <SortHeader col="description">Description</SortHeader>
                <SortHeader col="annee_document">Année</SortHeader>
                <SortHeader col="date_limite_conservation">Date limite</SortHeader>
                <th className="px-3 py-3 text-left text-xs font-medium text-text-muted uppercase">Statut</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-text-muted uppercase whitespace-nowrap min-w-[100px]">Obligation</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-text-muted uppercase whitespace-nowrap">Emprunt</th>
                {canWrite && <th className="px-3 py-3 text-center text-xs font-medium text-text-muted uppercase">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map(doc => (
                <tr key={doc.id} className={cn('hover:bg-bg-hover transition-colors', rowColor(doc.statut_calcule))}>
                  <td className="px-3 py-2.5 font-mono font-medium text-accent whitespace-nowrap">{doc.carton_numero}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{doc.salle_nom}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{doc.etagere_nom || '—'}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{doc.theme}</td>
                  <td className="px-3 py-2.5 max-w-[200px] truncate">{doc.categorie}</td>
                  <td className="px-3 py-2.5 max-w-[200px] truncate text-text-secondary">{doc.description || '—'}</td>
                  <td className="px-3 py-2.5 text-center">{doc.annee_document || '—'}</td>
                  <td className="px-3 py-2.5 font-mono text-xs whitespace-nowrap">{formatDate(doc.date_limite_conservation)}</td>
                  <td className="px-3 py-2.5">{doc.statut_calcule ? <Badge variant={doc.statut_calcule} /> : '—'}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap"><Badge variant={doc.obligatoire ? 'obligatoire' : 'recommande'} /></td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {doc.emprunte_par ? <EmpruntBadge doc={doc} /> : <span className="text-xs text-text-muted">Disponible</span>}
                  </td>
                  {canWrite && (
                    <td className="px-3 py-2.5 text-center whitespace-nowrap">
                      <div className="inline-flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setEditDoc(doc)} title="Modifier">
                          <Pencil size={14} className="text-accent" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setAddToCarton(doc)} title="Ajouter un document à ce carton">
                          <Plus size={14} className="text-accent" />
                        </Button>
                        <EmpruntActions doc={doc} onChanged={fetchDocuments} />
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={canWrite ? 12 : 11} className="px-3 py-8 text-center text-text-muted">Aucun document trouvé</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && total > 0 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-text-muted">{total} résultat(s) — page {page} / {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Précédent</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Suivant</Button>
          </div>
        </div>
      )}

      <EditDocModal
        doc={editDoc}
        open={!!editDoc}
        onClose={() => setEditDoc(null)}
        onSaved={() => { setEditDoc(null); fetchDocuments() }}
        salles={salles}
        categories={categories}
      />

      <AddDocToCartonModal
        carton={addToCarton}
        open={!!addToCarton}
        onClose={() => setAddToCarton(null)}
        onSaved={() => { setAddToCarton(null); fetchDocuments() }}
        categories={categories}
      />
    </PageWrapper>
  )
}
