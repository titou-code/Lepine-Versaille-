const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const helmet = require('helmet')

const WEAK_JWT_SECRETS = ['change-me-in-production', 'dev-secret-change-me', 'dev-secret']
if (!process.env.JWT_SECRET || WEAK_JWT_SECRETS.includes(process.env.JWT_SECRET) || process.env.JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET absent ou valeur par défaut — arrêt du backend')
  console.error('Générez un secret robuste avec : openssl rand -hex 32')
  process.exit(1)
}

const pool = require('./db')

const authRoutes = require('./routes/auth.routes')
const sallesRoutes = require('./routes/salles.routes')
const cartonsRoutes = require('./routes/cartons.routes')
const documentsRoutes = require('./routes/documents.routes')
const categoriesCnilRoutes = require('./routes/categoriesCnil.routes')
const destructionsRoutes = require('./routes/destructions.routes')
const adminRoutes = require('./routes/admin.routes')
const notificationsRoutes = require('./routes/notifications.routes')

const app = express()
// Derrière le reverse proxy nginx : faire confiance au premier proxy pour lire l'IP
// réelle via X-Forwarded-For (rate-limit par IP réelle et IP correcte dans l'audit).
app.set('trust proxy', 1)
const PORT = process.env.PORT || 4000

app.use(helmet())

// CORS restreint : n'autorise que la/les origine(s) de CORS_ORIGIN (séparées par des virgules).
// Absente → origin:false (aucune origine cross-site autorisée), sûr car le frontend est servi
// en même origine par nginx (proxy /api). En prod, définir CORS_ORIGIN = URL du client si l'API
// est appelée depuis une autre origine.
const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : false
app.use(cors({ origin: corsOrigin, credentials: true }))

app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

app.use('/api/auth', authRoutes)
app.use('/api/salles', sallesRoutes)
app.use('/api/cartons', cartonsRoutes)
app.use('/api/documents', documentsRoutes)
app.use('/api/categories-cnil', categoriesCnilRoutes)
app.use('/api/destructions', destructionsRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/notifications', notificationsRoutes)

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'ok' })
  } catch {
    res.status(503).json({ status: 'db_error' })
  }
})

async function purgeSupprimes() {
  try {
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    await pool.query('DELETE FROM etageres WHERE deleted_at IS NOT NULL AND deleted_at < $1', [cutoff])
    await pool.query('DELETE FROM salles WHERE deleted_at IS NOT NULL AND deleted_at < $1', [cutoff])
    await pool.query(
      `UPDATE users SET email = 'anonyme-' || id || '@supprime.local',
        nom = 'Anonyme', prenom = '', password_hash = '', email_original = NULL
       WHERE deleted_at IS NOT NULL AND deleted_at < $1
         AND email NOT LIKE 'anonyme-%@supprime.local'`,
      [cutoff]
    )
    console.log(`[PURGE] Éléments effacés avant ${cutoff.toISOString()}`)
  } catch (err) {
    console.error('[PURGE] Erreur:', err.message)
  }
}

purgeSupprimes()
setInterval(purgeSupprimes, 24 * 60 * 60 * 1000)

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`)
})
