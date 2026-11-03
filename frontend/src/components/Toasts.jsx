import { Bell, CheckCircle2, X } from 'lucide-react'
export default function Toasts({ items, dismiss }) {
  return (
    <div className="pointer-events-none fixed right-3 top-20 z-[60] flex w-[min(92vw,360px)] flex-col gap-2" aria-live="polite">
      {items.map(t => (
        <div key={t.id} className="pop pointer-events-auto flex items-start gap-3 rounded-2xl border border-line bg-surface p-3.5 shadow-lift">
          {t.kind === 'success' ? <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-400" /> : <Bell size={20} className="mt-0.5 shrink-0 text-brand-500" />}
          <p className="flex-1 text-sm font-medium">{t.text}</p>
          <button aria-label="Dismiss" className="text-dim hover:text-soft" onClick={() => dismiss(t.id)}><X size={16} /></button>
        </div>))}
    </div>
  )
}
