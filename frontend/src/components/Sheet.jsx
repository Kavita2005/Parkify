import { useEffect } from 'react'
import { X } from 'lucide-react'
export default function Sheet({ onClose, label, wide = false, children }) {
  useEffect(() => { const k = e => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 md:items-center md:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={label} onClick={e => e.stopPropagation()}
        className={`pop relative flex max-h-[92dvh] w-full ${wide ? 'max-w-2xl' : 'max-w-md'} flex-col gap-3 overflow-auto rounded-t-3xl border border-line bg-surface p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:rounded-3xl md:pb-6`}>
        <button className="btn btn-ghost absolute right-3 top-3 h-9 w-9 px-0" aria-label="Close" onClick={onClose}><X size={18} /></button>
        {children}
      </div>
    </div>
  )
}
