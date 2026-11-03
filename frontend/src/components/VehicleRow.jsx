// Side-view vehicles standing on a glowing ground line. Decorative illustration (a bike, a car, an EV and a bus).
const Wheel = ({ cx, cy, r = 10 }) => (
  <g><circle cx={cx} cy={cy} r={r} fill="#060d1c" stroke="#cbd5e1" strokeWidth="2.2" /><circle cx={cx} cy={cy} r={r * 0.35} fill="#94a3b8" /></g>
)

function Bike({ x, color }) {
  return (
    <g transform={`translate(${x} 66)`}>
      <circle cx="13" cy="40" r="11" fill="#060d1c" stroke="#cbd5e1" strokeWidth="2.5" /><circle cx="57" cy="40" r="11" fill="#060d1c" stroke="#cbd5e1" strokeWidth="2.5" />
      <path d="M13 40 L30 22 H46 L57 40" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24 21 H42" stroke="#0b1220" strokeWidth="6" strokeLinecap="round" />
      <path d="M46 22 L51 10 H59" fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx="38" cy="17" rx="10" ry="6" fill={color} />
      <circle cx="61" cy="22" r="2.6" fill="#fef9c3" />
    </g>
  )
}

function Car({ x, color, ev }) {
  return (
    <g transform={`translate(${x} 63)`}>
      <path d="M2 38 Q2 28 12 26 L26 24 L40 6 Q42 4 46 4 H80 Q86 4 90 8 L104 24 L112 27 Q120 29 120 38 V44 H2 Z" fill={color} />
      <path d="M30 24 L42 9 H60 V24 Z" fill="#0b1830" opacity=".85" /><path d="M65 24 V9 H80 Q83 9 85 11 L97 24 Z" fill="#0b1830" opacity=".85" />
      <path d="M6 31 H114" stroke="#fff" strokeOpacity=".2" strokeWidth="2" />
      <rect x="112" y="31" width="7" height="4" rx="2" fill="#fef9c3" />
      {ev && <path d="M62 29 L56 37 H61 L59 44 L67 35 H62 Z" fill="#fff" />}
      <Wheel cx={26} cy={45} /><Wheel cx={96} cy={45} />
    </g>
  )
}

function Bus({ x, color }) {
  return (
    <g transform={`translate(${x} 56)`}>
      <rect x="0" y="2" width="140" height="50" rx="9" fill={color} />
      {[0, 1, 2, 3, 4].map(i => <rect key={i} x={10 + i * 21} y="10" width="16" height="16" rx="3" fill="#0b1830" opacity=".85" />)}
      <path d="M116 10 H130 Q136 10 136 16 V28 H116 Z" fill="#0b1830" opacity=".85" />
      <rect x="0" y="34" width="140" height="3" fill="#fff" fillOpacity=".22" />
      <Wheel cx={30} cy={52} /><Wheel cx={108} cy={52} />
    </g>
  )
}

export default function VehicleRow({ className = '' }) {
  return (
    <svg viewBox="0 0 480 130" className={className} role="presentation" style={{ filter: 'drop-shadow(0 8px 16px rgba(26,109,255,.35))' }}>
      <ellipse cx="240" cy="121" rx="236" ry="6" fill="rgba(61,139,255,.25)" />
      <line x1="0" y1="118.5" x2="480" y2="118.5" stroke="rgba(61,139,255,.6)" strokeWidth="1.5" />
      <Bike x={0} color="#10b981" />
      <Car x={80} color="#0ea5e9" />
      <Car x={208} color="#22c55e" ev />
      <Bus x={338} color="#8b5cf6" />
    </svg>
  )
}
