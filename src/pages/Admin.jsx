import { useState } from 'react'
import { Plus, Edit2, UserPlus, Building2, Layers, Users, Settings } from 'lucide-react'
import { useSalles } from '../hooks/useSalles'
import { useToast } from '../components/ui/Toast'
import { supabase } from '../lib/supabase'
import PageWrapper from '../components/layout/PageWrapper'
import Header from '../components/layout/Header'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'

function SallesSection() {
  const { salles, loading, createSalle, updateSalle, createEtagere, updateEtagere } = useSalles()
  const toast = useToast()
  const [newSalle, setNewSalle] = useState('')
  const [editSalle, setEditSalle] = useState(null)
  const [newEtagere, setNewEtagere] = useState({ salle_id: '', nom: '' })
  const [expandedSalle, setExpandedSalle] = useState(null)

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

  async function handleToggleSalle(salle) {
    const { error } = await updateSalle(salle.id, { actif: !salle.actif })
    if (error) toast(`Erreur : ${error.message}`, 'error')
    else toast(salle.actif ? 'Salle désactivée' : 'Salle réactivée')
  }

  async function handleAddEtagere() {
    if (!newEtagere.salle_id || !newEtagere.nom.trim()) return
    const { error } = await createEtagere(newEtagere.salle_id, newEtagere.nom.trim())
    if (error) toast(`Erreur : ${error.message}`, 'error')
    else { toast('Étagère créée'); setNewEtagere({ salle_id: '', nom: '' }) }
  }

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
          <Building2 size={18} className="text-accent" /> Salles
        </h3>
        <div className="flex gap-3 mb-4">
          <Input
            value={newSalle}
            onChange={e => setNewSalle(e.target.value)}
            placeholder="Nom de la nouvelle salle"
            className="flex-1"
          />
          <Button onClick={handleAddSalle} disabled={!newSalle.trim()}>
            <Plus size={14} /> Ajouter
          </Button>
        </div>
        <div className="space-y-2">
          {salles.map(salle => (
            <div key={salle.id}>
              <div className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-bg-hover transition-colors">
                <button
                  onClick={() => setExpandedSalle(expandedSalle === salle.id ? null : salle.id)}
                  className="flex items-center gap-2 text-sm font-medium cursor-pointer flex-1 text-left"
                >
                  <span>{salle.nom}</span>
                  <span className="text-xs text-text-muted">
                    ({salle.etageres?.length || 0} étagères)
                  </span>
                  {!salle.actif && <Badge variant="default">Inactif</Badge>}
                </button>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditSalle({ ...salle })}>
                    <Edit2 size={14} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleToggleSalle(salle)}>
                    {salle.actif ? 'Désactiver' : 'Activer'}
                  </Button>
                </div>
              </div>
              {expandedSalle === salle.id && (
                <div className="ml-8 mt-2 space-y-1 pb-2">
                  {salle.etageres?.map(eta => (
                    <div key={eta.id} className="flex items-center justify-between px-3 py-1.5 text-sm text-text-secondary">
                      <span>{eta.nom}</span>
                      {!eta.actif && <Badge variant="default">Inactif</Badge>}
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
        <div className="flex gap-3">
          <Select
            value={newEtagere.salle_id}
            onChange={e => setNewEtagere(prev => ({ ...prev, salle_id: e.target.value }))}
            placeholder="Salle"
            options={salles.map(s => ({ value: s.id, label: s.nom }))}
            className="flex-1"
          />
          <Input
            value={newEtagere.nom}
            onChange={e => setNewEtagere(prev => ({ ...prev, nom: e.target.value }))}
            placeholder="Nom de l'étagère"
            className="flex-1"
          />
          <Button onClick={handleAddEtagere} disabled={!newEtagere.salle_id || !newEtagere.nom.trim()}>
            <Plus size={14} /> Ajouter
          </Button>
        </div>
      </Card>

      <Modal
        open={!!editSalle}
        onClose={() => setEditSalle(null)}
        title="Modifier la salle"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditSalle(null)}>Annuler</Button>
            <Button onClick={handleUpdateSalle}>Enregistrer</Button>
          </>
        }
      >
        {editSalle && (
          <Input
            label="Nom"
            value={editSalle.nom}
            onChange={e => setEditSalle(prev => ({ ...prev, nom: e.target.value }))}
          />
        )}
      </Modal>
    </div>
  )
}

function UsersSection() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [inviteModal, setInviteModal] = useState(false)
  const [invite, setInvite] = useState({ email: '', nom: '', prenom: '', role: 'consultation' })
  const toast = useToast()

  async function fetchUsers() {
    setLoading(true)
    const { data, error } = await supabase.from('profiles').select('*').order('nom')
    if (!error) setUsers(data || [])
    setLoading(false)
  }

  useState(() => { fetchUsers() })

  async function handleInvite() {
    if (!invite.email) { toast('Email requis', 'error'); return }
    const { error } = await supabase.auth.admin?.inviteUserByEmail?.(invite.email)
    if (error) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: crypto.randomUUID(),
        nom: invite.nom,
        prenom: invite.prenom,
        role: invite.role,
      })
      if (profileError) toast(`Note : profil à créer manuellement — ${error.message}`, 'error')
      else toast('Profil pré-créé. L\'utilisateur doit être invité via le dashboard Supabase.')
    } else {
      toast('Invitation envoyée')
    }
    setInviteModal(false)
    setInvite({ email: '', nom: '', prenom: '', role: 'consultation' })
    fetchUsers()
  }

  async function toggleUser(user) {
    const { error } = await supabase
      .from('profiles')
      .update({ actif: !user.actif })
      .eq('id', user.id)
    if (error) toast(`Erreur : ${error.message}`, 'error')
    else { toast(user.actif ? 'Utilisateur désactivé' : 'Utilisateur réactivé'); fetchUsers() }
  }

  async function changeRole(userId, role) {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', userId)
    if (error) toast(`Erreur : ${error.message}`, 'error')
    else { toast('Rôle modifié'); fetchUsers() }
  }

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <Users size={18} className="text-accent" /> Utilisateurs
        </h3>
        <Button size="sm" onClick={() => setInviteModal(true)}>
          <UserPlus size={14} /> Inviter
        </Button>
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
            {users.map(user => (
              <tr key={user.id} className="hover:bg-bg-hover transition-colors">
                <td className="px-3 py-2">{user.prenom} {user.nom}</td>
                <td className="px-3 py-2">
                  <select
                    value={user.role}
                    onChange={e => changeRole(user.id, e.target.value)}
                    className="bg-bg-secondary border border-border rounded px-2 py-1 text-xs cursor-pointer"
                  >
                    <option value="admin">Admin</option>
                    <option value="archiviste">Archiviste</option>
                    <option value="consultation">Consultation</option>
                  </select>
                </td>
                <td className="px-3 py-2">
                  <Badge variant={user.actif ? 'ok' : 'default'}>
                    {user.actif ? 'Actif' : 'Inactif'}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  <Button variant="ghost" size="sm" onClick={() => toggleUser(user)}>
                    {user.actif ? 'Désactiver' : 'Activer'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={inviteModal}
        onClose={() => setInviteModal(false)}
        title="Inviter un utilisateur"
        footer={
          <>
            <Button variant="ghost" onClick={() => setInviteModal(false)}>Annuler</Button>
            <Button onClick={handleInvite}>Inviter</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Email" type="email" value={invite.email} onChange={e => setInvite(p => ({ ...p, email: e.target.value }))} />
          <Input label="Prénom" value={invite.prenom} onChange={e => setInvite(p => ({ ...p, prenom: e.target.value }))} />
          <Input label="Nom" value={invite.nom} onChange={e => setInvite(p => ({ ...p, nom: e.target.value }))} />
          <Select
            label="Rôle"
            value={invite.role}
            onChange={e => setInvite(p => ({ ...p, role: e.target.value }))}
            options={[
              { value: 'consultation', label: 'Consultation' },
              { value: 'archiviste', label: 'Archiviste' },
              { value: 'admin', label: 'Admin' },
            ]}
          />
        </div>
      </Modal>
    </Card>
  )
}

export default function Admin() {
  const [tab, setTab] = useState('salles')

  return (
    <PageWrapper>
      <Header title="Administration" subtitle="Gestion des salles, étagères et utilisateurs" />

      <div className="flex gap-2 mb-6">
        {[
          { key: 'salles', label: 'Salles & Étagères', icon: Building2 },
          { key: 'users', label: 'Utilisateurs', icon: Users },
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
    </PageWrapper>
  )
}
