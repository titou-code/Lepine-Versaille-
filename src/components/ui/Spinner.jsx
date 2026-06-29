import { cn } from '../../lib/utils'

export default function Spinner({ size = 'md', className }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }
  return (
    <div className={cn('animate-spin rounded-full border-2 border-border border-t-accent', sizes[size], className)} />
  )
}
