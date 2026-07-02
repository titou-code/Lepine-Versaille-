import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { CheckCircle, AlertCircle, X } from 'lucide-react'
import { cn } from '../../lib/utils'

const ToastContext = createContext(null)

function ToastItem({ id, message, type, onRemove }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(id), 3000)
    return () => clearTimeout(timer)
  }, [id, onRemove])

  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg min-w-[300px] animate-[slideIn_0.2s_ease]',
      type === 'success' && 'bg-success/10 border-success/30 text-success',
      type === 'error' && 'bg-danger/10 border-danger/30 text-danger',
    )}>
      {type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
      <span className="text-sm flex-1">{message}</span>
      <button onClick={() => onRemove(id)} className="cursor-pointer hover:opacity-70">
        <X size={14} />
      </button>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
  }, [])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map(t => (
          <ToastItem key={t.id} {...t} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}
