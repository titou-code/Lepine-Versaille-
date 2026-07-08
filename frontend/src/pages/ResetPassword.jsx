import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Archive, KeyRound } from 'lucide-react'
import { api } from '../lib/api'
import { PASSWORD_RULE } from '../lib/utils'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Spinner from '../components/ui/Spinner'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token')

  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!token) { setError('Lien de réinitialisation invalide'); return }
    if (password !== passwordConfirm) { setError('Les mots de passe ne correspondent pas'); return }
    setSubmitting(true)
    try {
      await api.post('/auth/reset-password', { token, password })
      setDone(true)
    } catch (err) {
      setError(err.message)
    }
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg-primary">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/10 mb-4">
            <Archive className="text-accent" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Archives</h1>
          <p className="text-sm text-text-secondary mt-1">Réinitialisation du mot de passe</p>
        </div>

        <div className="bg-bg-card border border-border rounded-xl p-6 space-y-4">
          {!token && (
            <div className="text-center space-y-4">
              <div className="bg-danger/10 border border-danger/30 rounded-lg px-3 py-2 text-sm text-danger">Lien de réinitialisation invalide</div>
              <Button variant="outline" className="w-full" onClick={() => navigate('/login')}>Retour à la connexion</Button>
            </div>
          )}

          {token && !done && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-text-secondary">Choisissez un nouveau mot de passe.</p>
              <div>
                <Input label="Nouveau mot de passe" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimum 8 caractères" required />
                <p className="text-xs text-text-muted mt-1">{PASSWORD_RULE}</p>
              </div>
              <Input label="Confirmer le mot de passe" type="password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} placeholder="Retapez le mot de passe" required />
              {error && <div className="bg-danger/10 border border-danger/30 rounded-lg px-3 py-2 text-sm text-danger">{error}</div>}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Spinner size="sm" /> : <><KeyRound size={16} /> Réinitialiser le mot de passe</>}
              </Button>
            </form>
          )}

          {done && (
            <div className="text-center space-y-4">
              <p className="text-sm text-success font-medium">Mot de passe réinitialisé avec succès !</p>
              <Button className="w-full" onClick={() => navigate('/login')}>Se connecter</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
