const { Router } = require('express')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const pool = require('../db')
const { authenticate, signAccessToken, generateRefreshToken, hashToken, refreshExpiry, ROLE_HIERARCHY } = require('../middleware/auth')
const { logAudit } = require('../audit')

const router = Router()

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' })

    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1 AND actif = true AND deleted_at IS NULL', [email])
    if (rows.length === 0) return res.status(401).json({ error: 'Email ou mot de passe incorrect' })

    const user = rows[0]
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return res.status(401).json({ error: 'Email ou mot de passe incorrect' })

    const sessionId = crypto.randomUUID()
    const accessToken = signAccessToken({ ...user, session_id: sessionId })
    const refreshToken = generateRefreshToken()
    const tokenHash = hashToken(refreshToken)

    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at, session_id) VALUES ($1,$2,$3,$4)',
      [user.id, tokenHash, refreshExpiry(), sessionId]
    )

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth',
    })

    res.json({
      token: accessToken,
      user: { id: user.id, email: user.email, nom: user.nom, prenom: user.prenom, role: user.role }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies?.refresh_token
    if (!refreshToken) return res.status(401).json({ error: 'Refresh token manquant' })

    const tokenHash = hashToken(refreshToken)
    const { rows } = await pool.query(
      'SELECT rt.*, u.id as uid, u.role, u.actif, u.deleted_at FROM refresh_tokens rt JOIN users u ON rt.user_id = u.id WHERE rt.token_hash = $1 AND rt.revoked = false AND rt.expires_at > NOW()',
      [tokenHash]
    )
    if (rows.length === 0) return res.status(401).json({ error: 'Refresh token invalide' })

    const row = rows[0]
    if (!row.actif || row.deleted_at) return res.status(401).json({ error: 'Compte désactivé' })

    const accessToken = signAccessToken({ id: row.uid, role: row.role, session_id: row.session_id })
    res.json({ token: accessToken })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/logout', async (req, res) => {
  try {
    const refreshToken = req.cookies?.refresh_token
    if (refreshToken) {
      const tokenHash = hashToken(refreshToken)
      await pool.query('UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1', [tokenHash])
    }
    res.clearCookie('refresh_token', { path: '/api/auth' })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/me', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, email, nom, prenom, role, actif FROM users WHERE id = $1',
      [req.user.id]
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Utilisateur introuvable' })
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/invitation/:token', async (req, res) => {
  try {
    const tokenHash = hashToken(req.params.token)
    const { rows } = await pool.query(
      'SELECT email, role, nom, prenom, expires_at, used_at FROM invitations WHERE token_hash = $1',
      [tokenHash]
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Invitation introuvable' })
    const inv = rows[0]
    if (inv.used_at) return res.status(410).json({ error: 'Cette invitation a déjà été utilisée' })
    if (new Date(inv.expires_at) < new Date()) return res.status(410).json({ error: 'Cette invitation a expiré' })
    res.json({ email: inv.email, role: inv.role, nom: inv.nom, prenom: inv.prenom })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/invitation/accept', async (req, res) => {
  try {
    const { token, password } = req.body
    if (!token || !password) return res.status(400).json({ error: 'Token et mot de passe requis' })
    if (password.length < 8) return res.status(400).json({ error: 'Le mot de passe doit faire au moins 8 caractères' })

    const tokenHash = hashToken(token)
    const { rows } = await pool.query(
      'SELECT id, email, role, nom, prenom, expires_at, used_at FROM invitations WHERE token_hash = $1',
      [tokenHash]
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Invitation introuvable' })
    const inv = rows[0]
    if (inv.used_at) return res.status(410).json({ error: 'Cette invitation a déjà été utilisée' })
    if (new Date(inv.expires_at) < new Date()) return res.status(410).json({ error: 'Cette invitation a expiré' })

    const hash = await bcrypt.hash(password, 10)
    const { rows: userRows } = await pool.query(
      'INSERT INTO users (email, password_hash, nom, prenom, role) VALUES ($1,$2,$3,$4,$5) RETURNING id, email, nom, prenom, role',
      [inv.email, hash, inv.nom || '', inv.prenom || '', inv.role]
    )

    await pool.query('UPDATE invitations SET used_at = NOW() WHERE id = $1', [inv.id])

    res.status(201).json({ success: true, user: userRows[0] })
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Un compte existe déjà avec cet email' })
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
