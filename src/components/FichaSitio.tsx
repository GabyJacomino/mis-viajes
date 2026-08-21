import { Heart, Loader2, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import type { Place } from '../types'
import { banderaDePais, colorDePais } from '../lib/palette'

export type Borrador = {
  name: string
  label: string
  lat: number
  lon: number
  countryName: string
  countryCode: string
  visitedOn: string
  note: string
  favorite: boolean
}

type Props = {
  borrador: Borrador
  /** Cuando es un sitio ya guardado, se puede borrar. */
  existente: Place | null
  cargando?: boolean
  onGuardar: (b: Borrador) => void
  onBorrar?: () => void
  onCerrar: () => void
}

export function FichaSitio({ borrador, existente, cargando, onGuardar, onBorrar, onCerrar }: Props) {
  const [valores, setValores] = useState<Borrador>(borrador)
  const color = colorDePais(valores.countryCode)
  const cambia = <C extends keyof Borrador>(campo: C, valor: Borrador[C]) =>
    setValores((v) => ({ ...v, [campo]: valor }))

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-slate-700/70 bg-slate-900 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-w-md sm:rounded-3xl">
        <header className="flex items-start gap-3 border-b border-slate-800 px-5 py-4">
          <span
            className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full"
            style={{ background: color, boxShadow: `0 0 12px ${color}` }}
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-slate-100">
              {existente ? 'Editar sitio' : 'Nuevo sitio'}
            </h2>
            <p className="truncate text-xs text-slate-400">
              {banderaDePais(valores.countryCode)} {valores.label || 'Punto marcado en el mapa'}
            </p>
          </div>
          <button
            onClick={onCerrar}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </header>

        {cargando ? (
          <div className="flex items-center justify-center gap-2 px-5 py-10 text-sm text-slate-400">
            <Loader2 size={16} className="animate-spin text-teal-400" /> Averiguando qué hay aquí…
          </div>
        ) : (
          <div className="space-y-4 px-5 py-4">
            <Campo etiqueta="Nombre del sitio">
              <input
                value={valores.name}
                onChange={(e) => cambia('name', e.target.value)}
                placeholder="Roma"
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-[15px] text-slate-100 outline-none focus:border-teal-500/60"
                autoFocus
              />
            </Campo>

            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="País">
                <input
                  value={valores.countryName}
                  onChange={(e) => cambia('countryName', e.target.value)}
                  placeholder="Italia"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-[15px] text-slate-100 outline-none focus:border-teal-500/60"
                />
              </Campo>
              <Campo etiqueta="Cuándo">
                <input
                  value={valores.visitedOn}
                  onChange={(e) => cambia('visitedOn', e.target.value)}
                  placeholder="2019 · verano"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-[15px] text-slate-100 outline-none focus:border-teal-500/60"
                />
              </Campo>
            </div>

            <Campo etiqueta="Recuerdo">
              <textarea
                value={valores.note}
                onChange={(e) => cambia('note', e.target.value)}
                rows={3}
                placeholder="Lo que no quiero olvidar de este sitio…"
                className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-[15px] text-slate-100 outline-none focus:border-teal-500/60"
              />
            </Campo>

            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2.5">
              <span className="text-sm text-slate-300">Marcar como favorito</span>
              <button
                onClick={() => cambia('favorite', !valores.favorite)}
                className={`rounded-full p-2 transition ${
                  valores.favorite ? 'bg-rose-500/15 text-rose-400' : 'text-slate-500 hover:bg-slate-800'
                }`}
                aria-label="Favorito"
              >
                <Heart size={18} fill={valores.favorite ? 'currentColor' : 'none'} />
              </button>
            </div>

            <p className="text-[11px] text-slate-500">
              Punto exacto: {valores.lat.toFixed(5)}, {valores.lon.toFixed(5)}
            </p>

            <div className="flex gap-2 pt-1">
              {existente && onBorrar && (
                <button
                  onClick={onBorrar}
                  className="flex items-center gap-2 rounded-xl border border-rose-900/60 px-3 py-2.5 text-sm text-rose-300 hover:bg-rose-950/40"
                >
                  <Trash2 size={16} /> Borrar
                </button>
              )}
              <button
                onClick={() => onGuardar({ ...valores, name: valores.name.trim() || 'Sin nombre' })}
                className="flex-1 rounded-xl bg-teal-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-teal-400"
              >
                {existente ? 'Guardar cambios' : 'Marcar en el mapa'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Campo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {etiqueta}
      </span>
      {children}
    </label>
  )
}
