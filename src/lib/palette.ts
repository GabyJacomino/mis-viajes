/**
 * Un color por país, siempre el mismo para el mismo país.
 * Tonos vivos elegidos para destacar sobre el mapa oscuro.
 */
const PALETA = [
  // Intercalados a propósito: dos países con códigos parecidos caen en índices
  // vecinos, y si la paleta fuese en orden de tono saldrían todos del mismo color.
  // Aquí cada salto cruza la rueda, así que siempre se distinguen.
  '#f87171', // rojo coral
  '#22d3ee', // cian
  '#fbbf24', // ámbar
  '#a78bfa', // violeta
  '#a3e635', // lima
  '#f472b6', // rosa
  '#2dd4bf', // turquesa
  '#fb923c', // naranja
  '#60a5fa', // azul
  '#facc15', // amarillo
  '#e879f9', // fucsia
  '#34d399', // esmeralda
  '#fda4af', // rosa claro
  '#38bdf8', // celeste
  '#4ade80', // verde
  '#c084fc', // púrpura
  '#5eead4', // turquesa claro
  '#818cf8', // índigo
] as const

export function colorDePais(codigoIso: string): string {
  const clave = (codigoIso || '??').toUpperCase()
  // Hash sencillo y estable: el color de un país no cambia nunca entre sesiones.
  let h = 0
  for (let i = 0; i < clave.length; i++) h = (h * 31 + clave.charCodeAt(i)) | 0
  return PALETA[Math.abs(h) % PALETA.length]
}

export function banderaDePais(codigoIso: string): string {
  const c = (codigoIso || '').toUpperCase()
  if (!/^[A-Z]{2}$/.test(c)) return '🌍'
  // Los emoji de bandera son dos "indicadores regionales": A = U+1F1E6.
  return String.fromCodePoint(...[...c].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65))
}
