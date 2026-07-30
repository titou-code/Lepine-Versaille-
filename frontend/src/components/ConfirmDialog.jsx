import { AlertTriangle, Trash2 } from 'lucide-react'
import Modal from './ui/Modal'
import Button from './ui/Button'
import Spinner from './ui/Spinner'

// Dialogue de confirmation réutilisable pour toute action destructrice.
// Réutilise la modale et les boutons de l'application (même style).
// - message : contenu affiché (texte ou noeud React)
// - confirmLabel : libellé du bouton de confirmation (rouge/danger)
// - loading : désactive les boutons et affiche un spinner pendant l'action
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Confirmer la suppression',
  message,
  confirmLabel = 'Supprimer',
  cancelLabel = 'Annuler',
  loading = false,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>{cancelLabel}</Button>
          <Button variant="danger" onClick={onConfirm} disabled={loading}>
            {loading ? <Spinner size="sm" /> : <><Trash2 size={14} /> {confirmLabel}</>}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center flex-shrink-0">
          <AlertTriangle size={20} className="text-danger" />
        </div>
        <div className="text-sm text-text-secondary pt-1.5">{message}</div>
      </div>
    </Modal>
  )
}
