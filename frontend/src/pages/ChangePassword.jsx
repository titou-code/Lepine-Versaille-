import { useState } from 'react'
import { Archive, KeyRound } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import { PASSWORD_RULE } from '../lib/utils'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Spinner from '../components/ui/Spinner'

export default function ChangePassword() {
  const { markPasswordChanged, signOut } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (next !== confirm) { setError('Les mots de passe ne correspondent pas'); return }
    if (next === current) { setError('Le nouveau mot de passe doit être différent de l\'actuel'); return }
    setLoading(true)
    try {
      await api.post('/auth/change-password', { current_password: current, new_password: next })
      markPasswordChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg-primary">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/10 mb-4">
            <Archive className="text-accent" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Archives</h1>
          <p className="text-sm text-text-secondary mt-1">Changement de mot de passe requis</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-bg-card border border-border rounded-xl p-6 space-y-4">
          <p className="text-sm text-text-secondary">
            Pour des raisons de sécurité, vous devez définir un nouveau mot de passe avant d'accéder à l'application.
          </p>
          <Input label="Mot de passe actuel" type="password" value={current} onChange={e => setCurrent(e.target.value)} required />
          <div>
            <Input label="Nouveau mot de passe" type="password" value={next} onChange={e => setNext(e.target.value)} required />
            <p className="text-xs text-text-muted mt-1">{PASSWORD_RULE}</p>
          </div>
          <Input label="Confirmer le nouveau mot de passe" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required />

          {error && (
            <div className="bg-danger/10 border border-danger/30 rounded-lg px-3 py-2 text-sm text-danger">{error}</div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Spinner size="sm" /> : <><KeyRound size={16} /> Valider le nouveau mot de passe</>}
          </Button>
          <button type="button" onClick={signOut} className="w-full text-xs text-text-muted hover:text-text-secondary cursor-pointer">
            Se déconnecter
          </button>
        </form>
      </div>
    </div>
  )
}
