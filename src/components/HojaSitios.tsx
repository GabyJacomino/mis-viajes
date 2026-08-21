import { ChevronDown, ChevronUp, Heart, Pencil } from 'lucide-react'
import { useState } from 'react'
import type { Place } from '../types'
import type { Pais } from '../lib/useSitios'
import { banderaDePais, colorDePais } from '../lib/palette'
import { Buscador } from './Buscador'
import type { Sugerencia } from '../lib/geocode'

const PAISES_DEL_MUNDO = 195

type Props = {
  paises: Pais[]
  totalSitios: number
  abierta: boolean
  onAlternar: (abierta: boolean) => void
  onElegirSugerencia: (s: Sugerencia) => void
  onIrASitio: (p: Place) => void
  onEditarSitio: (p: Place) => void
}

export function HojaSitios({
  paises,
  totalSitios,
  abierta,
  onAlternar,
  onElegirSugerencia,
  onIrASitio,
  onEditarSitio,
}: Props) {
  const [plegados, setPlegados] = useState<Set<string>>(new Set())
  const porcentaje = ((paises.length / PAISES_DEL_MUNDO) * 100).toFixed(paises.length < 20 ? 1 : 0)

  const alternarPais = (codigo: string) =>
    setPlegados((prev) => {
      const s = new Set(prev)
      if (s.has(codigo)) s.delete(codigo)
      else s.add(codigo)
      return s
    })

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto w-full max-w-md rounded-3xl border border-slate-700/60 bg-slate-900/80 shadow-2xl backdrop-blur-xl">
        <button
          onClick={() => onAlternar(!abierta)}
          className="flex w-full items-center justify-between px-5 pb-2 pt-3"
          aria-label={abierta ? 'Plegar la lista' : 'Ver mis sitios'}
        >
          <span className="flex items-baseline gap-4 text-left">
            <Dato valor={paises.length} etiqueta={paises.length === 1 ? 'país' : 'países'} />
            <Dato valor={totalSitios} etiqueta={totalSitios === 1 ? 'sitio' : 'sitios'} />
            <span className="text-[11px] text-slate-500">{porcentaje}% del mundo</span>
          </span>
          {abierta ? (
            <ChevronDown size={18} className="text-slate-400" />
          ) : (
            <ChevronUp size={18} className="text-slate-400" />
          )}
        </button>

        <div className="px-4 pb-3">
          <Buscador onElegir={onElegirSugerencia} onFoco={() => onAlternar(false)} />
        </div>

        {abierta && (
          <div className="scroll-fino max-h-[46vh] overflow-y-auto border-t border-slate-800/80 px-2 py-2">
            {paises.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-slate-400">
                Todavía no hay nada en el mapa.
                <br />
                Busca arriba el primer sitio donde has estado.
              </p>
            ) : (
              paises.map((pais) => {
                const color = colorDePais(pais.codigo)
                const plegado = plegados.has(pais.codigo)
                return (
                  <div key={pais.codigo} className="mb-1">
                    <button
                      onClick={() => alternarPais(pais.codigo)}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 hover:bg-slate-800/50"
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: color, boxShadow: `0 0 8px ${color}` }}
                      />
                      <span className="text-sm">{banderaDePais(pais.codigo)}</span>
                      <span className="min-w-0 flex-1 truncate text-left text-sm font-medium text-slate-200">
                        {pais.nombre}
                      </span>
                      <span className="shrink-0 rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-400">
                        {pais.sitios.length}
                      </span>
                      {plegado ? (
                        <ChevronUp size={14} className="shrink-0 text-slate-500" />
                      ) : (
                        <ChevronDown size={14} className="shrink-0 text-slate-500" />
                      )}
                    </button>

                    {!plegado &&
                      pais.sitios.map((sitio) => (
                        <div
                          key={sitio.id}
                          className="group flex items-center gap-2 rounded-xl pl-8 pr-2 hover:bg-slate-800/40"
                        >
                          <button
                            onClick={() => onIrASitio(sitio)}
                            className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left"
                          >
                            <span className="min-w-0 flex-1 truncate text-sm text-slate-300">
                              {sitio.name}
                            </span>
                            {sitio.favorite && (
                              <Heart size={12} className="shrink-0 text-rose-400" fill="currentColor" />
                            )}
                            {sitio.visitedOn && (
                              <span className="shrink-0 text-[11px] text-slate-500">{sitio.visitedOn}</span>
                            )}
                          </button>
                          <button
                            onClick={() => onEditarSitio(sitio)}
                            className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-slate-200"
                            aria-label={`Editar ${sitio.name}`}
                          >
                            <Pencil size={14} />
                          </button>
                        </div>
                      ))}
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Dato({ valor, etiqueta }: { valor: number; etiqueta: string }) {
  return (
    <span className="flex items-baseline gap-1">
      <span className="text-lg font-semibold text-slate-100">{valor}</span>
      <span className="text-[11px] text-slate-400">{etiqueta}</span>
    </span>
  )
}
