export function computeStatut(dateLimite, seuilJours = 30) {
  if (!dateLimite) return null
  const now = new Date()
  const limite = new Date(dateLimite)
  const diffMs = limite - now
  const diffJours = diffMs / (1000 * 60 * 60 * 24)

  if (diffJours < 0) return 'a_detruire'
  if (diffJours <= seuilJours) return 'bientot'
  return 'ok'
}

export function computeDateReference(typeDateRef, anneeDocument) {
  if (typeDateRef === 'Date du document' && anneeDocument) {
    return `${anneeDocument}-12-31`
  }
  return null
}

export function computeDateLimite(dateReference, dureeMois) {
  if (!dateReference || !dureeMois) return null
  const date = new Date(dateReference)
  date.setMonth(date.getMonth() + dureeMois)
  return date.toISOString().split('T')[0]
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR')
}

export function getPrefixFromSalle(nomSalle) {
  if (!nomSalle) return ''
  const lower = nomSalle.toLowerCase()
  if (lower.includes('sous-sol') || lower.includes('ss')) return 'SS'
  if (lower.includes('1er') || lower.includes('r1') || lower.includes('premier')) return 'R1'
  if (lower.includes('2e') || lower.includes('r2') || lower.includes('deuxième')) return 'R2'
  if (lower.includes('rdc') || lower.includes('rez')) return 'RDC'
  return nomSalle.substring(0, 3).toUpperCase()
}

export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

export const THEMES = [
  'RH', 'Comptabilité', 'Médical', 'SSIAD', 'CCAS',
  'ESA', 'EHPAD', 'Juridique', 'Sécurité', 'Autre'
]

export const METHODES_DESTRUCTION = [
  'Broyage', 'Déchetterie', 'Confidentiel', 'Autre'
]
