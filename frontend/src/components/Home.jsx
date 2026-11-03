import { useEffect, useState } from 'react'
import { ArrowRight, Bell, Building2, Calendar, Car, ChevronDown, Clock, CreditCard, MapPin, Navigation, QrCode, Route, Search, ShieldCheck } from 'lucide-react'
import { api } from '../api'
import { VEHICLES, VehicleIcon, vlabel } from '../vehicles.jsx'
import Footer from './Footer.jsx'
import Reveal from './Reveal.jsx'
import ParkingScene from './ParkingScene.jsx'
import VehicleRow from './VehicleRow.jsx'

const WHY = [
  [ShieldCheck, 'Secure & Safe', 'Every lot is approved by an admin before it goes live'],
  [Bell, 'Real-Time Availability', 'Live slot updates & instant booking'],
  [CreditCard, 'Online Payments', 'Pay by UPI, cards or net banking'],
  [Route, 'Easy Navigation', 'Find your way with map directions'],
  [QrCode, 'QR Based Entry & Exit', 'Fast & contactless access'],
  [Clock, 'Flexible Booking', 'Pick any start and end time'],
]

function Field({ icon: I, label, children }) {
  return (
    <label className="flex min-w-0 items-center gap-3 rounded-xl px-3 py-2 lg:border-l lg:border-line lg:first:border-0">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-600/20 text-brand-500"><I size={20} aria-hidden="true" /></span>
      <span className="min-w-0 flex-1"><span className="block text-xs font-bold text-soft">{label}</span>{children}</span>
    </label>
  )
}

function HeroArt() {
  return (
    <div className="relative hidden h-[380px] lg:block" aria-hidden="true">
      <div className="absolute inset-0 overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-[#0c2147] via-[#071429] to-[#050b17]">
        <div className="absolute inset-0 opacity-70" style={{ background: 'repeating-linear-gradient(90deg, rgba(61,139,255,.10) 0 2px, transparent 2px 78px)' }} />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-brand-600/35 to-transparent" />
        <div className="absolute left-6 top-8 grid h-28 w-20 place-items-center rounded-2xl border border-brand-500/50 bg-[#0a1a38] text-5xl font-extrabold text-brand-500 shadow-[0_0_30px_rgba(26,109,255,.4)]">P</div>
        <VehicleRow className="absolute bottom-5 left-5 w-[calc(100%-290px)] min-w-[170px] max-w-[470px]" />
      </div>
      <div className="absolute right-10 top-6 h-[330px] w-[200px] rotate-[3deg] rounded-[2rem] border-4 border-[#1c2f5a] bg-[#050d1f] p-3 shadow-[0_20px_60px_rgba(26,109,255,.35)]">
        <div className="relative h-[190px] overflow-hidden rounded-2xl bg-[#08142c]">
          <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(61,139,255,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(61,139,255,.12) 1px, transparent 1px)', backgroundSize: '26px 26px' }} />
          <MapPin className="absolute left-8 top-10 text-brand-500" size={26} fill="currentColor" /><MapPin className="absolute right-8 top-6 text-brand-500" size={26} fill="currentColor" /><MapPin className="absolute bottom-10 left-16 text-emerald-400" size={22} fill="currentColor" />
        </div>
        <div className="mt-3 rounded-2xl bg-raised p-3"><p className="text-xs font-bold">Your Parking Spot</p><p className="text-lg font-extrabold">A1 - 12</p>
          <span className="mt-2 flex h-9 items-center justify-center gap-1.5 rounded-lg bg-brand-600 text-xs font-bold">Navigate <Navigation size={13} /></span></div>
      </div>
    </div>
  )
}

export default function Home({ go }) {
  const [loc, setLoc] = useState(''); const [veh, setVeh] = useState(''); const [when, setWhen] = useState('')
  const [lots, setLots] = useState(null)
  useEffect(() => {
    const fetchLots = c => api.get('/parking-lots', { params: c ? { lat: c.lat, lng: c.lng } : {} }).then(r => setLots(r.data.slice(0, 4))).catch(() => setLots([]))
    fetchLots()
    navigator.geolocation?.getCurrentPosition(p => fetchLots({ lat: p.coords.latitude, lng: p.coords.longitude }))
  }, [])
  const submit = e => { e.preventDefault(); go('find', { q: loc.trim(), vehicle: veh, start: when || undefined }) }
  const toVehicles = () => document.getElementById('vehicles')?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div>
      {/* Page 1: hero */}
      <section className="relative overflow-hidden lg:flex lg:min-h-[calc(100dvh-4rem)] lg:flex-col lg:justify-center">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[560px] w-[760px] rounded-full bg-brand-600/20 blur-[140px]" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-base" aria-hidden="true" />
        <div className="relative mx-auto w-full max-w-[1320px] px-5 pb-12 pt-10 lg:pb-8 lg:pt-12">
          <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-line2 bg-surface px-3.5 py-1.5 text-sm font-semibold text-soft"><Car size={16} className="text-brand-500" />Smart Parking Solution</span>
              <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] sm:text-5xl lg:text-6xl">Find Your Perfect<br /><span className="text-brand-500">Parking Spot</span> in Seconds</h1>
              <p className="mt-5 max-w-lg text-lg text-soft">Safe, secure and hassle-free parking for all types of vehicles. Book, pay and park — all in one place.</p>
              <div className="mx-auto mt-7 max-w-md lg:hidden"><ParkingScene /></div>
            </div>
            <HeroArt />
          </div>

          <form onSubmit={submit} className="mt-8 grid gap-1 rounded-2xl border border-line2 bg-surface/80 p-2 shadow-lift backdrop-blur sm:grid-cols-2 lg:mt-10 lg:grid-cols-[1.3fr_1fr_1.1fr_auto]">
            <Field icon={MapPin} label="Location"><input className="w-full min-w-0 bg-transparent text-sm text-ink placeholder:text-dim focus:outline-none" placeholder="Search city, area or landmark" value={loc} onChange={e => setLoc(e.target.value)} /></Field>
            <Field icon={Car} label="Vehicle Type">
              <span className="relative block"><select className="w-full appearance-none bg-transparent pr-5 text-sm text-ink focus:outline-none" value={veh} onChange={e => setVeh(e.target.value)}>
                <option value="">Select vehicle type</option>{VEHICLES.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select>
                <ChevronDown size={14} className="pointer-events-none absolute right-0 top-1 text-mute" /></span></Field>
            <Field icon={Calendar} label="Date & Time"><input type="datetime-local" min={new Date(Date.now() + 15 * 60e3 - new Date().getTimezoneOffset() * 60e3).toISOString().slice(0, 16)} className="w-full min-w-0 bg-transparent text-sm text-ink focus:outline-none" value={when} onChange={e => setWhen(e.target.value)} aria-label="Date and time" /></Field>
            <button className="btn btn-primary h-14 whitespace-nowrap px-7 text-[15px] sm:col-span-2 lg:col-span-1"><Search size={18} />Find Parking</button>
          </form>

          <div className="mt-8 hidden justify-center lg:flex">
            <button onClick={toVehicles} className="flex flex-col items-center gap-1 text-xs font-semibold text-mute transition hover:text-ink" aria-label="Scroll to vehicle types">
              Scroll<ChevronDown size={20} className="animate-bounce" /></button>
          </div>
        </div>
      </section>

      {/* Page 2: vehicle types (reveals as you scroll) */}
      <section id="vehicles" className="relative">
        <div className="pointer-events-none absolute left-1/2 top-1/3 h-72 w-[640px] -translate-x-1/2 rounded-full bg-brand-600/10 blur-[120px]" aria-hidden="true" />
        <div className="relative mx-auto flex max-w-[1320px] flex-col justify-center px-5 py-14 lg:min-h-[calc(100dvh-4rem)] lg:py-16">
          <Reveal>
            <div className="flex items-end justify-between gap-4">
              <div><h2 className="text-3xl font-extrabold lg:text-4xl">Select Your Vehicle Type</h2><p className="mt-1 text-brand-500">Multiple vehicle types. One smart platform.</p></div>
              <button className="hidden items-center gap-1.5 text-sm font-semibold text-brand-500 hover:text-brand-300 sm:flex" onClick={() => go('find')}>View All Vehicles <ArrowRight size={16} /></button>
            </div>
          </Reveal>
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            {VEHICLES.map((v, i) => (
              <Reveal key={v.id} delay={i * 70} className="h-full">
                <button onClick={() => go('find', { vehicle: v.id })} className="group card flex h-full w-full flex-col overflow-hidden text-left transition hover:-translate-y-0.5 hover:border-brand-600/70">
                  <div className="relative grid h-28 place-items-center bg-gradient-to-b from-raised to-surface lg:h-36">
                    <span className={`absolute h-20 w-20 rounded-full opacity-25 blur-2xl ${v.bg}`} />
                    <span className={`relative ${v.text}`}><VehicleIcon id={v.id} size={54} /></span>
                  </div>
                  <div className="flex items-center gap-3 p-4">
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-white ${v.bg}`}><VehicleIcon id={v.id} size={19} /></span>
                    <div className="min-w-0 flex-1"><p className="font-bold">{v.name}</p><p className="truncate text-[11px] text-mute">{v.hint}</p></div>
                    <ArrowRight size={16} className="shrink-0 text-brand-500 transition group-hover:translate-x-0.5" />
                  </div>
                </button>
              </Reveal>))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 pb-12">
        <Reveal>
          <div className="card grid gap-5 p-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[210px_repeat(6,1fr)] xl:items-center">
            <div className="sm:col-span-2 lg:col-span-3 xl:col-span-1"><h2 className="text-lg font-extrabold">Why Choose Parkify?</h2><p className="mt-1 text-sm text-mute">Smart features for a better parking experience.</p></div>
            {WHY.map(([I, t, d]) => (
              <div key={t} className="flex gap-3 xl:border-l xl:border-line xl:pl-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-600/15 text-brand-500"><I size={20} aria-hidden="true" /></span>
                <div><p className="text-sm font-bold">{t}</p><p className="mt-0.5 text-xs leading-snug text-mute">{d}</p></div>
              </div>))}
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 pb-16">
        <Reveal>
          <div className="flex items-end justify-between gap-4">
            <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white"><Building2 size={20} /></span>
              <div><h2 className="text-xl font-extrabold">Popular Parking Near You</h2><p className="text-xs text-mute">Live availability · Prices per hour</p></div></div>
            <button className="text-sm font-semibold text-brand-500 hover:text-brand-300" onClick={() => go('find')}>View all</button>
          </div>
        </Reveal>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {lots === null && [1, 2, 3, 4].map(i => <div key={i} className="card h-56 animate-pulse bg-raised" />)}
          {lots?.map((l, i) => {
            const types = Object.entries(l.types)
            return (
              <Reveal key={l.id} delay={i * 80} className="h-full">
                <article className="card h-full overflow-hidden transition hover:border-line2">
                  <div className="relative grid h-28 place-items-center bg-gradient-to-br from-[#10264f] to-[#0a1630] text-brand-500/60">
                    <Building2 size={46} aria-hidden="true" />
                    <span className={`pill absolute left-3 top-3 ${l.freeSpaces ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>{l.freeSpaces ? `${l.freeSpaces} free now` : 'Full'}</span>
                  </div>
                  <div className="p-4">
                    <h3 className="truncate font-bold">{l.name}</h3>
                    <p className="mt-0.5 truncate text-xs text-mute">{l.distanceKm != null ? `${l.distanceKm.toFixed(1)} km · ` : ''}{l.address}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 text-mute">
                      {types.slice(0, 5).map(([k]) => <span key={k} className="grid h-7 w-7 place-items-center rounded-lg bg-raised" title={vlabel(k)}><VehicleIcon id={k} size={14} /></span>)}
                      {types.length > 5 && <span className="text-xs">+{types.length - 5}</span>}
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <p><b className="text-xl font-extrabold">₹{l.minRate}</b><span className="text-xs text-mute"> / hour</span></p>
                      <button className="btn btn-primary btn-sm" onClick={() => go('find', { lotId: l.id })}>View Details <ArrowRight size={14} /></button>
                    </div>
                  </div>
                </article>
              </Reveal>)
          })}
          {lots?.length === 0 && <p className="card border-dashed p-8 text-center text-sm text-mute sm:col-span-2 xl:col-span-4">No parking lots are live yet. Lot providers can add theirs, and an admin approves them.</p>}
        </div>
      </section>
      <Footer go={go} />
    </div>
  )
}
