import { cn } from '../../lib/utils'

const variants = {
  ok: 'bg-success/15 text-success border-success/30',
  bientot: 'bg-warning/15 text-warning border-warning/30',
  a_detruire: 'bg-danger/15 text-danger border-danger/30',
  obligatoire: 'bg-danger/15 text-danger border-danger/30',
  recommande: 'bg-success/15 text-success border-success/30',
  default: 'bg-bg-hover text-text-secondary border-border',
}

const labels = {
  ok: 'OK',
  bientot: 'Bientôt',
  a_detruire: 'À détruire',
  obligatoire: 'Obligatoire',
  recommande: 'Recommandé',
}

export default function Badge({ variant = 'default', children, className }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border whitespace-nowrap',
      variants[variant] || variants.default,
      className
    )}>
      {children || labels[variant] || variant}
    </span>
  )
}
