import { cn } from '../../lib/utils'

const variants = {
  primary: 'bg-accent text-white hover:bg-accent/80',
  danger: 'bg-danger text-white hover:bg-danger/80',
  success: 'bg-success text-white hover:bg-success/80',
  ghost: 'bg-transparent text-text-secondary hover:bg-bg-hover hover:text-text-primary',
  outline: 'border border-border text-text-secondary hover:bg-bg-hover hover:text-text-primary',
}

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export default function Button({ children, variant = 'primary', size = 'md', className, disabled, ...props }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors cursor-pointer',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
