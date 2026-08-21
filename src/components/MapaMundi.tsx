import {
  GeolocateControl,
  Map as MapaLibre,
  NavigationControl,
  Popup,
  type GeoJSONSource,
  type LngLatBoundsLike,
  type MapLayerMouseEvent,
  type MapMouseEvent,
  type StyleSpecification,
} from 'maplibre-gl'
import { useEffect, useRef } from 'react'
import type { FeatureCollection } from 'geojson'
import type { Place } from '../types'
import { coloreaPaises } from '../lib/countries'
import { banderaDePais, colorDePais } from '../lib/palette'

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

/** Mapa oscuro de CARTO: gratis, sin clave y con las etiquetas ya dibujadas. */
const ESTILO: StyleSpecification = {
  version: 8,
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
    { id: 'fondo', type: 'background', paint: { 'background-color': '#0b1120' } },
    { id: 'base', type: 'raster', source: 'base', paint: { 'raster-opacity': 0.9 } },
  ],
}

const VACIO: FeatureCollection = { type: 'FeatureCollection', features: [] }

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

  useEffect(() => {
    if (!contenedor.current || mapa.current) return
    const m = new MapaLibre({
      container: contenedor.current,
      style: ESTILO,
      center: [8, 32],
      zoom: 1.4,
      minZoom: 1,
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
      m.addSource('paises', { type: 'geojson', data: VACIO })
      m.addSource('sitios', { type: 'geojson', data: VACIO })

      // El país entero se tiñe de su color; encima, el punto exacto donde estuve.
      m.addLayer({
        id: 'paises-relleno',
        type: 'fill',
        source: 'paises',
        paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.2 },
      })
      m.addLayer({
        id: 'paises-borde',
        type: 'line',
        source: 'paises',
        paint: { 'line-color': ['get', 'color'], 'line-width': 1.2, 'line-opacity': 0.75 },
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
      pendiente.current?.()
      pendiente.current = null
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

  // Encajar todos los sitios en pantalla.
  useEffect(() => {
    const m = mapa.current
    if (!m || ajustarNonce === 0) return
    const lista = sitiosRef.current
    if (lista.length === 0) {
      m.flyTo({ center: [8, 32], zoom: 1.4 })
      return
    }
    if (lista.length === 1) {
      m.flyTo({ center: [lista[0].lon, lista[0].lat], zoom: 8 })
      return
    }
    const lons = lista.map((s) => s.lon)
    const lats = lista.map((s) => s.lat)
    const limites: LngLatBoundsLike = [
      [Math.min(...lons), Math.min(...lats)],
      [Math.max(...lons), Math.max(...lats)],
    ]
    m.fitBounds(limites, {
      padding: { top: 90, bottom: 260, left: 50, right: 50 },
      maxZoom: 9,
      duration: 900,
    })
  }, [ajustarNonce])

  return <div ref={contenedor} className="absolute inset-0" />
}
