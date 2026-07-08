const { Router } = require('express')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const pool = require('../db')
const { authenticate, signAccessToken, generateRefreshToken, hashToken, refreshExpiry, ROLE_HIERARCHY } = require('../middleware/auth')
const { logAudit } = require('../audit')
const { validatePassword } = require('../passwordPolicy')
const { smtpReady, sendPasswordReset } = require('../mailer')

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
      user: { id: user.id, email: user.email, nom: user.nom, prenom: user.prenom, role: user.role, must_change_password: user.must_change_password }
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
      'SELECT id, email, nom, prenom, role, actif, must_change_password FROM users WHERE id = $1',
      [req.user.id]
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Utilisateur introuvable' })
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/config', (req, res) => {
  res.json({ smtp: smtpReady() })
})

router.post('/forgot-password', async (req, res) => {
  const genericResponse = { success: true, message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.' }
  try {
    const { email } = req.body
    if (!email || !smtpReady()) return res.json(genericResponse)

    const { rows } = await pool.query('SELECT id FROM users WHERE email = $1 AND actif = true AND deleted_at IS NULL', [email])
    if (rows.length === 0) return res.json(genericResponse)

    const userId = rows[0].id
    await pool.query('UPDATE password_resets SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL', [userId])

    const token = crypto.randomBytes(32).toString('hex')
    const tokenHash = hashToken(token)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
    await pool.query(
      'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1,$2,$3)',
      [userId, tokenHash, expiresAt]
    )

    try {
      await sendPasswordReset(email, token)
    } catch (mailErr) {
      console.error('[FORGOT] Erreur envoi email:', mailErr.message)
    }

    res.json(genericResponse)
  } catch (err) {
    console.error('[FORGOT]', err)
    res.json(genericResponse)
  }
})

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body
    if (!token || !password) return res.status(400).json({ error: 'Token et mot de passe requis' })
    const pwCheck = validatePassword(password)
    if (!pwCheck.ok) return res.status(400).json({ error: pwCheck.error })

    const tokenHash = hashToken(token)
    const { rows } = await pool.query(
      'SELECT id, user_id, expires_at, used_at FROM password_resets WHERE token_hash = $1',
      [tokenHash]
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Lien de réinitialisation introuvable' })
    const pr = rows[0]
    if (pr.used_at) return res.status(410).json({ error: 'Ce lien a déjà été utilisé' })
    if (new Date(pr.expires_at) < new Date()) return res.status(410).json({ error: 'Ce lien a expiré' })

    const hash = await bcrypt.hash(password, 10)
    await pool.query('UPDATE users SET password_hash = $1, must_change_password = false WHERE id = $2', [hash, pr.user_id])
    await pool.query('UPDATE password_resets SET used_at = NOW() WHERE id = $1', [pr.id])
    await pool.query('UPDATE refresh_tokens SET revoked = true WHERE user_id = $1', [pr.user_id])
    await logAudit(pr.user_id, 'reinitialisation_mdp', 'users', pr.user_id, { action: 'reset_par_email' })

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { current_password, new_password } = req.body
    if (!current_password || !new_password) return res.status(400).json({ error: 'Mot de passe actuel et nouveau requis' })
    const pwCheck = validatePassword(new_password)
    if (!pwCheck.ok) return res.status(400).json({ error: pwCheck.error })

    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id])
    if (rows.length === 0) return res.status(404).json({ error: 'Utilisateur introuvable' })

    const valid = await bcrypt.compare(current_password, rows[0].password_hash)
    if (!valid) return res.status(401).json({ error: 'Mot de passe actuel incorrect' })

    const same = await bcrypt.compare(new_password, rows[0].password_hash)
    if (same) return res.status(400).json({ error: 'Le nouveau mot de passe doit être différent de l\'actuel' })

    const hash = await bcrypt.hash(new_password, 10)
    await pool.query('UPDATE users SET password_hash = $1, must_change_password = false WHERE id = $2', [hash, req.user.id])

    await pool.query(
      'UPDATE refresh_tokens SET revoked = true WHERE user_id = $1 AND session_id IS DISTINCT FROM $2',
      [req.user.id, req.user.session_id || null]
    )

    await logAudit(req.user.id, 'changement_mdp', 'users', req.user.id, { action: 'changement_mot_de_passe' })
    res.json({ success: true })
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
    const pwCheck = validatePassword(password)
    if (!pwCheck.ok) return res.status(400).json({ error: pwCheck.error })

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
      'INSERT INTO users (email, password_hash, nom, prenom, role, must_change_password) VALUES ($1,$2,$3,$4,$5,false) RETURNING id, email, nom, prenom, role',
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
