import { useMemo, useState, useEffect } from 'react'
import { Package, FileText, AlertTriangle, AlertCircle, MapPin } from 'lucide-react'
import { useDocuments } from '../hooks/useDocuments'
import { api } from '../lib/api'
import { computeStatut, formatDate, THEMES } from '../lib/utils'
import PageWrapper from '../components/layout/PageWrapper'
import Header from '../components/layout/Header'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'

function KPICard({ icon: Icon, label, value, color }) {
  return (
    <Card className="flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-text-secondary">{label}</p>
      </div>
    </Card>
  )
}

export default function Dashboard() {
  const { documents, loading } = useDocuments({ all: 'true' })
  const [backupAlert, setBackupAlert] = useState(false)

  useEffect(() => {
    api.get('/admin/backup-status').then(d => setBackupAlert(!!d.alert)).catch(() => {})
  }, [])

  const stats = useMemo(() => {
    const withStatut = documents.map(d => ({
      ...d,
      statut_calcule: computeStatut(d.date_limite_conservation)
    }))
    const cartons = new Set(documents.map(d => d.carton_id))
    const aDetruire = withStatut.filter(d => d.statut_calcule === 'a_detruire')
    const bientot = withStatut.filter(d => d.statut_calcule === 'bientot')
    const derniers = [...documents].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10)

    const parTheme = THEMES.reduce((acc, t) => {
      const count = documents.filter(d => d.theme === t).length
      if (count > 0) acc.push({ theme: t, count })
      return acc
    }, []).sort((a, b) => b.count - a.count)

    const salleMap = {}
    documents.forEach(d => {
      salleMap[d.salle_nom] = (salleMap[d.salle_nom] || 0) + 1
    })
    const parSalle = Object.entries(salleMap).map(([salle, count]) => ({ salle, count })).sort((a, b) => b.count - a.count)

    return { totalCartons: cartons.size, totalDocs: documents.length, aDetruire, bientot, derniers, parTheme, parSalle }
  }, [documents])

  if (loading) return <PageWrapper><div className="flex justify-center py-20"><Spinner size="lg" /></div></PageWrapper>

  return (
    <PageWrapper>
      <Header title="Tableau de bord" subtitle="Vue d'ensemble des archives" />

      {backupAlert && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
          <AlertTriangle size={18} className="flex-shrink-0" />
          <span>⚠ Aucune sauvegarde réussie depuis plus de 48 h — contactez votre prestataire informatique.</span>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard icon={Package} label="Cartons" value={stats.totalCartons} color="bg-accent/10 text-accent" />
        <KPICard icon={FileText} label="Documents" value={stats.totalDocs} color="bg-success/10 text-success" />
        <KPICard icon={AlertTriangle} label="À détruire" value={stats.aDetruire.length} color="bg-danger/10 text-danger" />
        <KPICard icon={AlertCircle} label="Bientôt" value={stats.bientot.length} color="bg-warning/10 text-warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <h2 className="text-lg font-semibold mb-4">Répartition par service</h2>
          <div className="space-y-2">
            {stats.parTheme.map(({ theme, count }) => (
              <div key={theme} className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">{theme}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-bg-primary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full"
                      style={{ width: `${(count / stats.totalDocs) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
            {stats.parTheme.length === 0 && <p className="text-sm text-text-muted">Aucune donnée</p>}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold mb-4">Répartition par salle</h2>
          <div className="space-y-2">
            {stats.parSalle.map(({ salle, count }) => (
              <div key={salle} className="flex items-center justify-between">
                <span className="text-sm text-text-secondary flex items-center gap-2">
                  <MapPin size={14} className="text-accent" /> {salle}
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-bg-primary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-success rounded-full"
                      style={{ width: `${(count / stats.totalDocs) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
            {stats.parSalle.length === 0 && <p className="text-sm text-text-muted">Aucune donnée</p>}
          </div>
        </Card>
      </div>

      {stats.aDetruire.length > 0 && (
        <Card className="mb-6">
          <h2 className="text-lg font-semibold mb-4 text-danger flex items-center gap-2">
            <AlertTriangle size={18} /> Documents à traiter en priorité
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-bg-secondary">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase">N° Carton</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase">Salle</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase">Étagère</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase">Catégorie</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase">Date limite</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase">Obligation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.aDetruire.slice(0, 10).map(doc => (
                  <tr key={doc.id} className="bg-danger/5 hover:bg-danger/10 transition-colors">
                    <td className="px-3 py-2 font-mono font-medium text-accent">{doc.carton_numero}</td>
                    <td className="px-3 py-2">{doc.salle_nom}</td>
                    <td className="px-3 py-2 text-text-secondary">{doc.etagere_nom || '—'}</td>
                    <td className="px-3 py-2">{doc.categorie}</td>
                    <td className="px-3 py-2 font-mono text-xs">{formatDate(doc.date_limite_conservation)}</td>
                    <td className="px-3 py-2"><Badge variant={doc.obligatoire ? 'obligatoire' : 'recommande'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card>
        <h2 className="text-lg font-semibold mb-4">10 derniers documents archivés</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bg-secondary">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase">N° Carton</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase">Service</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase">Catégorie</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase">Date ajout</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {stats.derniers.map(doc => {
                const statut = computeStatut(doc.date_limite_conservation)
                return (
                  <tr key={doc.id} className="hover:bg-bg-hover transition-colors">
                    <td className="px-3 py-2 font-mono font-medium text-accent">{doc.carton_numero}</td>
                    <td className="px-3 py-2">{doc.theme}</td>
                    <td className="px-3 py-2 max-w-[200px] truncate text-text-secondary">{doc.categorie}</td>
                    <td className="px-3 py-2 font-mono text-xs">{formatDate(doc.created_at)}</td>
                    <td className="px-3 py-2">{statut ? <Badge variant={statut} /> : '—'}</td>
                  </tr>
                )
              })}
              {stats.derniers.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-text-muted">Aucun document</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </PageWrapper>
  )
}
