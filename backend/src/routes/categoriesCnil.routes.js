const { Router } = require('express')
const pool = require('../db')
const { authenticate, requireRole } = require('../middleware/auth')
const { logAudit } = require('../audit')

const router = Router()

router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM categories_cnil WHERE actif = true ORDER BY section, categorie'
    )
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/all', authenticate, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM categories_cnil ORDER BY section, categorie'
    )
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/', authenticate, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { categorie, section, duree_archivage_mois, type_date_reference, obligatoire, fondement_juridique, theme_defaut, type_precision, delai_apres_evenement_mois, options_duree } = req.body
    if (!categorie || !section) return res.status(400).json({ error: 'Catégorie et section requises' })
    const { rows } = await pool.query(
      'INSERT INTO categories_cnil (categorie, section, duree_archivage_mois, type_date_reference, obligatoire, fondement_juridique, theme_defaut, type_precision, delai_apres_evenement_mois, options_duree) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [categorie, section, duree_archivage_mois || null, type_date_reference || 'Date du document', obligatoire || false, fondement_juridique || null, theme_defaut || 'Autre', type_precision || null, delai_apres_evenement_mois || null, options_duree || null]
    )
    await logAudit(req.user.id, 'creation', 'categories_cnil', rows[0].id, { categorie, section })
    res.status(201).json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/:id', authenticate, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { id } = req.params
    const fields = []
    const values = []
    let idx = 1
    const allowed = ['categorie', 'section', 'duree_archivage_mois', 'type_date_reference', 'obligatoire', 'fondement_juridique', 'theme_defaut', 'type_precision', 'delai_apres_evenement_mois', 'options_duree']
    for (const [key, val] of Object.entries(req.body)) {
      if (allowed.includes(key)) {
        fields.push(`${key}=$${idx++}`)
        values.push(val)
      }
    }
    if (fields.length === 0) return res.status(400).json({ error: 'Rien à modifier' })
    values.push(id)
    await pool.query(`UPDATE categories_cnil SET ${fields.join(', ')} WHERE id = $${idx}`, values)
    await logAudit(req.user.id, 'modification', 'categories_cnil', id, req.body)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/:id/delete', authenticate, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { id } = req.params
    await pool.query('UPDATE categories_cnil SET actif = false, deleted_at = NOW() WHERE id = $1', [id])
    await logAudit(req.user.id, 'suppression', 'categories_cnil', id)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
