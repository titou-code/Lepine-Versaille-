const { Router } = require('express')
const pool = require('../db')
const { authenticate } = require('../middleware/auth')

const router = Router()

router.get('/compteurs', authenticate, async (req, res) => {
  try {
    const { rows: allDocs } = await pool.query(
      "SELECT date_limite_conservation, a_completer, detruit FROM v_documents_complets WHERE detruit = false"
    )

    const now = new Date()
    const seuil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    let a_completer = 0
    let a_detruire = 0
    let bientot = 0

    for (const doc of allDocs) {
      if (doc.a_completer) { a_completer++; continue }
      if (!doc.date_limite_conservation) continue
      const dl = new Date(doc.date_limite_conservation)
      if (dl < now) a_detruire++
      else if (dl <= seuil) bientot++
    }

    // Compteur des demandes de destruction en attente — pertinent uniquement pour admin/super_admin.
    let demandes_destruction = 0
    if (req.user.role === 'super_admin' || req.user.role === 'admin') {
      const { rows: ddRows } = await pool.query(
        "SELECT COUNT(*)::int AS n FROM demandes_destruction WHERE statut = 'en_attente'"
      )
      demandes_destruction = ddRows[0].n
    }

    res.json({ a_completer, a_detruire, bientot, demandes_destruction })
  } catch (err) {
    console.error('[NOTIFICATIONS]', err)
    res.status(500).json({ error: 'Une erreur interne est survenue' })
  }
})

module.exports = router
