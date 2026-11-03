import { useEffect, useState } from 'react'
import { CreditCard, Landmark, ShieldCheck, Smartphone } from 'lucide-react'
import { api, errMsg } from '../api'

const METHODS = [['UPI', 'UPI', Smartphone], ['CARD', 'Card', CreditCard], ['NETBANKING', 'Net banking', Landmark]]
const loadRzp = () => new Promise((res, rej) => {
  if (window.Razorpay) return res()
  const s = document.createElement('script'); s.src = 'https://checkout.razorpay.com/v1/checkout.js'
  s.onload = res; s.onerror = () => rej(new Error('Could not load the payment window. Check your internet connection.')); document.body.appendChild(s)
})

/** Pays for a held booking. Test mode = built-in gateway (no real money). Razorpay mode = real checkout. */
export default function PayPanel({ booking, onPaid, purpose = 'BOOKING' }) {
  const [mode, setMode] = useState(null); const [isTest, setIsTest] = useState(false)
  const [method, setMethod] = useState('UPI')
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const deadline = new Date(booking.createdAt).getTime() + 10 * 60e3
  const [left, setLeft] = useState(Math.max(0, Math.floor((deadline - Date.now()) / 1000)))
  useEffect(() => { api.get('/payments/config').then(r => { setMode(r.data.mode); setIsTest(!!r.data.test) }).catch(() => setMode('mock')) }, [])
  useEffect(() => { const t = setInterval(() => setLeft(Math.max(0, Math.floor((deadline - Date.now()) / 1000))), 1000); return () => clearInterval(t) }, [deadline])
  const mm = String(Math.floor(left / 60)).padStart(2, '0'), ss = String(left % 60).padStart(2, '0')

  const pay = async (outcome = 'SUCCESS') => {
    setBusy(true); setErr('')
    try {
      const o = (await api.post('/payments/order', { bookingId: booking.id, purpose })).data
      const confirm = async body => onPaid((await api.post('/payments/confirm', { paymentId: o.paymentId, ...body })).data)
      if (o.mode === 'razorpay') {
        await loadRzp()
        const rz = new window.Razorpay({
          key: o.keyId, order_id: o.orderId, amount: Math.round(o.amount * 100), currency: 'INR', name: 'Parkify',
          description: purpose === 'OVERSTAY' ? `Overstay charge, booking #${booking.id}` : `Parking booking #${booking.id}`, theme: { color: '#1a6dff' },
          prefill: { name: JSON.parse(localStorage.getItem('user') || '{}').name, email: JSON.parse(localStorage.getItem('user') || '{}').email },
          handler: async r => { try { await confirm({ razorpayPaymentId: r.razorpay_payment_id, razorpaySignature: r.razorpay_signature }) } catch (e) { setErr(errMsg(e)) } finally { setBusy(false) } },
          modal: { ondismiss: () => setBusy(false) },
        })
        rz.on('payment.failed', r => { setErr(r.error?.description || 'Payment failed. Try again.'); setBusy(false) })
        rz.open(); return
      }
      await confirm({ method, outcome }); setBusy(false)
    } catch (e) { setErr(errMsg(e)); setBusy(false) }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between rounded-xl border border-line bg-raised px-4 py-3">
        <div><p className="text-xs text-mute">{purpose === 'OVERSTAY' ? 'Overstay charge (final amount shown at payment)' : 'Amount to pay'}</p><p className="text-3xl font-extrabold">₹{booking.totalAmount}</p></div>
        {purpose === 'BOOKING' && <div className="text-right"><p className="text-xs text-mute">Slot held for</p><p className={`font-mono text-lg font-bold ${left < 60 ? 'text-rose-300' : ''}`}>{mm}:{ss}</p></div>}
      </div>
      {mode === 'mock' && <>
        <p className="rounded-lg bg-amber-500/15 px-3 py-2 text-xs font-semibold text-amber-200">Test mode: no real money is charged.</p>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Payment method">
          {METHODS.map(([k, l, I]) => (
            <button key={k} role="radio" aria-checked={method === k} onClick={() => setMethod(k)}
              className={`flex flex-col items-center gap-1 rounded-xl border-2 py-3 text-xs font-bold transition ${method === k ? 'border-brand-600 bg-brand-500/15' : 'border-line hover:border-line2'}`}><I size={20} />{l}</button>))}
        </div>
      </>}
      {mode === 'razorpay' && isTest && <p className="rounded-lg bg-amber-500/15 px-3 py-2 text-xs font-semibold text-amber-200">Razorpay test mode: no real money is charged. Use Razorpay's test payment details.</p>}
      {mode === 'razorpay' && <p className="flex items-center gap-2 text-sm text-mute"><ShieldCheck size={16} className="text-emerald-400" />Pay securely with UPI, cards or net banking through Razorpay.</p>}
      {err && <p className="rounded-lg bg-rose-500/15 px-3 py-2 text-sm font-medium text-rose-300" role="alert">{err}</p>}
      {purpose === 'BOOKING' && left === 0 ? <p className="rounded-lg bg-rose-500/15 px-3 py-2 text-sm font-medium text-rose-300">Time's up. This slot was released. Please book again.</p> :
        <button className="btn btn-primary h-12" disabled={busy || !mode} onClick={() => pay()}>{busy ? 'Processing…' : `Pay ₹${booking.totalAmount}`}</button>}
      {mode === 'mock' && !(purpose === 'BOOKING' && left === 0) && <button className="text-xs text-dim underline" disabled={busy} onClick={() => pay('FAIL')}>Simulate a failed payment</button>}
    </div>
  )
}
