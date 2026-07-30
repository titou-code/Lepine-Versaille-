const { Router } = require('express')
const fs = require('fs')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const pool = require('../db')
const { authenticate, requireRole, peutGererUtilisateur, hashToken, ROLE_HIERARCHY } = require('../middleware/auth')
const { logAudit } = require('../audit')
const { smtpReady, sendInvitation } = require('../mailer')
const { validatePassword } = require('../passwordPolicy')
const { handleDbConstraintError } = require('../dbError')

const router = Router()

router.get('/users', authenticate, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, email, nom, prenom, role, actif, created_at FROM users WHERE deleted_at IS NULL ORDER BY nom'
    )
    res.json(rows)
  } catch (err) {
    console.error('[ADMIN]', err)
    if (handleDbConstraintError(err, res)) return
    res.status(500).json({ error: 'Une erreur interne est survenue' })
  }
})

router.post('/users', authenticate, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { email, password, nom, prenom, role } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' })
    const pwCheck = validatePassword(password)
    if (!pwCheck.ok) return res.status(400).json({ error: pwCheck.error })
    const targetRole = role || 'consultation'
    if (!peutGererUtilisateur(req.user, { role: targetRole })) {
      return res.status(403).json({ error: 'Vous ne pouvez pas créer un utilisateur avec ce rôle' })
    }
    const hash = await bcrypt.hash(password, 10)
    const { rows } = await pool.query(
      'INSERT INTO users (email, password_hash, nom, prenom, role, must_change_password, created_by) VALUES ($1,$2,$3,$4,$5,true,$6) RETURNING id, email, nom, prenom, role, actif',
      [email, hash, nom || '', prenom || '', targetRole, req.user.id]
    )
    await logAudit(req.user.id, 'gestion_utilisateur', 'users', rows[0].id, { action: 'creation', email, role: targetRole })
    res.status(201).json(rows[0])
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email déjà utilisé' })
    console.error('[ADMIN]', err)
    if (handleDbConstraintError(err, res)) return
    res.status(500).json({ error: 'Une erreur interne est survenue' })
  }
})

router.patch('/users/:id', authenticate, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { id } = req.params
    const { rows: targetRows } = await pool.query('SELECT id, role FROM users WHERE id = $1', [id])
    if (targetRows.length === 0) return res.status(404).json({ error: 'Utilisateur introuvable' })
    const targetUser = targetRows[0]
    if (!peutGererUtilisateur(req.user, targetUser)) {
      return res.status(403).json({ error: 'Action non autorisée sur cet utilisateur' })
    }
    if (req.body.role && !peutGererUtilisateur(req.user, { role: req.body.role })) {
      return res.status(403).json({ error: 'Vous ne pouvez pas attribuer ce rôle' })
    }
    if (req.body.password) {
      const pwCheck = validatePassword(req.body.password)
      if (!pwCheck.ok) return res.status(400).json({ error: pwCheck.error })
    }
    const fields = []
    const values = []
    let idx = 1
    for (const [key, val] of Object.entries(req.body)) {
      if (['nom', 'prenom', 'role', 'actif'].includes(key)) {
        fields.push(`${key} = $${idx++}`)
        values.push(val)
      }
      if (key === 'password' && val) {
        fields.push(`password_hash = $${idx++}`)
        values.push(await bcrypt.hash(val, 10))
        if (id !== req.user.id) {
          fields.push(`must_change_password = $${idx++}`)
          values.push(true)
        }
      }
    }
    if (fields.length === 0) return res.status(400).json({ error: 'Rien à modifier' })
    values.push(id)
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}`, values)
    const { password, ...safeBody } = req.body
    await logAudit(req.user.id, 'gestion_utilisateur', 'users', id, { action: 'modification', ...safeBody })
    res.json({ success: true })
  } catch (err) {
    console.error('[ADMIN]', err)
    if (handleDbConstraintError(err, res)) return
    res.status(500).json({ error: 'Une erreur interne est survenue' })
  }
})

router.post('/users/:id/delete', authenticate, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { id } = req.params
    const { rows: targetRows } = await pool.query('SELECT id, role FROM users WHERE id = $1', [id])
    if (targetRows.length === 0) return res.status(404).json({ error: 'Utilisateur introuvable' })
    if (!peutGererUtilisateur(req.user, targetRows[0])) {
      return res.status(403).json({ error: 'Action non autorisée sur cet utilisateur' })
    }
    await pool.query(
      `UPDATE users SET actif = false, deleted_at = NOW(),
         email_original = email,
         email = 'supprime-' || extract(epoch from now())::bigint || '-' || email
       WHERE id = $1`,
      [id]
    )
    await logAudit(req.user.id, 'gestion_utilisateur', 'users', id, { action: 'suppression' })
    res.json({ success: true })
  } catch (err) {
    console.error('[ADMIN]', err)
    if (handleDbConstraintError(err, res)) return
    res.status(500).json({ error: 'Une erreur interne est survenue' })
  }
})

router.patch('/users/:id/reset-password', authenticate, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { id } = req.params
    const { password } = req.body
    const { rows: targetRows } = await pool.query('SELECT id, role FROM users WHERE id = $1', [id])
    if (targetRows.length === 0) return res.status(404).json({ error: 'Utilisateur introuvable' })
    if (!peutGererUtilisateur(req.user, targetRows[0])) {
      return res.status(403).json({ error: 'Action non autorisée sur cet utilisateur' })
    }
    const pwCheck = validatePassword(password)
    if (!pwCheck.ok) return res.status(400).json({ error: pwCheck.error })

    const hash = await bcrypt.hash(password, 10)
    await pool.query('UPDATE users SET password_hash = $1, must_change_password = true WHERE id = $2', [hash, id])
    await pool.query('UPDATE refresh_tokens SET revoked = true WHERE user_id = $1', [id])
    // Clôturer toute demande de réinitialisation interne en attente pour cet utilisateur.
    await pool.query(
      "UPDATE demandes_reset SET statut = 'traitee', traite_par = $1, date_traitement = now() WHERE user_id = $2 AND statut = 'en_attente'",
      [req.user.id, id]
    )
    await logAudit(req.user.id, 'gestion_utilisateur', 'users', id, { action: 'reinitialisation_mdp' })
    res.json({ success: true })
  } catch (err) {
    console.error('[ADMIN]', err)
    if (handleDbConstraintError(err, res)) return
    res.status(500).json({ error: 'Une erreur interne est survenue' })
  }
})

// Demandes de réinitialisation de mot de passe en attente.
// - super_admin : toutes les demandes.
// - admin : uniquement les demandes des utilisateurs dont il est le créateur (created_by).
router.get('/demandes-reset', authenticate, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const isSuper = req.user.role === 'super_admin'
    const params = []
    let where = "dr.statut = 'en_attente'"
    if (!isSuper) {
      where += ' AND u.created_by = $1'
      params.push(req.user.id)
    }
    const { rows } = await pool.query(
      `SELECT dr.id, dr.user_id, dr.date_demande,
              u.nom, u.prenom, u.email, u.role
         FROM demandes_reset dr
         JOIN users u ON dr.user_id = u.id
        WHERE ${where}
        ORDER BY dr.date_demande DESC`,
      params
    )
    res.json(rows)
  } catch (err) {
    console.error('[ADMIN]', err)
    if (handleDbConstraintError(err, res)) return
    res.status(500).json({ error: 'Une erreur interne est survenue' })
  }
})

router.get('/supprimes-recemment', authenticate, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { rows: salles } = await pool.query('SELECT id, nom, deleted_at FROM salles WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC')
    const { rows: etageres } = await pool.query('SELECT e.id, e.nom, e.deleted_at, s.nom AS salle_nom FROM etageres e LEFT JOIN salles s ON e.salle_id = s.id WHERE e.deleted_at IS NOT NULL ORDER BY e.deleted_at DESC')
    const { rows: users } = await pool.query("SELECT id, email_original, nom, prenom, role, deleted_at FROM users WHERE deleted_at IS NOT NULL AND email NOT LIKE 'anonyme-%@supprime.local' ORDER BY deleted_at DESC")
    res.json({ salles, etageres, users })
  } catch (err) {
    console.error('[ADMIN]', err)
    if (handleDbConstraintError(err, res)) return
    res.status(500).json({ error: 'Une erreur interne est survenue' })
  }
})

router.post('/restaurer', authenticate, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { type, id } = req.body
    const table = { salles: 'salles', etageres: 'etageres', users: 'users' }[type]
    if (!table) return res.status(400).json({ error: 'Type invalide' })

    if (type === 'users') {
      const { rows: uRows } = await pool.query('SELECT email_original FROM users WHERE id = $1', [id])
      if (uRows.length === 0) return res.status(404).json({ error: 'Utilisateur introuvable' })
      const emailOrig = uRows[0].email_original
      if (emailOrig) {
        const { rows: conflict } = await pool.query(
          'SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL AND id <> $2',
          [emailOrig, id]
        )
        if (conflict.length > 0) {
          return res.status(409).json({ error: 'Cette adresse a été réattribuée — restauration impossible sous cet email' })
        }
        await pool.query('UPDATE users SET actif = true, deleted_at = NULL, email = $1, email_original = NULL WHERE id = $2', [emailOrig, id])
      } else {
        await pool.query('UPDATE users SET actif = true, deleted_at = NULL WHERE id = $1', [id])
      }
      await logAudit(req.user.id, 'restauration', 'users', id)
      return res.json({ success: true })
    }

    await pool.query(`UPDATE ${table} SET actif = true, deleted_at = NULL WHERE id = $1`, [id])
    await logAudit(req.user.id, 'restauration', table, id)
    res.json({ success: true })
  } catch (err) {
    console.error('[ADMIN]', err)
    if (handleDbConstraintError(err, res)) return
    res.status(500).json({ error: 'Une erreur interne est survenue' })
  }
})

router.get('/audit', authenticate, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const conditions = []
    const values = []
    let idx = 1
    if (req.query.user_id) { conditions.push(`a.user_id = $${idx++}`); values.push(req.query.user_id) }
    if (req.query.action) { conditions.push(`a.action = $${idx++}`); values.push(req.query.action) }
    if (req.query.from) { conditions.push(`a.created_at >= $${idx++}`); values.push(req.query.from) }
    if (req.query.to) { conditions.push(`a.created_at <= $${idx++}`); values.push(req.query.to) }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''
    const { rows } = await pool.query(
      `SELECT a.*, u.nom, u.prenom, u.email FROM audit_log a LEFT JOIN users u ON a.user_id = u.id ${where} ORDER BY a.created_at DESC LIMIT 200`,
      values
    )
    res.json(rows)
  } catch (err) {
    console.error('[ADMIN]', err)
    if (handleDbConstraintError(err, res)) return
    res.status(500).json({ error: 'Une erreur interne est survenue' })
  }
})

router.get('/documents-detruits', authenticate, requireRole(['super_admin', 'admin', 'archiviste']), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT d.*, dest.date_destruction, dest.methode, dest.notes AS dest_notes,
              u.nom AS destructeur_nom, u.prenom AS destructeur_prenom
       FROM v_documents_complets d
       JOIN destructions dest ON dest.document_id = d.id
       LEFT JOIN users u ON dest.effectue_par = u.id
       WHERE d.detruit = true
       ORDER BY dest.date_destruction DESC`
    )
    res.json(rows)
  } catch (err) {
    console.error('[ADMIN]', err)
    if (handleDbConstraintError(err, res)) return
    res.status(500).json({ error: 'Une erreur interne est survenue' })
  }
})

router.get('/smtp-status', authenticate, requireRole(['super_admin', 'admin']), (req, res) => {
  res.json({ smtp: smtpReady() })
})

router.get('/backup-status', authenticate, (req, res) => {
  const statusPath = '/backups/status.json'
  const pendingResponse = { last_success: null, last_error: null, last_error_message: null, alert: false, pending: true }
  try {
    if (!fs.existsSync(statusPath)) return res.json(pendingResponse)
    const status = JSON.parse(fs.readFileSync(statusPath, 'utf8'))
    const lastSuccess = status.last_success ? new Date(status.last_success) : null
    const alert = !lastSuccess || (Date.now() - lastSuccess.getTime() > 48 * 60 * 60 * 1000)
    res.json({ ...status, alert })
  } catch (err) {
    console.error('[BACKUP-STATUS]', err)
    res.json(pendingResponse)
  }
})

router.post('/users/invite', authenticate, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { email, role, nom, prenom } = req.body
    if (!email) return res.status(400).json({ error: 'Email requis' })
    const targetRole = role || 'consultation'
    if (!peutGererUtilisateur(req.user, { role: targetRole })) {
      return res.status(403).json({ error: 'Vous ne pouvez pas inviter avec ce rôle' })
    }
    const { rows: existing } = await pool.query('SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL', [email])
    if (existing.length > 0) return res.status(409).json({ error: 'Un compte existe déjà avec cet email' })

    const token = crypto.randomBytes(32).toString('hex')
    const tokenHash = hashToken(token)
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000)

    await pool.query(
      'INSERT INTO invitations (email, role, nom, prenom, token_hash, expires_at, invited_by) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [email, targetRole, nom || '', prenom || '', tokenHash, expiresAt, req.user.id]
    )

    let emailSent = false
    try {
      const inviterName = `${req.user.prenom || ''} ${req.user.nom || ''}`.trim() || 'Un administrateur'
      emailSent = await sendInvitation(email, token, inviterName)
    } catch (mailErr) {
      console.error('[INVITE] Erreur envoi email:', mailErr.message)
    }

    await logAudit(req.user.id, 'invitation', 'invitations', null, { email, role: targetRole, email_sent: emailSent })

    if (emailSent) {
      res.status(201).json({ success: true, message: 'Invitation envoyée par email' })
    } else {
      res.status(201).json({ success: true, message: 'Invitation créée (email non envoyé — SMTP non configuré)', link: `/invitation?token=${token}` })
    }
  } catch (err) {
    console.error('[ADMIN]', err)
    if (handleDbConstraintError(err, res)) return
    res.status(500).json({ error: 'Une erreur interne est survenue' })
  }
})

module.exports = router
