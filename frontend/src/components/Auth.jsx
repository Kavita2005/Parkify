import { useState } from 'react'
import { api, errMsg } from '../api'

export default function Auth({ onDone, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode)
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'DRIVER' })
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const set = k => e => setF({ ...f, [k]: e.target.value })
  const submit = async e => {
    e.preventDefault(); setErr(''); setBusy(true)
    try { onDone((await api.post(`/auth/${mode}`, f)).data) } catch (x) { setErr(errMsg(x)) } finally { setBusy(false) }
  }
  return (
    <div className="mx-auto grid max-w-5xl items-center gap-10 px-5 py-10 md:grid-cols-[1fr_420px] md:py-20">
      <div className="hidden md:block">
        <h1 className="text-5xl font-extrabold leading-[1.05]">Welcome to <span className="text-brand-500">Parkify</span></h1>
        <p className="mt-4 max-w-sm text-lg text-soft">Reserve a space in seconds, or list your own lot and manage it from one dashboard.</p>
      </div>
      <form className="card pop flex flex-col gap-4 p-6 shadow-lift" onSubmit={submit}>
        <div className="grid grid-cols-2 rounded-xl bg-raised p-1" role="tablist">
          {[['login', 'Log in'], ['register', 'Sign up']].map(([k, l]) => (
            <button type="button" key={k} role="tab" aria-selected={mode === k} onClick={() => setMode(k)}
              className={`h-10 rounded-lg text-sm font-bold ${mode === k ? 'bg-raised text-ink' : 'text-mute'}`}>{l}</button>))}
        </div>
        {mode === 'register' && <label className="label">Name<input className="input" value={f.name} onChange={set('name')} required autoComplete="name" /></label>}
        <label className="label">Email<input className="input" type="email" value={f.email} onChange={set('email')} required autoComplete="email" placeholder="name@example.com" /></label>
        <label className="label">Password<input className="input" type="password" minLength={8} value={f.password} onChange={set('password')} required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>
        {mode === 'register' && <label className="label">I want to
          <select className="input" value={f.role} onChange={set('role')}><option value="DRIVER">Find and book parking</option><option value="OWNER">Provide parking (lot provider)</option></select></label>}
        {err && <p className="rounded-lg bg-rose-500/15 px-3 py-2 text-sm font-medium text-rose-300" role="alert">{err}</p>}
        <button className="btn btn-primary h-12" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}</button>
      </form>
    </div>
  )
}
