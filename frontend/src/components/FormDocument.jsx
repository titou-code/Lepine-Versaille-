import { useState, useEffect } from 'react'
import { useCategoriesCNIL } from '../hooks/useCategoriesCNIL'
import { useSalles } from '../hooks/useSalles'
import { computeDateReference, computeDateLimite, computeStatut, THEMES } from '../lib/utils'
import Input from './ui/Input'
import Select from './ui/Select'
import Badge from './ui/Badge'

function PrecisionMiniForm({ doc, cat, onChange }) {
  const tp = cat?.type_precision
  if (!tp) return null

  return (
    <div className="mt-3 p-3 bg-bg-secondary rounded-lg border border-border space-y-3">
      <p className="text-xs font-medium text-accent">Précisions optionnelles — {tp.replace(/_/g, ' ')}</p>

      {tp === 'fin_habilitation' && (
        <Input label="Date de fin d'habilitation" type="date" value={doc.date_evenement || ''} onChange={e => onChange('date_evenement', e.target.value)} />
      )}
      {tp === 'fin_mandat' && (
        <Input label="Date de fin de mandat" type="date" value={doc.date_evenement || ''} onChange={e => onChange('date_evenement', e.target.value)} />
      )}
      {tp === 'fin_procedure' && (
        <>
          <Input label="Date de fin de procédure" type="date" value={doc.date_evenement || ''} onChange={e => onChange('date_evenement', e.target.value)} />
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={doc.procedure_close || false} onChange={e => onChange('procedure_close', e.target.checked)} className="rounded border-border" />
            Procédure clôturée
          </label>
        </>
      )}
      {tp === 'duree_variable' && (
        <>
          {cat.options_duree && cat.options_duree.length > 0 && (
            <Select label="Durée de conservation" value={doc.duree_mois_saisie || ''} onChange={e => onChange('duree_mois_saisie', e.target.value)} placeholder="Choisir une durée"
              options={cat.options_duree.filter(o => o.mois !== null).map(o => ({ value: String(o.mois), label: o.label }))} />
          )}
          {(!cat.options_duree || cat.options_duree.some(o => o.mois === null)) && (
            <Input label="Durée en mois (saisie libre)" type="number" value={doc.duree_mois_saisie || ''} onChange={e => onChange('duree_mois_saisie', e.target.value)} placeholder="Nombre de mois" min="1" />
          )}
          <Input label="Date de l'événement déclencheur" type="date" value={doc.date_evenement || ''} onChange={e => onChange('date_evenement', e.target.value)} />
        </>
      )}
    </div>
  )
}

export default function FormDocument({ doc, onChange, categories: externalCategories }) {
  const { categories: hookCategories } = useCategoriesCNIL()
  const categories = externalCategories || hookCategories

  const cat = categories.find(c => c.id === doc.categorie_cnil_id) || null
  const dateRef = doc.date_reference || null
  const dateLimite = dateRef && cat?.duree_archivage_mois ? computeDateLimite(dateRef, cat.duree_archivage_mois) : null
  const statut = dateLimite ? computeStatut(dateLimite) : null

  function handleChange(field, value) {
    const updated = { ...doc, [field]: value }

    if (field === 'theme') {
      updated._themeManuel = true
    }

    if (field === 'categorie_cnil_id') {
      const c = categories.find(x => x.id === value)
      if (c && c.theme_defaut && !updated._themeManuel) {
        updated.theme = c.theme_defaut
      }
    }

    if (field === 'categorie_cnil_id' || field === 'annee_document' || field === 'manualDateRef') {
      const c = categories.find(x => x.id === updated.categorie_cnil_id)
      if (c && updated.annee_document) {
        if (c.type_date_reference === 'Date du document') {
          updated.date_reference = computeDateReference('Date du document', updated.annee_document)
        } else if (updated.manualDateRef) {
          updated.date_reference = updated.manualDateRef
        }
      }
    }

    onChange(updated)
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Select label="Service" value={doc.theme || ''} onChange={e => handleChange('theme', e.target.value)} placeholder="Choisir un service"
          options={THEMES.map(t => ({ value: t, label: t }))} />
        <Select label="Catégorie CNIL" value={doc.categorie_cnil_id || ''} onChange={e => handleChange('categorie_cnil_id', e.target.value)} placeholder="Choisir une catégorie"
          options={categories.map(c => ({ value: c.id, label: `${c.categorie} (${c.section})` }))} />
        <Input label="Description" value={doc.description || ''} onChange={e => handleChange('description', e.target.value)} placeholder="Description libre" />

        <div>
          <Input label="Année du document" type="number" value={doc.annee_document || ''} onChange={e => handleChange('annee_document', e.target.value)} placeholder="2024" min="1900" max="2099" />
          <label className="flex items-center gap-2 mt-2 text-xs text-text-muted cursor-pointer">
            <input type="checkbox" checked={doc.useDatePrecise || false} onChange={e => handleChange('useDatePrecise', e.target.checked)} className="rounded border-border" />
            Date précise connue
          </label>
          {doc.useDatePrecise && (
            <Input type="date" value={doc.date_precise || ''} onChange={e => handleChange('date_precise', e.target.value)} className="mt-2" />
          )}
        </div>

        {cat?.type_date_reference === 'Date fin de relation' && (
          <Input label="Date fin de relation" type="date" value={doc.manualDateRef || ''} onChange={e => handleChange('manualDateRef', e.target.value)} />
        )}
      </div>

      {cat?.type_precision && (
        <PrecisionMiniForm doc={doc} cat={cat} onChange={(field, value) => handleChange(field, value)} />
      )}

      {cat && doc.annee_document && (
        <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div>
            <p className="text-xs text-text-muted mb-1">Type date</p>
            <p className="text-sm">{cat.type_date_reference}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted mb-1">Date référence</p>
            <p className="text-sm font-mono">{dateRef ? new Date(dateRef).toLocaleDateString('fr-FR') : '—'}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted mb-1">Durée conservation</p>
            <p className="text-sm">{cat.duree_archivage_mois ? `${cat.duree_archivage_mois} mois` : 'Non définie'}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted mb-1">Date limite</p>
            <p className="text-sm font-mono">{dateLimite ? new Date(dateLimite).toLocaleDateString('fr-FR') : '—'}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted mb-1">Statut</p>
            {statut ? <Badge variant={statut} /> : <span className="text-sm">—</span>}
          </div>
          <div>
            <p className="text-xs text-text-muted mb-1">Obligation</p>
            <Badge variant={cat.obligatoire ? 'obligatoire' : 'recommande'} />
          </div>
          {cat.fondement_juridique && (
            <div className="col-span-full">
              <p className="text-xs text-text-muted mb-1">Fondement juridique</p>
              <p className="text-xs text-text-secondary">{cat.fondement_juridique}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
