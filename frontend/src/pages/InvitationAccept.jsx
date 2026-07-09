import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { api } from '../lib/api'
import { PASSWORD_RULE } from '../lib/utils'
import ClientLogo from '../components/ClientLogo'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Spinner from '../components/ui/Spinner'

export default function InvitationAccept() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token')

  const [invitation, setInvitation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) { setError('Lien d\'invitation invalide'); setLoading(false); return }
    api.get(`/auth/invitation/${token}`)
      .then(data => { setInvitation(data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [token])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Le mot de passe doit faire au moins 8 caractères'); return }
    if (password !== passwordConfirm) { setError('Les mots de passe ne correspondent pas'); return }
    setSubmitting(true)
    try {
      await api.post('/auth/invitation/accept', { token, password })
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
            <ClientLogo className="h-10 w-auto" iconSize={32} />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Archives</h1>
          <p className="text-sm text-text-secondary mt-1">Lépine Versailles</p>
        </div>

        <div className="bg-bg-card border border-border rounded-xl p-6 space-y-4">
          {loading && <div className="flex justify-center py-6"><Spinner size="lg" /></div>}

          {!loading && error && !invitation && (
            <div className="text-center space-y-4">
              <div className="bg-danger/10 border border-danger/30 rounded-lg px-3 py-2 text-sm text-danger">{error}</div>
              <Button variant="outline" className="w-full" onClick={() => navigate('/login')}>Retour à la connexion</Button>
            </div>
          )}

          {!loading && invitation && !done && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="text-center mb-2">
                <p className="text-sm text-text-secondary">Créer votre compte</p>
                <p className="text-xs text-text-muted mt-1">{invitation.email}</p>
              </div>
              <Input label="Prénom" value={invitation.prenom || ''} disabled />
              <Input label="Nom" value={invitation.nom || ''} disabled />
              <Input label="Rôle" value={invitation.role.replace('_', ' ')} disabled />
              <div>
                <Input label="Mot de passe" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimum 8 caractères" required />
                <p className="text-xs text-text-muted mt-1">{PASSWORD_RULE}</p>
              </div>
              <Input label="Confirmer le mot de passe" type="password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} placeholder="Retapez le mot de passe" required />
              {error && <div className="bg-danger/10 border border-danger/30 rounded-lg px-3 py-2 text-sm text-danger">{error}</div>}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Spinner size="sm" /> : <><UserPlus size={16} /> Créer mon compte</>}
              </Button>
            </form>
          )}

          {done && (
            <div className="text-center space-y-4">
              <p className="text-sm text-success font-medium">Compte créé avec succès !</p>
              <Button className="w-full" onClick={() => navigate('/login')}>Se connecter</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
