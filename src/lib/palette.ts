/**
 * Un color por país, siempre el mismo para el mismo país.
 * Tonos vivos elegidos para destacar sobre el mapa oscuro.
 */
const PALETA = [
  '#f87171', // rojo coral
  '#fb923c', // naranja
  '#fbbf24', // ámbar
  '#facc15', // amarillo
  '#a3e635', // lima
  '#4ade80', // verde
  '#34d399', // esmeralda
  '#2dd4bf', // turquesa
  '#22d3ee', // cian
  '#38bdf8', // celeste
  '#60a5fa', // azul
  '#818cf8', // índigo
  '#a78bfa', // violeta
  '#c084fc', // púrpura
  '#e879f9', // fucsia
  '#f472b6', // rosa
  '#fda4af', // rosa claro
  '#5eead4', // turquesa claro
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
