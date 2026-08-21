import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { NewPlace, Place } from '../types'
import { fusiona, guardarLocal, leerLocal, nuevoId } from './local'

export type Pais = {
  codigo: string
  nombre: string
  sitios: Place[]
}

/**
 * Los sitios viven en este móvil y en ningún otro sitio. El único respaldo es
 * el fichero de copia que se guarda a mano desde Ajustes.
 */
export function useSitios() {
  const [todos, setTodos] = useState<Place[]>(() => leerLocal())
  // Copia viva de la lista: setState no devuelve el valor al momento y al
  // restaurar una copia hace falta saber YA qué había guardado.
  const todosRef = useRef(todos)
  todosRef.current = todos

  useEffect(() => {
    guardarLocal(todos)
  }, [todos])

  const añadir = useCallback((datos: NewPlace): Place => {
    const ahora = new Date().toISOString()
    const sitio: Place = {
      ...datos,
      id: nuevoId(),
      createdAt: ahora,
      updatedAt: ahora,
      deleted: false,
    }
    setTodos((prev) => [...prev, sitio])
    return sitio
  }, [])

  const actualizar = useCallback((id: string, cambios: Partial<Place>) => {
    setTodos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...cambios, updatedAt: new Date().toISOString() } : p)),
    )
  }, [])

  const borrar = useCallback((id: string) => {
    // Lápida en vez de borrado real: si no, al restaurar una copia antigua
    // volverían a aparecer los sitios que ya había quitado.
    setTodos((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, deleted: true, updatedAt: new Date().toISOString() } : p,
      ),
    )
  }, [])

  const importar = useCallback((entrantes: Place[]): number => {
    const antes = new Set(todosRef.current.filter((p) => !p.deleted).map((p) => p.id))
    const unidos = fusiona(todosRef.current, entrantes)
    const añadidos = unidos.filter((p) => !p.deleted && !antes.has(p.id)).length
    todosRef.current = unidos
    setTodos(unidos)
    return añadidos
  }, [])

  const sitios = useMemo(
    () => todos.filter((p) => !p.deleted).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [todos],
  )

  const paises = useMemo<Pais[]>(() => {
    const porCodigo = new Map<string, Pais>()
    for (const s of sitios) {
      const codigo = s.countryCode || '??'
      const pais = porCodigo.get(codigo) ?? {
        codigo,
        nombre: s.countryName || 'Sin país',
        sitios: [],
      }
      pais.sitios.push(s)
      porCodigo.set(codigo, pais)
    }
    return [...porCodigo.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }, [sitios])

  return { sitios, paises, añadir, actualizar, borrar, importar }
}
