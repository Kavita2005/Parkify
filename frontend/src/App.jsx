import { useCallback, useEffect, useState } from 'react'
import { Building2, Home as HomeIcon, Info, LogOut, Menu, ScanLine, Search as SearchIcon, ShieldCheck, Tag, Ticket } from 'lucide-react'
import { useRealtime } from './realtime'
import { API } from './api'
import Logo from './components/Logo.jsx'
import Home from './components/Home.jsx'
import Auth from './components/Auth.jsx'
import Search from './components/Search.jsx'
import Bookings from './components/Bookings.jsx'
import Owner from './components/Owner.jsx'
import Gate from './components/Gate.jsx'
import Admin from './components/Admin.jsx'
import Pricing from './components/Pricing.jsx'
import About from './components/About.jsx'
import Toasts from './components/Toasts.jsx'
import MobileMenu from './components/MobileMenu.jsx'

// Role-based navigation: each role only sees its own screens.
const PUBLIC = [['home', 'Home', HomeIcon], ['find', 'Find Parking', SearchIcon], ['bookings', 'My Bookings', Ticket], ['pricing', 'Pricing', Tag], ['about', 'About', Info]]
const NAV = {
  GUEST: PUBLIC, DRIVER: PUBLIC,
  OWNER: [['owner', 'My Lots', Building2], ['gate', 'Gate', ScanLine]],
  ADMIN: [['admin', 'Admin', ShieldCheck], ['gate', 'Gate', ScanLine]],
}
const START = { GUEST: 'home', DRIVER: 'home', OWNER: 'owner', ADMIN: 'admin' }
const ROLE_LABEL = { OWNER: 'Lot provider', ADMIN: 'Admin' }

export default function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'))
  const role = user?.role || 'GUEST'
  const [tab, setTab] = useState(START[role])
  const [authMode, setAuthMode] = useState('login')
  const [prefill, setPrefill] = useState(null)
  const [toasts, setToasts] = useState([])
  const [tick, setTick] = useState(0)
  const [down, setDown] = useState(false)
  const [menu, setMenu] = useState(false)

  const dismiss = id => setToasts(t => t.filter(x => x.id !== id))
  const notify = useCallback((text, kind = 'info') => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, text, kind }]); setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 6000)
  }, [])
  const live = useRealtime(user, {
    onAvailability: () => setTick(n => n + 1),
    onNotification: n => { notify(n.message, 'success'); setTick(x => x + 1) },
  })

  const go = (k, p = null) => { setPrefill(p); setTab(k); setMenu(false); window.scrollTo(0, 0) }
  const openAuth = mode => { setAuthMode(mode); go('auth') }
  const login = ({ token, user }) => { localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(user)); setUser(user); go(user.role === 'DRIVER' ? 'find' : START[user.role]) }
  const logout = () => { localStorage.clear(); setUser(null); go('home') }
  const closeMenu = useCallback(() => setMenu(false), [])

  useEffect(() => {   // sign out politely when the login token expires
    const h = () => { logout(); notify('Your session expired. Please log in again.') }
    window.addEventListener('auth-expired', h); return () => window.removeEventListener('auth-expired', h)
  }) // eslint-disable-line
  useEffect(() => {   // warn when the backend isn't reachable
    const url = API.replace(/\/api\/v1\/?$/, '') + '/actuator/health'
    const check = () => fetch(url).then(r => setDown(!r.ok)).catch(() => setDown(true))
    check(); const t = setInterval(check, 20000); return () => clearInterval(t)
  }, [])

  const tabs = NAV[role]
  const current = tabs.some(([k]) => k === tab) || (tab === 'auth' && !user) ? tab : START[role]   // route guard

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-line bg-base/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-4 px-4 md:px-6">
          <button aria-label="Parkify home" onClick={() => go(START[role])}><Logo /></button>
          <nav className="mx-auto hidden h-full items-center gap-9 lg:flex" aria-label="Main">
            {tabs.map(([k, l]) => (
              <button key={k} onClick={() => go(k)} aria-current={current === k ? 'page' : undefined}
                className={`relative flex h-full items-center text-sm font-semibold transition ${current === k ? 'text-brand-500 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-brand-500' : 'text-soft hover:text-ink'}`}>{l}</button>))}
          </nav>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            {user ? <>
              <span className={`hidden items-center gap-1.5 text-xs font-bold sm:flex ${live ? 'text-emerald-400' : 'text-dim'}`} title={live ? 'Live updates connected' : 'Reconnecting…'}>
                <span className={`h-2 w-2 rounded-full ${live ? 'animate-pulse bg-emerald-500' : 'bg-line2'}`} />{live ? 'Live' : 'Offline'}</span>
              {ROLE_LABEL[role] && <span className="pill hidden bg-brand-500/15 text-brand-200 sm:inline-flex">{ROLE_LABEL[role]}</span>}
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-500/15 text-sm font-bold text-brand-200" title={user.email}>{user.name?.[0]?.toUpperCase()}</span>
              <button className="btn btn-ghost hidden h-9 w-9 px-0 lg:inline-flex" aria-label="Log out" onClick={logout}><LogOut size={18} /></button></>
            : <>
              <button className="btn btn-ghost hidden h-10 w-10 px-0 lg:inline-flex" aria-label="Find parking" onClick={() => go('find')}><SearchIcon size={19} /></button>
              <button className="btn hidden h-10 border-brand-600 bg-transparent px-5 text-brand-500 hover:bg-brand-600/10 sm:inline-flex" onClick={() => openAuth('login')}>Login</button>
              <button className="btn btn-primary hidden h-10 px-5 sm:inline-flex" onClick={() => openAuth('register')}>Sign Up</button></>}
            <button className="btn h-10 w-10 px-0 lg:hidden" aria-label="Open menu" aria-haspopup="dialog" aria-expanded={menu} aria-controls="mobile-menu" onClick={() => setMenu(true)}><Menu size={22} /></button>
          </div>
        </div>
      </header>

      <MobileMenu open={menu} onClose={closeMenu} tabs={tabs} current={current} onNav={k => go(k)} user={user} roleLabel={ROLE_LABEL[role]} live={live}
        onLogin={() => openAuth('login')} onSignUp={() => openAuth('register')} onLogout={() => { setMenu(false); logout() }} />

      {down && <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-sm font-medium text-amber-200" role="alert">Can't reach the Parkify server. Start the backend, then <button className="underline" onClick={() => window.location.reload()}>reload</button>.</div>}

      <main>
        {current === 'home' && <Home go={go} />}
        {current === 'auth' && !user && <Auth key={authMode} initialMode={authMode} onDone={login} />}
        {current === 'find' && <Search user={user} needLogin={() => openAuth('login')} goBookings={() => go('bookings')} live={live} tick={tick} prefill={prefill} />}
        {current === 'bookings' && (user ? <div className="mx-auto max-w-5xl px-4 py-6 md:py-8"><Bookings tick={tick} /></div> : <Auth key="b" initialMode="login" onDone={login} />)}
        {current === 'pricing' && <Pricing go={go} />}
        {current === 'about' && <About go={go} />}
        {current === 'owner' && <div className="mx-auto max-w-6xl px-4 py-6 md:py-8"><Owner tick={tick} /></div>}
        {current === 'gate' && <div className="mx-auto max-w-6xl px-4 py-6 md:py-8"><Gate tick={tick} /></div>}
        {current === 'admin' && <div className="mx-auto max-w-6xl px-4 py-6 md:py-8"><Admin tick={tick} /></div>}
      </main>
      <Toasts items={toasts} dismiss={dismiss} />
    </div>
  )
}
