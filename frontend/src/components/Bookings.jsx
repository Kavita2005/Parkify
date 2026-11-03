import { useEffect, useState } from 'react'
import { CalendarClock, MapPin, Navigation, QrCode } from 'lucide-react'
import { api, errMsg } from '../api'
import { VehicleIcon, vlabel } from '../vehicles.jsx'
import Pass from './Pass.jsx'
import PayPanel from './PayPanel.jsx'
import Sheet from './Sheet.jsx'
import { directionsUrl } from '../maps.js'

const clock = (iso, min) => new Date(new Date(iso).getTime() + min * 60e3).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
const fmt = s => new Date(s).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
const STATUS = {
  PENDING_PAYMENT: ['Awaiting payment', 'bg-amber-500/15 text-amber-200'], CONFIRMED: ['Confirmed', 'bg-emerald-500/15 text-emerald-300'],
  CHECKED_IN: ['Parked', 'bg-brand-500/15 text-brand-200'], COMPLETED: ['Completed', 'bg-raised text-soft'],
  CANCELLED: ['Cancelled', 'bg-rose-500/15 text-rose-300'], NO_SHOW: ['No-show', 'bg-rose-500/15 text-rose-300'], EXPIRED: ['Expired', 'bg-rose-500/15 text-rose-300'],
}

function OverstayBox({ b, onPay }) {
  const [q, setQ] = useState(null)
  useEffect(() => {
    const f = () => api.get(`/bookings/${b.id}/overstay`).then(r => setQ(r.data)).catch(() => {})
    f(); const t = setInterval(f, 30000); return () => clearInterval(t)
  }, [b.id])
  if (!q || !(Number(q.payAmount) > 0)) return null
  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
      <p className="font-bold text-amber-200">You are {q.minutes} min over your booked time</p>
      <p className="mt-0.5 text-xs text-amber-100/80">Overstay so far ₹{q.fee}{Number(q.paid) > 0 ? `, already paid ₹${q.paid}` : ''}. Pay now to exit; this covers the next 15 minutes. Then show your exit pass at the gate.</p>
      <button className="btn btn-primary btn-sm mt-2 w-full" onClick={() => onPay(q)}>Pay ₹{q.payAmount}</button>
    </div>
  )
}

export default function Bookings({ tick }) {
  const [rows, setRows] = useState([]); const [err, setErr] = useState(''); const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(null); const [paying, setPaying] = useState(null); const [payingOver, setPayingOver] = useState(null)
  const load = () => api.get('/bookings/me').then(r => setRows(r.data)).catch(e => setErr(errMsg(e))).finally(() => setLoading(false))
  useEffect(() => { load() }, [tick])
  const cancel = (b) => {
    const msg = b.status === 'CONFIRMED' ? 'Cancel this booking? Your payment will be refunded.' : 'Cancel this booking?'
    if (confirm(msg)) api.post(`/bookings/${b.id}/cancel`).then(load).catch(e => setErr(errMsg(e)))
  }
  return (
    <section>
      <h1 className="mb-5 text-3xl font-extrabold">My bookings</h1>
      {err && <p className="mb-3 text-sm font-medium text-rose-300" role="alert">{err}</p>}
      {loading && <p className="py-10 text-center text-mute">Loading…</p>}
      {!loading && !rows.length && <div className="card border-dashed p-10 text-center text-mute">No bookings yet. Find a spot and reserve it.</div>}
      <div className="grid gap-4 md:grid-cols-2">
        {rows.map(b => {
          const [label, cls] = STATUS[b.status] || [b.status, 'bg-raised text-soft']
          return (
            <article key={b.id} className={`card pop flex flex-col gap-3 p-5 ${['CANCELLED', 'EXPIRED', 'NO_SHOW'].includes(b.status) ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-500/15 text-brand-500"><VehicleIcon id={b.vehicleType} size={21} /></span>
                <div className="min-w-0 flex-1"><h3 className="truncate text-lg font-bold">{b.lotName}</h3><p className="flex items-center gap-1 text-xs text-mute"><MapPin size={13} aria-hidden="true" />{b.address}</p></div>
                <span className={`pill ${cls}`}>{label}</span>
              </div>
              <p className="flex items-center gap-2 text-sm"><CalendarClock size={16} className="text-dim" aria-hidden="true" />{fmt(b.startTime)} to {fmt(b.endTime)}</p>
              <div className="flex items-baseline justify-between"><span className="text-xs text-mute">{vlabel(b.vehicleType)} · space {b.spaceNumber}</span><b className="text-2xl font-extrabold">₹{b.totalAmount}</b></div>
              {b.status === 'CHECKED_IN' && <p className="text-xs text-mute">Entered {fmt(b.checkedInAt)}. Show the exit pass when you leave.</p>}
              {b.status === 'CONFIRMED' && <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-200">Arrive between {clock(b.startTime, -15)} and {clock(b.startTime, 15)}. If the gate hasn't scanned your entry pass by {clock(b.startTime, 15)}, the booking is cancelled as a no-show and the payment is not refunded.</p>}
              {b.status === 'NO_SHOW' && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-200">You didn't arrive within 15 minutes of your start time, so this booking was cancelled. The payment is non-refundable.</p>}
              {b.status === 'COMPLETED' && Number(b.earlyRefund) > 0 && <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">You left early. {b.refundStatus === 'REFUNDED' ? `₹${b.earlyRefund} for the unused time was refunded to your original payment method.` : `A refund of ₹${b.earlyRefund} for the unused time is being processed and will be issued within 2 hours.`}</p>}
              {b.status === 'COMPLETED' && Number(b.extraAmount) > 0 && <p className="rounded-lg bg-amber-500/15 px-3 py-2 text-xs font-semibold text-amber-200">Overstay charge of ₹{b.extraAmount} was settled.</p>}
              {b.status === 'CHECKED_IN' && <OverstayBox b={b} onPay={q => setPayingOver({ b, q })} />}

              {open === b.id && (b.entryToken || b.exitToken) && <Pass token={b.entryToken || b.exitToken} kind={b.exitToken ? 'exit' : 'entry'} />}

              <div className="flex flex-wrap gap-2">
                {b.status === 'PENDING_PAYMENT' && <button className="btn btn-primary btn-sm flex-1" onClick={() => setPaying(b)}>Pay ₹{b.totalAmount}</button>}
                {(b.entryToken || b.exitToken) && <button className="btn btn-primary btn-sm flex-1" onClick={() => setOpen(open === b.id ? null : b.id)}><QrCode size={15} />{open === b.id ? 'Hide' : b.exitToken ? 'Show exit pass' : 'Show entry pass'}</button>}
                {['PENDING_PAYMENT', 'CONFIRMED'].includes(b.status) && <a className="btn btn-sm" href={directionsUrl(b.latitude, b.longitude)} target="_blank" rel="noreferrer"><Navigation size={14} />Directions</a>}
                {['PENDING_PAYMENT', 'CONFIRMED'].includes(b.status) && <button className="btn btn-ghost btn-sm" onClick={() => cancel(b)}>Cancel</button>}
              </div>
            </article>)
        })}
      </div>
      {payingOver && <Sheet onClose={() => setPayingOver(null)} label="Pay overstay charge">
        <div className="pr-10"><h2 className="text-xl font-extrabold">Pay overstay charge</h2><p className="text-sm text-mute">{payingOver.b.lotName} · {vlabel(payingOver.b.vehicleType)}</p></div>
        <PayPanel purpose="OVERSTAY" booking={{ id: payingOver.b.id, totalAmount: payingOver.q.payAmount, createdAt: new Date().toISOString() }} onPaid={() => { setPayingOver(null); load() }} />
      </Sheet>}
      {paying && <Sheet onClose={() => setPaying(null)} label="Pay for booking">
        <div className="pr-10"><h2 className="text-xl font-extrabold">Complete payment</h2><p className="text-sm text-mute">{paying.lotName} · {vlabel(paying.vehicleType)}</p></div>
        <PayPanel booking={paying} onPaid={() => { setPaying(null); load() }} />
      </Sheet>}
    </section>
  )
}
