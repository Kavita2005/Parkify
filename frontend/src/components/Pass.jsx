import { QRCodeSVG } from 'qrcode.react'

/** QR pass. The QR sits on a white tile on purpose: scanners need dark-on-light contrast. */
export default function Pass({ token, kind = 'entry' }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-raised p-5 text-center">
      <p className="text-xs font-bold uppercase tracking-widest text-brand-500">{kind === 'exit' ? 'Exit pass' : 'Entry pass'}</p>
      <div className="rounded-xl bg-white p-3"><QRCodeSVG value={`PKFY:${token}`} size={176} level="M" /></div>
      <p className="font-mono text-lg font-bold tracking-[0.25em]">{token}</p>
      <p className="text-xs text-mute">{kind === 'exit' ? 'Show this at the exit gate when you leave.' : 'Show this at the entry gate when you arrive.'}</p>
    </div>
  )
}
