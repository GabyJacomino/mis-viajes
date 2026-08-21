import { Loader2, MapPin, Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { buscarSitios, type Sugerencia } from '../lib/geocode'
import { banderaDePais } from '../lib/palette'

type Props = {
  onElegir: (s: Sugerencia) => void
  onFoco?: () => void
}

export function Buscador({ onElegir, onFoco }: Props) {
  const [texto, setTexto] = useState('')
  const [resultados, setResultados] = useState<Sugerencia[]>([])
  const [buscando, setBuscando] = useState(false)
  const [error, setError] = useState('')
  const aborto = useRef<AbortController | null>(null)

  useEffect(() => {
    const q = texto.trim()
    if (q.length < 2) {
      setResultados([])
      setError('')
      return
    }
    // Espera a que se pare de escribir: OpenStreetMap pide como mucho una consulta por segundo.
    const t = setTimeout(() => {
      aborto.current?.abort()
      const ctrl = new AbortController()
      aborto.current = ctrl
      setBuscando(true)
      setError('')
      buscarSitios(q, ctrl.signal)
        .then((r) => {
          setResultados(r)
          if (r.length === 0) setError('No he encontrado ese sitio.')
        })
        .catch((e: Error) => {
          if (e.name !== 'AbortError') setError('No he podido buscar. ¿Hay conexión?')
        })
        .finally(() => {
          if (!ctrl.signal.aborted) setBuscando(false)
        })
    }, 450)
    return () => clearTimeout(t)
  }, [texto])

  const elegir = (s: Sugerencia) => {
    onElegir(s)
    setTexto('')
    setResultados([])
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-2xl border border-slate-700/70 bg-slate-900/70 px-3 py-2.5 focus-within:border-teal-500/60">
        {buscando ? (
          <Loader2 size={18} className="shrink-0 animate-spin text-teal-400" />
        ) : (
          <Search size={18} className="shrink-0 text-slate-400" />
        )}
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onFocus={onFoco}
          placeholder="¿Dónde has estado? Roma, Kyoto, Bali…"
          className="w-full bg-transparent text-[15px] text-slate-100 outline-none placeholder:text-slate-500"
          autoComplete="off"
          enterKeyHint="search"
        />
        {texto && (
          <button
            onClick={() => setTexto('')}
            className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            aria-label="Limpiar"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {(resultados.length > 0 || error) && (
        <div className="scroll-fino absolute bottom-full left-0 right-0 mb-2 max-h-72 overflow-y-auto rounded-2xl border border-slate-700/70 bg-slate-900/95 shadow-2xl backdrop-blur">
          {error && <p className="px-4 py-3 text-sm text-slate-400">{error}</p>}
          {resultados.map((s, i) => (
            <button
              key={`${s.lat},${s.lon},${i}`}
              onClick={() => elegir(s)}
              className="flex w-full items-start gap-3 border-b border-slate-800/70 px-4 py-3 text-left last:border-0 hover:bg-slate-800/60"
            >
              <MapPin size={16} className="mt-0.5 shrink-0 text-teal-400" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-slate-100">{s.name}</span>
                <span className="block truncate text-xs text-slate-400">
                  {banderaDePais(s.countryCode)} {s.label}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
