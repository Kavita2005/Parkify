import { Building2, ShieldCheck, User } from 'lucide-react'
import Footer from './Footer.jsx'

const roles = [
  [User, 'Drivers', 'Search by vehicle type and time, pay online, and use a QR pass to enter and leave.'],
  [Building2, 'Lot providers', 'List your lot, set spaces and prices per vehicle type, and scan passes at the gate.'],
  [ShieldCheck, 'Admins', 'Approve new lots, manage users, and keep an eye on bookings and payments.'],
]
export default function About({ go }) {
  return (
    <div>
      <div className="mx-auto max-w-[1100px] px-5 py-12">
        <h1 className="text-4xl font-extrabold">About Parkify</h1>
        <p className="mt-3 max-w-2xl text-lg text-soft">Parkify helps drivers find and reserve parking that actually fits their vehicle, and helps parking owners run their lots with live availability and contactless entry and exit.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {roles.map(([I, t, d]) => (
            <div key={t} className="card p-6"><span className="grid h-11 w-11 place-items-center rounded-full bg-brand-600/15 text-brand-500"><I size={20} aria-hidden="true" /></span>
              <h2 className="mt-4 text-lg font-bold">{t}</h2><p className="mt-1 text-sm text-mute">{d}</p></div>))}
        </div>
      </div>
      <Footer go={go} />
    </div>
  )
}
