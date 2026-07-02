const { Router } = require('express')
const pool = require('../db')
const { authenticate } = require('../middleware/auth')

const router = Router()

router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM categories_cnil ORDER BY section, categorie'
    )
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
