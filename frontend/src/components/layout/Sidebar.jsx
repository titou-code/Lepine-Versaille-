import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useCompteurs } from '../../hooks/useCompteurs'
import {
  LayoutDashboard, FilePlus, List, Search,
  AlertTriangle, BookOpen, Settings, LogOut, Menu, X, ClipboardList
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/utils'
import ClientLogo from '../ClientLogo'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord', roles: ['super_admin', 'admin'] },
  { to: '/saisie', icon: FilePlus, label: 'Saisie', roles: ['super_admin', 'admin', 'archiviste'] },
  { to: '/inventaire', icon: List, label: 'Inventaire', roles: ['super_admin', 'admin', 'archiviste', 'consultation'] },
  { to: '/recherche', icon: Search, label: 'Recherche', roles: ['super_admin', 'admin', 'archiviste', 'consultation'] },
  { to: '/a-completer', icon: ClipboardList, label: 'À compléter', roles: ['super_admin', 'admin', 'archiviste'], notifKey: 'a_completer' },
  { to: '/a-detruire', icon: AlertTriangle, label: 'À détruire', roles: ['super_admin', 'admin', 'archiviste'], notifKey: 'a_detruire', notifKeySecondary: 'bientot' },
  { to: '/referentiel', icon: BookOpen, label: 'Référentiel CNIL', roles: ['super_admin', 'admin', 'archiviste', 'consultation'] },
  { to: '/admin', icon: Settings, label: 'Administration', roles: ['super_admin', 'admin'] },
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

export default function Sidebar() {
  const { profile, role, signOut } = useAuth()
  const { compteurs } = useCompteurs()
  const [mobileOpen, setMobileOpen] = useState(false)
  const filtered = navItems.filter(item => item.roles.includes(role))

  function renderNotifs(item) {
    if (!item.notifKey) return null
    const primary = compteurs[item.notifKey] || 0
    const secondary = item.notifKeySecondary ? (compteurs[item.notifKeySecondary] || 0) : 0

    if (primary > 0) return <NotifBadge count={primary} pulse />
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

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-sm font-semibold">
            {profile?.prenom?.[0] || '?'}{profile?.nom?.[0] || ''}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">
              {profile?.prenom} {profile?.nom}
            </p>
            <p className="text-xs text-text-muted capitalize">{role}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-hover hover:text-danger transition-colors cursor-pointer"
        >
          <LogOut size={16} />
          Déconnexion
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
    </>
  )
}
