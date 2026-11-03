import { Bike, Bus, Car, Truck, Zap } from 'lucide-react'

const Svg = ({ size, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>)
const Moto = ({ size = 18 }) => <Svg size={size}><circle cx="5" cy="17" r="3" /><circle cx="19" cy="17" r="3" /><path d="M5 17h4l3-6h3l4 6M9 11h3M14 8l-1 3" /></Svg>
const Van = ({ size = 18 }) => <Svg size={size}><path d="M3 16V7a1 1 0 0 1 1-1h9l4 4h2a1 1 0 0 1 1 1v5h-2M3 16h2M9 16h6" /><circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" /><path d="M13 6v4h4" /></Svg>
const RV = ({ size = 18 }) => <Svg size={size}><rect x="2" y="6" width="16" height="10" rx="2" /><path d="M18 10h2.5a1.5 1.5 0 0 1 1.5 1.5V16h-4M6 10h4v3H6z" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="15" cy="17.5" r="1.8" /></Svg>

// name = card title, label = short chip text
export const VEHICLES = [
  { id: 'CAR', name: 'Cars', label: 'Car', hint: 'Sedan, Hatchback, SUV, Luxury', Icon: Car, bg: 'bg-sky-500', text: 'text-sky-400' },
  { id: 'TWO_WHEELER', name: 'Two Wheelers', label: '2-wheeler', hint: 'Motorcycles, Scooters, Mopeds', Icon: Moto, bg: 'bg-emerald-500', text: 'text-emerald-400' },
  { id: 'EV_CAR', name: 'Electric Vehicles', label: 'EV', hint: 'Charging stations available', Icon: Zap, bg: 'bg-green-500', text: 'text-green-400' },
  { id: 'TRUCK', name: 'Trucks', label: 'Truck', hint: 'Light & heavy vehicles', Icon: Truck, bg: 'bg-orange-500', text: 'text-orange-400' },
  { id: 'BUS', name: 'Buses', label: 'Bus', hint: 'Mini & large buses', Icon: Bus, bg: 'bg-violet-500', text: 'text-violet-400' },
  { id: 'VAN', name: 'Vans & Tempo', label: 'Van / Tempo', hint: 'Commercial vehicles', Icon: Van, bg: 'bg-teal-500', text: 'text-teal-400' },
  { id: 'RV', name: 'RV / Camper', label: 'RV / Camper', hint: 'Motorhomes & caravans', Icon: RV, bg: 'bg-amber-500', text: 'text-amber-400' },
  { id: 'CYCLE', name: 'Bicycle', label: 'Bicycle', hint: 'Standard & e-bikes', Icon: Bike, bg: 'bg-pink-500', text: 'text-pink-400' },
]
const LEGACY = { SUV: 'SUV / Van' }
export const vmeta = id => VEHICLES.find(v => v.id === id)
export const vlabel = id => vmeta(id)?.label || LEGACY[id] || id
export function VehicleIcon({ id, size = 18 }) {
  const I = vmeta(id)?.Icon || Car
  return <I size={size} aria-hidden="true" />
}
