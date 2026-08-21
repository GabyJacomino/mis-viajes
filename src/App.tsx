import { MapPinPlus, Maximize, Save, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MapaMundi, type Vuelo } from './components/MapaMundi'
import { FichaSitio, type Borrador } from './components/FichaSitio'
import { HojaSitios } from './components/HojaSitios'
import { PanelCopia } from './components/PanelCopia'
import { queHayEn, type Sugerencia } from './lib/geocode'
import { useSitios } from './lib/useSitios'
import type { Place } from './types'

type Ficha = { borrador: Borrador; existente: Place | null; cargando: boolean }

const borradorDesde = (s: Sugerencia): Borrador => ({
  name: s.name,
  label: s.label,
  lat: s.lat,
  lon: s.lon,
  countryName: s.countryName,
  countryCode: s.countryCode,
  visitedOn: '',
  note: '',
  favorite: false,
})

export default function App() {
  const { sitios, paises, añadir, actualizar, borrar, importar } = useSitios()
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null)
  const [ficha, setFicha] = useState<Ficha | null>(null)
  const [copia, setCopia] = useState(false)
  const [modoMarcar, setModoMarcar] = useState(false)
  const [hojaAbierta, setHojaAbierta] = useState(false)
  const [vuelo, setVuelo] = useState<Vuelo | null>(null)
  const [ajustarNonce, setAjustarNonce] = useState(0)
  const [aviso, setAviso] = useState('')
  const nonce = useRef(0)

  const seleccionado = useMemo(
    () => sitios.find((s) => s.id === seleccionadoId) ?? null,
    [sitios, seleccionadoId],
  )

  const volarA = useCallback((lat: number, lon: number, zoom?: number) => {
    nonce.current += 1
    setVuelo({ lat, lon, zoom, nonce: nonce.current })
  }, [])

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(''), 4000)
    return () => clearTimeout(t)
  }, [aviso])

  const elegirSugerencia = (s: Sugerencia) => {
    volarA(s.lat, s.lon, 9)
    setFicha({ borrador: borradorDesde(s), existente: null, cargando: false })
  }

  const tocarMapa = async (lat: number, lon: number) => {
    setModoMarcar(false)
    const provisional: Borrador = {
      name: '',
      label: '',
      lat,
      lon,
      countryName: '',
      countryCode: '',
      visitedOn: '',
      note: '',
      favorite: false,
    }
    setFicha({ borrador: provisional, existente: null, cargando: true })
    // Se pregunta a OpenStreetMap qué hay en ese punto para rellenar nombre y país.
    const encontrado = await queHayEn(lat, lon).catch(() => null)
    setFicha({
      borrador: encontrado ? { ...borradorDesde(encontrado), lat, lon } : provisional,
      existente: null,
      cargando: false,
    })
  }

  const guardarFicha = (b: Borrador) => {
    if (ficha?.existente) {
      actualizar(ficha.existente.id, b)
      setSeleccionadoId(ficha.existente.id)
      setAviso('Sitio actualizado.')
    } else {
      const nuevo = añadir(b)
      setSeleccionadoId(nuevo.id)
      volarA(nuevo.lat, nuevo.lon, 9)
      setAviso(`${nuevo.name} marcado en el mapa.`)
    }
    setFicha(null)
  }

  const borrarFicha = () => {
    if (!ficha?.existente) return
    borrar(ficha.existente.id)
    setSeleccionadoId(null)
    setFicha(null)
    setAviso('Sitio borrado.')
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <MapaMundi
        sitios={sitios}
        seleccionado={seleccionado}
        modoMarcar={modoMarcar}
        onSeleccionar={setSeleccionadoId}
        onTocarMapa={(lat, lon) => void tocarMapa(lat, lon)}
        vuelo={vuelo}
        ajustarNonce={ajustarNonce}
      />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-slate-700/60 bg-slate-900/70 px-3.5 py-2 backdrop-blur-xl">
          <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-teal-400 to-violet-400 shadow-[0_0_10px_#2dd4bf]" />
          <h1 className="text-sm font-semibold tracking-tight text-slate-100">Mis Viajes</h1>
        </div>

        <div className="pointer-events-auto flex flex-col gap-2">
          <BotonRedondo
            titulo="Marcar tocando el mapa"
            activo={modoMarcar}
            onClick={() => setModoMarcar((v) => !v)}
          >
            <MapPinPlus size={18} />
          </BotonRedondo>
          <BotonRedondo titulo="Ver todos mis sitios" onClick={() => setAjustarNonce((n) => n + 1)}>
            <Maximize size={18} />
          </BotonRedondo>
          <BotonRedondo titulo="Copia de mis sitios" onClick={() => setCopia(true)}>
            <Save size={18} />
          </BotonRedondo>
        </div>
      </header>

      {modoMarcar && (
        <div className="pointer-events-none absolute inset-x-0 top-20 z-20 flex justify-center px-4">
          <p className="pointer-events-auto flex items-center gap-2 rounded-full border border-teal-800/60 bg-teal-950/80 px-4 py-2 text-xs text-teal-200 backdrop-blur">
            Toca el mapa en el punto exacto donde estuviste
            <button onClick={() => setModoMarcar(false)} aria-label="Cancelar">
              <X size={14} />
            </button>
          </p>
        </div>
      )}

      <HojaSitios
        paises={paises}
        totalSitios={sitios.length}
        abierta={hojaAbierta}
        onAlternar={setHojaAbierta}
        onElegirSugerencia={elegirSugerencia}
        onIrASitio={(p) => {
          setSeleccionadoId(p.id)
          volarA(p.lat, p.lon, 10)
        }}
        onEditarSitio={(p) =>
          setFicha({
            borrador: {
              name: p.name,
              label: p.label,
              lat: p.lat,
              lon: p.lon,
              countryName: p.countryName,
              countryCode: p.countryCode,
              visitedOn: p.visitedOn,
              note: p.note,
              favorite: p.favorite,
            },
            existente: p,
            cargando: false,
          })
        }
      />

      {ficha && (
        <FichaSitio
          key={`${ficha.existente?.id ?? 'nuevo'}-${ficha.cargando}-${ficha.borrador.lat}`}
          borrador={ficha.borrador}
          existente={ficha.existente}
          cargando={ficha.cargando}
          onGuardar={guardarFicha}
          onBorrar={ficha.existente ? borrarFicha : undefined}
          onCerrar={() => setFicha(null)}
        />
      )}

      {copia && (
        <PanelCopia
          sitios={sitios}
          onImportar={importar}
          onAviso={setAviso}
          onCerrar={() => setCopia(false)}
        />
      )}

      {aviso && (
        <div className="pointer-events-none absolute inset-x-0 bottom-32 z-30 flex justify-center px-4">
          <p className="rounded-full border border-slate-700/70 bg-slate-900/90 px-4 py-2 text-xs text-slate-200 shadow-xl backdrop-blur">
            {aviso}
          </p>
        </div>
      )}
    </div>
  )
}

function BotonRedondo({
  titulo,
  activo,
  onClick,
  children,
}: {
  titulo: string
  activo?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={titulo}
      aria-label={titulo}
      className={`rounded-2xl border p-2.5 backdrop-blur-xl transition ${
        activo
          ? 'border-teal-500/70 bg-teal-500/20 text-teal-300'
          : 'border-slate-700/60 bg-slate-900/70 text-slate-300 hover:text-slate-100'
      }`}
    >
      {children}
    </button>
  )
}
