/**
 * Búsqueda de sitios contra Nominatim (OpenStreetMap): gratis y sin clave.
 * Política de uso: como máximo una consulta por segundo, así que arriba se
 * llama con retardo (debounce) y se cancela la anterior.
 */

export type Sugerencia = {
  name: string
  label: string
  lat: number
  lon: number
  countryName: string
  countryCode: string
  /** Recuadro geográfico [oeste, sur, este, norte] cuando Nominatim lo da. */
  bbox: [number, number, number, number] | null
}

const BASE = 'https://nominatim.openstreetmap.org'

type CrudoNominatim = {
  name?: string
  display_name?: string
  lat: string
  lon: string
  boundingbox?: [string, string, string, string]
  address?: { country?: string; country_code?: string }
}

function aSugerencia(r: CrudoNominatim): Sugerencia {
  const label = r.display_name ?? ''
  return {
    name: (r.name && r.name.trim()) || label.split(',')[0].trim() || 'Sin nombre',
    label,
    lat: Number(r.lat),
    lon: Number(r.lon),
    countryName: r.address?.country ?? '',
    countryCode: (r.address?.country_code ?? '').toUpperCase(),
    bbox: r.boundingbox
      ? [Number(r.boundingbox[2]), Number(r.boundingbox[0]), Number(r.boundingbox[3]), Number(r.boundingbox[1])]
      : null,
  }
}

export async function buscarSitios(texto: string, signal?: AbortSignal): Promise<Sugerencia[]> {
  const q = texto.trim()
  if (q.length < 2) return []
  const url = `${BASE}/search?q=${encodeURIComponent(q)}&format=jsonv2&addressdetails=1&limit=8&accept-language=es`
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`El buscador respondió ${res.status}`)
  const datos = (await res.json()) as CrudoNominatim[]
  return datos.map(aSugerencia).filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lon))
}

/** Qué hay en un punto del mapa. Se usa al marcar tocando el mapa. */
export async function queHayEn(lat: number, lon: number, signal?: AbortSignal): Promise<Sugerencia | null> {
  const url = `${BASE}/reverse?lat=${lat}&lon=${lon}&format=jsonv2&addressdetails=1&accept-language=es`
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) return null
  const dato = (await res.json()) as CrudoNominatim & { error?: string }
  if (dato.error || !dato.lat) return null
  // El punto que vale es el que tocó el dedo, no el centro que devuelve Nominatim.
  return { ...aSugerencia(dato), lat, lon, bbox: null }
}
