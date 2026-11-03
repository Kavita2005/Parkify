import { useEffect, useState } from 'react'
import { MapContainer, Marker, TileLayer, ZoomControl, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Search } from 'lucide-react'
import { geocode } from '../maps.js'

const total = l => Object.values(l.types).reduce((a, i) => a + i.total, 0) || 1
// Pins are plain HTML (no image files), coloured by how many spaces are free.
const pinIcon = (l, selected) => {
  const c = selected ? 'sel' : l.freeSpaces === 0 ? 'full' : l.freeSpaces / total(l) > 0.25 ? 'ok' : 'low'
  const s = selected ? 42 : 36
  return L.divIcon({ className: '', html: `<div class="pin ${c}"><span>${l.freeSpaces}</span></div>`, iconSize: [s, s], iconAnchor: [s / 2, s] })
}

function Recenter({ center }) {
  const map = useMap()
  useEffect(() => { map.setView([center.lat, center.lng], map.getZoom()) }, [center.lat, center.lng]) // eslint-disable-line
  return null
}

export default function MapSection({ lots, center, sel, onPick, onPlace, placeQuery }) {
  const [q, setQ] = useState(placeQuery || '')
  const go = async e => {
    e?.preventDefault(); if (!q.trim()) return
    try { const c = await geocode(q); c ? onPlace(c) : onPlace(null, 'Place not found. Try a landmark or a fuller address.') }
    catch { onPlace(null, "Couldn't search for that place. Check your internet connection.") }
  }
  useEffect(() => { if (placeQuery) go() }, []) // eslint-disable-line   (search typed on the home page)

  return (
    <div className="dark-map relative isolate h-full overflow-hidden rounded-2xl border border-line">
      <MapContainer center={[center.lat, center.lng]} zoom={14} scrollWheelZoom zoomControl={false} className="h-full w-full">
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
        <ZoomControl position="bottomright" />
        <Recenter center={center} />
        {lots.map(l => <Marker key={l.id} position={[l.latitude, l.longitude]} icon={pinIcon(l, sel?.id === l.id)} eventHandlers={{ click: () => onPick(l) }} />)}
      </MapContainer>
      <form onSubmit={go} className="absolute left-3 right-3 top-3 z-[500] flex gap-2 rounded-2xl bg-surface p-1.5 shadow-lift sm:right-auto sm:w-96">
        <input className="h-10 flex-1 rounded-xl bg-transparent px-3 text-sm text-ink placeholder:text-dim focus:outline-none" aria-label="Search a place" placeholder="Search a place or landmark" value={q} onChange={e => setQ(e.target.value)} />
        <button className="btn btn-primary h-10 w-10 px-0" aria-label="Go to place"><Search size={17} /></button>
      </form>
    </div>
  )
}
