import { cn } from '../../lib/utils'

export default function Input({ label, error, className, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-text-secondary">{label}</label>}
      <input
        className={cn(
          'w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border text-text-primary',
          'placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent',
          'transition-colors text-sm',
          error && 'border-danger',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
