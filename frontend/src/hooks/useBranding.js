import { useState, useEffect } from 'react'
import { getClientName, findClientLogo } from '../lib/branding'

// Retourne le branding client courant : { clientName, logoUrl } (null si absent).
export function useBranding() {
  const [clientName, setClientName] = useState(null)
  const [logoUrl, setLogoUrl] = useState(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([getClientName(), findClientLogo()]).then(([name, logo]) => {
      if (cancelled) return
      setClientName(name)
      setLogoUrl(logo ? logo.url : null)
    })
    return () => { cancelled = true }
  }, [])

  return { clientName, logoUrl }
}
