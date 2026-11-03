const SIZE = { car: [32, 58], ev: [32, 58], van: [34, 62], truck: [36, 72], bus: [38, 74], bike: [12, 40] }

function Veh({ cx, cy, color, kind, flip }) {
  const [w, h] = SIZE[kind]
  return (
    <g transform={`translate(${cx} ${cy})${flip ? ' rotate(180)' : ''}`}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={kind === 'bike' ? 6 : 9} fill={color} />
      {kind === 'bike' ? <>
        <rect x={-9} y={-h / 2 + 8} width={18} height={3} rx={1.5} fill="#0b1220" />
        <rect x={-3} y={-4} width={6} height={14} rx={3} fill="rgba(0,0,0,.35)" />
      </> : <>
        <rect x={-w * 0.36} y={-h * 0.32} width={w * 0.72} height={h * 0.18} rx={3} fill="rgba(5,11,23,.8)" />
        {kind === 'bus'
          ? [0, 1, 2, 3].map(i => <rect key={i} x={-w * 0.36} y={-h * 0.1 + i * h * 0.15} width={w * 0.72} height={h * 0.09} rx={2} fill="rgba(5,11,23,.55)" />)
          : <rect x={-w * 0.34} y={-h * 0.08} width={w * 0.68} height={h * 0.28} rx={4} fill="rgba(0,0,0,.22)" />}
        {kind === 'truck' && <rect x={-w * 0.42} y={h * 0.02} width={w * 0.84} height={h * 0.44} rx={3} fill="rgba(255,255,255,.3)" />}
        {kind === 'ev' && <path d="M1 -2 L-5 6 H0 L-1 12 L5 3 H0 Z" fill="#fff" />}
        <circle cx={-w * 0.28} cy={-h / 2 + 4} r={2.2} fill="#fef9c3" /><circle cx={w * 0.28} cy={-h / 2 + 4} r={2.2} fill="#fef9c3" />
      </>}
    </g>
  )
}

const ROWS = [
  [{ k: 'car', c: '#0ea5e9' }, { free: true }, { k: 'bike', c: '#10b981' }, { k: 'truck', c: '#f97316' }, { k: 'car', c: '#ec4899' }, { k: 'bus', c: '#8b5cf6' }],
  [{ k: 'car', c: '#14b8a6' }, { k: 'ev', c: '#22c55e' }, { free: true, pick: true }, { k: 'van', c: '#f59e0b' }, { k: 'bike', c: '#38bdf8' }, { k: 'car', c: '#0ea5e9' }],
]

/** A drawn night view of a parking lot with different vehicles and one highlighted free space. Decorative only. */
export default function ParkingScene() {
  return (
    <figure className="m-0">
      <svg viewBox="0 0 360 240" className="w-full overflow-hidden rounded-2xl border border-line" role="img" aria-label="Illustration of a parking lot with cars, a bike, a truck, a bus and a van, with one free space highlighted">
        <defs>
          <linearGradient id="ps-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#0c2147" /><stop offset="1" stopColor="#050b17" /></linearGradient>
          <radialGradient id="ps-glow" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#1a6dff" stopOpacity=".35" /><stop offset="1" stopColor="#1a6dff" stopOpacity="0" /></radialGradient>
        </defs>
        <rect width="360" height="240" fill="url(#ps-bg)" />
        <circle cx="180" cy="138" r="120" fill="url(#ps-glow)" />
        <line x1="12" y1="120" x2="348" y2="120" stroke="rgba(255,255,255,.22)" strokeWidth="1.5" strokeDasharray="10 8" />
        {ROWS.map((row, r) => row.map((s, i) => {
          const x = 24 + i * 52, y = r === 0 ? 24 : 138
          return (
            <g key={`${r}-${i}`}>
              <rect x={x + 1} y={y} width={50} height={78} rx={4} fill={s.free ? 'rgba(16,185,129,.10)' : 'rgba(255,255,255,.03)'}
                stroke={s.pick ? '#3d8bff' : s.free ? '#10b981' : 'rgba(255,255,255,.18)'} strokeWidth={s.pick ? 2 : 1.2} strokeDasharray={s.free ? '5 4' : undefined} />
              {s.k && <Veh cx={x + 26} cy={y + 39} color={s.c} kind={s.k} flip={r === 0} />}
              {s.free && <text x={x + 26} y={y + 46} textAnchor="middle" fontSize="20" fontWeight="800" fill={s.pick ? '#3d8bff' : '#10b981'} fontFamily="Manrope, sans-serif">P</text>}
            </g>)
        }))}
        <g transform="translate(154 118)">
          <path d="M0 -15 C-10 -15 -15 -8 -15 -2 C-15 9 0 22 0 22 C0 22 15 9 15 -2 C15 -8 10 -15 0 -15Z" fill="#1a6dff" stroke="#fff" strokeWidth="2" />
          <circle cx="0" cy="-3" r="5" fill="#fff" />
        </g>
      </svg>
    </figure>
  )
}
