import { useEffect, useState } from 'react'
import { MapPin } from 'lucide-react'
import { api } from '../api'
import { VEHICLES, vlabel } from '../vehicles.jsx'

// bay size (drawing units) per vehicle type: bigger vehicles get bigger bays
const DIM = { CAR: [50, 80], EV_CAR: [50, 80], SUV: [54, 86], TWO_WHEELER: [34, 56], CYCLE: [30, 48], VAN: [56, 92], TRUCK: [64, 108], BUS: [68, 116], RV: [68, 108] }
const W = 330, PAD = 8, GAP = 8, HEAD = 24
const COLOR = { AVAILABLE: '#10b981', BOOKED: '#f43f5e', UNAVAILABLE: '#64748b' }
const WORD = { AVAILABLE: 'Free', BOOKED: 'Booked', UNAVAILABLE: 'Unavailable' }

function layout(slots) {
  const order = [...VEHICLES.map(v => v.id), 'SUV']
  const groups = order.map(t => ({ t, items: slots.filter(s => s.vehicleType === t) })).filter(g => g.items.length)
  const out = []; let y = PAD
  for (const g of groups) {
    const [bw, bh] = DIM[g.t] || [50, 80]
    out.push({ kind: 'head', t: g.t, y, free: g.items.filter(s => s.status === 'AVAILABLE').length, total: g.items.length })
    y += HEAD
    let x = PAD, top = y
    for (const s of g.items) {
      if (x + bw > W - PAD) { x = PAD; top += bh + GAP }
      out.push({ kind: 'bay', s, x, y: top, bw, bh }); x += bw + GAP
    }
    y = top + bh + 16
  }
  return { items: out, height: Math.max(y, 60) }
}

// top-down silhouette of a parked vehicle, drawn inside a booked bay
function Parked({ x, y, w, h, type }) {
  const bike = type === 'TWO_WHEELER' || type === 'CYCLE'
  const vw = bike ? w * 0.3 : w * 0.64, vh = h * 0.6, cx = x + w / 2, cy = y + h / 2 - 5
  return (
    <g>
      <rect x={cx - vw / 2} y={cy - vh / 2} width={vw} height={vh} rx={bike ? 5 : 9} fill={COLOR.BOOKED} fillOpacity=".9" />
      {!bike && <>
        <rect x={cx - vw * 0.36} y={cy - vh * 0.3} width={vw * 0.72} height={vh * 0.18} rx="2" fill="#050b17" fillOpacity=".7" />
        <rect x={cx - vw * 0.34} y={cy - vh * 0.02} width={vw * 0.68} height={vh * 0.26} rx="3" fill="#050b17" fillOpacity=".25" />
      </>}
    </g>
  )
}

/** The lot drawn from live slot data: free bays are green and dashed, booked bays hold a red vehicle, unavailable bays are grey. */
export function SlotDiagram({ slots, onPick }) {
  const { items, height } = layout(slots)
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="mx-auto w-full max-w-sm rounded-xl bg-[#07101f]" role="group" aria-label="Parking slots">
      {items.map(it => it.kind === 'head'
        ? <text key={`h${it.t}`} x={PAD} y={it.y + 15} fill="#c5d0ea" fontSize="12" fontWeight="700" fontFamily="Manrope, sans-serif">{vlabel(it.t)} · {it.free} of {it.total} free</text>
        : (() => {
          const { s, x, y, bw, bh } = it, c = COLOR[s.status], free = s.status === 'AVAILABLE'
          return (
            <g key={s.id} role={free ? 'button' : undefined} tabIndex={free ? 0 : undefined} aria-label={`${s.spaceNumber}, ${WORD[s.status]}`}
              className={free ? 'cursor-pointer outline-none transition hover:opacity-80 focus-visible:opacity-80' : ''}
              onClick={free ? () => onPick(s) : undefined} onKeyDown={free ? e => (e.key === 'Enter' || e.key === ' ') && onPick(s) : undefined}>
              <title>{`${s.spaceNumber}: ${WORD[s.status]}${free ? ' (click to reserve)' : ''}`}</title>
              <rect x={x} y={y} width={bw} height={bh} rx="5" fill={c} fillOpacity={free ? 0.12 : 0.1} stroke={c} strokeWidth="1.5" strokeDasharray={free ? '5 4' : undefined} />
              {s.status === 'BOOKED' && <Parked x={x} y={y} w={bw} h={bh} type={s.vehicleType} />}
              {free && <text x={x + bw / 2} y={y + bh / 2 + 2} textAnchor="middle" fontSize="20" fontWeight="800" fill={c} fontFamily="Manrope, sans-serif">P</text>}
              {s.status === 'UNAVAILABLE' && <path d={`M${x + bw * 0.3} ${y + bh * 0.3} L${x + bw * 0.7} ${y + bh * 0.62} M${x + bw * 0.7} ${y + bh * 0.3} L${x + bw * 0.3} ${y + bh * 0.62}`} stroke={c} strokeWidth="2" strokeLinecap="round" />}
              <text x={x + bw / 2} y={y + bh - 5} textAnchor="middle" fontSize="9" fontWeight="700" fill={c} fontFamily="Manrope, sans-serif">{s.spaceNumber}</text>
            </g>)
        })())}
    </svg>
  )
}

const Swatch = ({ c, label, n }) => <span className="flex items-center gap-1.5 text-xs text-soft"><i className="inline-block h-3 w-3 rounded border" style={{ borderColor: c, background: `${c}33` }} />{label}{n != null && <b className="text-ink">{n}</b>}</span>

/** Slot map for the selected lot. Refreshes live (WebSocket tick) and whenever the time window changes. */
export default function SlotPanel({ lot, start, end, tick, onPickSlot }) {
  const [slots, setSlots] = useState(null); const [err, setErr] = useState('')
  const iso = v => new Date(v).toISOString()
  useEffect(() => { setSlots(null) }, [lot?.id])
  useEffect(() => {
    if (!lot) return
    if (new Date(end) <= new Date(start)) { setErr('Pick an end time after the start time.'); return }
    setErr('')
    api.get(`/parking-lots/${lot.id}/slots`, { params: { start: iso(start), end: iso(end) } }).then(r => setSlots(r.data)).catch(() => setErr("Couldn't load the slot map. Check that the backend is up to date."))
  }, [lot?.id, start, end, tick]) // eslint-disable-line
  const count = st => slots?.filter(s => s.status === st).length ?? 0
  const fmt = s => new Date(s).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <aside className="card flex flex-col gap-3 p-4 xl:h-[460px] xl:overflow-y-auto" aria-label="Slot map">
      {!lot ? (
        <div className="grid min-h-[200px] place-items-center text-center text-sm text-mute"><div><MapPin className="mx-auto mb-2 text-dim" size={28} aria-hidden="true" />Select a lot from the list or the map to see its parking slots.</div></div>
      ) : (<>
        <div><h3 className="truncate font-bold">{lot.name}</h3><p className="text-xs text-mute">{fmt(start)} to {fmt(end)}</p></div>
        {err ? <p className="rounded-lg bg-amber-500/15 px-3 py-2 text-sm text-amber-200" role="alert">{err}</p>
          : slots === null ? <div className="h-48 animate-pulse rounded-xl bg-raised" />
          : slots.length === 0 ? <p className="rounded-xl border border-dashed border-line p-4 text-center text-sm text-mute">This lot has no spaces yet.</p>
          : <>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <Swatch c={COLOR.AVAILABLE} label="Free" n={count('AVAILABLE')} /><Swatch c={COLOR.BOOKED} label="Booked" n={count('BOOKED')} /><Swatch c={COLOR.UNAVAILABLE} label="Unavailable" n={count('UNAVAILABLE')} />
            </div>
            <SlotDiagram slots={slots} onPick={onPickSlot} />
            <p className="text-xs text-dim">Drawn from live booking data for your chosen time. Click a green bay to reserve it.</p>
          </>}
      </>)}
    </aside>
  )
}
