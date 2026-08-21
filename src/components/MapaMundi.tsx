import {
  GeolocateControl,
  Map as MapaLibre,
  NavigationControl,
  Popup,
  type GeoJSONSource,
  type MapLayerMouseEvent,
  type MapMouseEvent,
  type StyleSpecification,
} from 'maplibre-gl'
import { useEffect, useRef, useState } from 'react'
import '../lib/mapa-worker'
import type { FeatureCollection } from 'geojson'
import type { Place } from '../types'
import { coloreaPaises, siluetaDelMundo } from '../lib/countries'
import { banderaDePais, colorDePais } from '../lib/palette'
import { vistaQueAbarca, zoomDelGloboCompleto } from '../lib/encaje'

export type Vuelo = { lat: number; lon: number; zoom?: number; nonce: number }

type Props = {
  sitios: Place[]
  seleccionado: Place | null
  modoMarcar: boolean
  onSeleccionar: (id: string | null) => void
  onTocarMapa: (lat: number, lon: number) => void
  vuelo: Vuelo | null
  ajustarNonce: number
}

/**
 * El estilo del mapa. Dos capas de fondo que se relevan:
 *  - De lejos, los continentes dibujados por nosotros: mar azul noche y tierra
 *    más clara. El mapa de calles de CARTO no sirve para esto porque su tierra
 *    es MÁS oscura que su agua y de lejos no se distingue nada.
 *  - De cerca, el mapa de calles aparece por encima, que es donde hace falta
 *    detalle real (calles, nombres de barrios) y donde nuestras siluetas, que
 *    son de baja resolución, se quedarían cortas.
 */
const MAR = '#0a1020'
const TIERRA = '#1b2743'
const BORDE_TIERRA = '#2f3f66'

const ESTILO: StyleSpecification = {
  version: 8,
  // Globo en vez de mapa plano: con sitios muy repartidos, en una pantalla de
  // móvil el mapa plano no puede alejarse lo suficiente para verlos todos.
  projection: { type: 'globe' },
  sources: {
    base: {
      type: 'raster',
      tiles: ['a', 'b', 'c', 'd'].map(
        (s) => `https://${s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png`,
      ),
      tileSize: 256,
      maxzoom: 19,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [
    { id: 'fondo', type: 'background', paint: { 'background-color': MAR } },
  ],
}

const VACIO: FeatureCollection = { type: 'FeatureCollection', features: [] }

// Hueco que hay que dejar libre: arriba la cabecera, abajo el panel de la lista.
const RELLENO = { arriba: 70, abajo: 170, izquierda: 30, derecha: 30 }

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

function esc(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c)
}

function aPuntos(sitios: Place[]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: sitios.map((s) => ({
      type: 'Feature',
      id: s.id,
      geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
      properties: { id: s.id, color: colorDePais(s.countryCode) },
    })),
  }
}

export function MapaMundi({
  sitios,
  seleccionado,
  modoMarcar,
  onSeleccionar,
  onTocarMapa,
  vuelo,
  ajustarNonce,
}: Props) {
  // Un mapa que falla se queda en negro y sin decir nada; esto lo cuenta en pantalla.
  const [estado, setEstado] = useState<'cargando' | 'listo' | string>('cargando')
  const [medida, setMedida] = useState('')
  const contenedor = useRef<HTMLDivElement>(null)
  const mapa = useRef<MapaLibre | null>(null)
  const globo = useRef<Popup | null>(null)
  const listo = useRef(false)
  // El mapa tarda en estar listo; lo que haya que pintar mientras espera aquí.
  const pendiente = useRef<(() => void) | null>(null)
  // Los callbacks se leen desde una ref para no recrear el mapa en cada render.
  const cb = useRef({ onSeleccionar, onTocarMapa, modoMarcar })
  cb.current = { onSeleccionar, onTocarMapa, modoMarcar }
  // Para encajar la vista hace falta la lista, pero sin que añadir un sitio mueva la cámara.
  const sitiosRef = useRef(sitios)
  sitiosRef.current = sitios

  const encajar = (m: MapaLibre, animar: boolean) => {
    const lista = sitiosRef.current
    const caja = m.getContainer().getBoundingClientRect()
    // Nunca alejarse más de lo que hace falta para ver el globo entero: pasado
    // ese punto la Tierra se queda hecha una canica en medio de la pantalla.
    const zoomSuelo = zoomDelGloboCompleto(caja.width, caja.height - RELLENO.arriba - RELLENO.abajo)
    const relleno = {
      top: RELLENO.arriba,
      bottom: RELLENO.abajo,
      left: RELLENO.izquierda,
      right: RELLENO.derecha,
    }
    const duracion = animar ? 900 : 0

    if (lista.length === 0) {
      m.easeTo({ center: [8, 20], zoom: zoomSuelo, padding: relleno, duration: duracion })
      return
    }
    const vista = vistaQueAbarca(lista, caja.width, caja.height, RELLENO)
    if (!vista) return
    m.easeTo({
      center: [vista.lon, vista.lat],
      zoom: Math.max(vista.zoom, zoomSuelo),
      padding: relleno,
      duration: duracion,
      essential: true,
    })
  }

  useEffect(() => {
    if (!contenedor.current || mapa.current) return
    // MapLibre necesita WebGL2. Si no está, mejor decirlo que dejar la pantalla negra.
    if (!document.createElement('canvas').getContext('webgl2')) {
      setEstado('Este navegador no puede dibujar el mapa: le falta WebGL2.')
      return
    }
    const caja = contenedor.current.getBoundingClientRect()
    setMedida(`${Math.round(caja.width)}x${Math.round(caja.height)}`)
    const m = new MapaLibre({
      container: contenedor.current,
      style: ESTILO,
      center: [8, 32],
      zoom: 1.4,
      // Con mínimo 1, en la pantalla de un móvil no cabe el mundo entero y el
      // encaje se queda corto dejando sitios fuera.
      minZoom: 0,
      maxZoom: 18,
      dragRotate: false,
      pitchWithRotate: false,
      attributionControl: { compact: true },
    })
    m.touchZoomRotate.disableRotation()
    m.addControl(new NavigationControl({ showCompass: false }), 'bottom-right')
    m.addControl(
      new GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
      }),
      'bottom-right',
    )

    m.on('load', () => {
      m.addSource('mundo', { type: 'geojson', data: VACIO })
      m.addLayer({
        id: 'mundo-relleno',
        type: 'fill',
        source: 'mundo',
        paint: { 'fill-color': TIERRA },
      })
      m.addLayer({
        id: 'mundo-borde',
        type: 'line',
        source: 'mundo',
        paint: {
          'line-color': BORDE_TIERRA,
          'line-width': 0.6,
          // De muy lejos las fronteras solo ensucian, y en el globo dejan
          // artefactos alrededor de los polos. Entran al acercarse.
          'line-opacity': ['interpolate', ['linear'], ['zoom'], 1.4, 0, 2.6, 1],
        },
      })
      // El mapa de calles entra al acercarse, cuando de verdad aporta detalle.
      m.addLayer({
        id: 'base',
        type: 'raster',
        source: 'base',
        paint: {
          'raster-opacity': ['interpolate', ['linear'], ['zoom'], 3.6, 0, 5.6, 1],
          'raster-brightness-min': 0.06,
        },
      })
      void siluetaDelMundo().then((fc) => {
        const fuente = m.getSource('mundo') as GeoJSONSource | undefined
        fuente?.setData(fc)
      })

      m.addSource('paises', { type: 'geojson', data: VACIO })
      m.addSource('sitios', { type: 'geojson', data: VACIO })

      // El país entero se tiñe de su color; encima, el punto exacto donde estuve.
      m.addLayer({
        id: 'paises-relleno',
        type: 'fill',
        source: 'paises',
        paint: {
          'fill-color': ['get', 'color'],
          // A pie de calle un 32% de color lo tiñe todo y no se ve el mapa:
          // el tinte sirve para la vista del mundo y se retira al acercarse.
          'fill-opacity': ['interpolate', ['linear'], ['zoom'], 4, 0.34, 6, 0.12, 8, 0],
        },
      })
      m.addLayer({
        id: 'paises-borde',
        type: 'line',
        source: 'paises',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 1.3,
          'line-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0.9, 9, 0.45],
        },
      })
      m.addLayer({
        id: 'sitios-halo',
        type: 'circle',
        source: 'sitios',
        paint: {
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.22,
          'circle-blur': 0.55,
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 9, 6, 16, 12, 26],
        },
      })
      m.addLayer({
        id: 'sitios-punto',
        type: 'circle',
        source: 'sitios',
        paint: {
          'circle-color': '#ffffff',
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 3.2, 6, 5.5, 12, 8],
          'circle-stroke-color': ['get', 'color'],
          'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 1, 2, 12, 3.5],
        },
      })

      listo.current = true
      setEstado('listo')
      // Abrir la app y ver tu mundo, sin tener que pulsar nada.
      if (sitiosRef.current.length > 0) encajar(m, false)
      pendiente.current?.()
      pendiente.current = null
    })

    m.on('error', (e) => {
      const motivo = e.error?.message ?? 'error sin detalle'
      setEstado(motivo)
      console.error('[mapa]', motivo, e)
    })

    m.on('click', 'sitios-punto', (e: MapLayerMouseEvent) => {
      e.preventDefault()
      const id = e.features?.[0]?.properties?.id as string | undefined
      if (id) cb.current.onSeleccionar(id)
    })
    m.on('click', (e: MapMouseEvent) => {
      if (e.defaultPrevented) return
      if (cb.current.modoMarcar) cb.current.onTocarMapa(e.lngLat.lat, e.lngLat.lng)
      else cb.current.onSeleccionar(null)
    })
    m.on('mouseenter', 'sitios-punto', () => {
      m.getCanvas().style.cursor = 'pointer'
    })
    m.on('mouseleave', 'sitios-punto', () => {
      m.getCanvas().style.cursor = ''
    })

    mapa.current = m
    return () => {
      m.remove()
      mapa.current = null
      listo.current = false
    }
  }, [])

  // El cursor avisa de que el siguiente toque va a marcar un sitio.
  useEffect(() => {
    const m = mapa.current
    if (m) m.getCanvas().style.cursor = modoMarcar ? 'crosshair' : ''
  }, [modoMarcar])

  // Puntos y países, en cuanto cambia la lista de sitios.
  useEffect(() => {
    const m = mapa.current
    if (!m) return
    const pintar = () => {
      const fuentePuntos = m.getSource('sitios') as GeoJSONSource | undefined
      fuentePuntos?.setData(aPuntos(sitios))
      const codigos = [...new Set(sitios.map((s) => s.countryCode).filter(Boolean))]
      void coloreaPaises(codigos).then((fc) => {
        const fuentePaises = m.getSource('paises') as GeoJSONSource | undefined
        fuentePaises?.setData(fc)
      })
    }
    if (listo.current) pintar()
    else pendiente.current = pintar
  }, [sitios])

  // Globo con la ficha del sitio elegido.
  useEffect(() => {
    const m = mapa.current
    if (!m) return
    globo.current?.remove()
    globo.current = null
    if (!seleccionado) return
    const s = seleccionado
    const color = colorDePais(s.countryCode)
    const detalle = [s.visitedOn, s.countryName].filter(Boolean).join(' · ')
    const nota = s.note
      ? `<div style="margin-top:6px;font-size:12px;color:#cbd5e1;white-space:pre-wrap">${esc(s.note)}</div>`
      : ''
    const pie = detalle
      ? `<div style="margin-top:4px;font-size:12px;color:#94a3b8">${banderaDePais(s.countryCode)} ${esc(detalle)}</div>`
      : ''
    globo.current = new Popup({ offset: 16, closeButton: true, maxWidth: '260px' })
      .setLngLat([s.lon, s.lat])
      .setHTML(
        `<div style="min-width:150px">
           <div style="display:flex;align-items:center;gap:8px">
             <span style="width:10px;height:10px;border-radius:99px;background:${color};box-shadow:0 0 10px ${color}"></span>
             <strong style="font-size:14px">${esc(s.name)}</strong>
           </div>
           ${pie}
           ${nota}
         </div>`,
      )
      .addTo(m)
    globo.current.on('close', () => cb.current.onSeleccionar(null))
  }, [seleccionado])

  // Volar hasta un sitio concreto.
  useEffect(() => {
    if (!vuelo || !mapa.current) return
    mapa.current.flyTo({
      center: [vuelo.lon, vuelo.lat],
      zoom: vuelo.zoom ?? 9,
      speed: 1.1,
      essential: true,
    })
  }, [vuelo])

  // El botón de encajar.
  useEffect(() => {
    const m = mapa.current
    if (!m || ajustarNonce === 0) return
    encajar(m, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ajustarNonce])

  return (
    <>
      <div ref={contenedor} className="h-full w-full" />
      {estado !== 'listo' && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-8">
          {estado === 'cargando' ? (
            <p className="flex items-center gap-2.5 rounded-full border border-slate-700/60 bg-slate-900/80 px-4 py-2 text-xs text-slate-400 backdrop-blur">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-600 border-t-teal-400" />
              Cargando el mapa… <span className="text-slate-600">{medida}</span>
            </p>
          ) : (
            <div className="pointer-events-auto max-w-xs rounded-2xl border border-rose-900/60 bg-slate-900/90 px-4 py-3 text-center backdrop-blur">
              <p className="text-sm font-medium text-rose-300">El mapa no ha podido cargarse</p>
              <p className="mt-1.5 break-words text-xs text-slate-400">{estado}</p>
            </div>
          )}
        </div>
      )}
    </>
  )
}
