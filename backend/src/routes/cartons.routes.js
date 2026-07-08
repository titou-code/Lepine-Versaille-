const { Router } = require('express')
const pool = require('../db')
const { authenticate, requireRole } = require('../middleware/auth')
const { logAudit } = require('../audit')
const { calculerDateLimite } = require('../dateLimite')

const router = Router()

router.get('/numero/preview', authenticate, requireRole(['super_admin', 'admin', 'archiviste']), async (req, res) => {
  try {
    const { prefix } = req.query
    if (!prefix) return res.status(400).json({ error: 'Préfixe requis' })
    const { rows } = await pool.query('SELECT dernier_numero FROM compteurs_numerotation WHERE prefixe = $1', [prefix])
    const next = rows.length > 0 ? rows[0].dernier_numero + 1 : 1
    const numero = `${prefix}-${String(next).padStart(3, '0')}`
    res.json({ numero })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/', authenticate, requireRole(['super_admin', 'admin', 'archiviste']), async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { carton, documents } = req.body

    if (!carton || !carton.prefix) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'Préfixe du carton requis' })
    }

    const { rows: numRows } = await client.query('SELECT generate_numero_carton($1) AS numero', [carton.prefix])
    const numero = numRows[0].numero

    const { rows: cartonRows } = await client.query(
      'INSERT INTO cartons (numero, salle_id, etagere_id, emplacement, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [numero, carton.salle_id, carton.etagere_id || null, carton.emplacement || null, req.user.id]
    )
    const newCarton = cartonRows[0]
    await logAudit(req.user.id, 'creation', 'cartons', newCarton.id, { numero })

    if (documents && documents.length > 0) {
      for (const doc of documents) {
        let dateLimite = doc.date_limite_conservation || null

        if (doc.categorie_cnil_id) {
          const { rows: catRows } = await client.query('SELECT * FROM categories_cnil WHERE id = $1', [doc.categorie_cnil_id])
          if (catRows.length > 0) {
            const calculated = calculerDateLimite(doc, catRows[0])
            if (calculated) {
              dateLimite = calculated
            }
          }
        }

        const aCompleter = (dateLimite === null || dateLimite === undefined)

        const { rows: docRows } = await client.query(
          `INSERT INTO documents (carton_id, theme, categorie_cnil_id, description, annee_document, type_date, date_reference, date_limite_conservation, obligatoire, fondement_juridique, date_precise, date_evenement, duree_mois_saisie, procedure_close, a_completer, created_by, session_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING id`,
          [newCarton.id, doc.theme, doc.categorie_cnil_id, doc.description || null,
           doc.annee_document || null, doc.type_date || null, doc.date_reference || null,
           dateLimite, doc.obligatoire || false, doc.fondement_juridique || null,
           doc.date_precise || null, doc.date_evenement || null, doc.duree_mois_saisie || null,
           doc.procedure_close || null, aCompleter, req.user.id, req.user.session_id || null]
        )
        await logAudit(req.user.id, 'creation', 'documents', docRows[0].id, { theme: doc.theme })
      }
    }

    await client.query('COMMIT')
    res.status(201).json(newCarton)
  } catch (err) {
    await client.query('ROLLBACK')
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
})

router.post('/:id/documents', authenticate, requireRole(['super_admin', 'admin', 'archiviste']), async (req, res) => {
  try {
    const { id } = req.params
    const doc = req.body

    if (!doc.theme || !doc.categorie_cnil_id) {
      return res.status(400).json({ error: 'Service et catégorie requis' })
    }

    const { rows: catRows } = await pool.query('SELECT * FROM categories_cnil WHERE id = $1', [doc.categorie_cnil_id])
    if (catRows.length === 0) return res.status(400).json({ error: 'Catégorie introuvable' })
    const cat = catRows[0]

    let dateLimite = null
    const calculated = calculerDateLimite(doc, cat)
    if (calculated) {
      dateLimite = calculated
    }
    const aCompleter = (dateLimite === null || dateLimite === undefined)

    const { rows: docRows } = await pool.query(
      `INSERT INTO documents (carton_id, theme, categorie_cnil_id, description, annee_document, type_date, date_reference, date_limite_conservation, obligatoire, fondement_juridique, date_precise, date_evenement, duree_mois_saisie, procedure_close, a_completer, created_by, session_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING id`,
      [id, doc.theme, doc.categorie_cnil_id, doc.description || null,
       doc.annee_document || null, doc.type_date || null, doc.date_reference || null,
       dateLimite, cat.obligatoire || false, cat.fondement_juridique || null,
       doc.date_precise || null, doc.date_evenement || null, doc.duree_mois_saisie || null,
       doc.procedure_close || null, aCompleter, req.user.id, req.user.session_id || null]
    )
    await logAudit(req.user.id, 'creation', 'documents', docRows[0].id, { theme: doc.theme, carton_id: id })
    res.status(201).json({ id: docRows[0].id, date_limite_conservation: dateLimite, a_completer: aCompleter })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/:id/dernier-document', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    const { rows } = await pool.query(
      'SELECT * FROM documents WHERE carton_id = $1 AND detruit = false ORDER BY created_at DESC LIMIT 1',
      [id]
    )
    res.json(rows[0] || null)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
