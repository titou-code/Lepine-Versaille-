if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL manquant — arrêt du backend')
  process.exit(1)
}

const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
module.exports = pool
