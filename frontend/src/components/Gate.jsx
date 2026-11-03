import { useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, CircleAlert, LogIn, LogOut } from 'lucide-react'
import { api, errMsg } from '../api'
import { VehicleIcon, vlabel } from '../vehicles.jsx'

const t = s => new Date(s).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

/** Gate console for lot providers: scan or type a driver's QR pass to record entry or exit. Shows who is inside right now. */
export default function Gate({ tick }) {
  const [code, setCode] = useState(''); const [lastCode, setLastCode] = useState(''); const [result, setResult] = useState(null); const [err, setErr] = useState('')
  const [inside, setInside] = useState([]); const [scanning, setScanning] = useState(false)
  const video = useRef(null); const stream = useRef(null); const timer = useRef(null)
  const canScan = typeof window !== 'undefined' && 'BarcodeDetector' in window

  const loadInside = () => api.get('/owner/inside').then(r => setInside(r.data)).catch(() => {})
  useEffect(() => { loadInside() }, [tick])

  const submit = async (c, collectedAtGate = false) => {
    setErr(''); setResult(null); setLastCode(c)
    try { setResult((await api.post('/gate/scan', { code: c, collectedAtGate })).data); setCode(''); loadInside() } catch (e) { setErr(errMsg(e)) }
  }
  const stop = () => { clearInterval(timer.current); stream.current?.getTracks().forEach(x => x.stop()); stream.current = null; setScanning(false) }
  const start = async () => {
    setErr('')
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      setScanning(true); await new Promise(r => setTimeout(r, 80))
      video.current.srcObject = stream.current; await video.current.play()
      const det = new window.BarcodeDetector({ formats: ['qr_code'] })
      timer.current = setInterval(async () => { try { const f = await det.detect(video.current); if (f[0]) { stop(); submit(f[0].rawValue) } } catch { /* keep trying */ } }, 350)
    } catch { setErr('Could not open the camera. Allow camera access, or type the pass code instead.'); stop() }
  }
  useEffect(() => () => stop(), []) // eslint-disable-line

  return (
    <section>
      <h1 className="mb-1 text-3xl font-extrabold">Gate</h1>
      <p className="mb-5 text-mute">Scan a driver's pass to let them in or out.</p>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="card flex flex-col gap-4 p-5">
          {scanning ? <div className="overflow-hidden rounded-2xl border border-line bg-black"><video ref={video} className="aspect-square w-full object-cover" muted playsInline /></div>
            : canScan ? <button className="btn btn-primary h-14" onClick={start}><Camera size={20} />Scan QR with camera</button>
            : <p className="flex items-start gap-2 rounded-xl bg-amber-500/15 px-3 py-2.5 text-sm text-amber-200"><CameraOff size={18} className="mt-0.5 shrink-0" />Camera scanning isn't supported in this browser. Use Chrome, or type the code below.</p>}
          {scanning && <button className="btn" onClick={stop}>Stop camera</button>}
          <form className="flex gap-2" onSubmit={e => { e.preventDefault(); if (code.trim()) submit(code) }}>
            <input className="input font-mono uppercase tracking-widest" aria-label="Pass code" placeholder="Type the pass code" value={code} onChange={e => setCode(e.target.value)} />
            <button className="btn btn-primary">Check</button>
          </form>
          {err && <div className="flex items-start gap-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4" role="alert"><CircleAlert className="mt-0.5 shrink-0 text-rose-300" /><p className="font-semibold text-rose-200">{err}</p></div>}
          {result && (
            <div className={`rounded-2xl border p-4 ${result.result === 'ENTRY_OK' ? 'border-emerald-500/40 bg-emerald-500/10' : result.result === 'FEE_DUE' ? 'border-amber-500/50 bg-amber-500/10' : 'border-brand-500/40 bg-brand-500/10'}`} role="status">
              <div className="flex items-center gap-3">
                {result.result === 'ENTRY_OK' ? <LogIn className="text-emerald-300" size={28} /> : result.result === 'FEE_DUE' ? <CircleAlert className="text-amber-300" size={28} /> : <LogOut className="text-brand-300" size={28} />}
                <div><p className="text-xl font-extrabold">{result.result === 'ENTRY_OK' ? 'Entry allowed' : result.result === 'FEE_DUE' ? `Pay ₹${result.dueAmount} to exit` : 'Exit allowed'}</p><p className="text-sm text-soft">{result.message}</p></div>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div><dt className="text-xs text-mute">Driver</dt><dd className="font-semibold">{result.driverName}</dd></div>
                <div><dt className="text-xs text-mute">Space</dt><dd className="font-semibold">{result.spaceNumber} · {vlabel(result.vehicleType)}</dd></div>
                <div><dt className="text-xs text-mute">Booked</dt><dd className="font-semibold">{t(result.startTime)} to {t(result.endTime)}</dd></div>
                {Number(result.refundAmount) > 0 && <div><dt className="text-xs text-mute">Refund to driver</dt><dd className="font-bold text-emerald-300">₹{result.refundAmount}</dd></div>}
                {Number(result.extraAmount) > 0 && result.result === 'EXIT_OK' && <div><dt className="text-xs text-mute">Overstay settled</dt><dd className="font-bold text-amber-200">₹{result.extraAmount}</dd></div>}
              </dl>
              {result.result === 'FEE_DUE' && <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <button className="btn flex-1" onClick={() => submit(lastCode)}>Driver paid in app: check again</button>
                <button className="btn btn-primary flex-1" onClick={() => submit(lastCode, true)}>Collected ₹{result.dueAmount} at gate: allow exit</button></div>}
            </div>)}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between"><h2 className="font-bold">Inside now</h2><span className="pill bg-brand-500/15 text-brand-200">{inside.length}</span></div>
          <ul className="mt-3 flex flex-col gap-2">
            {inside.map(v => {
              const over = new Date(v.endTime) < new Date()
              return (
                <li key={v.id} className="flex items-center gap-3 rounded-xl border border-line bg-raised p-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500/15 text-brand-500"><VehicleIcon id={v.vehicleType} size={20} /></span>
                  <div className="min-w-0 flex-1"><p className="truncate font-semibold">{v.driverName} · {v.spaceNumber}</p><p className="text-xs text-mute">{v.lotName} · in {t(v.checkedInAt)} · until {t(v.endTime)}</p></div>
                  {over && <span className="pill bg-amber-500/15 text-amber-200">Overstay</span>}
                </li>)
            })}
            {!inside.length && <li className="py-8 text-center text-sm text-mute">No vehicles inside right now.</li>}
          </ul>
        </div>
      </div>
    </section>
  )
}
