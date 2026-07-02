if (process.env.DATABASE_URL) {
  const { Pool } = require('pg')
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  pool._isMemory = false
  module.exports = pool
} else {
  console.log('⚠ Pas de DATABASE_URL — mode mémoire activé')
  const memDb = require('./memoryDb')
  module.exports = memDb
}
