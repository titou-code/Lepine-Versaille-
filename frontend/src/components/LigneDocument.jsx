import { Trash2 } from 'lucide-react'
import { computeDateReference, computeDateLimite, computeStatut, isValidYear } from '../lib/utils'
import Input from './ui/Input'
import Select from './ui/Select'
import Badge from './ui/Badge'
import Button from './ui/Button'

// Une ligne = un document. Seuls les champs qui varient d'un document à l'autre ;
// le service et la catégorie CNIL sont portés par le bloc parent.
export function emptyLigne() {
  return {
    key: Date.now() + Math.random(),
    description: '', annee_document: '',
    useDatePrecise: false, date_precise: '',
    date_reference: '', manualDateRef: '',
    date_evenement: '', duree_mois_saisie: '', procedure_close: false,
  }
}

function PrecisionMiniForm({ ligne, cat, onChange }) {
  const tp = cat?.type_precision
  if (!tp) return null

  return (
    <div className="mt-3 p-3 bg-bg-secondary rounded-lg border border-border space-y-3">
      <p className="text-xs font-medium text-accent">Précisions optionnelles — {tp.replace(/_/g, ' ')}</p>

      {tp === 'fin_habilitation' && (
        <Input label="Date de fin d'habilitation" type="date" value={ligne.date_evenement || ''} onChange={e => onChange('date_evenement', e.target.value)} />
      )}
      {tp === 'fin_mandat' && (
        <Input label="Date de fin de mandat" type="date" value={ligne.date_evenement || ''} onChange={e => onChange('date_evenement', e.target.value)} />
      )}
      {tp === 'fin_procedure' && (
        <>
          <Input label="Date de fin de procédure" type="date" value={ligne.date_evenement || ''} onChange={e => onChange('date_evenement', e.target.value)} />
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={ligne.procedure_close || false} onChange={e => onChange('procedure_close', e.target.checked)} className="rounded border-border" />
            Procédure clôturée
          </label>
        </>
      )}
      {tp === 'duree_variable' && (
        <>
          {cat.options_duree && cat.options_duree.length > 0 && (
            <Select label="Durée de conservation" value={ligne.duree_mois_saisie || ''} onChange={e => onChange('duree_mois_saisie', e.target.value)} placeholder="Choisir une durée"
              options={cat.options_duree.filter(o => o.mois !== null).map(o => ({ value: String(o.mois), label: o.label }))} />
          )}
          {(!cat.options_duree || cat.options_duree.some(o => o.mois === null)) && (
            <Input label="Durée en mois (saisie libre)" type="number" value={ligne.duree_mois_saisie || ''} onChange={e => onChange('duree_mois_saisie', e.target.value)} placeholder="Nombre de mois" min="1" />
          )}
          <Input label="Date de l'événement déclencheur" type="date" value={ligne.date_evenement || ''} onChange={e => onChange('date_evenement', e.target.value)} />
        </>
      )}
    </div>
  )
}

export default function LigneDocument({ ligne, cat, index, canRemove, onChange, onRemove }) {
  const dateRef = cat
    ? (cat.type_date_reference === 'Date du document'
        ? computeDateReference('Date du document', ligne.annee_document)
        : (ligne.manualDateRef || null))
    : null
  const dateLimite = dateRef && cat?.duree_archivage_mois ? computeDateLimite(dateRef, cat.duree_archivage_mois) : null
  const statut = dateLimite ? computeStatut(dateLimite) : null

  function handleChange(field, value) {
    onChange({ ...ligne, [field]: value })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Document #{index + 1}</span>
        {canRemove && (
          <Button variant="ghost" size="sm" onClick={onRemove} title="Supprimer la ligne">
            <Trash2 size={14} className="text-danger" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Input label="Description" value={ligne.description || ''} onChange={e => handleChange('description', e.target.value)} placeholder="Description libre" />

        <div>
          <Input label="Année du document" type="number" value={ligne.annee_document || ''} onChange={e => handleChange('annee_document', e.target.value)} placeholder="2024" min="1900" max="2099" />
          <label className="flex items-center gap-2 mt-2 text-xs text-text-muted cursor-pointer">
            <input type="checkbox" checked={ligne.useDatePrecise || false} onChange={e => handleChange('useDatePrecise', e.target.checked)} className="rounded border-border" />
            Date précise connue
          </label>
          {ligne.useDatePrecise && (
            <Input type="date" value={ligne.date_precise || ''} onChange={e => handleChange('date_precise', e.target.value)} className="mt-2" />
          )}
        </div>

        {cat?.type_date_reference === 'Date fin de relation' && (
          <Input label="Date fin de relation" type="date" value={ligne.manualDateRef || ''} onChange={e => handleChange('manualDateRef', e.target.value)} />
        )}
      </div>

      {cat?.type_precision && (
        <PrecisionMiniForm ligne={ligne} cat={cat} onChange={handleChange} />
      )}

      {cat && isValidYear(ligne.annee_document) && (
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
