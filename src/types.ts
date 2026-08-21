export type Place = {
  id: string
  /** Nombre corto del sitio, el que se ve en la lista: "Roma". */
  name: string
  /** Descripción larga que devuelve el buscador: "Roma, Lacio, Italia". */
  label: string
  lat: number
  lon: number
  countryName: string
  /** ISO 3166-1 alfa-2 en mayúsculas ("IT"). Es la clave del color del país. */
  countryCode: string
  /** Cuándo estuve. Texto libre corto tipo "2019" o "2019-07". */
  visitedOn: string
  note: string
  favorite: boolean
  createdAt: string
  updatedAt: string
  /** Lápida: el sitio se borró. Se conserva para que al restaurar una copia
   *  antigua no reaparezca lo que ya había borrado. */
  deleted: boolean
}

export type NewPlace = Omit<Place, 'id' | 'createdAt' | 'updatedAt' | 'deleted'>
