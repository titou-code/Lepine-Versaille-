const { Router } = require('express')
const pool = require('../db')
const { authenticate, requireRole } = require('../middleware/auth')
const { logAudit } = require('../audit')

const router = Router()

router.get('/', authenticate, async (req, res) => {
  try {
    const { rows: salles } = await pool.query(
      'SELECT * FROM salles WHERE actif = true AND deleted_at IS NULL ORDER BY nom'
    )
    for (const salle of salles) {
      const { rows: etageres } = await pool.query(
        'SELECT * FROM etageres WHERE salle_id = $1 AND deleted_at IS NULL ORDER BY nom',
        [salle.id]
      )
      salle.etageres = etageres
    }
    res.json(salles)
  } catch (err) {
    console.error('[SALLES]', err)
    res.status(500).json({ error: 'Une erreur interne est survenue' })
  }
})

router.post('/', authenticate, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { nom } = req.body
    const { rows } = await pool.query(
      'INSERT INTO salles (nom) VALUES ($1) RETURNING *',
      [nom]
    )
    await logAudit(req.user.id, 'creation', 'salles', rows[0].id, { nom })
    res.status(201).json(rows[0])
  } catch (err) {
    console.error('[SALLES]', err)
    res.status(500).json({ error: 'Une erreur interne est survenue' })
  }
})

router.patch('/:id', authenticate, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { id } = req.params
    const fields = []
    const values = []
    let idx = 1
    for (const [key, val] of Object.entries(req.body)) {
      if (['nom', 'actif'].includes(key)) {
        fields.push(`${key} = $${idx++}`)
        values.push(val)
      }
    }
    if (fields.length === 0) return res.status(400).json({ error: 'Rien à modifier' })
    values.push(id)
    await pool.query(`UPDATE salles SET ${fields.join(', ')} WHERE id = $${idx}`, values)
    res.json({ success: true })
  } catch (err) {
    console.error('[SALLES]', err)
    res.status(500).json({ error: 'Une erreur interne est survenue' })
  }
})

router.post('/:id/delete', authenticate, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { id } = req.params
    await pool.query('UPDATE salles SET actif = false, deleted_at = NOW() WHERE id = $1', [id])
    await logAudit(req.user.id, 'suppression', 'salles', id)
    res.json({ success: true })
  } catch (err) {
    console.error('[SALLES]', err)
    res.status(500).json({ error: 'Une erreur interne est survenue' })
  }
})

router.post('/etageres', authenticate, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { salle_id, nom, description, nombre_rangees } = req.body
    const { rows } = await pool.query(
      'INSERT INTO etageres (salle_id, nom, description, nombre_rangees) VALUES ($1, $2, $3, $4) RETURNING *',
      [salle_id, nom, description || '', nombre_rangees ?? 5]
    )
    await logAudit(req.user.id, 'creation', 'etageres', rows[0].id, { salle_id, nom })
    res.status(201).json(rows[0])
  } catch (err) {
    console.error('[SALLES]', err)
    res.status(500).json({ error: 'Une erreur interne est survenue' })
  }
})

router.patch('/etageres/:id', authenticate, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { id } = req.params
    const fields = []
    const values = []
    let idx = 1
    for (const [key, val] of Object.entries(req.body)) {
      if (['nom', 'description', 'actif', 'nombre_rangees'].includes(key)) {
        fields.push(`${key} = $${idx++}`)
        values.push(val)
      }
    }
    if (fields.length === 0) return res.status(400).json({ error: 'Rien à modifier' })
    values.push(id)
    await pool.query(`UPDATE etageres SET ${fields.join(', ')} WHERE id = $${idx}`, values)
    res.json({ success: true })
  } catch (err) {
    console.error('[SALLES]', err)
    res.status(500).json({ error: 'Une erreur interne est survenue' })
  }
})

router.post('/etageres/:id/delete', authenticate, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { id } = req.params
    await pool.query('UPDATE etageres SET actif = false, deleted_at = NOW() WHERE id = $1', [id])
    await logAudit(req.user.id, 'suppression', 'etageres', id)
    res.json({ success: true })
  } catch (err) {
    console.error('[SALLES]', err)
    res.status(500).json({ error: 'Une erreur interne est survenue' })
  }
})

module.exports = router
