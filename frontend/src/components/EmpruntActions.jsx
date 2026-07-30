import { useState } from 'react'
import { ArrowUpFromLine, Undo2 } from 'lucide-react'
import { api } from '../lib/api'
import { useToast } from './ui/Toast'
import Button from './ui/Button'
import Input from './ui/Input'
import Modal from './ui/Modal'
import Spinner from './ui/Spinner'
import ConfirmDialog from './ConfirmDialog'

// Indicateur visuel « Emprunté par [nom] » — affiché à tous (y compris consultation).
export function EmpruntBadge({ doc }) {
  if (!doc.emprunte_par) return null
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-warning bg-warning/10 border border-warning/30 rounded-full px-2 py-0.5 whitespace-nowrap">
      <ArrowUpFromLine size={12} /> Emprunté · {doc.emprunte_par}
    </span>
  )
}

// Actions Emprunter / Retour pour un document (réservé aux rôles en écriture).
// onChanged() est appelé après un emprunt ou un retour réussi pour rafraîchir la liste.
export default function EmpruntActions({ doc, onChanged, size = 'sm' }) {
  const toast = useToast()
  const [empruntOpen, setEmpruntOpen] = useState(false)
  const [nom, setNom] = useState('')
  const [retourOpen, setRetourOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const emprunte = !!doc.emprunte_par

  async function handleEmprunter() {
    if (!nom.trim()) { toast("Saisissez le nom de l'emprunteur", 'error'); return }
    setBusy(true)
    try {
      await api.post(`/documents/${doc.id}/emprunter`, { emprunte_par: nom.trim() })
      toast('Document emprunté')
      setEmpruntOpen(false); setNom('')
      onChanged?.()
    } catch (err) { toast(`Erreur : ${err.message}`, 'error') }
    setBusy(false)
  }

  async function handleRetour() {
    setBusy(true)
    try {
      await api.post(`/documents/${doc.id}/retour`, {})
      toast('Document rentré — disponible')
      setRetourOpen(false)
      onChanged?.()
    } catch (err) { toast(`Erreur : ${err.message}`, 'error') }
    setBusy(false)
  }

  return (
    <>
      {emprunte ? (
        <Button variant="ghost" size={size} onClick={() => setRetourOpen(true)} title={`Retour (emprunté par ${doc.emprunte_par})`}>
          <Undo2 size={14} className="text-warning" />
        </Button>
      ) : (
        <Button variant="ghost" size={size} onClick={() => { setNom(''); setEmpruntOpen(true) }} title="Emprunter">
          <ArrowUpFromLine size={14} className="text-accent" />
        </Button>
      )}

      <Modal open={empruntOpen} onClose={() => setEmpruntOpen(false)} title="Emprunter le document" footer={
        <>
          <Button variant="ghost" onClick={() => setEmpruntOpen(false)}>Annuler</Button>
          <Button onClick={handleEmprunter} disabled={busy}>{busy ? <Spinner size="sm" /> : "Confirmer l'emprunt"}</Button>
        </>
      }>
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">Indiquez la personne qui sort ce document des archives.</p>
          <Input label="Nom de l'emprunteur" value={nom} onChange={e => setNom(e.target.value)} placeholder="Prénom Nom" autoFocus />
        </div>
      </Modal>

      <ConfirmDialog
        open={retourOpen}
        onClose={() => setRetourOpen(false)}
        onConfirm={handleRetour}
        loading={busy}
        title="Retour du document"
        confirmLabel="Confirmer le retour"
        message={<>Confirmer le retour du document{doc.emprunte_par ? <> emprunté par <strong>{doc.emprunte_par}</strong></> : null} ? Il redeviendra disponible dans les archives.</>}
      />
    </>
  )
}
