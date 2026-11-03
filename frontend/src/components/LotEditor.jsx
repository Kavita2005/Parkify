import { useEffect, useState } from 'react'
import { api, errMsg } from '../api'
import { VEHICLES, VehicleIcon, vlabel } from '../vehicles.jsx'
import Sheet from './Sheet.jsx'
import LocationPicker from './LocationPicker.jsx'

const ORDER = [...VEHICLES.map(v => v.id), 'SUV']

/** Lot providers edit their lot: details and map pin, price per vehicle type, switching spaces on/off, adding spaces. */
export default function LotEditor({ lotId, onClose, onChanged }) {
  const [data, setData] = useState(null); const [f, setF] = useState(null); const [msg, setMsg] = useState({ text: '', ok: true })
  const [prices, setPrices] = useState({}); const [add, setAdd] = useState({ vehicleType: 'CAR', count: 5, hourlyRate: 30 })
  const load = () => api.get(`/owner/parking-lots/${lotId}`).then(r => {
    setData(r.data); setF(p => p || { name: r.data.lot.name, address: r.data.lot.address, latitude: r.data.lot.latitude, longitude: r.data.lot.longitude })
  }).catch(e => setMsg({ text: errMsg(e), ok: false }))
  useEffect(() => { load() }, [lotId]) // eslint-disable-line
  const run = async (fn, okText) => {
    setMsg({ text: '', ok: true })
    try { await fn(); await load(); onChanged(); setMsg({ text: okText, ok: true }) } catch (e) { setMsg({ text: errMsg(e), ok: false }) }
  }
  if (!data || !f) return <Sheet onClose={onClose} label="Edit lot" wide><p className="py-10 text-center text-mute">{msg.text || 'Loading…'}</p></Sheet>
  const groups = ORDER.map(t => ({ t, items: data.spaces.filter(s => s.vehicleType === t) })).filter(g => g.items.length)

  return (
    <Sheet onClose={onClose} label="Edit lot" wide>
      <h2 className="pr-10 text-xl font-extrabold">Edit lot</h2>
      {msg.text && <p className={`rounded-lg px-3 py-2 text-sm font-medium ${msg.ok ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`} role="status">{msg.text}</p>}

      <section className="flex flex-col gap-3">
        <h3 className="font-bold">Lot details</h3>
        <label className="label">Name<input className="input" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></label>
        <label className="label">Address<input className="input" value={f.address} onChange={e => setF({ ...f, address: e.target.value })} /></label>
        <LocationPicker lat={parseFloat(f.latitude)} lng={parseFloat(f.longitude)} onPick={(la, ln) => setF({ ...f, latitude: la.toFixed(6), longitude: ln.toFixed(6) })} />
        <button className="btn btn-primary" onClick={() => run(() => api.put(`/owner/parking-lots/${lotId}`, { ...f, latitude: +f.latitude, longitude: +f.longitude }), 'Lot details saved.')}>Save details</button>
      </section>

      <section className="flex flex-col gap-3 border-t border-line pt-4">
        <h3 className="font-bold">Prices and spaces</h3>
        <p className="text-xs text-mute">Tap a space to switch it off (for example for maintenance) or back on. A space with upcoming bookings can't be switched off. New prices apply to new bookings only.</p>
        {groups.map(g => {
          const rate = prices[g.t] ?? g.items[0].hourlyRate
          return (
            <div key={g.t} className="rounded-xl border border-line p-3">
              <div className="flex flex-wrap items-center gap-3">
                <b className="flex items-center gap-2"><span className="text-brand-500"><VehicleIcon id={g.t} size={18} /></span>{vlabel(g.t)}
                  <span className="text-xs font-normal text-mute">{g.items.filter(s => s.active).length} of {g.items.length} on</span></b>
                <div className="ml-auto flex items-center gap-2"><span className="text-xs text-mute">₹/hr</span>
                  <input className="input h-9 w-24" type="number" min="0" value={rate} onChange={e => setPrices({ ...prices, [g.t]: e.target.value })} aria-label={`${vlabel(g.t)} price per hour`} />
                  <button className="btn btn-sm" onClick={() => run(() => api.put(`/owner/parking-lots/${lotId}/prices`, { vehicleType: g.t, hourlyRate: +rate }), `${vlabel(g.t)} price updated.`)}>Update</button></div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {g.items.map(s => (
                  <button key={s.id} onClick={() => run(() => api.put(`/owner/spaces/${s.id}`, { active: !s.active }), `${s.spaceNumber} switched ${s.active ? 'off' : 'on'}.`)}
                    title={s.active ? 'On: tap to switch off' : 'Off: tap to switch on'}
                    className={`h-9 rounded-lg border px-2.5 text-xs font-bold ${s.active ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300' : 'border-line bg-raised text-dim line-through'}`}>{s.spaceNumber}</button>))}
              </div>
            </div>)
        })}
      </section>

      <section className="flex flex-col gap-3 border-t border-line pt-4">
        <h3 className="font-bold">Add spaces</h3>
        <div className="grid grid-cols-3 gap-2">
          <label className="label min-w-0">Vehicle<select className="input" value={add.vehicleType} onChange={e => setAdd({ ...add, vehicleType: e.target.value })}>{VEHICLES.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}</select></label>
          <label className="label min-w-0">How many<input className="input" type="number" min="1" value={add.count} onChange={e => setAdd({ ...add, count: e.target.value })} /></label>
          <label className="label min-w-0">₹ per hour<input className="input" type="number" min="0" value={add.hourlyRate} onChange={e => setAdd({ ...add, hourlyRate: e.target.value })} /></label>
        </div>
        <button className="btn" onClick={() => run(() => api.post(`/owner/parking-lots/${lotId}/spaces`, { vehicleType: add.vehicleType, count: +add.count, hourlyRate: +add.hourlyRate }), 'Spaces added.')}>Add spaces</button>
      </section>
    </Sheet>
  )
}
