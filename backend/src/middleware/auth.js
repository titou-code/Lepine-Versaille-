const jwt = require('jsonwebtoken')
const crypto = require('crypto')

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'
const ACCESS_EXPIRES = '2h'
const REFRESH_DAYS = 7

const ROLE_HIERARCHY = { super_admin: 4, admin: 3, archiviste: 2, consultation: 1 }

function authenticate(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' })
  }
  try {
    const token = header.split(' ')[1]
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = { id: decoded.id, role: decoded.role, session_id: decoded.session_id }
    next()
  } catch {
    return res.status(401).json({ error: 'Token invalide' })
  }
}

function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès interdit' })
    }
    next()
  }
}

function peutGererUtilisateur(actingUser, targetUser) {
  if (actingUser.role === 'super_admin') return true
  if (actingUser.role === 'admin') {
    return ROLE_HIERARCHY[targetUser.role] < ROLE_HIERARCHY['admin']
  }
  return false
}

function peutModifierDocument(user, document) {
  if (user.role === 'super_admin' || user.role === 'admin') return true
  if (user.role === 'archiviste') {
    return document.created_by === user.id && document.session_id === user.session_id
  }
  return false
}

function signAccessToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, session_id: user.session_id || null },
    JWT_SECRET,
    { expiresIn: ACCESS_EXPIRES }
  )
}

function generateRefreshToken() {
  return crypto.randomBytes(40).toString('hex')
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function refreshExpiry() {
  return new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000)
}

module.exports = { authenticate, requireRole, signAccessToken, generateRefreshToken, hashToken, refreshExpiry, JWT_SECRET, peutGererUtilisateur, peutModifierDocument, ROLE_HIERARCHY }
