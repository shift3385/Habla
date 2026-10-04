// Pantallas pequeñas (NC-07) y horizontal (NC-12).
//
// La interfaz está diseñada para ~390×800 px CSS (p. ej. Poco X6, que ya se ve bien). En pantallas más pequeñas
// (Galaxy A11: 360×780; teléfonos de 320 px) se escala TODO en proporción con `zoom` sobre <html>: el navegador
// vuelve a maquetar como si la pantalla midiera 390×800, así se mantiene exactamente el mismo aspecto, sin
// textos partidos ni rejillas solapadas. En pantallas iguales o mayores no se toca nada (escala 1).
//
// En horizontal no se reduce (la altura es pequeña y todo quedaría diminuto): se marca <html data-landscape>
// para que las pantallas se reorganicen (contenido centrado, desplazable y mascota más pequeña).

const DESIGN_W = 390
const DESIGN_H = 800
const MIN_SCALE = 0.8

export function viewportScale(w: number, h: number): number {
  if (w > h) return 1
  return Math.max(MIN_SCALE, Math.min(1, w / DESIGN_W, h / DESIGN_H))
}

function apply() {
  const html = document.documentElement
  // innerWidth/innerHeight son las medidas reales de la pantalla: el zoom de CSS no las cambia.
  const w = window.innerWidth
  const h = window.innerHeight
  const z = viewportScale(w, h)
  html.style.zoom = z === 1 ? '' : String(Math.round(z * 1000) / 1000)
  if (w > h) html.dataset.landscape = ''
  else delete html.dataset.landscape
}

export function installViewport() {
  apply()
  let t = 0
  const later = () => {
    clearTimeout(t)
    t = window.setTimeout(apply, 120)
  }
  window.addEventListener('resize', later)
  window.addEventListener('orientationchange', later)
}
