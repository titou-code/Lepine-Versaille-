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

    res.json({ a_completer, a_detruire, bientot })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
