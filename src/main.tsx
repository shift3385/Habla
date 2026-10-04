import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { installLifecycle } from './lib/lifecycle'
import { installViewport } from './lib/viewport'

// En segundo plano la app queda inactiva: micrófono cerrado, voz callada y la clase guardada.
installLifecycle()
// Pantallas pequeñas: misma apariencia a escala; horizontal: pantallas reorganizadas.
installViewport()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
