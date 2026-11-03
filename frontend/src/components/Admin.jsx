import { useEffect, useState } from 'react'
import { api, errMsg } from '../api'

const tone = { ACTIVE: 'bg-emerald-500/15 text-emerald-300', PENDING: 'bg-amber-500/15 text-amber-200', SUSPENDED: 'bg-rose-500/15 text-rose-300' }

function Overview({ tick }) {
  const [s, setS] = useState(null)
  useEffect(() => { api.get('/admin/stats').then(r => setS(r.data)) }, [tick])
  if (!s) return <p className="py-10 text-center text-mute">Loading…</p>
  const group = (title, rows) => (
    <div className="card p-5"><h3 className="font-bold">{title}</h3>
      <ul className="mt-3 flex flex-col gap-2">{rows.map(r => <li key={r.label} className="flex justify-between text-sm"><span className="text-mute">{r.label.replace('_', ' ').toLowerCase()}</span><b>{r.n}</b></li>)}
        {!rows.length && <li className="text-sm text-dim">Nothing yet</li>}</ul></div>)
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <div className="card p-5"><p className="text-xs font-bold text-mute">Revenue (paid online)</p><p className="mt-1 text-3xl font-extrabold">₹{s.revenue}</p></div>
      {group('Users', s.users)}{group('Parking lots', s.lots)}{group('Bookings', s.bookings)}{group('Payments', s.payments || [])}{group('Refunds', s.refunds || [])}
    </div>
  )
}

function Lots() {
  const [rows, setRows] = useState([]); const [err, setErr] = useState('')
  const load = () => api.get('/admin/lots').then(r => setRows(r.data)).catch(e => setErr(errMsg(e)))
  useEffect(() => { load() }, [])
  const set = (id, status) => api.post(`/admin/lots/${id}/status`, { status }).then(load).catch(e => setErr(errMsg(e)))
  return (
    <div>{err && <p className="mb-3 text-sm text-rose-300">{err}</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map(l => (
          <article key={l.id} className="card flex flex-col gap-3 p-5">
            <div className="flex items-start justify-between gap-2"><div><h3 className="text-lg font-bold">{l.name}</h3><p className="text-xs text-mute">{l.address}</p></div><span className={`pill ${tone[l.status] || ''}`}>{l.status}</span></div>
            <p className="text-sm text-soft">{l.spaces} spaces · by {l.ownerName} <span className="text-dim">({l.ownerEmail})</span></p>
            <div className="flex gap-2">
              {l.status === 'PENDING' && <><button className="btn btn-primary btn-sm" onClick={() => set(l.id, 'ACTIVE')}>Approve</button><button className="btn btn-sm" onClick={() => set(l.id, 'SUSPENDED')}>Reject</button></>}
              {l.status === 'ACTIVE' && <button className="btn btn-sm" onClick={() => set(l.id, 'SUSPENDED')}>Suspend</button>}
              {l.status === 'SUSPENDED' && <button className="btn btn-sm" onClick={() => set(l.id, 'ACTIVE')}>Reactivate</button>}
            </div>
          </article>))}
        {!rows.length && <p className="card border-dashed p-8 text-center text-sm text-mute md:col-span-2">No parking lots yet.</p>}
      </div></div>
  )
}

function Users() {
  const [rows, setRows] = useState([]); const [err, setErr] = useState('')
  const load = () => api.get('/admin/users').then(r => setRows(r.data)).catch(e => setErr(errMsg(e)))
  useEffect(() => { load() }, [])
  const toggle = u => api.post(`/admin/users/${u.id}/enabled`, { enabled: !u.enabled }).then(load).catch(e => setErr(errMsg(e)))
  const label = { DRIVER: 'Driver', OWNER: 'Lot provider', ADMIN: 'Admin' }
  return (
    <div>{err && <p className="mb-3 text-sm text-rose-300">{err}</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map(u => (
          <article key={u.id} className={`card flex items-center gap-3 p-4 ${u.enabled ? '' : 'opacity-60'}`}>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-500/15 font-bold text-brand-200">{u.name?.[0]?.toUpperCase()}</span>
            <div className="min-w-0 flex-1"><p className="truncate font-semibold">{u.name}</p><p className="truncate text-xs text-mute">{u.email}</p></div>
            <span className="pill bg-raised text-soft">{label[u.role]}</span>
            {u.role !== 'ADMIN' && <button className="btn btn-sm" onClick={() => toggle(u)}>{u.enabled ? 'Disable' : 'Enable'}</button>}
          </article>))}
      </div></div>
  )
}

export default function Admin({ tick }) {
  const [tab, setTab] = useState('overview')
  return (
    <section>
      <h1 className="mb-4 text-3xl font-extrabold">Admin</h1>
      <div className="mb-5 inline-flex rounded-xl border border-line bg-surface p-1" role="tablist">
        {[['overview', 'Overview'], ['lots', 'Parking lots'], ['users', 'Users']].map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`h-9 rounded-lg px-4 text-sm font-bold ${tab === k ? 'bg-raised text-ink' : 'text-mute'}`}>{l}</button>))}
      </div>
      {tab === 'overview' && <Overview tick={tick} />}{tab === 'lots' && <Lots />}{tab === 'users' && <Users />}
    </section>
  )
}
