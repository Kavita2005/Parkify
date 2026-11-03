import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api, errMsg } from '../api'
import LocationPicker from './LocationPicker.jsx'
import LotEditor from './LotEditor.jsx'
import { VEHICLES, VehicleIcon, vlabel } from '../vehicles.jsx'

export default function Owner({ tick }) {
  const [f, setF] = useState({ name: '', address: '', latitude: 18.5204, longitude: 73.8567 })
  const [groups, setGroups] = useState([{ vehicleType: 'CAR', count: 10, hourlyRate: 30 }])
  const [editing, setEditing] = useState(null); const [stats, setStats] = useState(null); const [lots, setLots] = useState([]); const [recent, setRecent] = useState([]); const [msg, setMsg] = useState('')
  const set = k => e => setF({ ...f, [k]: e.target.value })
  const setG = (i, k) => e => setGroups(groups.map((g, j) => j === i ? { ...g, [k]: e.target.value } : g))
  const unused = VEHICLES.filter(v => !groups.some(g => g.vehicleType === v.id))
  const load = () => Promise.all([api.get('/owner/analytics'), api.get('/owner/parking-lots'), api.get('/owner/bookings')])
    .then(([a, l, b]) => { setStats(a.data); setLots(l.data); setRecent(b.data) }).catch(e => setMsg(errMsg(e)))
  useEffect(() => { load() }, [tick])
  const submit = async e => {
    e.preventDefault()
    try {
      await api.post('/owner/parking-lots', { ...f, latitude: +f.latitude, longitude: +f.longitude,
        spaces: groups.map(g => ({ vehicleType: g.vehicleType, count: +g.count, hourlyRate: +g.hourlyRate })) })
      setMsg('Lot submitted. It will appear to drivers after an admin approves it.'); load()
    } catch (x) { setMsg(errMsg(x)) }
  }
  const tiles = stats ? [['Lots', stats.facilities], ['Spaces', stats.spaces], ['Bookings', stats.bookings], ['Inside now', stats.inside], ['Revenue', `₹${stats.revenue}`]] : []
  return (
    <section>
      <h1 className="mb-5 text-3xl font-extrabold">My lots</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {tiles.map(([k, v]) => <div key={k} className="card p-4"><p className="text-xs font-bold text-mute">{k}</p><p className="mt-1 text-3xl font-extrabold">{v}</p></div>)}
      </div>
      <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
        <div className="card p-5"><h2 className="font-bold">Bookings per day</h2>
          {stats?.daily?.length ? <div className="mt-3 h-60"><ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.daily}><CartesianGrid stroke="#27272d" vertical={false} /><XAxis dataKey="day" tickFormatter={d => d.slice(5)} tick={{ fill: '#8d8d97', fontSize: 12 }} stroke="#27272d" /><YAxis allowDecimals={false} width={28} tick={{ fill: '#8d8d97', fontSize: 12 }} stroke="#27272d" /><Tooltip cursor={{ fill: 'rgba(255,255,255,.04)' }} contentStyle={{ background: '#111114', border: '1px solid #27272d', borderRadius: 12, color: '#f4f4f5' }} />
              <Bar dataKey="bookings" fill="#5b86ff" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
            : <p className="py-10 text-center text-sm text-mute">No bookings yet. They'll show here once drivers reserve your spaces.</p>}</div>
        <form className="card flex flex-col gap-3 p-5" onSubmit={submit}>
          <h2 className="font-bold">Add a parking lot</h2>
          <label className="label">Name<input className="input" value={f.name} onChange={set('name')} required /></label>
          <label className="label">Address<input className="input" value={f.address} onChange={set('address')} required /></label>
          <LocationPicker lat={parseFloat(f.latitude)} lng={parseFloat(f.longitude)} onPick={(la, ln) => setF({ ...f, latitude: la.toFixed(6), longitude: ln.toFixed(6) })} />
          <div className="grid grid-cols-2 gap-3"><label className="label">Latitude<input className="input" type="number" step="any" value={f.latitude} onChange={set('latitude')} /></label>
            <label className="label">Longitude<input className="input" type="number" step="any" value={f.longitude} onChange={set('longitude')} /></label></div>
          <fieldset className="flex min-w-0 flex-col gap-3 rounded-2xl border border-line p-3"><legend className="px-1.5 text-xs font-bold text-mute">Spaces by vehicle type</legend>
            {groups.map((g, i) => (
              <div key={g.vehicleType} className="grid grid-cols-2 items-end gap-3 border-b border-dashed border-line pb-3 last:border-0 last:pb-0">
                <b className="col-span-2 flex items-center gap-2 text-sm"><span className="text-brand-500"><VehicleIcon id={g.vehicleType} size={18} /></span>{vlabel(g.vehicleType)}</b>
                <label className="label">Spaces<input className="input" type="number" min="1" inputMode="numeric" value={g.count} onChange={setG(i, 'count')} /></label>
                <label className="label">₹ per hour<input className="input" type="number" min="0" inputMode="numeric" value={g.hourlyRate} onChange={setG(i, 'hourlyRate')} /></label>
                {groups.length > 1 && <button type="button" className="btn btn-ghost btn-sm col-span-2" onClick={() => setGroups(groups.filter((_, j) => j !== i))}>Remove {vlabel(g.vehicleType)}</button>}
              </div>))}
            {unused.length > 0 && <label className="label">Add another type<select className="input" value="" onChange={e => e.target.value && setGroups([...groups, { vehicleType: e.target.value, count: 5, hourlyRate: 20 }])}>
              <option value="">Choose…</option>{unused.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}</select></label>}
          </fieldset>
          {msg && <p className="rounded-xl bg-brand-500/15 px-3 py-2 text-sm font-medium text-brand-100" role="status">{msg}</p>}
          <button className="btn btn-primary h-12">Add lot</button>
        </form>
      </div>
      <h2 className="mb-3 mt-8 text-xl font-extrabold">Your lots</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {lots.map(l => (
          <article key={l.id} className="card pop flex flex-col gap-2 p-5">
            <div className="flex items-start justify-between gap-2"><div><h3 className="text-lg font-bold">{l.name}</h3><p className="text-xs text-mute">{l.address}</p></div><span className={`pill ${l.status === 'ACTIVE' ? 'bg-emerald-500/15 text-emerald-300' : l.status === 'PENDING' ? 'bg-amber-500/15 text-amber-200' : 'bg-rose-500/15 text-rose-300'}`}>{l.status === 'PENDING' ? 'Awaiting approval' : l.status === 'ACTIVE' ? 'Live' : 'Suspended'}</span></div>
            <p className="text-sm">{l.spaces} spaces · from ₹{l.hourlyRate}/hr</p>
            <div className="flex flex-wrap gap-1.5">{(l.vehicleTypes || '').split(',').filter(Boolean).map(t => <span key={t} className="pill bg-brand-500/15 text-brand-200"><VehicleIcon id={t} size={13} />{vlabel(t)}</span>)}</div>
            <button className="btn btn-sm mt-1" onClick={() => setEditing(l.id)}>Edit lot</button>
          </article>))}
        {!lots.length && <p className="card border-dashed p-8 text-center text-sm text-mute md:col-span-2 lg:col-span-3">You haven't added a lot yet.</p>}
      </div>
      <h2 className="mb-3 mt-8 text-xl font-extrabold">Recent bookings</h2>
      <div className="card divide-y divide-line">
        {recent.map(b => (
          <div key={b.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-4 text-sm">
            <span className="text-brand-500"><VehicleIcon id={b.vehicleType} size={18} /></span>
            <b className="min-w-0 flex-1 truncate">{b.driverName}</b>
            <span className="text-mute">{b.lotName} · {b.spaceNumber}</span>
            <span className="text-mute">{new Date(b.startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
            <b>₹{b.totalAmount}</b><span className="pill bg-raised text-soft">{b.status.replace('_', ' ').toLowerCase()}</span>
          </div>))}
        {!recent.length && <p className="p-8 text-center text-sm text-mute">No bookings yet.</p>}
      </div>
      {editing && <LotEditor lotId={editing} onClose={() => setEditing(null)} onChanged={load} />}
    </section>
  )
}
