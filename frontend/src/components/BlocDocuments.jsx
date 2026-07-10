import { Plus, Trash2 } from 'lucide-react'
import { THEMES, categoriesForService } from '../lib/utils'
import Card from './ui/Card'
import Select from './ui/Select'
import Button from './ui/Button'
import LigneDocument, { emptyLigne } from './LigneDocument'

// Un bloc = un couple (service + catégorie CNIL) choisi une seule fois,
// sous lequel on ajoute autant de lignes (documents) que voulu.
export function emptyBloc() {
  return {
    key: Date.now() + Math.random(),
    service: '', categorie_cnil_id: '',
    lignes: [emptyLigne()],
  }
}

export default function BlocDocuments({ bloc, index, canRemove, categories, onChange, onRemove }) {
  const cat = categories.find(c => c.id === bloc.categorie_cnil_id) || null
  const availableCats = bloc.service ? categoriesForService(bloc.service, categories) : []

  function setService(service) {
    // changer le service réinitialise la catégorie du bloc
    onChange({ ...bloc, service, categorie_cnil_id: '' })
  }

  function updateLigne(ligneIndex, updated) {
    onChange({ ...bloc, lignes: bloc.lignes.map((l, i) => (i === ligneIndex ? updated : l)) })
  }

  function addLigne() {
    onChange({ ...bloc, lignes: [...bloc.lignes, emptyLigne()] })
  }

  function removeLigne(ligneIndex) {
    if (bloc.lignes.length > 1) {
      onChange({ ...bloc, lignes: bloc.lignes.filter((_, i) => i !== ligneIndex) })
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-text-primary">Bloc #{index + 1}</span>
        {canRemove && (
          <Button variant="ghost" size="sm" onClick={onRemove}>
            <Trash2 size={14} className="text-danger" /> Supprimer le bloc
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Select label="Service" value={bloc.service} onChange={e => setService(e.target.value)}
          placeholder="Choisir un service" options={THEMES.map(t => ({ value: t, label: t }))} />
        <Select label="Catégorie CNIL" value={bloc.categorie_cnil_id}
          onChange={e => onChange({ ...bloc, categorie_cnil_id: e.target.value })}
          placeholder={bloc.service ? 'Choisir une catégorie' : "Choisir un service d'abord"}
          disabled={!bloc.service}
          options={availableCats.map(c => ({ value: c.id, label: `${c.categorie} (${c.section})` }))} />
      </div>

      <div className="space-y-3">
        {bloc.lignes.map((ligne, i) => (
          <div key={ligne.key} className="p-3 rounded-lg border border-border bg-bg-primary/40">
            <LigneDocument
              ligne={ligne}
              cat={cat}
              index={i}
              canRemove={bloc.lignes.length > 1}
              onChange={updated => updateLigne(i, updated)}
              onRemove={() => removeLigne(i)}
            />
          </div>
        ))}
      </div>

      <div className="mt-4">
        <Button variant="outline" size="sm" onClick={addLigne} disabled={!bloc.categorie_cnil_id}>
          <Plus size={14} /> Ajouter une ligne
        </Button>
      </div>
    </Card>
  )
}
