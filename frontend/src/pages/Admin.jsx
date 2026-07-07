import { useState, useEffect } from 'react'
import { Plus, Edit2, UserPlus, Building2, Layers, Users, Trash2, RotateCcw, ScrollText, FileX2, BookOpen } from 'lucide-react'
import { useSalles } from '../hooks/useSalles'
import { useCategoriesCNIL } from '../hooks/useCategoriesCNIL'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/ui/Toast'
import { api } from '../lib/api'
import { formatDate } from '../lib/utils'
import PageWrapper from '../components/layout/PageWrapper'
import Header from '../components/layout/Header'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'

const ROLE_HIERARCHY = { super_admin: 4, admin: 3, archiviste: 2, consultation: 1 }

function ConfirmDeleteModal({ open, onClose, onConfirm, label }) {
  return (
    <Modal open={open} onClose={onClose} title="Confirmer la suppression" footer={
      <>
        <Button variant="ghost" onClick={onClose}>Annuler</Button>
        <Button variant="danger" onClick={onConfirm}><Trash2 size={14} /> Supprimer</Button>
      </>
    }>
      <p className="text-sm text-text-secondary">
        Êtes-vous sûr de vouloir supprimer <strong>{label}</strong> ?
        L'élément sera déplacé dans la corbeille pendant 14 jours avant suppression définitive.
      </p>
    </Modal>
  )
}

function SallesSection() {
  const { salles, loading, createSalle, updateSalle, deleteSalle, createEtagere, updateEtagere, deleteEtagere } = useSalles()
  const toast = useToast()
  const [newSalle, setNewSalle] = useState('')
  const [editSalle, setEditSalle] = useState(null)
  const [newEtagere, setNewEtagere] = useState({ salle_id: '', nom: '', nombre_rangees: 5 })
  const [expandedSalle, setExpandedSalle] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  async function handleAddSalle() {
    if (!newSalle.trim()) return
    const { error } = await createSalle(newSalle.trim())
    if (error) toast(`Erreur : ${error.message}`, 'error')
    else { toast('Salle créée'); setNewSalle('') }
  }

  async function handleUpdateSalle() {
    if (!editSalle) return
    const { error } = await updateSalle(editSalle.id, { nom: editSalle.nom })
    if (error) toast(`Erreur : ${error.message}`, 'error')
    else { toast('Salle modifiée'); setEditSalle(null) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const { type, id } = deleteTarget
    const fn = type === 'salle' ? deleteSalle : deleteEtagere
    const { error } = await fn(id)
    if (error) toast(`Erreur : ${error.message}`, 'error')
    else toast('Élément supprimé')
    setDeleteTarget(null)
  }

  async function handleAddEtagere() {
    if (!newEtagere.salle_id || !newEtagere.nom.trim()) return
    const { error } = await createEtagere(newEtagere.salle_id, newEtagere.nom.trim(), '', parseInt(newEtagere.nombre_rangees) || 5)
    if (error) toast(`Erreur : ${error.message}`, 'error')
    else { toast('Étagère créée'); setNewEtagere({ salle_id: '', nom: '', nombre_rangees: 5 }) }
  }

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
          <Building2 size={18} className="text-accent" /> Salles
        </h3>
        <div className="flex gap-3 mb-4">
          <Input value={newSalle} onChange={e => setNewSalle(e.target.value)} placeholder="Nom de la nouvelle salle" className="flex-1" />
          <Button onClick={handleAddSalle} disabled={!newSalle.trim()}><Plus size={14} /> Ajouter</Button>
        </div>
        <div className="space-y-2">
          {salles.map(salle => (
            <div key={salle.id}>
              <div className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-bg-hover transition-colors">
                <button onClick={() => setExpandedSalle(expandedSalle === salle.id ? null : salle.id)} className="flex items-center gap-2 text-sm font-medium cursor-pointer flex-1 text-left">
                  <span>{salle.nom}</span>
                  <span className="text-xs text-text-muted">({salle.etageres?.length || 0} étagères)</span>
                </button>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditSalle({ ...salle })}><Edit2 size={14} /></Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteTarget({ type: 'salle', id: salle.id, label: salle.nom })}>
                    <Trash2 size={14} className="text-danger" />
                  </Button>
                </div>
              </div>
              {expandedSalle === salle.id && (
                <div className="ml-8 mt-2 space-y-1 pb-2">
                  {salle.etageres?.map(eta => (
                    <div key={eta.id} className="flex items-center justify-between px-3 py-1.5 text-sm text-text-secondary">
                      <span>{eta.nom} <span className="text-xs text-text-muted">({eta.nombre_rangees || 5} rangées)</span></span>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget({ type: 'etagere', id: eta.id, label: eta.nom })}>
                        <Trash2 size={12} className="text-danger" />
                      </Button>
                    </div>
                  ))}
                  {(!salle.etageres || salle.etageres.length === 0) && (
                    <p className="text-xs text-text-muted px-3 py-1">Aucune étagère</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
          <Layers size={18} className="text-accent" /> Ajouter une étagère
        </h3>
        <div className="flex gap-3 flex-wrap">
          <Select value={newEtagere.salle_id} onChange={e => setNewEtagere(prev => ({ ...prev, salle_id: e.target.value }))} placeholder="Salle" options={salles.map(s => ({ value: s.id, label: s.nom }))} className="flex-1" />
          <Input value={newEtagere.nom} onChange={e => setNewEtagere(prev => ({ ...prev, nom: e.target.value }))} placeholder="Nom de l'étagère" className="flex-1" />
          <Input type="number" value={newEtagere.nombre_rangees} onChange={e => setNewEtagere(prev => ({ ...prev, nombre_rangees: e.target.value }))} placeholder="Rangées" min="1" max="50" className="w-24" label="Rangées" />
          <Button onClick={handleAddEtagere} disabled={!newEtagere.salle_id || !newEtagere.nom.trim()}><Plus size={14} /> Ajouter</Button>
        </div>
      </Card>

      <Modal open={!!editSalle} onClose={() => setEditSalle(null)} title="Modifier la salle" footer={
        <><Button variant="ghost" onClick={() => setEditSalle(null)}>Annuler</Button><Button onClick={handleUpdateSalle}>Enregistrer</Button></>
      }>
        {editSalle && <Input label="Nom" value={editSalle.nom} onChange={e => setEditSalle(prev => ({ ...prev, nom: e.target.value }))} />}
      </Modal>

      <ConfirmDeleteModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} label={deleteTarget?.label || ''} />
    </div>
  )
}

function UsersSection() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [inviteModal, setInviteModal] = useState(false)
  const [invite, setInvite] = useState({ email: '', password: '', nom: '', prenom: '', role: 'consultation' })
  const [deleteTarget, setDeleteTarget] = useState(null)
  const { role: myRole, isSuperAdmin } = useAuth()
  const toast = useToast()

  async function fetchUsers() {
    setLoading(true)
    try { setUsers((await api.get('/admin/users')) || []) } catch { setUsers([]) }
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  function canActOn(targetRole) {
    if (isSuperAdmin) return true
    return ROLE_HIERARCHY[targetRole] < ROLE_HIERARCHY[myRole]
  }

  const availableRoles = isSuperAdmin
    ? [{ value: 'super_admin', label: 'Super Admin' }, { value: 'admin', label: 'Admin' }, { value: 'archiviste', label: 'Archiviste' }, { value: 'consultation', label: 'Consultation' }]
    : [{ value: 'archiviste', label: 'Archiviste' }, { value: 'consultation', label: 'Consultation' }]

  async function handleInvite() {
    if (!invite.email || !invite.password) { toast('Email et mot de passe requis', 'error'); return }
    try {
      await api.post('/admin/users', invite)
      toast('Utilisateur créé')
      setInviteModal(false)
      setInvite({ email: '', password: '', nom: '', prenom: '', role: 'consultation' })
      fetchUsers()
    } catch (err) { toast(`Erreur : ${err.message}`, 'error') }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await api.post(`/admin/users/${deleteTarget.id}/delete`)
      toast('Utilisateur supprimé')
      fetchUsers()
    } catch (err) { toast(`Erreur : ${err.message}`, 'error') }
    setDeleteTarget(null)
  }

  async function changeRole(userId, role) {
    try { await api.patch(`/admin/users/${userId}`, { role }); toast('Rôle modifié'); fetchUsers() }
    catch (err) { toast(`Erreur : ${err.message}`, 'error') }
  }

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold flex items-center gap-2"><Users size={18} className="text-accent" /> Utilisateurs</h3>
        <Button size="sm" onClick={() => setInviteModal(true)}><UserPlus size={14} /> Créer</Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-bg-secondary">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase">Nom</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase">Rôle</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase">Statut</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map(user => {
              const editable = canActOn(user.role)
              return (
                <tr key={user.id} className="hover:bg-bg-hover transition-colors">
                  <td className="px-3 py-2">{user.prenom} {user.nom}</td>
                  <td className="px-3 py-2">
                    {editable ? (
                      <select value={user.role} onChange={e => changeRole(user.id, e.target.value)} className="bg-bg-secondary border border-border rounded px-2 py-1 text-xs cursor-pointer">
                        {availableRoles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    ) : (
                      <span className="text-xs px-2 py-1 bg-bg-secondary border border-border rounded capitalize">{user.role.replace('_', ' ')}</span>
                    )}
                  </td>
                  <td className="px-3 py-2"><Badge variant={user.actif ? 'ok' : 'default'}>{user.actif ? 'Actif' : 'Inactif'}</Badge></td>
                  <td className="px-3 py-2">
                    {editable ? (
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(user)}>
                        <Trash2 size={14} className="text-danger" />
                      </Button>
                    ) : (
                      <span className="text-xs text-text-muted" title="Action non autorisée">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Modal open={inviteModal} onClose={() => setInviteModal(false)} title="Créer un utilisateur" footer={
        <><Button variant="ghost" onClick={() => setInviteModal(false)}>Annuler</Button><Button onClick={handleInvite}>Créer</Button></>
      }>
        <div className="space-y-4">
          <Input label="Email" type="email" value={invite.email} onChange={e => setInvite(p => ({ ...p, email: e.target.value }))} />
          <Input label="Mot de passe" type="password" value={invite.password} onChange={e => setInvite(p => ({ ...p, password: e.target.value }))} />
          <Input label="Prénom" value={invite.prenom} onChange={e => setInvite(p => ({ ...p, prenom: e.target.value }))} />
          <Input label="Nom" value={invite.nom} onChange={e => setInvite(p => ({ ...p, nom: e.target.value }))} />
          <Select label="Rôle" value={invite.role} onChange={e => setInvite(p => ({ ...p, role: e.target.value }))} options={availableRoles} />
        </div>
      </Modal>

      <ConfirmDeleteModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} label={deleteTarget ? `${deleteTarget.prenom} ${deleteTarget.nom}` : ''} />
    </Card>
  )
}

function SupprimesSection() {
  const [tab, setTab] = useState('elements')
  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('elements')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${tab === 'elements' ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:bg-bg-hover'}`}>
          Éléments supprimés
        </button>
        <button onClick={() => setTab('detruits')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${tab === 'detruits' ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:bg-bg-hover'}`}>
          Documents détruits
        </button>
      </div>
      {tab === 'elements' ? <ElementsSupprimes /> : <DocumentsDetruits />}
    </div>
  )
}

function ElementsSupprimes() {
  const [data, setData] = useState({ salles: [], etageres: [], users: [] })
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  async function fetchData() {
    setLoading(true)
    try { setData(await api.get('/admin/supprimes-recemment')) } catch { setData({ salles: [], etageres: [], users: [] }) }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  async function handleRestore(type, id) {
    try {
      await api.post('/admin/restaurer', { type, id })
      toast('Élément restauré')
      fetchData()
    } catch (err) { toast(`Erreur : ${err.message}`, 'error') }
  }

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>

  const all = [
    ...data.salles.map(s => ({ ...s, _type: 'salles', _label: `Salle: ${s.nom}` })),
    ...data.etageres.map(e => ({ ...e, _type: 'etageres', _label: `Étagère: ${e.nom}${e.salle_nom ? ` (${e.salle_nom})` : ''}` })),
    ...data.users.map(u => ({ ...u, _type: 'users', _label: `Utilisateur: ${u.prenom} ${u.nom}` })),
  ].sort((a, b) => (b.deleted_at || '').localeCompare(a.deleted_at || ''))

  if (all.length === 0) {
    return <Card><p className="text-center text-text-muted py-6">Aucun élément supprimé récemment</p></Card>
  }

  return (
    <Card>
      <p className="text-xs text-text-muted mb-3">Purge automatique après 14 jours</p>
      <div className="space-y-2">
        {all.map(item => {
          const daysLeft = Math.max(0, Math.ceil((new Date(item.deleted_at).getTime() + 14 * 86400000 - Date.now()) / 86400000))
          return (
            <div key={item.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-bg-hover">
              <div>
                <p className="text-sm font-medium">{item._label}</p>
                <p className="text-xs text-text-muted">Supprimé le {new Date(item.deleted_at).toLocaleDateString('fr-FR')} — {daysLeft}j restants</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleRestore(item._type, item.id)}>
                <RotateCcw size={14} /> Restaurer
              </Button>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function DocumentsDetruits() {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/documents-detruits').then(data => { setDocs(data || []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>

  if (docs.length === 0) {
    return (
      <Card>
        <div className="flex flex-col items-center py-10 text-text-muted">
          <FileX2 size={48} className="mb-3 opacity-30" />
          <p>Aucun document détruit</p>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <p className="text-xs text-text-muted mb-3">Conservation indéfinie — preuve de destruction pour conformité CNIL</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-bg-secondary">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase">N° Carton</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase">Catégorie</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase">Description</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase">Localisation</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase">Date destruction</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase">Méthode</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase">Par</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {docs.map(doc => (
              <tr key={doc.id} className="hover:bg-bg-hover transition-colors">
                <td className="px-3 py-2 font-mono text-accent">{doc.carton_numero}</td>
                <td className="px-3 py-2 max-w-[180px] truncate">{doc.categorie}</td>
                <td className="px-3 py-2 max-w-[180px] truncate text-text-secondary">{doc.description || '—'}</td>
                <td className="px-3 py-2 text-xs">{doc.salle_nom}{doc.etagere_nom ? ` — ${doc.etagere_nom}` : ''}</td>
                <td className="px-3 py-2 font-mono text-xs">{formatDate(doc.date_destruction)}</td>
                <td className="px-3 py-2 text-xs">{doc.methode}</td>
                <td className="px-3 py-2 text-xs">{doc.destructeur_prenom} {doc.destructeur_nom}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function AuditSection() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/audit').then(data => { setLogs(data || []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-bg-secondary">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase">Date</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase">Utilisateur</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase">Action</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase">Table</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase">Détails</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {logs.map(log => (
              <tr key={log.id} className="hover:bg-bg-hover transition-colors">
                <td className="px-3 py-2 text-xs text-text-muted whitespace-nowrap">{new Date(log.created_at).toLocaleString('fr-FR')}</td>
                <td className="px-3 py-2 text-xs">{log.prenom} {log.nom}</td>
                <td className="px-3 py-2"><Badge variant={log.action === 'creation' ? 'ok' : log.action === 'suppression' ? 'danger' : 'default'}>{log.action}</Badge></td>
                <td className="px-3 py-2 text-xs font-mono">{log.table_concernee}</td>
                <td className="px-3 py-2 text-xs text-text-muted max-w-[200px] truncate">{log.details ? JSON.stringify(log.details) : '—'}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan="5" className="px-3 py-6 text-center text-text-muted">Aucune entrée</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function CategoriesSection() {
  const { categories, sections, loading, fetchCategories, createCategory, updateCategory, deleteCategory } = useCategoriesCNIL()
  const toast = useToast()
  const [addModal, setAddModal] = useState(false)
  const [editCat, setEditCat] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [sectionFilter, setSectionFilter] = useState('')
  const [form, setForm] = useState({ categorie: '', section: '', duree_archivage_mois: '', type_date_reference: 'Date du document', obligatoire: false, fondement_juridique: '', theme_defaut: 'Autre' })

  const filtered = sectionFilter ? categories.filter(c => c.section === sectionFilter) : categories

  function openAdd() {
    setForm({ categorie: '', section: '', duree_archivage_mois: '', type_date_reference: 'Date du document', obligatoire: false, fondement_juridique: '', theme_defaut: 'Autre' })
    setAddModal(true)
  }

  function openEdit(cat) {
    setForm({
      categorie: cat.categorie, section: cat.section,
      duree_archivage_mois: cat.duree_archivage_mois || '',
      type_date_reference: cat.type_date_reference || 'Date du document',
      obligatoire: cat.obligatoire, fondement_juridique: cat.fondement_juridique || '',
      theme_defaut: cat.theme_defaut || 'Autre',
    })
    setEditCat(cat)
  }

  async function handleAdd() {
    if (!form.categorie.trim() || !form.section.trim()) { toast('Catégorie et section requises', 'error'); return }
    const payload = { ...form, duree_archivage_mois: form.duree_archivage_mois ? parseInt(form.duree_archivage_mois) : null }
    const { error } = await createCategory(payload)
    if (error) toast(`Erreur : ${error.message}`, 'error')
    else { toast('Catégorie créée'); setAddModal(false) }
  }

  async function handleEdit() {
    if (!editCat) return
    const payload = { ...form, duree_archivage_mois: form.duree_archivage_mois ? parseInt(form.duree_archivage_mois) : null }
    const { error } = await updateCategory(editCat.id, payload)
    if (error) toast(`Erreur : ${error.message}`, 'error')
    else { toast('Catégorie modifiée'); setEditCat(null) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const { error } = await deleteCategory(deleteTarget.id)
    if (error) toast(`Erreur : ${error.message}`, 'error')
    else toast('Catégorie désactivée')
    setDeleteTarget(null)
  }

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>

  const formFields = (
    <div className="space-y-4">
      <Input label="Catégorie" value={form.categorie} onChange={e => setForm(p => ({ ...p, categorie: e.target.value }))} />
      <Input label="Section" value={form.section} onChange={e => setForm(p => ({ ...p, section: e.target.value }))} />
      <Input label="Durée archivage (mois)" type="number" value={form.duree_archivage_mois} onChange={e => setForm(p => ({ ...p, duree_archivage_mois: e.target.value }))} placeholder="Ex: 60" />
      <Select label="Type date référence" value={form.type_date_reference} onChange={e => setForm(p => ({ ...p, type_date_reference: e.target.value }))} options={[{ value: 'Date du document', label: 'Date du document' }, { value: 'Date fin de relation', label: 'Date fin de relation' }]} />
      <Select label="Service par défaut" value={form.theme_defaut} onChange={e => setForm(p => ({ ...p, theme_defaut: e.target.value }))} options={['RH', 'Comptabilité', 'Médical', 'SSIAD', 'CCAS', 'ESA', 'EHPAD', 'Juridique', 'Sécurité', 'Autre'].map(t => ({ value: t, label: t }))} />
      <Input label="Fondement juridique" value={form.fondement_juridique} onChange={e => setForm(p => ({ ...p, fondement_juridique: e.target.value }))} />
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={form.obligatoire} onChange={e => setForm(p => ({ ...p, obligatoire: e.target.checked }))} className="rounded border-border" />
        Obligatoire
      </label>
    </div>
  )

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold flex items-center gap-2"><BookOpen size={18} className="text-accent" /> Catégories CNIL</h3>
          <Button size="sm" onClick={openAdd}><Plus size={14} /> Ajouter</Button>
        </div>

        <div className="mb-4">
          <Select value={sectionFilter} onChange={e => setSectionFilter(e.target.value)} placeholder="Toutes les sections" options={sections.map(s => ({ value: s, label: s }))} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bg-secondary">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase">Section</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase">Catégorie</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase">Durée</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase">Service</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase">Obligation</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-text-muted uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(cat => (
                <tr key={cat.id} className="hover:bg-bg-hover transition-colors">
                  <td className="px-3 py-2 whitespace-nowrap text-text-secondary">{cat.section}</td>
                  <td className="px-3 py-2 max-w-[250px]">{cat.categorie}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{cat.duree_archivage_mois ? `${cat.duree_archivage_mois} mois` : '—'}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-text-secondary">{cat.theme_defaut || '—'}</td>
                  <td className="px-3 py-2"><Badge variant={cat.obligatoire ? 'obligatoire' : 'recommande'} /></td>
                  <td className="px-3 py-2 text-center whitespace-nowrap">
                    <div className="inline-flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(cat)}><Edit2 size={14} /></Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(cat)}><Trash2 size={14} className="text-danger" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-text-muted">Aucune catégorie</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={addModal} onClose={() => setAddModal(false)} title="Ajouter une catégorie CNIL" footer={
        <><Button variant="ghost" onClick={() => setAddModal(false)}>Annuler</Button><Button onClick={handleAdd}>Créer</Button></>
      }>
        {formFields}
      </Modal>

      <Modal open={!!editCat} onClose={() => setEditCat(null)} title="Modifier la catégorie" footer={
        <><Button variant="ghost" onClick={() => setEditCat(null)}>Annuler</Button><Button onClick={handleEdit}>Enregistrer</Button></>
      }>
        {formFields}
      </Modal>

      <ConfirmDeleteModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} label={deleteTarget?.categorie || ''} />
    </div>
  )
}

export default function Admin() {
  const [tab, setTab] = useState('salles')

  return (
    <PageWrapper>
      <Header title="Administration" subtitle="Gestion des salles, étagères, utilisateurs et audit" />

      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: 'salles', label: 'Salles & Étagères', icon: Building2 },
          { key: 'users', label: 'Utilisateurs', icon: Users },
          { key: 'categories', label: 'Référentiel CNIL', icon: BookOpen },
          { key: 'supprimes', label: 'Corbeille', icon: Trash2 },
          { key: 'audit', label: 'Journal d\'audit', icon: ScrollText },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              tab === t.key ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:bg-bg-hover'
            }`}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'salles' && <SallesSection />}
      {tab === 'users' && <UsersSection />}
      {tab === 'categories' && <CategoriesSection />}
      {tab === 'supprimes' && <SupprimesSection />}
      {tab === 'audit' && <AuditSection />}
    </PageWrapper>
  )
}
