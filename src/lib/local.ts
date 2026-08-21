import type { Place } from '../types'

const CLAVE = 'misviajes.sitios.v1'

/** Los sitios viven aquí: en el propio móvil. Todo lo demás es respaldo. */
export function leerLocal(): Place[] {
  try {
    const bruto = localStorage.getItem(CLAVE)
    if (!bruto) return []
    const datos = JSON.parse(bruto) as Place[]
    return Array.isArray(datos) ? datos.map(normaliza) : []
  } catch {
    return []
  }
}

export function guardarLocal(sitios: Place[]): void {
  localStorage.setItem(CLAVE, JSON.stringify(sitios))
}

/** Completa lo que falte: así una copia antigua o de otra versión sigue abriéndose. */
export function normaliza(p: Partial<Place>): Place {
  const ahora = new Date().toISOString()
  return {
    id: p.id ?? nuevoId(),
    name: p.name ?? 'Sin nombre',
    label: p.label ?? '',
    lat: Number(p.lat ?? 0),
    lon: Number(p.lon ?? 0),
    countryName: p.countryName ?? '',
    countryCode: (p.countryCode ?? '').toUpperCase(),
    visitedOn: p.visitedOn ?? '',
    note: p.note ?? '',
    favorite: Boolean(p.favorite),
    createdAt: p.createdAt ?? ahora,
    updatedAt: p.updatedAt ?? ahora,
    deleted: Boolean(p.deleted),
  }
}

export function nuevoId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Une dos listas quedándose con la versión más reciente de cada sitio.
 * Es lo que permite restaurar una copia sin perder ni duplicar nada.
 */
export function fusiona(a: Place[], b: Place[]): Place[] {
  const porId = new Map<string, Place>()
  for (const p of [...a, ...b]) {
    const previo = porId.get(p.id)
    if (!previo || p.updatedAt > previo.updatedAt) porId.set(p.id, p)
  }
  return [...porId.values()]
}
