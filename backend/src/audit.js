const pool = require('./db')

async function logAudit(userId, action, table, recordId, details = null) {
  try {
    await pool.query(
      'INSERT INTO audit_log (user_id, action, table_concernee, enregistrement_id, details) VALUES ($1,$2,$3,$4,$5)',
      [userId, action, table, recordId, details ? JSON.stringify(details) : null]
    )
  } catch (err) {
    console.error('[AUDIT] Erreur:', err.message)
  }
}

module.exports = { logAudit }
