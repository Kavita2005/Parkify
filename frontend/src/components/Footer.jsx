import Logo from './Logo.jsx'
export default function Footer({ go }) {
  const links = [['home', 'Home'], ['find', 'Find Parking'], ['bookings', 'My Bookings'], ['pricing', 'Pricing'], ['about', 'About']]
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-[1320px] flex-col items-start justify-between gap-5 px-5 py-7 md:flex-row md:items-center">
        <Logo />
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-mute" aria-label="Footer">
          {links.map(([k, l]) => <button key={k} className="hover:text-ink" onClick={() => go(k)}>{l}</button>)}
        </nav>
        <p className="text-xs text-dim">© 2026 Parkify. All rights reserved.</p>
      </div>
    </footer>
  )
}
