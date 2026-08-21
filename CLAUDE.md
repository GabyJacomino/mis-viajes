# Mis Viajes — notas para Claude

## Qué es esto

Proyecto **personal** de Gabriela, sin ninguna relación con el trabajo.
Mapa de sitios visitados, PWA instalable en el móvil.

**Nunca** mezclar nada de aquí con `D:\myClaude\` (proyectos de trabajo: iLinium,
Aunna, Bruzón, traspasos). Ni scripts, ni datos, ni credenciales, ni commits.

## Pila

React 19 + TypeScript + Vite 8 + Tailwind 4 + MapLibre GL 6 + `vite-plugin-pwa`.
Sin backend, sin base de datos, sin cuentas.

## Decisiones ya tomadas (no rehacer sin motivo)

- **Solo local, y así se queda.** Los sitios viven en `localStorage` y no salen del
  dispositivo. Se valoró sincronizar con Supabase y se descartó a propósito: no
  merecía el lío de cuentas y logins. Si algún día se retoma, es un módulo nuevo
  encima de `useSitios`, no un cambio del guardado local.
- **iCloud no es una opción.** Apple solo permite que una app escriba en iCloud vía
  CloudKit, que exige cuenta de Apple Developer de pago y una app iOS registrada.
  El respaldo es el fichero de copia que se guarda a mano (`backup.ts`).
- **Todo en español**: nombres de variables, funciones, comentarios y textos de
  pantalla. El tipo `Place` y sus campos siguen en inglés por costumbre del dominio.
- **Mapa sin claves de API**: teselas raster de CARTO (`dark_all`) y búsqueda con
  Nominatim. Si hay que cambiar de proveedor, mantener el requisito de "gratis y sin
  clave" salvo que Gabriela diga lo contrario.
- **Sin etiquetas de texto en el mapa**: no hay servidor de tipografías accesible
  (`demotiles.maplibre.org` y `fonts.openmaptiles.org` no responden desde aquí),
  así que los nombres se ven en un globo al tocar el punto. No añadir capas
  `symbol` con `text-field` sin resolver antes el `glyphs` del estilo.
- **Un color fijo por país**: `colorDePais()` hashea el código ISO. Cambiar la
  paleta o el hash le cambia el color a países ya marcados; evitarlo.
- **Borrado con lápida**: borrar pone `deleted: true`, no quita la fila. Sin eso, al
  restaurar una copia antigua reaparecerían los sitios ya borrados.
- **`base: '/mis-viajes/'`** en `vite.config.ts` tiene que ir siempre acompañado de
  `scope` y `start_url` iguales en el manifiesto. Si no, el icono instalado abre una
  página que no existe.

## Trampas conocidas

- `setTodos(prev => ...)` **no** deja leer el resultado en la línea siguiente.
  Para eso está `todosRef` en `useSitios.ts`, que se asigna en cada render.
- `maplibre-gl` v6 **no tiene export por defecto**: hay que importar con nombre
  (`import { Map as MapaLibre } from 'maplibre-gl'`).
- Los eventos propios (`m.fire('lo-que-sea')`) no compilan en v6; para esperar a que
  el mapa esté listo se usa la ref `pendiente`.
- Nominatim admite ~1 consulta por segundo. El buscador espera 450 ms tras la última
  tecla y cancela la petición anterior. No bajar ese retardo.
- Los iconos PNG los genera `scripts/make-icons.mjs` sin dependencias. Si se cambia
  el diseño, `node scripts/make-icons.mjs`.

## Comprobar cambios

```bash
npm run lint      # oxlint
npx tsc -b        # tipos
npm run build     # producción
```

Al verificar en el navegador: el panel de vista previa **tiene que estar visible**.
Si está oculto, el contenedor del mapa se queda sin alto, MapLibre no pide teselas y
parece que el mapa está roto cuando no lo está.

## Git

- Repositorio: `https://github.com/GabyJacomino/mis-viajes` (**público**), rama `main`.
- Publicada en `https://gabyjacomino.github.io/mis-viajes/` vía GitHub Pages; el
  workflow `publicar.yml` despliega en cada empujón a `main`.
- Identidad **local de este repo**: el correo anónimo de GitHub
  (`90014996+GabyJacomino@users.noreply.github.com`). El repo es público: no volver
  a poner aquí ni el gmail personal ni el correo del trabajo.
- `gh` está en `C:\Program Files\GitHub CLI\gh.exe`. Si no responde por nombre es
  que la terminal arrastra un PATH viejo: llamarlo por la ruta completa.
- **`github.com` no responde desde el shell tipo Unix de Claude Code** (sandbox de
  red), pero sí desde PowerShell. Los `git push` / `gh` van por PowerShell.
