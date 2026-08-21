import { Download, HardDrive, Upload, X } from 'lucide-react'
import { useRef } from 'react'
import type { Place } from '../types'
import { exportarCopia, leerCopia } from '../lib/backup'

type Props = {
  sitios: Place[]
  onImportar: (sitios: Place[]) => number
  onAviso: (texto: string) => void
  onCerrar: () => void
}

export function PanelCopia({ sitios, onImportar, onAviso, onCerrar }: Props) {
  const ficheroRef = useRef<HTMLInputElement>(null)

  const guardarCopia = async () => {
    if (sitios.length === 0) {
      onAviso('Todavía no hay sitios que guardar.')
      return
    }
    const via = await exportarCopia(sitios)
    onAviso(
      via === 'compartido'
        ? 'Elige dónde dejar el fichero.'
        : `Copia descargada (${sitios.length} sitios).`,
    )
  }

  const restaurarCopia = async (fichero: File) => {
    try {
      const entrantes = await leerCopia(fichero)
      const añadidos = onImportar(entrantes)
      onAviso(añadidos > 0 ? `Restaurados ${añadidos} sitios nuevos.` : 'La copia no traía nada nuevo.')
    } catch (e) {
      onAviso((e as Error).message)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
      <div className="w-full rounded-t-3xl border border-slate-700/70 bg-slate-900 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-w-md sm:rounded-3xl">
        <header className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-100">Copia de mis sitios</h2>
          <button
            onClick={onCerrar}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </header>

        <section className="space-y-4 px-5 py-5">
          <p className="flex items-start gap-2.5 rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-3 text-sm text-slate-400">
            <HardDrive size={16} className="mt-0.5 shrink-0 text-teal-400" />
            <span>
              Tus <strong className="text-slate-200">{sitios.length}</strong>{' '}
              {sitios.length === 1 ? 'sitio está' : 'sitios están'} guardados en este dispositivo.
              No salen de aquí.
            </span>
          </p>

          <p className="text-sm text-slate-400">
            Guarda un fichero con todo de vez en cuando. Es tu red de seguridad si cambias de móvil
            o borras los datos del navegador.
          </p>

          <div className="flex gap-2">
            <button
              onClick={guardarCopia}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-500 px-3 py-2.5 text-sm font-semibold text-slate-950 hover:bg-teal-400"
            >
              <Upload size={16} /> Guardar copia
            </button>
            <button
              onClick={() => ficheroRef.current?.click()}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-800 px-3 py-2.5 text-sm font-medium text-slate-100 hover:bg-slate-700"
            >
              <Download size={16} /> Restaurar
            </button>
          </div>

          <input
            ref={ficheroRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void restaurarCopia(f)
              e.target.value = ''
            }}
          />
        </section>
      </div>
    </div>
  )
}
