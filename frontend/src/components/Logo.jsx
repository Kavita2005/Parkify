export default function Logo({ tagline = true }) {
  return (
    <span className="flex items-center gap-3">
      <svg width="34" height="40" viewBox="0 0 40 48" aria-hidden="true"><path d="M20 47C20 47 3 30 3 18a17 17 0 0 1 34 0c0 12-17 29-17 29z" fill="#1a6dff" /><text x="20" y="25" textAnchor="middle" fontSize="19" fontWeight="800" fill="#fff" fontFamily="Manrope, sans-serif">P</text></svg>
      <span className="flex flex-col leading-tight"><span className="text-[22px] font-extrabold tracking-tight">Parkify</span>
        {tagline && <span className="hidden text-[11px] text-mute xl:block">Smart Parking <span className="mx-1 text-dim">•</span> Every Vehicle <span className="mx-1 text-dim">•</span> Every Time</span>}</span>
    </span>
  )
}
