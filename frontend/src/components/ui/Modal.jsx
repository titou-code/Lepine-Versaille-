import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'
import Button from './Button'

// Largeur paramétrable. `md` par défaut pour élargir l'existant sans casser les petites modales.
const SIZES = { sm: 'max-w-lg', md: 'max-w-2xl', lg: 'max-w-4xl' }

export default function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      {/* Colonne flex bornée à 90vh : en-tête et pied fixes, seul le corps défile. */}
      <div className={cn('relative bg-bg-card border border-border rounded-xl w-full flex flex-col max-h-[90vh]', SIZES[size] || SIZES.md)}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-border flex-shrink-0">
          <h3 className="text-lg font-semibold">{title}</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={18} />
          </Button>
        </div>
        <div className="px-6 py-4 flex-1 min-h-0 overflow-y-auto">{children}</div>
        {footer && (
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-border flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
