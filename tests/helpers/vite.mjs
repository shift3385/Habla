// Carga módulos de src/ con Vite (ssrLoadModule) para probar la lógica sin navegador ni dependencias nuevas
// (AUD-ARQ-113). Un único servidor Vite en middlewareMode para todas las pruebas de un archivo.
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = fileURLToPath(new URL('../..', import.meta.url))
let server = null

async function getServer() {
  server ??= await createServer({
    root,
    configFile: false, // sin los plugins de React/Tailwind: solo hace falta transformar TypeScript
    logLevel: 'error',
    appType: 'custom',
    // Sin servidor WebSocket de HMR: node:test ejecuta varios archivos de test en paralelo y chocarían en el puerto.
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
  })
  return server
}

/** Carga el módulo desde cero (estado de módulo limpio en cada llamada). */
export async function loadFresh(path) {
  const s = await getServer()
  s.moduleGraph.invalidateAll()
  return s.ssrLoadModule(path)
}

export async function closeServer() {
  await server?.close()
  server = null
}
