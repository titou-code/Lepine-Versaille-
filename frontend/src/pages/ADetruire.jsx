import { useState, useMemo } from 'react'
import { AlertTriangle, AlertCircle, Trash2, MapPin, Package, Scale } from 'lucide-react'
import { useDocuments } from '../hooks/useDocuments'
import { useDestructions } from '../hooks/useDestructions'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/ui/Toast'
import { refreshCompteurs } from '../hooks/useCompteurs'
import { computeStatut, formatDate, METHODES_DESTRUCTION } from '../lib/utils'
import PageWrapper from '../components/layout/PageWrapper'
import Header from '../components/layout/Header'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Spinner from '../components/ui/Spinner'

export default function ADetruire() {
  const { user } = useAuth()
  const { documents, loading, fetchDocuments } = useDocuments({})
  const { marquerDetruit, loading: destroying } = useDestructions()
  const toast = useToast()

  const [modal, setModal] = useState(null)
  const [destructionDate, setDestructionDate] = useState(new Date().toISOString().split('T')[0])
  const [methode, setMethode] = useState('')
  const [notes, setNotes] = useState('')

  const { aDetruire, bientot } = useMemo(() => {
    const withStatut = documents.map(d => ({
      ...d,
      statut_calcule: computeStatut(d.date_limite_conservation)
    }))
    return {
      aDetruire: withStatut.filter(d => d.statut_calcule === 'a_detruire'),
      bientot: withStatut.filter(d => d.statut_calcule === 'bientot'),
    }
  }, [documents])

  function openModal(doc) {
    setModal(doc)
    setDestructionDate(new Date().toISOString().split('T')[0])
    setMethode('')
    setNotes('')
  }

  async function handleDestruction() {
    if (!methode) { toast('Sélectionnez une méthode', 'error'); return }
    const { error } = await marquerDetruit({
      document_id: modal.id,
      date_destruction: destructionDate,
      effectue_par: user.id,
      methode,
      notes,
    })
    if (error) {
      toast(`Erreur : ${error.message}`, 'error')
    } else {
      toast('Document marqué comme détruit')
      setModal(null)
      fetchDocuments()
      refreshCompteurs()
    }
  }

  function DocCard({ doc }) {
    return (
      <Card className="hover:border-border transition-colors">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={doc.obligatoire ? 'obligatoire' : 'recommande'} />
              <span className="text-sm text-text-muted">{doc.theme}</span>
            </div>
            <h3 className="font-medium mb-1">{doc.categorie}</h3>
            {doc.description && <p className="text-sm text-text-secondary mb-2">{doc.description}</p>}

            <div className="flex flex-wrap gap-4 text-xs text-text-muted mb-3">
              <span>Année : {doc.annee_document || '—'}</span>
              <span>Limite : {formatDate(doc.date_limite_conservation)}</span>
            </div>

            {doc.obligatoire ? (
              <div className="bg-danger/5 border border-danger/20 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Scale size={14} className="text-danger mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-danger">Destruction obligatoire</p>
                    <p className="text-xs text-text-secondary mt-1">{doc.fondement_juridique}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-warning/5 border border-warning/20 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle size={14} className="text-warning mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-warning">Destruction recommandée (non contraignante)</p>
                    <p className="text-xs text-text-secondary mt-1">Recommandation CNIL — pas d'obligation légale</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="lg:w-56 flex flex-col gap-3">
            <div className="bg-bg-primary rounded-lg p-3 border border-border text-sm space-y-1">
              <div className="flex items-center gap-2"><MapPin size={14} className="text-accent" /> {doc.salle_nom}</div>
              {doc.etagere_nom && <div className="text-text-secondary pl-5">{doc.etagere_nom}</div>}
              {doc.emplacement && <div className="text-text-muted pl-5">{doc.emplacement}</div>}
              <div className="flex items-center gap-2"><Package size={14} className="text-accent" /> <span className="font-mono font-bold text-accent">{doc.carton_numero}</span></div>
            </div>
            <Button variant="danger" onClick={() => openModal(doc)} className="w-full">
              <Trash2 size={14} /> Marquer comme détruit
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  if (loading) return <PageWrapper><div className="flex justify-center py-20"><Spinner size="lg" /></div></PageWrapper>

  return (
    <PageWrapper>
      <Header title="Documents à détruire" subtitle={`${aDetruire.length} à détruire · ${bientot.length} bientôt`} />

      {aDetruire.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="text-danger" size={20} />
            <h2 className="text-lg font-semibold text-danger">À détruire maintenant ({aDetruire.length})</h2>
          </div>
          <div className="space-y-3">
            {aDetruire.map(doc => <DocCard key={doc.id} doc={doc} />)}
          </div>
        </div>
      )}

      {bientot.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="text-warning" size={20} />
            <h2 className="text-lg font-semibold text-warning">À détruire bientôt ({bientot.length})</h2>
          </div>
          <div className="space-y-3">
            {bientot.map(doc => <DocCard key={doc.id} doc={doc} />)}
          </div>
        </div>
      )}

      {aDetruire.length === 0 && bientot.length === 0 && (
        <div className="text-center py-20 text-text-muted">
          <AlertTriangle size={48} className="mx-auto mb-4 opacity-30" />
          <p>Aucun document à détruire pour le moment</p>
        </div>
      )}

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title="Confirmer la destruction"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModal(null)}>Annuler</Button>
            <Button variant="danger" onClick={handleDestruction} disabled={destroying}>
              {destroying ? <Spinner size="sm" /> : <><Trash2 size={14} /> Confirmer</>}
            </Button>
          </>
        }
      >
        {modal && (
          <div className="space-y-4">
            <div className="bg-bg-primary rounded-lg p-3 border border-border">
              <p className="text-sm font-medium">{modal.categorie}</p>
              <p className="text-xs text-text-muted">{modal.description}</p>
              <p className="text-xs text-text-muted mt-1">Carton {modal.carton_numero} — {modal.salle_nom}</p>
            </div>
            <Input
              label="Date de destruction"
              type="date"
              value={destructionDate}
              onChange={e => setDestructionDate(e.target.value)}
            />
            <Select
              label="Méthode de destruction"
              value={methode}
              onChange={e => setMethode(e.target.value)}
              placeholder="Sélectionner une méthode"
              options={METHODES_DESTRUCTION.map(m => ({ value: m, label: m }))}
            />
            <Input
              label="Notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Notes optionnelles"
            />
          </div>
        )}
      </Modal>
    </PageWrapper>
  )
}
