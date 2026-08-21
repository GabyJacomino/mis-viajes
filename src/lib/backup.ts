import type { Place } from '../types'
import { normaliza } from './local'

type Copia = { app: 'misviajes'; version: 1; exportadoEl: string; sitios: Place[] }

function nombreFichero(): string {
  const hoy = new Date().toISOString().slice(0, 10)
  return `mis-viajes-${hoy}.json`
}

/**
 * Genera el fichero de copia. En el móvil abre la hoja de compartir, para
 * dejarlo donde uno quiera; en el ordenador se descarga sin más.
 */
export async function exportarCopia(sitios: Place[]): Promise<'compartido' | 'descargado'> {
  const copia: Copia = { app: 'misviajes', version: 1, exportadoEl: new Date().toISOString(), sitios }
  const texto = JSON.stringify(copia, null, 2)
  const fichero = new File([texto], nombreFichero(), { type: 'application/json' })

  // canShare con ficheros es lo que abre la hoja de compartir del móvil.
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (nav.share && nav.canShare?.({ files: [fichero] })) {
    try {
      await nav.share({ files: [fichero], title: 'Mis Viajes' })
      return 'compartido'
    } catch (e) {
      // Si cancela la hoja de compartir no es un error: se cae a la descarga.
      if ((e as DOMException)?.name === 'AbortError') return 'compartido'
    }
  }

  const url = URL.createObjectURL(fichero)
  const a = document.createElement('a')
  a.href = url
  a.download = fichero.name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
  return 'descargado'
}

/** Lee un fichero de copia y devuelve los sitios que contiene. */
export async function leerCopia(fichero: File): Promise<Place[]> {
  const datos = JSON.parse(await fichero.text()) as Partial<Copia> & { sitios?: Place[] }
  const sitios = Array.isArray(datos.sitios) ? datos.sitios : null
  if (!sitios) throw new Error('Este fichero no es una copia de Mis Viajes.')
  return sitios.map(normaliza)
}
