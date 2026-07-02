import { useState, useEffect } from 'react'
import { Plus, Trash2, Save, Package, FileText } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useSalles } from '../hooks/useSalles'
import { useCategoriesCNIL } from '../hooks/useCategoriesCNIL'
import { useCartons } from '../hooks/useCartons'
import { useToast } from '../components/ui/Toast'
import { refreshCompteurs } from '../hooks/useCompteurs'
import { computeDateLimite, getPrefixFromSalle } from '../lib/utils'
import PageWrapper from '../components/layout/PageWrapper'
import Header from '../components/layout/Header'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Spinner from '../components/ui/Spinner'
import FormDocument from '../components/FormDocument'

const emptyDoc = () => ({
  key: Date.now() + Math.random(),
  theme: '', categorie_cnil_id: '', description: '', annee_document: '',
  date_reference: '', manualDateRef: '',
  useDatePrecise: false, date_precise: '',
  date_evenement: '', duree_mois_saisie: '', procedure_close: false,
  _themeManuel: false,
})

export default function Saisie() {
  const { user } = useAuth()
  const { salles, loading: sallesLoading } = useSalles()
  const { categories } = useCategoriesCNIL()
  const { loading: saving, getNextNumero, createCartonWithDocuments } = useCartons()
  const toast = useToast()

  const [step, setStep] = useState(1)
  const [salleId, setSalleId] = useState('')
  const [etagereId, setEtagereId] = useState('')
  const [emplacement, setEmplacement] = useState('')
  const [numero, setNumero] = useState('')
  const [documents, setDocuments] = useState([emptyDoc()])

  const selectedSalle = salles.find(s => s.id === salleId)
  const etageres = selectedSalle?.etageres?.filter(e => e.actif) || []

  useEffect(() => { setEtagereId('') }, [salleId])

  useEffect(() => {
    if (!selectedSalle) { setNumero(''); return }
    const prefix = getPrefixFromSalle(selectedSalle.nom)
    getNextNumero(prefix).then(n => setNumero(n || `${prefix}-001`))
  }, [selectedSalle])

  function updateDoc(index, updatedDoc) {
    setDocuments(prev => { const next = [...prev]; next[index] = updatedDoc; return next })
  }

  function addDoc() { setDocuments(prev => [...prev, emptyDoc()]) }
  function removeDoc(index) { if (documents.length > 1) setDocuments(prev => prev.filter((_, i) => i !== index)) }

  async function handleSave() {
    if (!salleId || !numero) { toast('Veuillez remplir les informations du carton', 'error'); return }
    const validDocs = documents.filter(d => d.theme && d.categorie_cnil_id)
    if (validDocs.length === 0) { toast('Ajoutez au moins un document', 'error'); return }

    const cartonData = { numero, salle_id: salleId, etagere_id: etagereId || null, emplacement: emplacement || null, created_by: user.id }

    const docsData = validDocs.map(doc => {
      const cat = categories.find(c => c.id === doc.categorie_cnil_id)
      const dateRef = doc.date_reference || null
      const dateLimite = dateRef && cat?.duree_archivage_mois ? computeDateLimite(dateRef, cat.duree_archivage_mois) : null
      return {
        theme: doc.theme, categorie_cnil_id: doc.categorie_cnil_id,
        description: doc.description || null, annee_document: doc.annee_document ? parseInt(doc.annee_document) : null,
        type_date: cat?.type_date_reference || null, date_reference: dateRef,
        date_limite_conservation: dateLimite, obligatoire: cat?.obligatoire ?? false,
        fondement_juridique: cat?.fondement_juridique || null,
        date_precise: doc.useDatePrecise && doc.date_precise ? doc.date_precise : null,
        date_evenement: doc.date_evenement || null,
        duree_mois_saisie: doc.duree_mois_saisie ? parseInt(doc.duree_mois_saisie) : null,
        procedure_close: doc.procedure_close || null, created_by: user.id,
      }
    })

    const { data, error } = await createCartonWithDocuments(cartonData, docsData)
    if (error) {
      toast(`Erreur : ${error.message}`, 'error')
    } else {
      toast(`Carton ${data.numero} créé avec ${docsData.length} document(s)`)
      setStep(1); setSalleId(''); setEtagereId(''); setEmplacement(''); setNumero(''); setDocuments([emptyDoc()])
      refreshCompteurs()
    }
  }

  if (sallesLoading) return <PageWrapper><div className="flex justify-center py-20"><Spinner size="lg" /></div></PageWrapper>

  return (
    <PageWrapper>
      <Header title="Saisie d'archives" subtitle="Créer un carton et ses documents" />

      <div className="flex items-center gap-4 mb-6">
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${step === 1 ? 'bg-accent/10 text-accent' : 'text-text-muted'}`}>
          <Package size={16} /> 1. Carton
        </div>
        <div className="h-px w-8 bg-border" />
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${step === 2 ? 'bg-accent/10 text-accent' : 'text-text-muted'}`}>
          <FileText size={16} /> 2. Documents
        </div>
      </div>

      {step === 1 && (
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="Salle" value={salleId} onChange={e => setSalleId(e.target.value)} placeholder="Sélectionner une salle" options={salles.map(s => ({ value: s.id, label: s.nom }))} />
            <Select label="Étagère" value={etagereId} onChange={e => setEtagereId(e.target.value)} placeholder={etageres.length ? 'Sélectionner une étagère' : "Choisir une salle d'abord"} options={etageres.map(e => ({ value: e.id, label: e.nom }))} disabled={!salleId} />
            <Input label="Emplacement (rangée/niveau)" value={emplacement} onChange={e => setEmplacement(e.target.value)} placeholder="Ex: Rangée 3, Niveau 2" />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-secondary">N° Carton (auto)</label>
              <div className="px-3 py-2 rounded-lg bg-bg-primary border border-border text-accent font-mono text-lg font-bold">{numero || '—'}</div>
            </div>
          </div>
          <div className="flex justify-end mt-6">
            <Button onClick={() => setStep(2)} disabled={!salleId || !numero}>Suivant — Documents</Button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <>
          <div className="mb-4 bg-bg-card border border-border rounded-lg px-4 py-3 flex items-center gap-4">
            <span className="text-sm text-text-secondary">Carton :</span>
            <span className="font-mono font-bold text-accent">{numero}</span>
            <span className="text-text-muted">|</span>
            <span className="text-sm text-text-secondary">{selectedSalle?.nom}</span>
            <Button variant="ghost" size="sm" onClick={() => setStep(1)}>Modifier</Button>
          </div>

          <div className="space-y-4">
            {documents.map((doc, index) => (
              <Card key={doc.key} className="relative">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-text-secondary">Document #{index + 1}</span>
                  {documents.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => removeDoc(index)}><Trash2 size={14} className="text-danger" /></Button>
                  )}
                </div>
                <FormDocument doc={doc} onChange={updated => updateDoc(index, updated)} categories={categories} />
              </Card>
            ))}
          </div>

          <div className="flex items-center justify-between mt-6">
            <Button variant="outline" onClick={addDoc}><Plus size={16} /> Ajouter un document</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Spinner size="sm" /> : <><Save size={16} /> Enregistrer le carton</>}
            </Button>
          </div>
        </>
      )}
    </PageWrapper>
  )
}
