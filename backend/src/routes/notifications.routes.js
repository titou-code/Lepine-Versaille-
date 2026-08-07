const { Router } = require('express')
const pool = require('../db')
const { authenticate } = require('../middleware/auth')

const router = Router()

router.get('/compteurs', authenticate, async (req, res) => {
  try {
    const { rows: cptRows } = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE a_completer)::int AS a_completer,
        COUNT(*) FILTER (WHERE NOT a_completer AND date_limite_conservation < CURRENT_DATE)::int AS a_detruire,
        COUNT(*) FILTER (WHERE NOT a_completer AND date_limite_conservation >= CURRENT_DATE
                         AND date_limite_conservation <= CURRENT_DATE + INTERVAL '30 days')::int AS bientot
      FROM documents WHERE detruit = false
    `)
    const { a_completer, a_detruire, bientot } = cptRows[0]

    // Compteur des demandes de destruction en attente — pertinent uniquement pour admin/super_admin.
    let demandes_destruction = 0
    if (req.user.role === 'super_admin' || req.user.role === 'admin') {
      const { rows: ddRows } = await pool.query(
        "SELECT COUNT(*)::int AS n FROM demandes_destruction WHERE statut = 'en_attente'"
      )
      demandes_destruction = ddRows[0].n
    }

    // Compteur des demandes de réinitialisation en attente — filtré selon le rôle :
    // super_admin voit tout ; admin ne voit que les demandes des comptes qu'il a créés.
    let demandes_reset = 0
    if (req.user.role === 'super_admin') {
      const { rows: drRows } = await pool.query(
        "SELECT COUNT(*)::int AS n FROM demandes_reset WHERE statut = 'en_attente'"
      )
      demandes_reset = drRows[0].n
    } else if (req.user.role === 'admin') {
      const { rows: drRows } = await pool.query(
        "SELECT COUNT(*)::int AS n FROM demandes_reset dr JOIN users u ON dr.user_id = u.id WHERE dr.statut = 'en_attente' AND u.created_by = $1",
        [req.user.id]
      )
      demandes_reset = drRows[0].n
    }

    res.json({ a_completer, a_detruire, bientot, demandes_destruction, demandes_reset })
  } catch (err) {
    console.error('[NOTIFICATIONS]', err)
    res.status(500).json({ error: 'Une erreur interne est survenue' })
  }
})

module.exports = router
