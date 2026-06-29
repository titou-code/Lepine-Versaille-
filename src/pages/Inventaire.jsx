import { useState, useMemo } from 'react'
import { Download, Search, ArrowUpDown } from 'lucide-react'
import { useDocuments } from '../hooks/useDocuments'
import { useSalles } from '../hooks/useSalles'
import { computeStatut, formatDate, THEMES, cn } from '../lib/utils'
import PageWrapper from '../components/layout/PageWrapper'
import Header from '../components/layout/Header'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'

export default function Inventaire() {
  const [filters, setFilters] = useState({
    salle_id: '', theme: '', search: '', annee: ''
  })
  const [statusFilter, setStatusFilter] = useState('')
  const [obligatoireFilter, setObligatoireFilter] = useState('')
  const [sortCol, setSortCol] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')

  const { documents, loading } = useDocuments(filters)
  const { salles } = useSalles()

  const filtered = useMemo(() => {
    let result = documents.map(doc => ({
      ...doc,
      statut_calcule: computeStatut(doc.date_limite_conservation)
    }))
    if (statusFilter) result = result.filter(d => d.statut_calcule === statusFilter)
    if (obligatoireFilter === 'true') result = result.filter(d => d.obligatoire)
    if (obligatoireFilter === 'false') result = result.filter(d => !d.obligatoire)

    result.sort((a, b) => {
      let va = a[sortCol], vb = b[sortCol]
      if (va == null) return 1
      if (vb == null) return -1
      if (typeof va === 'string') va = va.toLowerCase()
      if (typeof vb === 'string') vb = vb.toLowerCase()
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return result
  }, [documents, statusFilter, obligatoireFilter, sortCol, sortDir])

  function toggleSort(col) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  function exportCSV() {
    const headers = ['N° Carton', 'Salle', 'Étagère', 'Emplacement', 'Thème', 'Catégorie CNIL', 'Description', 'Année', 'Date limite', 'Statut', 'Obligatoire']
    const rows = filtered.map(d => [
      d.carton_numero, d.salle_nom, d.etagere_nom || '', d.emplacement || '',
      d.theme, d.categorie || '', d.description || '', d.annee_document || '',
      d.date_limite_conservation || '', d.statut_calcule || '',
      d.obligatoire ? 'Obligatoire' : 'Recommandé'
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${(c ?? '').toString().replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inventaire_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function rowColor(statut) {
    if (statut === 'a_detruire') return 'bg-danger/5'
    if (statut === 'bientot') return 'bg-warning/5'
    return ''
  }

  const SortHeader = ({ col, children }) => (
    <th
      onClick={() => toggleSort(col)}
      className="px-3 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider cursor-pointer hover:text-text-secondary whitespace-nowrap"
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <ArrowUpDown size={12} className={sortCol === col ? 'text-accent' : 'opacity-30'} />
      </span>
    </th>
  )

  return (
    <PageWrapper>
      <Header
        title="Inventaire"
        subtitle={`${filtered.length} document(s)`}
        actions={
          <Button variant="outline" onClick={exportCSV} disabled={filtered.length === 0}>
            <Download size={16} /> Export CSV
          </Button>
        }
      />

      <Card className="mb-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Select
            value={filters.salle_id}
            onChange={e => setFilters(f => ({ ...f, salle_id: e.target.value }))}
            placeholder="Toutes les salles"
            options={salles.map(s => ({ value: s.id, label: s.nom }))}
          />
          <Select
            value={filters.theme}
            onChange={e => setFilters(f => ({ ...f, theme: e.target.value }))}
            placeholder="Tous les thèmes"
            options={THEMES.map(t => ({ value: t, label: t }))}
          />
          <Select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            placeholder="Tous les statuts"
            options={[
              { value: 'ok', label: 'OK' },
              { value: 'bientot', label: 'Bientôt' },
              { value: 'a_detruire', label: 'À détruire' },
            ]}
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
          <Input
            type="number"
            value={filters.annee}
            onChange={e => setFilters(f => ({ ...f, annee: e.target.value }))}
            placeholder="Année"
            min="1900"
            max="2099"
          />
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-bg-secondary border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent text-sm"
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              placeholder="Rechercher..."
            />
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
                <SortHeader col="theme">Thème</SortHeader>
                <SortHeader col="categorie">Catégorie</SortHeader>
                <SortHeader col="description">Description</SortHeader>
                <SortHeader col="annee_document">Année</SortHeader>
                <SortHeader col="date_limite_conservation">Date limite</SortHeader>
                <th className="px-3 py-3 text-left text-xs font-medium text-text-muted uppercase">Statut</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-text-muted uppercase">Obligation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(doc => (
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
                  <td className="px-3 py-2.5"><Badge variant={doc.obligatoire ? 'obligatoire' : 'recommande'} /></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="px-3 py-8 text-center text-text-muted">Aucun document trouvé</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </PageWrapper>
  )
}
