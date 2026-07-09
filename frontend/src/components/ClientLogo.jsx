import { Archive } from 'lucide-react'
import { useClientLogo } from '../hooks/useClientLogo'

// Affiche le logo client s'il est disponible, sinon l'icône boîte par défaut.
export default function ClientLogo({ className = '', iconSize = 24 }) {
  const logoUrl = useClientLogo()
  if (logoUrl) return <img src={logoUrl} alt="Logo" className={className} />
  return <Archive className="text-accent" size={iconSize} />
}
