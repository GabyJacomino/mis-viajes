/**
 * Qué centro y qué zoom hacen que quepan todos los sitios en pantalla.
 *
 * Se calcula aquí en vez de dejárselo a `fitBounds` porque los límites de
 * MapLibre no se portan como uno espera cuando los sitios rodean el planeta:
 * con puntos en México y en Japón acababa encajando el lado corto y dejaba
 * medio mundo fuera de la pantalla.
 */

export type Punto = { lat: number; lon: number }
export type Relleno = { arriba: number; abajo: number; izquierda: number; derecha: number }
export type Vista = { lon: number; lat: number; zoom: number }

/** En Mercator los polos quedan a distancia infinita: se recorta como hace MapLibre. */
const LAT_MAXIMA = 85.051129

/** Altura del mundo en pixeles a zoom 0, por convenio de MapLibre. */
const MUNDO = 512

const recorta = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/** Latitud → posición vertical de 0 (polo norte) a 1 (polo sur). */
function aMercatorY(lat: number): number {
  const rad = (recorta(lat, -LAT_MAXIMA, LAT_MAXIMA) * Math.PI) / 180
  return (1 - Math.log(Math.tan(Math.PI / 4 + rad / 2)) / Math.PI) / 2
}

/** Y de Mercator → latitud. */
function aLatitud(y: number): number {
  const rad = 2 * Math.atan(Math.exp((1 - 2 * y) * Math.PI)) - Math.PI / 2
  return (rad * 180) / Math.PI
}

/** Normaliza a -180..180. */
const normaliza = (lon: number) => ((((lon + 180) % 360) + 360) % 360) - 180

/**
 * El arco de longitudes más corto que contiene todos los puntos. Se busca el
 * hueco más grande entre sitios consecutivos: el resto del círculo es el arco
 * bueno. Así, con sitios en Nueva Zelanda y Chile, se encaja por el Pacífico y
 * no dando la vuelta al mundo entero.
 */
function arcoDeLongitudes(lones: number[]): { centro: number; ancho: number } {
  const ordenadas = [...lones].map(normaliza).sort((a, b) => a - b)
  let huecoMayor = -1
  let inicioTrasHueco = ordenadas[0]
  for (let i = 0; i < ordenadas.length; i++) {
    const actual = ordenadas[i]
    const siguiente = ordenadas[(i + 1) % ordenadas.length]
    const hueco = i === ordenadas.length - 1 ? siguiente + 360 - actual : siguiente - actual
    if (hueco > huecoMayor) {
      huecoMayor = hueco
      inicioTrasHueco = siguiente
    }
  }
  const ancho = 360 - huecoMayor
  return { centro: normaliza(inicioTrasHueco + ancho / 2), ancho }
}

export function vistaQueAbarca(
  puntos: Punto[],
  ancho: number,
  alto: number,
  relleno: Relleno,
  zoomMaximo = 9,
): Vista | null {
  if (puntos.length === 0) return null

  const utilAncho = Math.max(50, ancho - relleno.izquierda - relleno.derecha)
  const utilAlto = Math.max(50, alto - relleno.arriba - relleno.abajo)

  const arco = arcoDeLongitudes(puntos.map((p) => p.lon))
  const yes = puntos.map((p) => aMercatorY(p.lat))
  const yMin = Math.min(...yes)
  const yMax = Math.max(...yes)

  // Un solo sitio, o todos en el mismo punto: no hay nada que abarcar.
  if (arco.ancho < 0.001 && yMax - yMin < 0.000001) {
    return { lon: arco.centro, lat: aLatitud((yMin + yMax) / 2), zoom: 8 }
  }

  const zoomPorAncho =
    arco.ancho > 0.001 ? Math.log2(utilAncho / (MUNDO * (arco.ancho / 360))) : Infinity
  const zoomPorAlto = yMax - yMin > 1e-9 ? Math.log2(utilAlto / (MUNDO * (yMax - yMin))) : Infinity

  const zoom = recorta(Math.min(zoomPorAncho, zoomPorAlto), 0, zoomMaximo)

  // El centro vertical se compensa: el relleno de abajo es mayor (ahí va el
  // panel de la lista), así que el contenido tiene que subir un poco.
  const escala = MUNDO * 2 ** zoom
  const centroY = (yMin + yMax) / 2 + (relleno.abajo - relleno.arriba) / 2 / escala

  return { lon: arco.centro, lat: aLatitud(recorta(centroY, 0, 1)), zoom }
}
