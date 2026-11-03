import { useEffect, useState } from 'react'
import { api } from '../api'
import { VEHICLES, VehicleIcon } from '../vehicles.jsx'
import Footer from './Footer.jsx'

export default function Pricing({ go }) {
  const [lots, setLots] = useState(null)
  useEffect(() => { api.get('/parking-lots').then(r => setLots(r.data)).catch(() => setLots([])) }, [])
  return (
    <div>
      <div className="mx-auto max-w-[1100px] px-5 py-12">
        <h1 className="text-4xl font-extrabold">Pricing</h1>
        <p className="mt-2 max-w-2xl text-soft">Each parking lot sets its own hourly price for every vehicle type. You always see the total before you pay. Here is what is available right now.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {VEHICLES.map(v => {
            const rates = (lots || []).map(l => l.types[v.id]?.rate).filter(r => r != null)
            return (
              <div key={v.id} className="card flex flex-col gap-3 p-5">
                <span className={`grid h-11 w-11 place-items-center rounded-full text-white ${v.bg}`}><VehicleIcon id={v.id} size={22} /></span>
                <div><p className="font-bold">{v.name}</p><p className="text-xs text-mute">{v.hint}</p></div>
                {lots === null ? <div className="h-8 animate-pulse rounded bg-raised" /> : rates.length
                  ? <p><span className="text-xs text-mute">From </span><b className="text-2xl font-extrabold">₹{Math.min(...rates)}</b><span className="text-xs text-mute"> / hour</span><span className="mt-0.5 block text-xs text-mute">{rates.length} {rates.length === 1 ? 'lot' : 'lots'}</span></p>
                  : <p className="text-sm text-dim">No lots yet</p>}
                <button className="btn btn-sm mt-auto" onClick={() => go('find', { vehicle: v.id })}>Find parking</button>
              </div>)
          })}
        </div>
      </div>
      <Footer go={go} />
    </div>
  )
}
