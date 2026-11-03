import { useEffect } from 'react'
import { LogIn, LogOut, UserPlus, X } from 'lucide-react'
import Logo from './Logo.jsx'

/** Slide-in menu for phones and tablets (below 1024px). */
export default function MobileMenu({ open, onClose, tabs, current, onNav, user, roleLabel, live, onLogin, onSignUp, onLogout }) {
  useEffect(() => {
    if (!open) return
    const k = e => e.key === 'Escape' && onClose()
    const mq = window.matchMedia('(min-width: 1024px)'); const grow = () => mq.matches && onClose()
    window.addEventListener('keydown', k); mq.addEventListener('change', grow)
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', k); mq.removeEventListener('change', grow); document.body.style.overflow = prev }
  }, [open, onClose])
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="fade-in absolute inset-0 bg-black/70" onClick={onClose} />
      <aside id="mobile-menu" role="dialog" aria-modal="true" aria-label="Menu"
        className="slide-in absolute right-0 top-0 flex h-full w-[86%] max-w-sm flex-col border-l border-line bg-surface shadow-lift">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-4">
          <Logo tagline={false} />
          <button className="btn btn-ghost h-10 w-10 px-0" aria-label="Close menu" onClick={onClose}><X size={22} /></button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3" aria-label="Menu">
          {tabs.map(([k, l, I]) => (
            <button key={k} onClick={() => onNav(k)} aria-current={current === k ? 'page' : undefined}
              className={`mb-1 flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-[15px] font-semibold transition ${current === k ? 'bg-brand-500/15 text-brand-200' : 'text-soft hover:bg-raised'}`}>
              <I size={20} aria-hidden="true" />{l}</button>))}
        </nav>
        <div className="shrink-0 border-t border-line p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {user ? <>
            <div className="mb-3 flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-500/15 text-base font-bold text-brand-200">{user.name?.[0]?.toUpperCase()}</span>
              <div className="min-w-0 flex-1"><p className="truncate font-bold">{user.name}</p><p className="truncate text-xs text-mute">{user.email}</p></div>
              {roleLabel && <span className="pill bg-brand-500/15 text-brand-200">{roleLabel}</span>}
            </div>
            <p className={`mb-3 flex items-center gap-1.5 text-xs font-bold ${live ? 'text-emerald-400' : 'text-dim'}`}><span className={`h-2 w-2 rounded-full ${live ? 'animate-pulse bg-emerald-500' : 'bg-line2'}`} />{live ? 'Live updates on' : 'Offline'}</p>
            <button className="btn w-full" onClick={onLogout}><LogOut size={18} />Log out</button></>
          : <div className="grid grid-cols-2 gap-3">
              <button className="btn h-12 border-brand-600 text-brand-500" onClick={onLogin}><LogIn size={18} />Login</button>
              <button className="btn btn-primary h-12" onClick={onSignUp}><UserPlus size={18} />Sign Up</button></div>}
        </div>
      </aside>
    </div>
  )
}
