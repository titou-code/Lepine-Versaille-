const { Router } = require('express')
const pool = require('../db')
const { authenticate, requireRole } = require('../middleware/auth')
const { logAudit } = require('../audit')

const router = Router()

router.post('/', authenticate, requireRole(['super_admin', 'admin', 'archiviste']), async (req, res) => {
  try {
    const { document_id, date_destruction, methode, notes } = req.body
    const { rows } = await pool.query(
      'INSERT INTO destructions (document_id, date_destruction, effectue_par, methode, notes) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [document_id, date_destruction, req.user.id, methode, notes || null]
    )
    await pool.query('UPDATE documents SET detruit = true WHERE id = $1', [document_id])
    await logAudit(req.user.id, 'destruction', 'documents', document_id, { methode, notes })
    res.status(201).json(rows[0])
  } catch (err) {
    console.error('[DESTRUCTIONS]', err)
    res.status(500).json({ error: 'Une erreur interne est survenue' })
  }
})

module.exports = router
