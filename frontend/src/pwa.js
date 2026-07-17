import { getClientName, findClientLogo } from './lib/branding'

const THEME_COLOR = '#d97b2a'
const BACKGROUND_COLOR = '#ffffff'

// Personnalise le titre et le manifest PWA à partir du branding client déposé dans /branding.
// À défaut de branding, on garde le titre et le manifest statiques génériques (« Archives »).
export async function applyBranding() {
  const [clientName, logo] = await Promise.all([getClientName(), findClientLogo()])

  if (clientName) {
    document.title = `Archives — ${clientName}`
  }

  // Manifest dynamique uniquement si un branding est présent.
  if (clientName || logo) {
    const icons = []
    if (logo) icons.push({ src: logo.url, sizes: '512x512', type: logo.type, purpose: 'any' })
    icons.push({ src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' })
    icons.push({ src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' })

    const manifest = {
      name: clientName ? `Archives — ${clientName}` : 'Archives',
      short_name: clientName || 'Archives',
      description: 'Gestion des archives physiques',
      display: 'standalone',
      start_url: '/',
      scope: '/',
      theme_color: THEME_COLOR,
      background_color: BACKGROUND_COLOR,
      icons,
    }

    const blob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' })
    const blobUrl = URL.createObjectURL(blob)
    let link = document.querySelector('link[rel="manifest"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'manifest'
      document.head.appendChild(link)
    }
    link.href = blobUrl
  }
}
