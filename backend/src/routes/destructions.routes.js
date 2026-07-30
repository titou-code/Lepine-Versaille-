const { Router } = require('express')
const pool = require('../db')
const { authenticate, requireRole } = require('../middleware/auth')
const { logAudit } = require('../audit')
const { handleDbConstraintError } = require('../dbError')

const router = Router()

// POST /destructions
//  - Archiviste : crée une DEMANDE de destruction en attente (le document n'est PAS détruit).
//  - Admin / super_admin : destruction directe immédiate (comportement historique conservé).
router.post('/', authenticate, requireRole(['super_admin', 'admin', 'archiviste']), async (req, res) => {
  try {
    const { document_id, date_destruction, methode, notes, motif } = req.body
    const isAdmin = req.user.role === 'super_admin' || req.user.role === 'admin'

    if (!isAdmin) {
      // Archiviste : proposition. Empêcher les doublons (une seule demande en attente par document).
      const { rows: existing } = await pool.query(
        "SELECT id FROM demandes_destruction WHERE document_id = $1 AND statut = 'en_attente'",
        [document_id]
      )
      if (existing.length > 0) {
        return res.status(409).json({ error: 'Une demande de destruction est déjà en attente pour ce document' })
      }
      const { rows } = await pool.query(
        'INSERT INTO demandes_destruction (document_id, demande_par, motif) VALUES ($1,$2,$3) RETURNING *',
        [document_id, req.user.id, motif || notes || null]
      )
      await logAudit(req.user.id, 'proposition_destruction', 'demandes_destruction', rows[0].id, { document_id })
      return res.status(201).json(rows[0])
    }

    // Admin / super_admin : destruction directe.
    const { rows } = await pool.query(
      'INSERT INTO destructions (document_id, date_destruction, effectue_par, methode, notes) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [document_id, date_destruction, req.user.id, methode, notes || null]
    )
    await pool.query('UPDATE documents SET detruit = true WHERE id = $1', [document_id])
    await logAudit(req.user.id, 'destruction', 'documents', document_id, { methode, notes })
    res.status(201).json(rows[0])
  } catch (err) {
    console.error('[DESTRUCTIONS]', err)
    if (handleDbConstraintError(err, res)) return
    res.status(500).json({ error: 'Une erreur interne est survenue' })
  }
})

// GET /destructions/demandes — demandes en attente (admin, super_admin)
router.get('/demandes', authenticate, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT dd.id, dd.document_id, dd.motif, dd.date_demande,
              u.nom AS demandeur_nom, u.prenom AS demandeur_prenom,
              v.carton_numero, v.theme, v.categorie, v.description,
              v.salle_nom, v.etagere_nom, v.emplacement,
              v.obligatoire, v.annee_document, v.date_limite_conservation
         FROM demandes_destruction dd
         LEFT JOIN users u ON dd.demande_par = u.id
         LEFT JOIN v_documents_complets v ON dd.document_id = v.id
        WHERE dd.statut = 'en_attente'
        ORDER BY dd.date_demande DESC`
    )
    res.json(rows)
  } catch (err) {
    console.error('[DESTRUCTIONS]', err)
    if (handleDbConstraintError(err, res)) return
    res.status(500).json({ error: 'Une erreur interne est survenue' })
  }
})

// POST /destructions/demandes/:id/valider — valide la demande PUIS détruit réellement (admin, super_admin)
router.post('/demandes/:id/valider', authenticate, requireRole(['super_admin', 'admin']), async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { id } = req.params
    const { date_destruction, methode, notes } = req.body

    const { rows: dRows } = await client.query(
      "SELECT * FROM demandes_destruction WHERE id = $1 AND statut = 'en_attente' FOR UPDATE",
      [id]
    )
    if (dRows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Demande introuvable ou déjà traitée' })
    }
    const demande = dRows[0]

    await client.query(
      "UPDATE demandes_destruction SET statut = 'validee', valide_par = $1, date_traitement = now() WHERE id = $2",
      [req.user.id, id]
    )
    await client.query(
      'INSERT INTO destructions (document_id, date_destruction, effectue_par, methode, notes) VALUES ($1,$2,$3,$4,$5)',
      [demande.document_id, date_destruction || new Date().toISOString().split('T')[0], req.user.id, methode || null, notes || null]
    )
    await client.query('UPDATE documents SET detruit = true WHERE id = $1', [demande.document_id])

    await client.query('COMMIT')
    await logAudit(req.user.id, 'validation_destruction', 'demandes_destruction', id, { document_id: demande.document_id })
    res.json({ success: true })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[DESTRUCTIONS]', err)
    if (handleDbConstraintError(err, res)) return
    res.status(500).json({ error: 'Une erreur interne est survenue' })
  } finally {
    client.release()
  }
})

// POST /destructions/demandes/:id/refuser — refuse la demande, le document n'est pas détruit (admin, super_admin)
router.post('/demandes/:id/refuser', authenticate, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { id } = req.params
    const { rows } = await pool.query(
      "UPDATE demandes_destruction SET statut = 'refusee', valide_par = $1, date_traitement = now() WHERE id = $2 AND statut = 'en_attente' RETURNING document_id",
      [req.user.id, id]
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Demande introuvable ou déjà traitée' })
    await logAudit(req.user.id, 'refus_destruction', 'demandes_destruction', id, { document_id: rows[0].document_id })
    res.json({ success: true })
  } catch (err) {
    console.error('[DESTRUCTIONS]', err)
    if (handleDbConstraintError(err, res)) return
    res.status(500).json({ error: 'Une erreur interne est survenue' })
  }
})

module.exports = router
