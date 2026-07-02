import { cn } from '../../lib/utils'

export default function Select({ label, options = [], placeholder, error, className, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-text-secondary">{label}</label>}
      <select
        className={cn(
          'w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border text-text-primary',
          'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent',
          'transition-colors text-sm cursor-pointer',
          error && 'border-danger',
          className
        )}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
