import { useState, useEffect } from 'react'

// Recherche du logo client dans l'ordre. Premier trouvé = affiché.
const CANDIDATES = [
  '/branding/Lepine-logo.png',
  '/branding/Lepine-logo.jpg',
  '/branding/client-logo.png',
]

export function useClientLogo() {
  const [logoUrl, setLogoUrl] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function findLogo() {
      for (const url of CANDIDATES) {
        try {
          const res = await fetch(url, { method: 'HEAD' })
          const type = res.headers.get('content-type') || ''
          // Le SPA renvoie index.html (200, text/html) pour un fichier absent :
          // on n'accepte que si la réponse est bien une image.
          if (res.ok && type.startsWith('image/')) {
            if (!cancelled) setLogoUrl(url)
            return
          }
        } catch {
          // réseau indisponible pour ce candidat — on passe au suivant
        }
      }
    }
    findLogo()
    return () => { cancelled = true }
  }, [])

  return logoUrl
}
