const { Router } = require('express')
const pool = require('../db')
const { authenticate, requireRole } = require('../middleware/auth')
const { logAudit } = require('../audit')
const { calculerDateLimite } = require('../dateLimite')
const { handleDbConstraintError } = require('../dbError')

const router = Router()

function isUuid(v) {
  return typeof v === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v)
}

router.get('/numero/preview', authenticate, requireRole(['super_admin', 'admin', 'archiviste']), async (req, res) => {
  try {
    const { prefix } = req.query
    if (!prefix) return res.status(400).json({ error: 'Préfixe requis' })
    const { rows } = await pool.query('SELECT dernier_numero FROM compteurs_numerotation WHERE prefixe = $1', [prefix])
    const next = rows.length > 0 ? rows[0].dernier_numero + 1 : 1
    const numero = `${prefix}-${String(next).padStart(3, '0')}`
    res.json({ numero })
  } catch (err) {
    console.error('[CARTONS]', err)
    if (handleDbConstraintError(err, res)) return
    res.status(500).json({ error: 'Une erreur interne est survenue' })
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

    // — Un carton doit contenir au moins un document exploitable (ni description, ni catégorie, ni année → vide) —
    const docsList = Array.isArray(documents) ? documents : []
    const aAuMoinsUnDoc = docsList.some(d => d && (d.description || d.categorie_cnil_id || d.annee_document))
    if (!aAuMoinsUnDoc) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'Un carton doit contenir au moins un document' })
    }

    // — Validation des références et de l'année : 400 explicite au lieu d'un 500 de contrainte —
    if (carton.salle_id) {
      if (!isUuid(carton.salle_id)) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Salle introuvable' }) }
      const { rows } = await client.query('SELECT 1 FROM salles WHERE id = $1 AND deleted_at IS NULL', [carton.salle_id])
      if (rows.length === 0) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Salle introuvable' }) }
    }
    if (carton.etagere_id) {
      if (!isUuid(carton.etagere_id)) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Étagère introuvable' }) }
      const { rows } = await client.query('SELECT 1 FROM etageres WHERE id = $1 AND deleted_at IS NULL', [carton.etagere_id])
      if (rows.length === 0) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Étagère introuvable' }) }
    }
    for (const doc of (Array.isArray(documents) ? documents : [])) {
      if (doc.categorie_cnil_id) {
        if (!isUuid(doc.categorie_cnil_id)) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Catégorie CNIL introuvable' }) }
        const { rows } = await client.query('SELECT 1 FROM categories_cnil WHERE id = $1', [doc.categorie_cnil_id])
        if (rows.length === 0) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Catégorie CNIL introuvable' }) }
      }
      if (doc.annee_document !== undefined && doc.annee_document !== null && doc.annee_document !== '') {
        let annee = NaN
        if (typeof doc.annee_document === 'number') annee = doc.annee_document
        else if (typeof doc.annee_document === 'string' && /^\d+$/.test(doc.annee_document.trim())) annee = parseInt(doc.annee_document, 10)
        if (!Number.isInteger(annee) || annee < 1900 || annee > 2200) {
          await client.query('ROLLBACK'); return res.status(400).json({ error: 'Année invalide (attendu : 1900–2200)' })
        }
      }
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
    console.error('[CARTONS]', err)
    if (handleDbConstraintError(err, res)) return
    res.status(500).json({ error: 'Une erreur interne est survenue' })
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
    console.error('[CARTONS]', err)
    if (handleDbConstraintError(err, res)) return
    res.status(500).json({ error: 'Une erreur interne est survenue' })
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
    console.error('[CARTONS]', err)
    if (handleDbConstraintError(err, res)) return
    res.status(500).json({ error: 'Une erreur interne est survenue' })
  }
})

module.exports = router
