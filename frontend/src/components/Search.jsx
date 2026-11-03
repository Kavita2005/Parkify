import { useEffect, useRef, useState } from 'react'
import { MapPin, Navigation, Search as SearchIcon, Send } from 'lucide-react'
import { api, errMsg } from '../api'
import { VEHICLES, VehicleIcon, vlabel } from '../vehicles.jsx'
import BookModal from './BookModal.jsx'
import MapSection from './MapSection.jsx'
import SlotPanel from './SlotPanel.jsx'
import { directionsUrl } from '../maps.js'

const PUNE = { lat: 18.5204, lng: 73.8567 }
const toLocal = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
const minStart = () => toLocal(new Date(Date.now() + 15 * 60e3))   // bookings start at least 15 minutes from now

export default function Search({ user, needLogin, goBookings, live, tick, prefill }) {
  const [origin, setOrigin] = useState(PUNE)         // where distances are measured from
  const [mapCenter, setMapCenter] = useState(PUNE)   // what the map is showing
  const [vehicle, setVehicle] = useState(prefill?.vehicle || '')
  const [start, setStart] = useState(prefill?.start || toLocal(new Date(Date.now() + 3600e3)))
  const [end, setEnd] = useState(prefill?.start ? toLocal(new Date(new Date(prefill.start).getTime() + 2 * 3600e3)) : toLocal(new Date(Date.now() + 3 * 3600e3)))
  const [placeQuery] = useState(prefill?.q || '')
  const [lots, setLots] = useState([])
  const [sel, setSel] = useState(null)
  const [msg, setMsg] = useState('')
  const [chat, setChat] = useState('')
  const [bot, setBot] = useState(null)
  const mapRef = useRef(null)
  const [booking, setBooking] = useState(null)
  const [preset, setPreset] = useState(null)   // a bay clicked on the slot map
  const [loading, setLoading] = useState(true)

  useEffect(() => { navigator.geolocation?.getCurrentPosition(p => { const c = { lat: p.coords.latitude, lng: p.coords.longitude }; setOrigin(c); setMapCenter(c) }) }, [])

  const iso = v => new Date(v).toISOString()
  const load = async () => {
    if (new Date(end) <= new Date(start)) return setMsg('Pick an end time after the start time.')
    setMsg(new Date(start) < new Date(Date.now() + 15 * 60e3) ? 'Bookings must start at least 15 minutes from now, so you have time to reach the lot.' : '')
    try {
      const params = { lat: origin.lat, lng: origin.lng, start: iso(start), end: iso(end) }
      if (vehicle) params.vehicleType = vehicle
      setLots((await api.get('/parking-lots', { params })).data); setBot(null)
    } catch (e) { setMsg(errMsg(e)) } finally { setLoading(false) }
  }
  // reload when filters change, and whenever the server says availability changed (WebSocket tick)
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t) }, [origin, vehicle, start, end, tick]) // eslint-disable-line

  useEffect(() => { if (!sel && lots.length) setSel(lots[0]) }, [lots]) // eslint-disable-line   (show the first lot's slots straight away)

  useEffect(() => {   // "View Details" on the home page
    if (!prefill?.lotId || sel) return
    const l = lots.find(x => x.id === prefill.lotId); if (l) { setSel(l); setMapCenter({ lat: l.latitude, lng: l.longitude }) }
  }, [lots]) // eslint-disable-line

  const ask = async e => {
    e.preventDefault(); if (!chat.trim()) return
    try { const r = (await api.post('/search/quick', { message: chat, lat: origin.lat, lng: origin.lng })).data; setBot(r); setLots(r.results); setMsg('') }
    catch (x) { setMsg(errMsg(x)) }
  }
  const onPlace = (c, err) => { if (err) return setMsg(err); setMsg(''); setSel(null); setOrigin(c); setMapCenter(c) }
  const pick = l => { setSel(l); setMapCenter({ lat: l.latitude, lng: l.longitude }); if (window.innerWidth < 1024) mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }
  const reserve = l => { if (!user) return needLogin(); setPreset(null); setBooking(l) }
  const lot = lots.find(l => l.id === sel?.id) || sel   // freshest data for the selected lot
  const pickSlot = s => { if (!user) return needLogin(); setPreset({ vehicle: s.vehicleType, slotId: s.id }); setBooking(lot) }

  return (
    <div className="flex flex-col gap-4 p-3 pb-6 lg:grid lg:grid-cols-[minmax(380px,460px)_1fr] lg:items-start lg:p-4">
      <section className="flex flex-col gap-3">
        <form onSubmit={ask} className="flex items-center gap-2 rounded-2xl border border-line bg-surface p-1.5 pl-4 text-brand-500 focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/25">
          <SearchIcon size={18} aria-hidden="true" />
          <input aria-label="Describe what you need" className="h-10 flex-1 bg-transparent text-[15px] text-ink placeholder:text-dim focus:outline-none"
            value={chat} onChange={e => setChat(e.target.value)} placeholder="Bike parking near the station, 3 hours, under ₹60" />
          <button className="btn btn-primary h-10 w-10 px-0" aria-label="Ask"><Send size={17} /></button>
        </form>
        {bot && <p className="flex items-center gap-2 rounded-xl bg-brand-500/15 px-3.5 py-2.5 text-sm font-medium text-brand-100">{bot.message}</p>}

        <div className="flex flex-wrap gap-2" role="group" aria-label="Vehicle type">
          <button className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${!vehicle ? 'border-brand-600 bg-brand-600 text-white' : 'border-line bg-surface'}`} onClick={() => setVehicle('')}>All</button>
          {VEHICLES.map(v => (
            <button key={v.id} title={v.hint} onClick={() => setVehicle(v.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold ${vehicle === v.id ? 'border-brand-600 bg-brand-600 text-white' : 'border-line bg-surface'}`}>
              <VehicleIcon id={v.id} size={16} />{v.label}</button>))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="label min-w-0">From<input className="input min-w-0 !px-2 !text-sm" type="datetime-local" min={minStart()} value={start} onChange={e => setStart(e.target.value)} /></label>
          <label className="label min-w-0">Until<input className="input min-w-0 !px-2 !text-sm" type="datetime-local" min={start} value={end} onChange={e => setEnd(e.target.value)} /></label>
        </div>

        {msg && <p className="rounded-xl bg-amber-500/15 px-3.5 py-2.5 text-sm font-medium text-amber-200" role="status">{msg}</p>}
        <div className="flex items-center justify-between text-xs font-bold text-mute">
          <span>{lots.length} {lots.length === 1 ? 'place' : 'places'}{vehicle ? ` for ${vlabel(vehicle).toLowerCase()}` : ''}</span>
          <span className={`flex items-center gap-1.5 ${live ? 'text-emerald-400' : ''}`}><span className={`h-1.5 w-1.5 rounded-full ${live ? 'animate-pulse bg-emerald-500' : 'bg-line2'}`} />{live ? 'Updating live' : 'Not live'}</span>
        </div>

        <ul className="flex flex-col gap-3">
          {loading && [1, 2, 3].map(i => <li key={i} className="card h-32 animate-pulse bg-raised" />)}
          {!loading && lots.map(l => {
            const total = vehicle ? l.types[vehicle]?.total : Object.values(l.types).reduce((a, i) => a + i.total, 0)
            const pct = total ? Math.round((l.freeSpaces / total) * 100) : 0
            return (
              <li key={l.id} onClick={() => pick(l)} className={`card pop cursor-pointer p-4 transition hover:shadow-lift ${sel?.id === l.id ? 'border-brand-500 ring-2 ring-brand-500' : ''}`}>
                <div className="flex justify-between gap-3">
                  <div className="min-w-0"><h3 className="truncate text-lg font-bold">{l.name}</h3>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-mute"><MapPin size={13} aria-hidden="true" /><span className="truncate">{l.address}{l.distanceKm != null && ` · ${l.distanceKm.toFixed(1)} km`}</span></p></div>
                  <p className="shrink-0 text-right"><b className="text-2xl font-extrabold">₹{l.minRate}</b><span className="text-xs text-mute">/hr</span></p>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-raised" aria-hidden="true"><div className={`h-full rounded-full ${pct > 25 ? 'bg-emerald-500' : pct > 0 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${pct}%` }} /></div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">{Object.entries(l.types).map(([k, i]) => (
                    <span key={k} title={`${vlabel(k)}: ${i.free} of ${i.total} free, ₹${i.rate}/hr`} className={`pill ${i.free ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}><VehicleIcon id={k} size={13} />{i.free}</span>))}</div>
                  <div className="flex gap-1.5">
                    <a className="btn btn-ghost btn-sm" href={directionsUrl(l.latitude, l.longitude)} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}><Navigation size={14} />Directions</a>
                    <button className="btn btn-primary btn-sm" disabled={!l.freeSpaces} onClick={e => { e.stopPropagation(); reserve(l) }}>{l.freeSpaces ? 'Reserve' : 'Full'}</button>
                  </div>
                </div>
              </li>)
          })}
          {!loading && !lots.length && <li className="card border-dashed p-8 text-center text-sm text-mute">No places match. Try another vehicle type, a wider time window, or a higher price limit.</li>}
        </ul>
      </section>

      <div className="flex flex-col gap-4 xl:sticky xl:top-20 xl:grid xl:grid-cols-2 xl:items-stretch">
      <section ref={mapRef} className="h-[340px] scroll-mt-20 lg:h-[400px] xl:h-[460px]">
        <MapSection lots={lots} center={mapCenter} sel={sel} onPick={pick} onPlace={onPlace} placeQuery={placeQuery} />
      </section>
      <SlotPanel lot={lot} start={start} end={end} tick={tick} onPickSlot={pickSlot} />
      </div>

      {booking && <BookModal lot={booking} vehicle={vehicle} preset={preset} start={start} end={end} tick={tick} onClose={() => { setBooking(null); setPreset(null) }} onDone={load} goBookings={goBookings} />}
    </div>
  )
}
