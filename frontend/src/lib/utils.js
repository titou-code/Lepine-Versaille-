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

export function isValidYear(y) {
  if (y === null || y === undefined || y === '') return false
  const n = Number(y)
  return Number.isInteger(n) && n >= 1900 && n <= 2100
}

export function computeDateReference(typeDateRef, anneeDocument) {
  if (typeDateRef === 'Date du document' && isValidYear(anneeDocument)) {
    return `${anneeDocument}-01-01`
  }
  return null
}

export function computeDateLimite(dateReference, dureeMois) {
  if (!dateReference || !dureeMois) return null
  const date = new Date(dateReference)
  if (isNaN(date.getTime())) return null
  date.setMonth(date.getMonth() + dureeMois)
  if (isNaN(date.getTime())) return null
  return date.toISOString().split('T')[0]
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('fr-FR')
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
  'RH', 'Comptabilité', 'Médical', 'Juridique', 'Sécurité', 'Administratif', 'Social', 'Autre'
]

// Correspondance service métier → sections CNIL (le champ `section` des catégories en base).
// `null` = toutes les sections (filet de sécurité, utilisé par « Autre »).
export const SERVICE_SECTIONS = {
  'RH':            ['Recrutement', 'Gestion administrative', 'Rémunérations', 'Accidents du travail', 'Relations collectives', 'Contentieux & Alertes'],
  'Comptabilité':  ['Rémunérations', 'Véhicules'],
  'Médical':       ['Santé — Dossiers patients'],
  'Juridique':     ['Contentieux & Alertes', 'Relations collectives'],
  'Sécurité':      ['Sécurité'],
  'Administratif': ['Gestion administrative', 'Santé — Dossiers patients', 'Véhicules'],
  'Social':        ['Santé — Dossiers patients'],
  'Autre':         null,
}

export function categoriesForService(service, allCategories) {
  const sections = SERVICE_SECTIONS[service]
  if (!sections) return allCategories
  return allCategories.filter(c => sections.includes(c.section))
}

export const METHODES_DESTRUCTION = [
  'Broyage', 'Déchetterie', 'Confidentiel', 'Autre'
]

export const PASSWORD_RULE = 'Au moins 8 caractères, dont un chiffre et un caractère spécial'
