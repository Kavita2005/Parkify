import { useEffect, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Search } from 'lucide-react'
import { geocode } from '../maps.js'

const icon = L.divIcon({ className: '', html: '<div class="pin sel"><span>P</span></div>', iconSize: [42, 42], iconAnchor: [21, 42] })
function Clicks({ onPick }) { useMapEvents({ click: e => onPick(e.latlng.lat, e.latlng.lng) }); return null }
function Fly({ lat, lng }) {
  const map = useMap()
  useEffect(() => { if (Number.isFinite(lat) && Number.isFinite(lng)) map.setView([lat, lng], map.getZoom()) }, [lat, lng]) // eslint-disable-line
  return null
}

/** Click the map (or search a place) to set the lot's coordinates. */
export default function LocationPicker({ lat, lng, onPick }) {
  const [q, setQ] = useState(''); const [err, setErr] = useState('')
  const search = async () => {
    if (!q.trim()) return; setErr('')
    try { const c = await geocode(q); c ? onPick(c.lat, c.lng) : setErr('Place not found.') } catch { setErr("Couldn't search. Check your internet connection.") }
  }
  const ok = Number.isFinite(lat) && Number.isFinite(lng)
  return (
    <div className="flex flex-col gap-2">
      <span className="label">Pin the lot on the map</span>
      <div className="flex gap-2">
        <input className="input" placeholder="Search a place, then click the map to fine-tune" value={q} onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); search() } }} />
        <button type="button" className="btn h-11 w-11 shrink-0 px-0" aria-label="Search place" onClick={search}><Search size={17} /></button>
      </div>
      {err && <p className="text-xs text-rose-300">{err}</p>}
      <div className="dark-map relative isolate h-56 overflow-hidden rounded-xl border border-line">
        <MapContainer center={ok ? [lat, lng] : [18.5204, 73.8567]} zoom={14} scrollWheelZoom className="h-full w-full">
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
          <Clicks onPick={onPick} /><Fly lat={lat} lng={lng} />
          {ok && <Marker position={[lat, lng]} icon={icon} />}
        </MapContainer>
      </div>
      <p className="text-xs text-dim">Click the map to move the pin. Coordinates fill in below.</p>
    </div>
  )
}
