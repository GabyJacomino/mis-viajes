import { setWorkerUrl } from 'maplibre-gl'
// MapLibre v6 arma la ruta de su worker en tiempo de ejecución, con una plantilla
// (`new URL(`./${nombre}`, import.meta.url)`). El empaquetador no puede verla, así
// que nunca copia el fichero y el mapa se queda a medio cargar sin decir nada.
// Con `?worker&url` es Vite quien empaqueta el worker y nos da su dirección real.
import urlDelWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'

setWorkerUrl(urlDelWorker)
