import { useState, useMemo, useEffect, useCallback } from 'react'
import { AlertTriangle, AlertCircle, Trash2, MapPin, Package, Scale, Clock, User, Check, X } from 'lucide-react'
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
import ConfirmDialog from '../components/ConfirmDialog'

export default function ADetruire() {
  const { user, isAdmin } = useAuth()
  const { documents, loading, fetchDocuments } = useDocuments({ all: 'true' })
  const { marquerDetruit, proposerDestruction, getDemandes, validerDemande, refuserDemande, loading: busy } = useDestructions()
  const toast = useToast()

  // Destruction directe (admin / super_admin)
  const [modal, setModal] = useState(null)
  const [destructionDate, setDestructionDate] = useState(new Date().toISOString().split('T')[0])
  const [methode, setMethode] = useState('')
  const [notes, setNotes] = useState('')

  // Proposition (archiviste)
  const [proposeTarget, setProposeTarget] = useState(null)
  const [proposedIds, setProposedIds] = useState(() => new Set())

  // Demandes en attente (admin / super_admin)
  const [demandes, setDemandes] = useState([])
  const [validateTarget, setValidateTarget] = useState(null)

  // Filtre d'affichage : tout | a_detruire | bientot | demandes
  const [filter, setFilter] = useState('tout')

  const loadDemandes = useCallback(async () => {
    if (!isAdmin) return
    try { setDemandes((await getDemandes()) || []) } catch { setDemandes([]) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin])

  useEffect(() => { loadDemandes() }, [loadDemandes])

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

  async function handlePropose() {
    if (!proposeTarget) return
    const target = proposeTarget
    const { error } = await proposerDestruction({ document_id: target.id })
    if (error) {
      toast(`Erreur : ${error.message}`, 'error')
    } else {
      toast('Demande envoyée, en attente de validation par un administrateur')
      setProposedIds(prev => new Set(prev).add(target.id))
      refreshCompteurs()
    }
    setProposeTarget(null)
  }

  async function handleValidate() {
    if (!validateTarget) return
    const { error } = await validerDemande(validateTarget.id)
    if (error) {
      toast(`Erreur : ${error.message}`, 'error')
    } else {
      toast('Destruction validée — document détruit')
      fetchDocuments()
      loadDemandes()
      refreshCompteurs()
    }
    setValidateTarget(null)
  }

  async function handleRefuse(id) {
    const { error } = await refuserDemande(id)
    if (error) {
      toast(`Erreur : ${error.message}`, 'error')
    } else {
      toast('Demande refusée')
      loadDemandes()
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
            {isAdmin ? (
              <Button variant="danger" onClick={() => openModal(doc)} className="w-full">
                <Trash2 size={14} /> Marquer comme détruit
              </Button>
            ) : proposedIds.has(doc.id) ? (
              <Button variant="outline" disabled className="w-full">
                <Clock size={14} /> Demande envoyée
              </Button>
            ) : (
              <Button variant="danger" onClick={() => setProposeTarget(doc)} className="w-full">
                <Trash2 size={14} /> Proposer la destruction
              </Button>
            )}
          </div>
        </div>
      </Card>
    )
  }

  if (loading) return <PageWrapper><div className="flex justify-center py-20"><Spinner size="lg" /></div></PageWrapper>

  const filterOptions = [
    { key: 'tout', label: 'Tout' },
    { key: 'a_detruire', label: 'À détruire maintenant' },
    { key: 'bientot', label: 'Bientôt à détruire' },
    ...(isAdmin ? [{ key: 'demandes', label: 'Demandes en attente' }] : []),
  ]
  const showDemandes = isAdmin && (filter === 'tout' || filter === 'demandes') && demandes.length > 0
  const showADetruire = (filter === 'tout' || filter === 'a_detruire') && aDetruire.length > 0
  const showBientot = (filter === 'tout' || filter === 'bientot') && bientot.length > 0
  const emptyMsg = filter === 'demandes' ? 'Aucune demande de destruction en attente'
    : filter === 'bientot' ? 'Aucun document à détruire bientôt'
    : filter === 'a_detruire' ? 'Aucun document à détruire maintenant'
    : 'Aucun document à détruire pour le moment'

  return (
    <PageWrapper>
      <Header title="Documents à détruire" subtitle={`${aDetruire.length} à détruire · ${bientot.length} bientôt${isAdmin ? ` · ${demandes.length} demande(s) en attente` : ''}`} />

      <div className="flex gap-2 mb-6 flex-wrap">
        {filterOptions.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              filter === f.key ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:bg-bg-hover'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {showDemandes && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="text-accent" size={20} />
            <h2 className="text-lg font-semibold">Demandes en attente ({demandes.length})</h2>
          </div>
          <div className="space-y-3">
            {demandes.map(d => (
              <Card key={d.id}>
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={d.obligatoire ? 'obligatoire' : 'recommande'} />
                      <span className="text-sm text-text-muted">{d.theme}</span>
                    </div>
                    <h3 className="font-medium">{d.categorie}</h3>
                    {d.description && <p className="text-sm text-text-secondary">{d.description}</p>}
                    <div className="flex flex-wrap gap-4 text-xs text-text-muted mt-2">
                      <span className="flex items-center gap-1"><Package size={12} className="text-accent" /> <span className="font-mono text-accent">{d.carton_numero}</span></span>
                      <span className="flex items-center gap-1"><MapPin size={12} className="text-accent" /> {d.salle_nom}{d.etagere_nom ? ` — ${d.etagere_nom}` : ''}</span>
                      <span>Année : {d.annee_document || '—'}</span>
                      <span>Limite : {formatDate(d.date_limite_conservation)}</span>
                    </div>
                    <p className="text-xs text-text-muted mt-2 flex items-center gap-1">
                      <User size={12} /> Demandé par {d.demandeur_prenom} {d.demandeur_nom} · {formatDate(d.date_demande)}
                    </p>
                    {d.motif && <p className="text-xs text-text-secondary mt-1">Motif : {d.motif}</p>}
                  </div>
                  <div className="flex gap-2 lg:flex-col lg:w-52">
                    <Button variant="danger" onClick={() => setValidateTarget(d)} className="flex-1">
                      <Check size={14} /> Valider la destruction
                    </Button>
                    <Button variant="outline" onClick={() => handleRefuse(d.id)} disabled={busy} className="flex-1">
                      <X size={14} /> Refuser
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {showADetruire && (
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

      {showBientot && (
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

      {!showDemandes && !showADetruire && !showBientot && (
        <div className="text-center py-20 text-text-muted">
          <AlertTriangle size={48} className="mx-auto mb-4 opacity-30" />
          <p>{emptyMsg}</p>
        </div>
      )}

      {/* Destruction directe (admin / super_admin) */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title="Confirmer la destruction"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModal(null)}>Annuler</Button>
            <Button variant="danger" onClick={handleDestruction} disabled={busy}>
              {busy ? <Spinner size="sm" /> : <><Trash2 size={14} /> Confirmer</>}
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

      {/* Proposition de destruction (archiviste) */}
      <ConfirmDialog
        open={!!proposeTarget}
        onClose={() => setProposeTarget(null)}
        onConfirm={handlePropose}
        loading={busy}
        title="Proposer la destruction"
        confirmLabel="Proposer"
        message={
          proposeTarget && (
            <>
              Proposer la destruction de <strong>{proposeTarget.categorie}</strong>
              {proposeTarget.carton_numero ? <> (carton {proposeTarget.carton_numero})</> : null} ?
              La demande sera transmise à un administrateur pour validation. Le document n'est pas détruit tant qu'elle n'est pas validée.
            </>
          )
        }
      />

      {/* Validation d'une demande (admin / super_admin) — action destructrice */}
      <ConfirmDialog
        open={!!validateTarget}
        onClose={() => setValidateTarget(null)}
        onConfirm={handleValidate}
        loading={busy}
        title="Valider la destruction"
        confirmLabel="Valider la destruction"
        message={
          validateTarget && (
            <>
              Valider la destruction de <strong>{validateTarget.categorie}</strong>
              {validateTarget.carton_numero ? <> (carton {validateTarget.carton_numero})</> : null} ?
              Cette action est irréversible : le document sera détruit et la destruction tracée.
            </>
          )
        }
      />
    </PageWrapper>
  )
}
