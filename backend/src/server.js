const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
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
const PORT = process.env.PORT || 4000

app.use(cors({ origin: true, credentials: true }))
app.use(express.json())
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
    await pool.query('DELETE FROM salles WHERE deleted_at IS NOT NULL AND deleted_at < $1', [cutoff])
    await pool.query('DELETE FROM etageres WHERE deleted_at IS NOT NULL AND deleted_at < $1', [cutoff])
    await pool.query('DELETE FROM users WHERE deleted_at IS NOT NULL AND deleted_at < $1', [cutoff])
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
