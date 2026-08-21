# Mis Viajes

El mapa de todos los sitios donde he estado. Busco el nombre de un sitio, lo marco,
y el país se enciende con su color y aparece un punto en el lugar exacto.

Proyecto **personal**. Nada que ver con el trabajo.

**Publicada en https://gabyjacomino.github.io/mis-viajes/** — cada empujón a `main`
la reconstruye y la publica sola (ver `.github/workflows/publicar.yml`).

## Arrancarlo

```bash
npm install
npm run dev
```

Se abre en http://localhost:5173.

## Ponerlo en el móvil

Es una PWA: se instala sin tiendas de aplicaciones.

1. Publícala (ver más abajo) o entra desde el móvil a la dirección del portátil
   (`npm run dev -- --host` y usar la IP que salga, ambos en el mismo wifi).
2. **iPhone**: en Safari, botón de compartir → *Añadir a pantalla de inicio*.
3. **Android**: en Chrome, menú → *Instalar aplicación*.

Queda con su icono y a pantalla completa, como cualquier app.

## Cómo se usa

- **Buscar y marcar**: escribe el sitio en la caja de abajo ("Roma", "Kyoto", "Bali"),
  elige el resultado correcto y ponle cuándo estuviste y un recuerdo.
- **Marcar a mano**: el botón del pin (arriba derecha) y luego un toque en el punto
  exacto del mapa. La app averigua sola qué sitio y qué país es.
- **Colores**: cada país tiene su color, siempre el mismo. El territorio se tiñe de
  ese color y encima va un punto blanco con anillo del color por cada sitio.
- **Encuadrar**: el botón del cuadrado ajusta la vista a todos tus sitios.
- **Lista**: toca la barra de cifras de abajo para desplegar tus países y sitios.

## Dónde se guardan los sitios

**En el propio dispositivo y en ningún otro sitio** (`localStorage` del navegador).
Sin cuentas, sin logins, sin servidores: los sitios no salen de tu móvil.

La contrapartida es que si borras los datos del navegador o cambias de móvil, se van
con él. Para eso está el botón de guardar:

- **Guardar copia** (botón del disquete): genera un fichero `.json` con todo. En el
  móvil se abre la hoja de compartir y lo dejas donde quieras — Archivos, Drive, un
  correo a ti misma, lo que sea. En el ordenador se descarga.
- **Restaurar**: eliges ese fichero y vuelve todo. Se puede restaurar sobre una lista
  que ya tenga sitios: se fusionan sin duplicar, y de cada sitio gana la versión más
  reciente. Los sitios que borraste siguen borrados.

Merece la pena guardar una copia de vez en cuando.

## Publicarlo

Ya está publicada en GitHub Pages y se despliega sola al subir a `main`.

Ojo: Pages sirve el sitio en `/mis-viajes/`, no en la raíz del dominio. De ahí el
`base` en `vite.config.ts` y el `scope`/`start_url` del manifiesto. Si algún día se
mueve a un dominio propio, hay que quitar las tres cosas a la vez.

`npm run build` deja todo en `dist/`, así que también vale cualquier otro hosting
estático. Sin servidor propio: la app no tiene backend.

## De dónde salen los datos

- **Mapa**: teselas oscuras de CARTO sobre OpenStreetMap. Gratis y sin clave.
- **Buscador**: Nominatim (OpenStreetMap). Gratis y sin clave; admite como mucho
  una consulta por segundo, de ahí el pequeño retardo al escribir.
- **Siluetas de países**: `world-atlas` (Natural Earth), incluido en el paquete.
  Se carga aparte para no ralentizar el arranque.

Lo único que sale a internet es la búsqueda de sitios y las teselas del mapa. Tus
sitios guardados no se envían a ninguna parte.

## Estructura

```
src/
  App.tsx                 pantalla principal y flujos
  types.ts                qué es un "sitio"
  lib/
    useSitios.ts          estado y guardado en el dispositivo
    local.ts              localStorage y fusión de listas
    backup.ts             copia y restauración de fichero
    geocode.ts            búsqueda de sitios (Nominatim)
    countries.ts          siluetas de países coloreadas
    palette.ts            color y bandera de cada país
  components/
    MapaMundi.tsx         el mapa y sus capas
    Buscador.tsx          caja de búsqueda con sugerencias
    HojaSitios.tsx        panel inferior: cifras y lista
    FichaSitio.tsx        alta y edición de un sitio
    PanelCopia.tsx        guardar y restaurar la copia
scripts/make-icons.mjs    genera los iconos PNG de la app
```
