// OpenStreetMap helpers. No API key needed.
// Place search uses OpenStreetMap's free Nominatim service (light use only, max ~1 request per second).
export async function geocode(q) {
  const r = await (await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`)).json()
  return r[0] ? { lat: +r[0].lat, lng: +r[0].lon } : null
}
// Opens OpenStreetMap's route planner with the destination filled in.
export const directionsUrl = (lat, lng) => `https://www.openstreetmap.org/directions?route=%3B${lat}%2C${lng}`
