const { Router } = require('express')
const pool = require('../db')
const { authenticate, requireRole, peutModifierDocument } = require('../middleware/auth')
const { logAudit } = require('../audit')
const { calculerDateLimite } = require('../dateLimite')

const router = Router()

router.get('/', authenticate, async (req, res) => {
  try {
    const conditions = ['a_completer = false', 'detruit = false']
    const values = []
    let idx = 1

    if (req.query.salle_id) { conditions.push(`salle_id = $${idx++}`); values.push(req.query.salle_id) }
    if (req.query.theme) { conditions.push(`theme = $${idx++}`); values.push(req.query.theme) }
    if (req.query.annee) { conditions.push(`annee_document = $${idx++}`); values.push(parseInt(req.query.annee)) }
    if (req.query.etagere_id) { conditions.push(`etagere_id = $${idx++}`); values.push(req.query.etagere_id) }
    if (req.query.carton_numero) { conditions.push(`carton_numero ILIKE $${idx++}`); values.push(`%${req.query.carton_numero}%`) }
    if (req.query.search) {
      conditions.push(`(description ILIKE $${idx} OR categorie ILIKE $${idx} OR carton_numero ILIKE $${idx})`)
      values.push(`%${req.query.search}%`)
      idx++
    }
    if (req.query.obligatoire === 'true') conditions.push('obligatoire = true')
    else if (req.query.obligatoire === 'false') conditions.push('obligatoire = false')
    if (req.query.statut === 'a_detruire') conditions.push('date_limite_conservation IS NOT NULL AND date_limite_conservation < CURRENT_DATE')
    else if (req.query.statut === 'bientot') conditions.push("date_limite_conservation IS NOT NULL AND date_limite_conservation >= CURRENT_DATE AND date_limite_conservation <= CURRENT_DATE + INTERVAL '30 days'")
    else if (req.query.statut === 'ok') conditions.push("date_limite_conservation IS NOT NULL AND date_limite_conservation > CURRENT_DATE + INTERVAL '30 days'")

    const where = 'WHERE ' + conditions.join(' AND ')

    const SORT_COLUMNS = {
      carton_numero: 'carton_numero', salle_nom: 'salle_nom', etagere_nom: 'etagere_nom',
      theme: 'theme', categorie: 'categorie', description: 'description',
      annee_document: 'annee_document', date_limite_conservation: 'date_limite_conservation',
      created_at: 'created_at',
    }
    const sortCol = SORT_COLUMNS[req.query.sort] || 'created_at'
    const sortDir = req.query.dir === 'asc' ? 'ASC' : 'DESC'

    const { rows: countRows } = await pool.query(`SELECT COUNT(*)::int AS total FROM v_documents_complets ${where}`, values)
    const total = countRows[0].total

    let dataSql = `SELECT * FROM v_documents_complets ${where} ORDER BY ${sortCol} ${sortDir} NULLS LAST`
    let page = 1
    let pageSize = total
    if (req.query.all !== 'true') {
      page = Math.max(1, parseInt(req.query.page) || 1)
      pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize) || 50))
      dataSql += ` LIMIT $${idx++} OFFSET $${idx++}`
      values.push(pageSize, (page - 1) * pageSize)
    }

    const { rows } = await pool.query(dataSql, values)
    res.json({ data: rows, total, page, pageSize })
  } catch (err) {
    console.error('[DOCUMENTS]', err)
    res.status(500).json({ error: 'Une erreur interne est survenue' })
  }
})

router.get('/a-completer', authenticate, requireRole(['super_admin', 'admin', 'archiviste']), async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM v_documents_complets WHERE a_completer = true ORDER BY created_at DESC'
    )
    res.json(rows)
  } catch (err) {
    console.error('[DOCUMENTS]', err)
    res.status(500).json({ error: 'Une erreur interne est survenue' })
  }
})

router.patch('/:id/completer', authenticate, requireRole(['super_admin', 'admin', 'archiviste']), async (req, res) => {
  try {
    const { id } = req.params
    const { date_evenement, duree_mois_saisie, procedure_close, date_precise } = req.body

    const { rows: catRows } = await pool.query(
      'SELECT c.* FROM documents d JOIN categories_cnil c ON d.categorie_cnil_id = c.id WHERE d.id = $1', [id]
    )
    if (catRows.length === 0) return res.status(404).json({ error: 'Document introuvable' })

    const { rows: docRows } = await pool.query('SELECT * FROM documents WHERE id = $1', [id])
    const doc = { ...docRows[0], date_evenement, duree_mois_saisie, procedure_close, date_precise }
    const dateLimite = calculerDateLimite(doc, catRows[0])
    const aCompleter = (dateLimite === null || dateLimite === undefined)

    await pool.query(
      `UPDATE documents SET date_evenement = $1, duree_mois_saisie = $2, procedure_close = $3, date_precise = $4,
       date_limite_conservation = $5, a_completer = $6 WHERE id = $7`,
      [date_evenement || null, duree_mois_saisie || null, procedure_close ?? null, date_precise || null,
       dateLimite, aCompleter, id]
    )
    await logAudit(req.user.id, 'modification', 'documents', id, { action: 'completion' })
    res.json({ success: true, date_limite_conservation: dateLimite })
  } catch (err) {
    console.error('[DOCUMENTS]', err)
    res.status(500).json({ error: 'Une erreur interne est survenue' })
  }
})

router.put('/:id', authenticate, requireRole(['super_admin', 'admin', 'archiviste']), async (req, res) => {
  try {
    const { id } = req.params
    const {
      theme, categorie_cnil_id, description, annee_document,
      date_precise, date_evenement, duree_mois_saisie, procedure_close,
      carton_id, carton_salle_id, carton_etagere_id, carton_emplacement,
      update_carton_location
    } = req.body

    const { rows: oldRows } = await pool.query('SELECT * FROM documents WHERE id = $1', [id])
    if (oldRows.length === 0) return res.status(404).json({ error: 'Document introuvable' })
    const old = oldRows[0]

    if (!peutModifierDocument(req.user, old)) {
      return res.status(403).json({ error: 'Vous ne pouvez pas modifier ce document' })
    }

    const catId = categorie_cnil_id || old.categorie_cnil_id
    const { rows: catRows } = await pool.query('SELECT * FROM categories_cnil WHERE id = $1', [catId])
    const cat = catRows[0]

    const newAnnee = annee_document !== undefined ? annee_document : old.annee_document
    let dateRef = old.date_reference
    if (cat) {
      if (cat.type_date_reference === 'Date du document' && newAnnee) {
        dateRef = `${newAnnee}-12-31`
      }
    }

    const updatedDoc = {
      ...old,
      theme: theme !== undefined ? theme : old.theme,
      categorie_cnil_id: catId,
      description: description !== undefined ? description : old.description,
      annee_document: newAnnee,
      date_precise: date_precise !== undefined ? (date_precise || null) : old.date_precise,
      date_evenement: date_evenement !== undefined ? (date_evenement || null) : old.date_evenement,
      duree_mois_saisie: duree_mois_saisie !== undefined ? (duree_mois_saisie || null) : old.duree_mois_saisie,
      procedure_close: procedure_close !== undefined ? procedure_close : old.procedure_close,
      date_reference: dateRef,
    }

    let dateLimite = null
    if (cat) {
      dateLimite = calculerDateLimite(updatedDoc, cat)
    }
    const aCompleter = (dateLimite === null || dateLimite === undefined)

    await pool.query(
      `UPDATE documents SET theme=$1, categorie_cnil_id=$2, description=$3, annee_document=$4,
       date_precise=$5, date_evenement=$6, duree_mois_saisie=$7, procedure_close=$8,
       type_date=$9, date_reference=$10, date_limite_conservation=$11,
       obligatoire=$12, fondement_juridique=$13, a_completer=$14,
       updated_at=NOW() WHERE id=$15`,
      [
        updatedDoc.theme, catId, updatedDoc.description, updatedDoc.annee_document,
        updatedDoc.date_precise, updatedDoc.date_evenement, updatedDoc.duree_mois_saisie,
        updatedDoc.procedure_close,
        cat?.type_date_reference || old.type_date, dateRef, dateLimite,
        cat?.obligatoire ?? old.obligatoire, cat?.fondement_juridique || old.fondement_juridique,
        aCompleter, id
      ]
    )

    if (carton_id && carton_id !== old.carton_id) {
      await pool.query('UPDATE documents SET carton_id = $1 WHERE id = $2', [carton_id, id])
    }

    if (update_carton_location && old.carton_id) {
      const cartonUpdates = []
      const cartonValues = []
      let ci = 1
      if (carton_salle_id !== undefined) { cartonUpdates.push(`salle_id = $${ci++}`); cartonValues.push(carton_salle_id) }
      if (carton_etagere_id !== undefined) { cartonUpdates.push(`etagere_id = $${ci++}`); cartonValues.push(carton_etagere_id || null) }
      if (carton_emplacement !== undefined) { cartonUpdates.push(`emplacement = $${ci++}`); cartonValues.push(carton_emplacement || null) }
      if (cartonUpdates.length > 0) {
        cartonValues.push(old.carton_id)
        await pool.query(`UPDATE cartons SET ${cartonUpdates.join(', ')} WHERE id = $${ci}`, cartonValues)
      }
    }

    const diff = {}
    const fields = ['theme', 'categorie_cnil_id', 'description', 'annee_document', 'date_precise', 'date_evenement', 'duree_mois_saisie', 'procedure_close']
    for (const f of fields) {
      const oldVal = old[f], newVal = updatedDoc[f]
      if (String(oldVal ?? '') !== String(newVal ?? '')) diff[f] = { ancien: oldVal, nouveau: newVal }
    }
    if (dateLimite !== old.date_limite_conservation) diff.date_limite_conservation = { ancien: old.date_limite_conservation, nouveau: dateLimite }
    if (carton_id && carton_id !== old.carton_id) diff.carton_id = { ancien: old.carton_id, nouveau: carton_id }

    await logAudit(req.user.id, 'modification', 'documents', id, diff)
    res.json({ success: true, date_limite_conservation: dateLimite, a_completer: aCompleter })
  } catch (err) {
    console.error('[DOCUMENTS]', err)
    res.status(500).json({ error: 'Une erreur interne est survenue' })
  }
})

router.get('/recherche-intelligente', authenticate, async (req, res) => {
  const { q, annee } = req.query
  if (!q || q.trim().length < 2) return res.json([])
  const term = q.trim()
  const anneeInt = /^\d+$/.test(String(annee || '')) ? parseInt(annee) : null

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    // Seuil de similarité de mot ~0.3 (équivalent au comportement JS précédent), le temps de la transaction
    await client.query('SET LOCAL pg_trgm.word_similarity_threshold = 0.3')

    const { rows } = await client.query(
      `SELECT v.*
       FROM v_documents_complets v
       JOIN documents d ON d.id = v.id
       WHERE v.detruit = false
         AND ($2::int IS NULL OR v.annee_document = $2::int)
         AND (
              d.search_text %> f_unaccent(lower($1))
           OR f_unaccent(coalesce(v.carton_numero, '')) %> f_unaccent(lower($1))
           OR f_unaccent(coalesce(v.categorie, '')) %> f_unaccent(lower($1))
           OR f_unaccent(coalesce(v.salle_nom, '')) ILIKE '%' || f_unaccent(lower($1)) || '%'
           OR f_unaccent(coalesce(v.etagere_nom, '')) ILIKE '%' || f_unaccent(lower($1)) || '%'
           OR f_unaccent(coalesce(v.emplacement, '')) ILIKE '%' || f_unaccent(lower($1)) || '%'
           OR f_unaccent(coalesce(v.categorie_section, '')) ILIKE '%' || f_unaccent(lower($1)) || '%'
         )
       ORDER BY GREATEST(
              word_similarity(f_unaccent(lower($1)), coalesce(d.search_text, '')),
              word_similarity(f_unaccent(lower($1)), f_unaccent(coalesce(v.carton_numero, ''))),
              word_similarity(f_unaccent(lower($1)), f_unaccent(coalesce(v.categorie, ''))),
              word_similarity(f_unaccent(lower($1)), f_unaccent(coalesce(v.salle_nom, ''))),
              word_similarity(f_unaccent(lower($1)), f_unaccent(coalesce(v.etagere_nom, ''))),
              word_similarity(f_unaccent(lower($1)), f_unaccent(coalesce(v.emplacement, ''))),
              word_similarity(f_unaccent(lower($1)), f_unaccent(coalesce(v.categorie_section, '')))
            ) DESC
       LIMIT 50`,
      [term, anneeInt]
    )

    await client.query('COMMIT')
    res.json(rows)
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[DOCUMENTS]', err)
    res.status(500).json({ error: 'Une erreur interne est survenue' })
  } finally {
    client.release()
  }
})

module.exports = router
