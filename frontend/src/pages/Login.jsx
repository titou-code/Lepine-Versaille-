import { useState } from 'react'
import { LogIn } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useBranding } from '../hooks/useBranding'
import { api } from '../lib/api'
import ClientLogo from '../components/ClientLogo'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Spinner from '../components/ui/Spinner'

export default function Login() {
  const { signIn } = useAuth()
  const { clientName } = useBranding()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [mode, setMode] = useState('login')
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleForgot(e) {
    e.preventDefault()
    setForgotLoading(true)
    try {
      await api.post('/auth/forgot-password-interne', { email: forgotEmail })
    } catch {}
    setForgotSent(true)
    setForgotLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg-primary">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <ClientLogo className="h-60 w-auto" iconSize={192} />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Archives</h1>
          {clientName && <p className="text-sm text-text-secondary mt-1">{clientName}</p>}
        </div>

        {mode === 'login' && (
          <form onSubmit={handleSubmit} className="bg-bg-card border border-border rounded-xl p-6 space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="votre@email.fr"
              required
            />
            <Input
              label="Mot de passe"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            {error && (
              <div className="bg-danger/10 border border-danger/30 rounded-lg px-3 py-2 text-sm text-danger">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Spinner size="sm" /> : <><LogIn size={16} /> Connexion</>}
            </Button>

            <button type="button" onClick={() => { setMode('forgot'); setError('') }} className="w-full text-xs text-text-muted hover:text-accent cursor-pointer">
              Mot de passe oublié ?
            </button>
          </form>
        )}

        {mode === 'forgot' && (
          <div className="bg-bg-card border border-border rounded-xl p-6 space-y-4">
            {forgotSent ? (
              <>
                <p className="text-sm text-text-secondary">
                  Si un compte existe, votre demande a été transmise à un administrateur.
                </p>
                <Button variant="outline" className="w-full" onClick={() => { setMode('login'); setForgotSent(false); setForgotEmail('') }}>
                  Retour à la connexion
                </Button>
              </>
            ) : (
              <form onSubmit={handleForgot} className="space-y-4">
                <p className="text-sm text-text-secondary">
                  Saisissez votre email. Votre demande de réinitialisation sera transmise à un administrateur.
                </p>
                <Input
                  label="Email"
                  type="email"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  placeholder="votre@email.fr"
                  required
                />
                <Button type="submit" className="w-full" disabled={forgotLoading}>
                  {forgotLoading ? <Spinner size="sm" /> : 'Envoyer la demande'}
                </Button>
                <button type="button" onClick={() => { setMode('login'); setForgotEmail('') }} className="w-full text-xs text-text-muted hover:text-accent cursor-pointer">
                  Retour à la connexion
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
