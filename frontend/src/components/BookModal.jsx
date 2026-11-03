import { useEffect, useState } from 'react'
import { CheckCircle2, Clock } from 'lucide-react'
import { api, errMsg } from '../api'
import { VehicleIcon, vlabel } from '../vehicles.jsx'
import Sheet from './Sheet.jsx'
import PayPanel from './PayPanel.jsx'
import Pass from './Pass.jsx'

const fmt = s => new Date(s).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
const LEAD_MINUTES = 15

const SLOT = {
  AVAILABLE: 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25',
  BOOKED: 'cursor-not-allowed border-rose-500/40 bg-rose-500/10 text-rose-300/70',
  UNAVAILABLE: 'cursor-not-allowed border-line bg-raised text-dim',
}
const Legend = ({ cls, label }) => <span className="flex items-center gap-1.5"><i className={`inline-block h-3 w-3 rounded border ${cls}`} />{label}</span>

/** Steps: choose vehicle + space → hold slot and pay → entry pass. */
export default function BookModal({ lot, vehicle, preset, start, end, tick, onClose, onDone, goBookings }) {
  const options = Object.entries(lot.types).filter(([, i]) => i.free > 0)
  const [type, setType] = useState(preset?.vehicle && lot.types[preset.vehicle]?.free > 0 ? preset.vehicle : vehicle && lot.types[vehicle]?.free > 0 ? vehicle : options[0]?.[0])
  const [slots, setSlots] = useState(null); const [pick, setPick] = useState(preset?.slotId ?? null); const [slotsErr, setSlotsErr] = useState(false)
  const [step, setStep] = useState('choose'); const [held, setHeld] = useState(null); const [paid, setPaid] = useState(null)
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const hours = (new Date(end) - new Date(start)) / 36e5
  const iso = v => new Date(v).toISOString()
  const tooSoon = new Date(start) < new Date(Date.now() + LEAD_MINUTES * 60e3)
  const chosen = slots?.find(s => s.id === pick)
  const rate = chosen?.hourlyRate ?? lot.types[type]?.rate ?? 0
  const total = (rate * hours).toFixed(2)

  const loadSlots = () => {
    if (!type || hours <= 0) return
    return api.get(`/parking-lots/${lot.id}/slots`, { params: { start: iso(start), end: iso(end), vehicleType: type } }).then(r => {
      setSlots(r.data); setSlotsErr(false)
      setPick(p => r.data.some(s => s.id === p && s.status === 'AVAILABLE') ? p : (r.data.find(s => s.status === 'AVAILABLE')?.id ?? null))
    }).catch(() => { setSlots([]); setSlotsErr(true); setPick(null) })   // show an error, not a misleading "0 of 0"
  }
  useEffect(() => { if (step === 'choose') loadSlots() }, [type, start, end, tick, step]) // eslint-disable-line

  const hold = async () => {
    setBusy(true); setErr('')
    try {
      setHeld((await api.post('/bookings', { parkingSpaceId: pick, startTime: iso(start), endTime: iso(end) })).data)
      setStep('pay'); onDone()
    } catch (e) { setErr(errMsg(e)); loadSlots() } finally { setBusy(false) }
  }
  const release = async () => { try { await api.post(`/bookings/${held.id}/cancel`) } catch { /* already expired */ } onDone(); onClose() }
  const freeCount = slots?.filter(s => s.status === 'AVAILABLE').length ?? 0

  return (
    <Sheet onClose={onClose} label={`Reserve at ${lot.name}`}>
      {step === 'done' && paid ? (
        <div className="flex flex-col items-center gap-2 text-center">
          <CheckCircle2 size={48} className="text-emerald-400" aria-hidden="true" />
          <h2 className="text-2xl font-extrabold">Payment received</h2>
          <p className="text-sm text-mute">{lot.name} · {vlabel(type)} · space {chosen?.spaceNumber}<br />{fmt(paid.startTime)} to {fmt(paid.endTime)}</p>
          <Pass token={paid.entryToken} kind="entry" />
          <div className="flex w-full gap-2"><button className="btn flex-1" onClick={onClose}>Done</button><button className="btn btn-primary flex-1" onClick={() => { onClose(); goBookings() }}>My bookings</button></div>
        </div>
      ) : step === 'pay' ? (<>
        <div className="pr-10"><h2 className="text-xl font-extrabold">Complete payment</h2><p className="text-sm text-mute">{lot.name} · {vlabel(type)} · space {chosen?.spaceNumber} · {hours.toFixed(1)} h</p></div>
        <PayPanel booking={held} onPaid={b => { setPaid(b); setStep('done'); onDone() }} />
        <button className="btn btn-ghost btn-sm" onClick={release}>Cancel and release the space</button>
        <p className="text-center text-xs text-dim">You can also pay later from My bookings, before the timer ends. No-show policy: if you do not arrive within 15 minutes after your start time, the booking is cancelled and the payment is not refunded.</p>
      </>) : (<>
        <div className="pr-10"><h2 className="text-xl font-extrabold">{lot.name}</h2><p className="text-sm text-mute">{lot.address}</p></div>
        <p className="text-xs font-bold text-mute">Choose your vehicle</p>
        <div className="grid grid-cols-2 gap-2">
          {options.map(([t, i]) => (
            <button key={t} onClick={() => setType(t)} className={`flex flex-col items-start gap-0.5 rounded-2xl border-2 p-3 text-left transition ${t === type ? 'border-brand-600 bg-brand-500/15' : 'border-line hover:border-line2'}`}>
              <span className="mb-1 text-brand-500"><VehicleIcon id={t} size={22} /></span><b className="text-sm">{vlabel(t)}</b><span className="text-xs text-mute">₹{i.rate}/hr · {i.free} free</span></button>))}
          {!options.length && <p className="col-span-2 py-4 text-center text-sm text-mute">No free spaces for this time.</p>}
        </div>

        {type && <>
          <div className="flex items-baseline justify-between"><p className="text-xs font-bold text-mute">Choose your space</p>
            {slots && !slotsErr && <p className="text-xs text-mute">{freeCount} of {slots.length} free for your time</p>}</div>
          {slotsErr ? (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200" role="alert">
              <p className="font-semibold">Couldn't load the spaces for this lot.</p>
              <p className="mt-0.5 text-xs text-amber-100/80">Check that the backend is running and up to date, then try again.</p>
              <button className="btn btn-sm mt-2" onClick={loadSlots}>Try again</button></div>
          ) : slots === null ? <div className="h-24 animate-pulse rounded-xl bg-raised" /> : slots.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line p-4 text-center text-sm text-mute">This lot has no spaces for that vehicle type.</p>
          ) : (
            <div className="grid max-h-44 grid-cols-5 gap-2 overflow-y-auto pr-1 sm:grid-cols-6" role="radiogroup" aria-label="Choose your space">
              {slots.map(s => {
                const sel = s.id === pick
                return (
                  <button key={s.id} role="radio" aria-checked={sel} aria-label={`Space ${s.spaceNumber}, ${s.status.toLowerCase()}`} disabled={s.status !== 'AVAILABLE'} onClick={() => setPick(s.id)}
                    title={s.status === 'BOOKED' ? 'Already booked for this time' : s.status === 'UNAVAILABLE' ? 'Not available' : 'Free'}
                    className={`h-11 truncate rounded-lg border px-1 text-[13px] font-bold transition ${sel ? 'border-brand-500 bg-brand-600 text-white' : SLOT[s.status]}`}>{s.spaceNumber}</button>)
              })}
            </div>)}
          {!slotsErr && <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-mute">
            <Legend cls="border-emerald-500/50 bg-emerald-500/30" label="Available" /><Legend cls="border-brand-500 bg-brand-600" label="Selected" />
            <Legend cls="border-rose-500/40 bg-rose-500/30" label="Booked" /><Legend cls="border-line bg-raised" label="Unavailable" />
          </div>}
        </>}

        <p className="flex items-center gap-2 text-sm text-soft"><Clock size={16} aria-hidden="true" />{fmt(start)} to {fmt(end)} ({hours.toFixed(1)} h)</p>
        {tooSoon && <p className="rounded-lg bg-amber-500/15 px-3 py-2 text-sm font-medium text-amber-200" role="alert">Bookings must start at least {LEAD_MINUTES} minutes from now, so you have time to reach the lot. Pick a later start time.</p>}
        <div className="flex items-baseline justify-between border-y border-dashed border-line2 py-3"><span className="text-sm text-mute">Total{chosen ? ` · space ${chosen.spaceNumber}` : ''}</span><b className="text-3xl font-extrabold">₹{total}</b></div>
        {err && <p className="rounded-lg bg-rose-500/15 px-3 py-2 text-sm font-medium text-rose-300" role="alert">{err}</p>}
        <button className="btn btn-primary h-12" disabled={busy || !type || !pick || hours <= 0 || tooSoon} onClick={hold}>{busy ? 'Holding space…' : slotsErr ? "Can't load spaces" : pick ? `Continue to payment · ${chosen?.spaceNumber}` : slots === null ? 'Loading spaces…' : 'No space free'}</button>
        <p className="text-center text-xs text-dim">Your space is held for 10 minutes while you pay.<br />Arrive within 15 minutes after your start time. After that the booking is cancelled as a no-show and the payment is not refunded.</p>
      </>)}
    </Sheet>
  )
}
