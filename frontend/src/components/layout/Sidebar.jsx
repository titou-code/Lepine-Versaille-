import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useCompteurs } from '../../hooks/useCompteurs'
import {
  LayoutDashboard, FilePlus, List, Search,
  AlertTriangle, BookOpen, Settings, LogOut, Menu, X, ClipboardList, Boxes, KeyRound, ChevronUp
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { cn, PASSWORD_RULE } from '../../lib/utils'
import { api } from '../../lib/api'
import ClientLogo from '../ClientLogo'
import { useToast } from '../ui/Toast'
import Modal from '../ui/Modal'
import Input from '../ui/Input'
import Button from '../ui/Button'
import Spinner from '../ui/Spinner'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord', roles: ['super_admin', 'admin'] },
  { to: '/saisie', icon: FilePlus, label: 'Saisie', roles: ['super_admin', 'admin', 'archiviste'] },
  { to: '/inventaire', icon: List, label: 'Inventaire', roles: ['super_admin', 'admin', 'archiviste', 'consultation'] },
  { to: '/cartons', icon: Boxes, label: 'Cartons', roles: ['super_admin', 'admin', 'archiviste'] },
  { to: '/recherche', icon: Search, label: 'Recherche', roles: ['super_admin', 'admin', 'archiviste', 'consultation'] },
  { to: '/a-completer', icon: ClipboardList, label: 'À compléter', roles: ['super_admin', 'admin', 'archiviste'], notifKey: 'a_completer' },
  { to: '/a-detruire', icon: AlertTriangle, label: 'À détruire', roles: ['super_admin', 'admin', 'archiviste'], notifKey: 'a_detruire', notifKeySecondary: 'bientot', notifKeyAdmin: 'demandes_destruction' },
  { to: '/referentiel', icon: BookOpen, label: 'Référentiel CNIL', roles: ['super_admin', 'admin', 'archiviste', 'consultation'] },
  { to: '/admin', icon: Settings, label: 'Administration', roles: ['super_admin', 'admin'], notifKeyAdmin: 'demandes_reset' },
]

function NotifBadge({ count, pulse, variant = 'danger' }) {
  if (!count) return null
  const bg = variant === 'warning' ? 'bg-warning' : 'bg-danger'
  return (
    <span className="relative ml-auto flex items-center">
      {pulse && (
        <span className={cn('absolute inset-0 rounded-full opacity-40', bg, 'animate-notif-pulse')} />
      )}
      <span className={cn('relative text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none', bg)}>
        {count}
      </span>
    </span>
  )
}

// Modale de changement volontaire de mot de passe (route existante POST /auth/change-password).
function ChangePasswordModal({ open, onClose }) {
  const toast = useToast()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function close() {
    setCurrent(''); setNext(''); setConfirm(''); setError(''); setLoading(false)
    onClose()
  }

  async function handleSubmit() {
    setError('')
    if (!current || !next) { setError('Veuillez remplir tous les champs'); return }
    if (next !== confirm) { setError('Les mots de passe ne correspondent pas'); return }
    setLoading(true)
    try {
      await api.post('/auth/change-password', { current_password: current, new_password: next })
      toast('Mot de passe modifié')
      close()
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={close} size="sm" title="Changer mon mot de passe" footer={
      <>
        <Button variant="ghost" onClick={close} disabled={loading}>Annuler</Button>
        <Button onClick={handleSubmit} disabled={loading}>{loading ? <Spinner size="sm" /> : 'Valider'}</Button>
      </>
    }>
      <div className="space-y-4">
        <Input label="Mot de passe actuel" type="password" value={current} onChange={e => setCurrent(e.target.value)} />
        <div>
          <Input label="Nouveau mot de passe" type="password" value={next} onChange={e => setNext(e.target.value)} />
          <p className="text-xs text-text-muted mt-1">{PASSWORD_RULE}</p>
        </div>
        <Input label="Confirmer le nouveau mot de passe" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} />
        {error && <div className="bg-danger/10 border border-danger/30 rounded-lg px-3 py-2 text-sm text-danger">{error}</div>}
      </div>
    </Modal>
  )
}

export default function Sidebar() {
  const { profile, role, isAdmin, signOut } = useAuth()
  const { compteurs } = useCompteurs()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)
  const menuRef = useRef(null)
  const filtered = navItems.filter(item => item.roles.includes(role))

  // Fermeture du menu profil au clic extérieur ou sur Échap.
  useEffect(() => {
    if (!menuOpen) return
    function onDown(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    function onKey(e) { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [menuOpen])

  function renderNotifs(item) {
    if (!item.notifKey && !item.notifKeyAdmin) return null
    const primary = item.notifKey ? (compteurs[item.notifKey] || 0) : 0
    // Compteur réservé aux admins (ex. demandes en attente à valider).
    const admin = (item.notifKeyAdmin && isAdmin) ? (compteurs[item.notifKeyAdmin] || 0) : 0
    const secondary = item.notifKeySecondary ? (compteurs[item.notifKeySecondary] || 0) : 0
    const danger = primary + admin

    if (danger > 0) return <NotifBadge count={danger} pulse />
    if (secondary > 0) return <NotifBadge count={secondary} variant="warning" />
    return null
  }

  const nav = (
    <>
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-3">
          <ClientLogo className="h-24 w-auto" iconSize={96} />
          <div>
            <h1 className="text-base font-bold text-text-primary leading-tight">Archives</h1>
            <p className="text-xs text-text-muted">Lépine Versailles</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {filtered.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-accent/10 text-accent'
                : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
            )}
          >
            <item.icon size={18} />
            {item.label}
            {renderNotifs(item)}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-border relative" ref={menuRef}>
        {menuOpen && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50">
            <button
              onClick={() => { setMenuOpen(false); setPwOpen(true) }}
              className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors cursor-pointer text-left"
            >
              <KeyRound size={16} /> Changer de mot de passe
            </button>
            <button
              onClick={() => { setMenuOpen(false); signOut() }}
              className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-text-secondary hover:bg-bg-hover hover:text-danger transition-colors cursor-pointer text-left"
            >
              <LogOut size={16} /> Se déconnecter
            </button>
          </div>
        )}
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="flex items-center gap-3 w-full px-2 py-1.5 rounded-lg hover:bg-bg-hover transition-colors cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-sm font-semibold flex-shrink-0">
            {profile?.prenom?.[0] || '?'}{profile?.nom?.[0] || ''}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium text-text-primary truncate">
              {profile?.prenom} {profile?.nom}
            </p>
            <p className="text-xs text-text-muted capitalize">{role}</p>
          </div>
          <ChevronUp size={16} className={cn('text-text-muted flex-shrink-0 transition-transform', menuOpen ? '' : 'rotate-180')} />
        </button>
      </div>
    </>
  )

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-bg-card border border-border rounded-lg p-2 cursor-pointer"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={cn(
        'fixed top-0 left-0 h-full w-64 bg-bg-secondary border-r border-border flex flex-col z-40',
        'transition-transform lg:translate-x-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {nav}
      </aside>

      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </>
  )
}
