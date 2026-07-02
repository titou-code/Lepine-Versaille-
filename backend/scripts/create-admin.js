const bcrypt = require('bcryptjs')
const { Pool } = require('pg')

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  const email = process.argv[2]
  const password = process.argv[3]
  const nom = process.argv[4] || 'Admin'
  const prenom = process.argv[5] || 'Super'

  if (!email || !password) {
    console.error('Usage: node scripts/create-admin.js <email> <password> [nom] [prenom]')
    process.exit(1)
  }

  const hash = await bcrypt.hash(password, 10)
  try {
    const { rows } = await pool.query(
      'INSERT INTO users (email, password_hash, nom, prenom, role) VALUES ($1,$2,$3,$4,$5) RETURNING id, email, role',
      [email, hash, nom, prenom, 'admin']
    )
    console.log('Admin créé:', rows[0])
  } catch (err) {
    if (err.code === '23505') console.error('Cet email existe déjà.')
    else console.error('Erreur:', err.message)
  }
  await pool.end()
}

main()
