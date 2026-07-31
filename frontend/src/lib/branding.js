// Lecture du branding client déposé dans /branding (nom + logo).
// Aucune erreur console si les fichiers sont absents : le SPA renvoie index.html (200, text/html),
// on ne retient donc que les réponses du bon type.

const LOGO_CANDIDATES = [
  '/branding/client-logo.png',
]

// Nom du client depuis /branding/branding.json → string, ou null si absent/invalide.
export async function getClientName() {
  try {
    const res = await fetch('/branding/branding.json', { headers: { Accept: 'application/json' } })
    const type = res.headers.get('content-type') || ''
    if (!res.ok || !type.includes('json')) return null
    const data = await res.json()
    const name = data && typeof data.client_name === 'string' ? data.client_name.trim() : ''
    return name || null
  } catch {
    return null
  }
}

// Premier logo client trouvé → { url, type }, ou null.
export async function findClientLogo() {
  for (const url of LOGO_CANDIDATES) {
    try {
      const res = await fetch(url, { method: 'HEAD' })
      const type = res.headers.get('content-type') || ''
      if (res.ok && type.startsWith('image/')) return { url, type }
    } catch {
      // candidat indisponible → suivant
    }
  }
  return null
}
