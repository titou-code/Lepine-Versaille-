import { cn } from '../../lib/utils'

export default function Card({ children, className, ...props }) {
  return (
    <div className={cn('bg-bg-card border border-border rounded-xl p-6', className)} {...props}>
      {children}
    </div>
  )
}
