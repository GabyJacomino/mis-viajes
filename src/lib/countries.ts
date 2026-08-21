import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import type { GeometryCollection, Topology } from 'topojson-specification'
import { colorDePais } from './palette'

/**
 * Siluetas de los países para poder pintar del color del país todo el territorio
 * donde he estado. El fichero pesa ~700 KB, así que se carga aparte y una sola vez.
 */

type Contornos = Map<string, Feature<Polygon | MultiPolygon>>

let cache: Promise<Contornos> | null = null

async function cargar(): Promise<Contornos> {
  const [{ feature }, topo, iso] = await Promise.all([
    import('topojson-client'),
    import('world-atlas/countries-50m.json'),
    import('i18n-iso-countries'),
  ])
  // El fichero identifica los países por código ISO numérico ("380"), y el
  // buscador los devuelve en alfa-2 ("IT"): hay que traducir de uno a otro.
  const numericoAAlfa2 = new Map<string, string>()
  for (const alfa2 of Object.keys(iso.default.getAlpha2Codes())) {
    const num = iso.default.alpha2ToNumeric(alfa2)
    if (num) numericoAAlfa2.set(String(Number(num)), alfa2)
  }

  const topologia = topo.default as unknown as Topology
  const colección = feature(
    topologia,
    topologia.objects.countries as GeometryCollection,
  ) as FeatureCollection<Polygon | MultiPolygon>

  const mapa: Contornos = new Map()
  for (const f of colección.features) {
    const alfa2 = numericoAAlfa2.get(String(Number(f.id)))
    if (alfa2) mapa.set(alfa2, f)
  }
  return mapa
}

export function contornosDePaises(): Promise<Contornos> {
  cache ??= cargar()
  return cache
}

/** Los países visitados, cada uno con su color, listos para pintar en el mapa. */
export async function coloreaPaises(codigos: string[]): Promise<FeatureCollection> {
  const contornos = await contornosDePaises()
  const features: Feature[] = []
  for (const codigo of codigos) {
    const contorno = contornos.get(codigo.toUpperCase())
    if (!contorno) continue // País diminuto que el fichero no trae: se ve el punto igual.
    features.push({
      ...contorno,
      properties: { ...contorno.properties, codigo, color: colorDePais(codigo) },
    })
  }
  return { type: 'FeatureCollection', features }
}
