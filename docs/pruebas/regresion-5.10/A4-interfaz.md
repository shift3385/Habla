# A4 · Interfaz y navegación — regresión 5.10 (build 40)

Agente A4 · 2026-10-20 · rama `v5.10-gramatica` (`cd5803a`) · navegador integrado (Vite `habla-dev`, origen aislado
`reg.localhost:5173`) · datos ficticios (`B7/arnes/seed7.js` con 6 sesiones, 18 errores, 500 tarjetas, 300 consultas) ·
Gemini y Azure **simulados** con `evidencia/A4/arnes-a4.js` (responde según `generationConfig.responseJsonSchema`; clave
`AIzaTEST-NO-REAL-…`), micro falso (oscilador) y voz falsa (`speechSynthesis` «suena» 2,5 s). Sin `adb`, sin cambios en `src/`.

## Resumen · go/no-go

**GO condicionado para la interfaz** (sin bloqueantes). La pestaña Gramática, la pila de navegación, la hoja encima de la
clase, «Pregúntale», los ejercicios de los 3 tipos, «Dilo tú», el informe con «Para repasar en Gramática», la tarjeta de
Gramática del Repaso, el aviso de `echoesIdea` y el corte de la voz antes de abrir el micro (P6) funcionan en 390×844,
320×640 y 780×360, sin scroll horizontal y sin scroll de página en el Inicio (salvo un caso límite, REG-A4-08).

Antes de dar el release por bueno recomiendo arreglar **REG-A4-02** (el aviso «Abriendo el micro… espera» de P7 solo
existe en la clase: en el Repaso, «Dilo tú» y el test el botón sigue en «Toca para hablar» 2–3 s mientras el micro abre,
justo el síntoma que el dueño denunció, y Novedades promete que ya no pasa) y **REG-A4-01** («Pregúntale» pierde la
respuesta al volver de un tema y obliga a gastar otra llamada). El resto es menor (contraste en claro, tamaños de toque,
textos) y puede ir a una 5.10.1.

| Severidad | Nº | IDs |
|---|---|---|
| Alta | 0 | — |
| Media | 3 | REG-A4-01, REG-A4-02, REG-A4-03 |
| Baja | 6 | REG-A4-04 (MOV-2), REG-A4-05, REG-A4-06, REG-A4-07, REG-A4-08, REG-A4-09 |

Cobertura: 4.1–4.5 hechas en el navegador. Queda para el teléfono lo que el navegador no puede: teclado real de
Android, voz real (TTS español/inglés), Atrás físico, micro real y tiempos de apertura (5.2), Galaxy A11 (no conectado).

## Casos

Capturas en `docs/pruebas/regresion-5.10/evidencia/A4/` (nombre = número del caso).

| Caso | Qué se comprobó | Resultado | Evidencia |
|---|---|---|---|
| 4.1-a | Presentación de la mascota de Gramática (1.ª vez); «¡Vamos!»/«Ahora no» | OK | 4.1-01 |
| 4.1-b | Pestaña de 3 segmentos «Temas 3 · Prácticas 5 · Gramática 12» cabe en 390 y 320 (93 px por segmento a 320) | OK | 4.1-02, 4.1-16 |
| 4.1-c | Inicio sin scroll de página: `scrollHeight` = `clientHeight` (844/844 a 390; 640/640 y `.tab-content` 800/800 a 320 con zoom 0,8); sin scroll horizontal (`scrollWidth` = `clientWidth`) | OK (salvo REG-A4-08) | 4.1-02, 4.1-16, 4.1-22 |
| 4.1-d | Buscador «deberia» → 4 temas + «Pregúntale a Gota · «deberia»» | OK | 4.1-03 |
| 4.1-e | «Para ti»: ya no es una fila (decisión del dueño, `GrammarPanel.tsx:11-12`); los recomendados llevan ⭐ en las listas (visto en «Present Perfect») | OK (por diseño) | 4.1-05 |
| 4.1-f | Sección «Tiempos verbales» (lista propia con scroll, 1848/600) | OK | 4.1-05 |
| 4.1-g | Tema: Explícame (globo teñido + ▶), Cómo se forma, Ejemplos, Errores típicos, Relacionado, «Hacer los ejercicios», «Pregúntale», «Practicar en una clase» | OK | 4.1-06, 4.1-07, 4.1-17, 4.1-21 |
| 4.1-h | Ejercicio «Elige» fallado: trampa explicada, correcta en verde, frase con ▶, «Lo apunto en tu Repaso» | OK | 4.1-08 |
| 4.1-i | Ejercicio «Completa» (1 y 2 huecos, Intro comprueba) fallado: «Era didn't sleep» | OK | 4.1-09, 4.1-18 |
| 4.1-j | Ejercicio «Ordena»: palabras elegidas arriba, quitar tocando, «¡Correcto!» | OK | 4.1-10, 4.1-11, 4.1-20 |
| 4.1-k | Resultado de la ronda («¡Ronda terminada!», 7 de 8 para dominar, Ver la explicación / Otra ronda) | OK con NC menor (REG-A4-06) | 4.1-12 |
| 4.1-l | «Dilo tú»: reto 1 de 3, grabar (anillo/barras), enviar, «¡Correcto!», «Dijiste…», forma modelo con ▶ | OK con NC (REG-A4-02) | 4.1-13…15 |
| 4.1-m | «Pregúntale» con la respuesta simulada: párrafos, ejemplo con ▶, enlace 📘 solo al id real (el inventado `tema-inventado-xyz` no sale) | OK | 4.1-04 |
| 4.1-n | 780×360 (A11 horizontal): barra lateral, Inicio desplazable dentro de `.tab-content` (diseño de horizontal), tema y ejercicios legibles, sin scroll horizontal | OK | 4.1-19…21 |
| 4.1-o | Tamaños de toque ≥ 40 px en lo nuevo | NC menor (REG-A4-05) | — |
| 4.2-a | Atrás de pantalla: Pasado continuo (relacionado) → Pasado simple | OK (scroll perdido, REG-A4-09) | — |
| 4.2-b | Atrás de Android (simulado con `notifyListeners('backButton')` del plugin `App`): relacionado → tema → sección → Inicio (Gramática) → «¿Ya te vas?» → (otro Atrás) cierra el diálogo | OK | — |
| 4.2-c | Atrás de Android con la presentación abierta → vuelve a Temas | OK | — |
| 4.2-d | «Pregúntale» desde el buscador: pregunta precargada; Atrás vuelve a Gramática con «deberia» todavía en el buscador | OK | 4.2-01 |
| 4.2-e | «Pregúntale» → 📘 tema → Atrás: **la respuesta desaparece** | **NC (REG-A4-01)** | 4.2-02 |
| 4.2-f | Hoja de Gramática sobre la clase («📘 Ver en Gramática»): sin «Dilo tú» ni «Practicar»; pila tema → relacionado → Pregúntale; 3 × Atrás de Android → la clase sigue con sus turnos y correcciones | OK | 4.2-03 |
| 4.2-g | Hoja desde el informe → Atrás (botón) → vuelve al informe | OK | — |
| 4.3-a | Clase: «¿Qué digo?» con 3 ideas; tocar una idea la «lee» y su icono pasa a ⏸ | OK | 4.3-01 |
| 4.3-b | Micro con una idea sonando: corta la voz, «Abriendo el micro… espera» 2 s (400 ms + apertura de 1,5 s), luego «Toca para enviar»; ideas ocultas | OK | 4.3-02 |
| 4.3-c | Transcripción = una idea → aviso «Te entendí justo la idea de «¿Qué digo?»…» y no se corrige | OK | 4.3-03 |
| 4.3-d | Corrección con varios 📘 (2 correcciones × 2 temas; el id inventado no sale) | OK | 4.3-04 |
| 4.3-e | Informe con «Para repasar en Gramática» (4 temas) y 📘 en cada corrección | OK | 4.3-05 |
| 4.3-f | Repaso: tarjeta «ejercicio de Gramática», «Di la frase completa en inglés», evaluación y botones de intervalo | OK | 4.3-06 |
| 4.3-g | Repaso y test: fase «Abriendo el micro… espera» | **NC (REG-A4-02)** | 4.3-09 |
| 4.3-h | Test de nivel (re-test) hasta la tarea 1 de habla: gramática → lectura → audición → habla; reanuda tras recarga; «Posponer» con `MascotPage` | OK | 4.3-09, 4.4-01 |
| 4.3-i | Ajustes, Acerca de, Novedades 5.10 (build 40, 18 oct; 38–40 juntas en una entrada, 7 novedades · 12 mejoras · 1 corrección) | OK | 4.3-07, 4.3-08 |
| 4.3-j | Progreso y Palabras: sin scroll de página ni desbordes | OK | — |
| 4.4 | MOV-2: `confirm()` nativo confirmado (texto capturado al sustituir `window.confirm`): «¿Terminar «…» y ver tu evaluación? Ya no podrás seguirla.» | NC conocida (REG-A4-04), diseño abajo | 4.4-01, 4.4-02 |
| 4.5-a | 4 temas × claro/oscuro: ratios calculados (tabla abajo); `.tip-bubble` teñida con el acento en todos (`color-mix` 20 %) | OK salvo REG-A4-03 | 4.5-01…03 |
| 4.5-b | Accesibilidad: `aria-label` en ▶ de filas, explicación, Atrás, borrar búsqueda, huecos | OK con NC menor (REG-A4-07) | — |
| Red | Ninguna petición real: todas las llamadas de IA pasaron por el arnés (`__a4.calls`); al primer arranque no hubo recursos `googleapis` | OK | `arnes-a4.js` |

### Contraste (WCAG, `contraste.mjs`)

Texto sobre el cristal (`--g` sobre `--bg`) y sobre el globo `.tip-bubble` (acento 20 % + fondo):

| Tema | texto/cristal | sub/cristal | texto/globo | sub/globo | acc2/cristal | verde OK | rojo BAD | `--ink` sobre acento |
|---|---|---|---|---|---|---|---|---|
| Ember oscuro | 17,7 | 7,8 | 15,7 | 7,1 | 10,0 | 8,0 | 6,4 | **2,9** |
| Ember claro | 17,1 | 5,3 | 12,4 | 4,7 | 5,2 | **2,1** | **2,6** | 4,1 |
| Lumi oscuro | 17,2 | 7,7 | 15,7 | 7,1 | 10,8 | 7,7 | 6,2 | 3,5 |
| Lumi claro | 16,4 | 4,8 | 12,0 | 4,2 | 6,3 | **2,1** | **2,7** | 5,0 |
| Marea oscuro | 15,7 | 7,2 | 11,9 | 5,9 | 10,8 | 7,1 | 5,7 | 9,9 |
| Marea claro | 15,3 | 4,8 | 11,4 | 4,3 | 4,7 | **2,2** | **2,7** | 4,3 |
| Nimbo oscuro | 16,8 | 7,6 | 13,6 | 6,5 | 11,5 | 7,6 | 6,1 | 8,7 |
| Nimbo claro | 16,3 | 4,8 | 11,9 | 4,2 | 5,7 | **2,1** | **2,6** | 5,2 |

Texto principal y secundario pasan (el secundario en el globo queda en 4,2–4,7: justo en el límite para 11–12 px, como
«— Gota» o «💡…»). Fallan el verde y el rojo fijos de Gramática en los 4 temas claros (REG-A4-03). `--ink` sobre el
acento en Ember/Lumi oscuro (2,9/3,5) es de la 5.x anterior (botones `btn-acc`), no de la 5.10: lo anoto sin NC.

## No conformidades

### REG-A4-01 · «Pregúntale» pierde la respuesta al abrir un tema y volver
- **Severidad:** Media · **Prioridad:** P2 (gasta otra llamada a Gemini y confunde).
- **Pasos:** Gramática → buscar «deberia» → «Pregúntale a Gota» → Preguntar → tocar «📘 Should, could, would» → Atrás (pantalla o Android).
- **Obtenido:** vuelve la pantalla de «Pregúntale» con la pregunta, pero sin la respuesta, los ejemplos ni los enlaces (captura 4.2-02). Para verla otra vez hay que preguntar de nuevo (otra llamada).
- **Esperado:** volver a la respuesta que tenías, como en cualquier pila (la ida a un tema es justo el uso previsto de los enlaces).
- **Causa:** `GrammarRoutes` pinta solo la pantalla de arriba de la pila; al apilar el tema, `GrammarAskScreen` se desmonta y su estado (`src/screens/GrammarAskScreen.tsx:34-37`) se pierde. Pasa igual en el Inicio y en la hoja de la clase.
- **Arreglo propuesto** (memoria del módulo, sin datos persistentes ni claves):
```diff
--- a/src/screens/GrammarAskScreen.tsx
+++ b/src/screens/GrammarAskScreen.tsx
@@
 import { THEME_INFO } from '../ui/theme'
 
+// REG-A4-01: la última respuesta de cada «Pregúntale» (tema + pregunta inicial) sobrevive a abrir un 📘 y volver con Atrás.
+const lastAnswers = new Map<string, { q: string; asked: string; answer: MascotAnswer }>()
+
@@ export default function GrammarAskScreen({
-  const [q, setQ] = useState(initialQuestion)
-  const [asked, setAsked] = useState('')
+  const cacheKey = `${topicId ?? ''}:${initialQuestion}`
+  const cached = lastAnswers.get(cacheKey)
+  const [q, setQ] = useState(cached?.q ?? initialQuestion)
+  const [asked, setAsked] = useState(cached?.asked ?? '')
   const [loading, setLoading] = useState(false)
-  const [answer, setAnswer] = useState<MascotAnswer | null>(null)
+  const [answer, setAnswer] = useState<MascotAnswer | null>(cached?.answer ?? null)
@@ const send = async () => {
       const r = await askMascot(settings.geminiKey, fastModels(settings), info.mascotName, text, level, topic)
+      lastAnswers.set(cacheKey, { q: text, asked: text, answer: r })
       if (alive.current) setAnswer(r)
```

### REG-A4-02 · P7 a medias: «Abriendo el micro… espera» solo en la clase
- **Severidad:** Media · **Prioridad:** P1 (es el síntoma que el dueño marcó: «se pierden las 3–4 primeras palabras»).
- **Pasos:** con el micro tardando en abrir (arnés `gumDelay` 2–3 s, como el POCO), tocar el micro en (a) Repaso, (b) Gramática → «Dilo tú», (c) test de nivel → tarea de habla.
- **Obtenido:** el texto sigue en «Toca para hablar» / «Toca y contesta…» durante toda la apertura (2–3 s medidos cada 400 ms) y salta directamente a «0 s de 60 · toca para enviar» / «3 s · toca para terminar». No hay estado intermedio ni el botón queda bloqueado. En la clase sí sale «Abriendo el micro… espera» (caso 4.3-b).
- **Esperado:** el mismo aviso que la clase en las cuatro pantallas que graban. Novedades 5.10 dice «Al tocar el micro verás «Abriendo el micro… espera»… ya no se pierden las primeras palabras» sin limitarlo a la clase.
- **Dónde:** `src/screens/ReviewScreen.tsx:40` (el `PHASE` no tiene `opening`) y `:130-143` (`onPress`); `src/components/GrammarSpeak.tsx:27`, `:84-102` y `:235-242`; `src/screens/Calibration.tsx:310`, `:574-586` y `:1122-1133`. La clase lo hace en `src/screens/Conversation.tsx:495`.
- **Arreglo propuesto** (mismo patrón en las tres; el `Recorder` ya espera el evento `start`):
```diff
--- a/src/screens/ReviewScreen.tsx
+++ b/src/screens/ReviewScreen.tsx
-type Step = 'ask' | 'recording' | 'checking' | 'result'
-const PHASE: Record<Exclude<Step, 'result'>, Phase> = { ask: 'idle', recording: 'recording', checking: 'thinking' }
+type Step = 'ask' | 'opening' | 'recording' | 'checking' | 'result'
+// P7: mientras abre el micro, el botón dice «Abriendo el micro… espera» y no acepta toques (como en la clase).
+const PHASE: Record<Exclude<Step, 'result'>, Phase> = { ask: 'idle', opening: 'opening', recording: 'recording', checking: 'thinking' }
@@ const onPress = async () => {
     await stopSpeaking()
+    setStep('opening')
     try {
-      if (!(await recorder.current.begin())) return
+      if (!(await recorder.current.begin())) return setStep('ask')
       recStart.current = performance.now()
       setElapsed(0)
       setStep('recording')
     } catch (e) {
+      setStep('ask')
       setError(e instanceof MicError ? e.message : 'No se pudo grabar.')
     }
```
```diff
--- a/src/components/GrammarSpeak.tsx
+++ b/src/components/GrammarSpeak.tsx
-type Step = 'ask' | 'recording' | 'checking' | 'result'
+type Step = 'ask' | 'opening' | 'recording' | 'checking' | 'result'
@@ if (step === 'ask' || step === 'result') {
       await stopSpeaking()
       setResult(null)
       pronTry.current++
       setPron(null)
+      setStep('opening') // P7
       try {
-        if (!(await recorder.current.begin())) return
+        if (!(await recorder.current.begin())) return setStep('ask')
@@
-                disabled={step === 'checking'}
+                disabled={step === 'checking' || step === 'opening'}
@@
-                : step === 'checking'
+                : step === 'opening'
+                  ? 'Abriendo el micro… espera'
+                  : step === 'checking'
```
  En `Calibration.tsx`: `recState` con `'opening'` (`setRecState('opening')` antes de `begin()`, vuelta a `'idle'` si devuelve `false` o falla; `toggleRecord` ignora toques en `'opening'`; texto «Abriendo el micro… espera» en `:1123`). Revisar que «No lo sé» / salir durante `'opening'` dejen el estado en `'ask'`/`'idle'` (hoy la cancelación devuelve `false`).

### REG-A4-03 · Verde y rojo de Gramática ilegibles en modo claro
- **Severidad:** Media · **Prioridad:** P2 (afecta a la madre del dueño si usa un tema claro; texto clave: la forma correcta).
- **Pasos:** tema Marea o Ember claro → Gramática → un tema → «Errores típicos»; ejercicios → «¡Correcto!»/«Aún no»; sección con «Dominado».
- **Obtenido:** `#22c58b` sobre el cristal ≈ 2,1:1 y `#f87171` ≈ 2,6:1 en los 4 temas claros (AA pide 4,5:1 para 14 px). Capturas 4.5-02 y 4.5-03.
- **Esperado:** ≥ 4,5:1 (o ≥ 3:1 si es texto grande en negrita).
- **Dónde:** `src/screens/GrammarTopicScreen.tsx:199` y `:203`; `src/components/GrammarExercises.tsx:13-14`; `src/components/GrammarTopicRow.tsx:12`; `src/components/GrammarPanel.tsx:133`; también `#22c58b` en `CorrectionView`/informe.
- **Arreglo propuesto:** variables por modo en `cssVars` y usarlas en lugar de los literales.
```diff
--- a/src/ui/theme.ts
+++ b/src/ui/theme.ts
@@ export function cssVars(t: ThemeVars): Record<string, string> {
+  const light = t.tx !== '#ffffff'
   return {
@@
     '--glow': t.glow,
+    // REG-A4-03: verde/rojo legibles en claro (≥ 5:1 sobre el cristal); en oscuro, los de siempre.
+    '--ok': light ? '#0b7a53' : '#22c58b',
+    '--bad': light ? '#b91c1c' : '#f87171',
   }
--- a/src/components/GrammarExercises.tsx
+++ b/src/components/GrammarExercises.tsx
-const OK = '#22c58b'
-const BAD = '#f87171'
+const OK = 'var(--ok)'
+const BAD = 'var(--bad)'
```
  (y `style={{ color: 'var(--bad)' }}` / `'var(--ok)'` en `GrammarTopicScreen.tsx:199/203`, `GrammarTopicRow.tsx:12`, `GrammarPanel.tsx:133`). Ratios con `#0b7a53`: 5,1–5,2 sobre cristal, 3,7–3,9 en el globo (el «¡Correcto!» va en negrita con icono); `#b91c1c`: 6,1–6,2 y 4,4–4,7.

### REG-A4-04 · MOV-2: diálogos `confirm()` nativos (en inglés en Android y sin la mascota)
- **Severidad:** Baja · **Prioridad:** P3 (ya conocida como MOV-2).
- **Dónde:** `src/App.tsx:540` (terminar la clase guardada desde el Inicio) y `src/screens/SettingsScreen.tsx:849` (importar una copia). En el navegador se confirmó que es `window.confirm` (texto capturado); en Android el WebView pinta un diálogo del sistema con botones «Cancel/OK».
- **Diseño propuesto:** `MascotPage` a pantalla completa, como «¿Posponer el test?» (4.4-01): mascota pensativa, título en pregunta, explicación corta, botón principal = la opción segura y enlace = la acción irreversible.
```diff
--- a/src/App.tsx
+++ b/src/App.tsx
@@ (estado, junto a askNew/askExit, ~l.116)
+  const [askFinish, setAskFinish] = useState(false)
@@ function finishSavedClass() {
     const s = savedRef.current
     if (!s) return
-    if (!confirm(`¿Terminar «${s.title}» y ver tu evaluación? Ya no podrás seguirla.`)) return
+    setAskFinish(true) // MOV-2: la mascota pregunta (antes, confirm() nativo en inglés)
+  }
+  function doFinishSavedClass() {
+    setAskFinish(false)
+    const s = savedRef.current
+    if (!s) return
     backHandler.current = null
     setPlanOpen(false)
     setLesson({
@@ const dialogs = (
     <>
+      {askFinish && (
+        <MascotPage
+          overlay={{ t }}
+          element={mascotEl}
+          mood="thinking"
+          title="¿Terminar la clase?"
+          subtitle={`Si terminas «${savedClass?.title ?? 'tu clase'}» ahora, te doy la evaluación con lo que hablaste y ya no podrás seguirla.`}
+          primary={{ label: 'No, la sigo otro día', onClick: () => setAskFinish(false) }}
+          secondary={{ label: 'Sí, terminar y evaluar', onClick: doFinishSavedClass }}
+          onBack={() => setAskFinish(false)}
+        />
+      )}
       {askNew && (
```
  y en el listener de `backButton` (`App.tsx:262`), cerrar primero `askFinish` si está abierto (con una ref, como `tabRef`).
```diff
--- a/src/screens/SettingsScreen.tsx
+++ b/src/screens/SettingsScreen.tsx
-import { applyBackup, exportBackup, readBackup } from '../lib/backup'
+import { applyBackup, exportBackup, readBackup, type ReadyBackup } from '../lib/backup'
+import MascotPage from '../components/MascotPage'
@@ (las dos llamadas a <DataPage …>, l.91 y l.120)
-            <DataPage
+            <DataPage
+              t={t}
+              mascot={THEME_INFO[settings.theme].mascot}
@@ export default function SettingsScreen({ settings, update, registerBack, onRetest, onOpenAbout, initialPage, onDataReplaced }: Props) {
+  // (añadir `t` a la desestructuración: ya viene en Props)
@@
-function DataPage({ onImported }: { onImported: () => void }) {
+function DataPage({ onImported, t, mascot }: { onImported: () => void; t: ThemeVars; mascot: MascotElement }) {
   const [status, setStatus] = useState<Status>(null)
+  const [pending, setPending] = useState<{ ready: ReadyBackup; what: string } | null>(null)
@@ const doImport = async (file: File | undefined) => {
       const what = `${count(sessions, 'sesión', 'sesiones')} y ${count(mistakes, 'error', 'errores')}`
-      if (!confirm(`La copia tiene ${what}. Esto SUSTITUYE todo tu progreso actual por el del archivo (antes guardo una copia de lo que tienes ahora). ¿Continuar?`)) return
-      const r = await applyBackup(ready)
-      setStatus({ kind: 'ok', text: `Importado: ${what} ✓${r.safetyCopy ? ` · Lo que tenías antes quedó en ${r.safetyCopy}` : ''}` })
-      onImported()
+      setPending({ ready, what }) // MOV-2: lo confirma la mascota
     } catch (e) {
@@
+  const doApply = async () => {
+    if (!pending) return
+    const { ready, what } = pending
+    setPending(null)
+    try {
+      const r = await applyBackup(ready)
+      setStatus({ kind: 'ok', text: `Importado: ${what} ✓${r.safetyCopy ? ` · Lo que tenías antes quedó en ${r.safetyCopy}` : ''}` })
+      onImported()
+    } catch (e) {
+      setStatus({ kind: 'error', text: (e as Error).message })
+    }
+  }
@@ return (
     <Card>
+      {pending && (
+        <MascotPage
+          overlay={{ t }}
+          element={mascot}
+          mood="thinking"
+          title="¿Cambiar tu progreso por el de la copia?"
+          subtitle={`La copia tiene ${pending.what}. Todo lo que tienes ahora se sustituye por lo del archivo. Antes guardo una copia de lo tuyo, por si acaso.`}
+          primary={{ label: 'No, me quedo como estoy', onClick: () => setPending(null) }}
+          secondary={{ label: 'Sí, usar la copia', onClick: doApply }}
+          onBack={() => setPending(null)}
+        />
+      )}
```
  (importar `MascotElement` de `../ui/Mascot`; el Atrás de Android en Ajustes debería cerrar `pending` antes que la página: pasar un `onDialog` a `registerBack`.)

### REG-A4-05 · Tamaños de toque por debajo de 40 px en las pantallas nuevas
- **Severidad:** Baja · **Prioridad:** P3 (A11 con pantalla dañada; a 320 px el zoom 0,8 lo reduce aún más).
- Medidos a 390×844 (entre paréntesis, físico a 320×640): ▶ de la explicación 36×36 (29×29) `GrammarTopicScreen.tsx:149`; ✕ «Borrar la búsqueda» 32×32 `GrammarPanel.tsx:75`; chevron «Abrir …» 24×40 pegado al ▶ de 40 (riesgo de tocar el ▶) `GrammarTopicRow.tsx:78`; palabras de «Ordena» 36 de alto `GrammarExercises.tsx:224,233`; forma correcta de «Errores típicos» (botón ▶) 19 de alto `GrammarTopicScreen.tsx:203`; chips de «Relacionado» y enlaces 📘 de las correcciones 36 de alto. (Los ejemplos están bien: toda la fila es el botón.)
- **Arreglo:** `h-10 w-10` en el ▶ de la explicación y el ✕; `h-10` en las palabras de «Ordena»; `min-h-10 py-1.5` en la forma correcta, chips y 📘; quitar el chevron como botón aparte (la fila ya abre el tema) o darle `w-10`.

### REG-A4-06 · El resultado de la ronda cuenta mal los ejercicios que van al Repaso
- **Severidad:** Baja · **Prioridad:** P3.
- **Pasos:** hacer una ronda fallando ejercicios que ya fallaste antes.
- **Obtenido:** «Acertaste 0 de 8… Los 2 ejercicios que fallaste están en tu Repaso» (captura 4.1-12): parece que solo fallaste 2.
- **Esperado:** «Fallaste 8: 2 nuevos van a tu Repaso (los otros ya estaban)» o, más simple, «Los que fallaste están en tu Repaso».
- **Dónde:** `src/components/GrammarExercises.tsx:123` (`cards` = tarjetas nuevas; las repetidas las rechaza el índice único).
```diff
-          {cards > 0 && ` ${cards === 1 ? 'El ejercicio que fallaste está' : `Los ${cards} ejercicios que fallaste están`} en tu Repaso.`}
+          {results.some((r) => !r) && ' Los ejercicios que fallaste están en tu Repaso.'}
```

### REG-A4-07 · Accesibilidad de ▶/⏸ y del micro de «Dilo tú»
- **Severidad:** Baja · **Prioridad:** P4.
- El icono cambia a ⏸ pero el `aria-label` sigue en «Escuchar…» (`GrammarTopicRow.tsx:72`, `GrammarTopicScreen.tsx:150`); las ideas de «¿Qué digo?» no tienen `aria-label` ni `aria-pressed` (`Conversation.tsx:1092`); el micro de «Dilo tú» se llama «Hablar», igual que la pestaña «Hablar» de la barra (`GrammarSpeak.tsx:229`); no hay estilo `:focus-visible` propio (solo `.input:focus`, `index.css:324`).
- **Arreglo:** `aria-pressed={on}` usando `useSpeaking(key)` en el botón (o un `SpeakButton` común); `aria-label="Grabar tu frase"` en «Dilo tú»; `:focus-visible { outline: 2px solid var(--acc); outline-offset: 2px }` global.

### REG-A4-08 · 320×640: el Inicio con clase guardada desplaza 30 px en Gramática
- **Severidad:** Baja · **Prioridad:** P4 (caso límite; en Prácticas pasa lo mismo con 70 px desde antes de la 5.10).
- **Pasos:** 320×640, clase guardada + lección del plan + Repaso + pestaña Gramática.
- **Obtenido:** `.tab-content` 830/800 (el título «Good evening.» se corta al desplazar, captura 4.1-22). La lista no baja de `MIN_HEIGHT = 160` (`src/components/InfiniteList.tsx:5`). Sin clase guardada: 800/800 (OK).
- **Arreglo:** con poco alto, ocultar la línea `¿De qué hablamos hoy?` o compactar la tarjeta del plan cuando hay clase guardada; o `MIN_HEIGHT` 120 solo en Gramática (el buscador ya ayuda).

### REG-A4-09 · Atrás desde un tema relacionado vuelve al principio del tema anterior
- **Severidad:** Baja · **Prioridad:** P4.
- **Pasos:** tema → bajar hasta «Relacionado» → tocar uno → Atrás.
- **Obtenido:** el tema anterior aparece arriba del todo (`scrollTop` 0): hay que volver a bajar hasta «Relacionado».
- **Esperado:** volver a la altura donde estabas.
- **Arreglo:** al apilar, guardar `scrollTop` de `.tab-content` en la ruta de arriba (`GramRoute` con `scroll?: number`) y restaurarlo en `pop` (Home y `GrammarSheet.tsx:32`).

## Otras observaciones (sin NC)
- Atrás de Android en la pestaña Gramática del Inicio abre directamente «¿Ya te vas?» (no vuelve a «Temas»); es igual en Prácticas.
- Las ideas de «¿Qué digo?» añaden «…» a la frase (`Conversation.tsx:1099`, desde la v2): si Gemini devuelve una frase con punto, se ve «weekend.…». Solo con frases completas.
- En el Repaso, Atrás de Android tras evaluar (sin elegir intervalo) termina el repaso y cuenta la frase como repasada; coherente con «Terminar», pero distinto de «Hace falta elegir para pasar».
- `--ink` sobre el acento en Ember y Lumi oscuro (2,9 y 3,5:1) en los botones `btn-acc`: anterior a la 5.10.
- Durante la prueba, el panel del navegador recargaba la página cada pocos minutos (al quitar la emulación de tamaño, y dos veces por compilaciones de Android de otro agente: Vite vigila `android/**`). Cada flujo se repitió entero tras recargar; no afecta a los resultados.

## Propuestas de mejora visual (5.10)
1. **Enlaces 📘 de las correcciones** como chips en una fila (`flex-wrap`, nombre corto del tema) en vez de una línea por tema: con 2 correcciones × 2 temas la tarjeta ocupa media pantalla (4.3-04).
2. **Explícame en pantallas estrechas:** a < 360 px, mascota de 40 px o encima del globo; el globo gana ~60 px de ancho y deja de partir tanto las líneas (4.1-17).
3. **Cabecera del tema en horizontal:** título en una línea con los chips A1/Visto al lado y el segmento a la derecha; hoy ocupa 180 de 360 px (4.1-20).
4. **Icono de la sección** (círculo junto a Atrás, 4.1-05): parece un segundo botón; mejor sin círculo o dentro del título.
5. **«EN GRAMÁTICA» de «Pregúntale»:** el enlace sale centrado y partido en 2 líneas (4.1-04); alinearlo a la izquierda como las filas de tema.

## Archivos
- Informe: `docs/pruebas/regresion-5.10/A4-interfaz.md`
- Evidencias (39 capturas), arnés `arnes-a4.js` y cálculo de contraste `contraste.mjs`: `docs/pruebas/regresion-5.10/evidencia/A4/`
- Tamaño de letra (REG-M-05): `docs/pruebas/regresion-5.10/evidencia/A4/fuente/` (10 capturas, `fuente.js`, `driver.js`)

---

## § Tamaño de letra (REG-M-05)

Petición del dueño: un usuario se quejó de que no se puede cambiar el tamaño de la letra; el dueño quiere **4 valores
fijos con vista previa** y que ninguno rompa la app. **Decisión del orquestador con el dueño:** escalar **solo el texto**
(como `sp` en Android, Dynamic Type en iOS y WCAG 1.4.4 «Resize text»), no toda la interfaz. Aquí se mide esa opción (a)
en el navegador; el zoom de toda la interfaz (b) queda como referencia breve. Sin cambios en `src/`.

### Cómo se probó
- Navegador integrado, origen `reg.localhost:5173`, Gemini y **Azure simulados**: fonética activa con la clave
  `AZTEST-NO-REAL`, y `fuente/fuente.js` contesta a `issueToken` y `stt.speech.microsoft.com` con datos inventados.
  Ninguna petición real.
- **(a) solo texto** (`__fz.text(k)`): cada elemento con texto propio pasa a `font-size` original × k, también los nodos
  que aparecen después (`MutationObserver`). Equivale a una tipografía en tokens × `--fs` o al `textZoom` del WebView: el
  texto crece y las cajas de alto o ancho fijo no.
- **(b) zoom** (`__fz.zoom(k)`): multiplica el `zoom` que ya aplica `viewport.ts` (toda la interfaz).
- Valores 0,9 · 1 · 1,15 · 1,3 en 390×844, 360×780 (A11 vertical), 320×640 y 780×360 (A11 horizontal).
- Pantallas medidas:
  - avisos a pantalla completa: bienvenida, «¡Hola de nuevo!», «Tu tarea de hoy», «Tu re-test está pospuesto»;
  - Inicio, pestañas Temas y Gramática, con y sin clase guardada;
  - tema de Gramática; ejercicio sin responder y respondido;
  - Ajustes; informe;
  - clase con «¿Qué digo?» y clase con correcciones + fonética;
  - Repaso respondido con fonética; test, tarea 1 de habla.
- Qué mide `__fz.sweep()`:
  - scroll de página;
  - scroll de `.tab-content` (la regla «sin scroll en el Inicio»);
  - scroll horizontal;
  - solo los problemas **nuevos** respecto a la escala 1: elementos que salen por la derecha, texto cortado (`overflow`
    oculto, `truncate` o `line-clamp` que no cabe) y botones cuyo texto se sale.
- Lo completé con capturas: algunos desbordes visibles, como la etiqueta de un segmento que se sale de su píldora, el
  script no los detecta.
- Arnés en `evidencia/A4/fuente/fuente.js` y `driver.js`; capturas en `evidencia/A4/fuente/01…10`.

**Dato de partida:** en vertical, `viewport.ts` ya normaliza la maqueta a unos 390–400 px CSS de ancho (zoom 0,923 en
360×780 y 0,8 en 320×640). Por eso 390, 360 y 320 dan medidas casi iguales. El caso distinto es el **horizontal**: 780×360
con zoom 1 y solo 360 px de alto.

### Resultados de (a), solo texto

| Escala | Vertical (390 · 360 · 320) | Horizontal 780×360 |
|---|---|---|
| **0,9** | Sin problemas en ninguna pantalla | Sin problemas |
| **1,15** | Inicio **sin scroll**. Fallos menores: los chips de 2 líneas de «Relacionado» («Presente perfecto frente a pasado simple») se salen de su alto fijo; el enlace «Más tarde (te lo recuerdo…)» del aviso del re-test no cabe en su `h-10`; Ajustes trunca «Voz de Emma · 0.90×» y «Modelos · fonética activa» (3–45 px de scroll, pero no es el Inicio) | Bien, pero **el micro de la clase queda al borde** (su parte de abajo en 357 de 360 px) |
| **1,3** | Inicio con clase guardada + lección + Repaso: **36 px de scroll** en Gramática a 390 y 4 px a 320; sin clase guardada, OK. «Gramática 12» se sale de la píldora del segmento (01, 07). «LECCIÓN DE HOY · SEMANA 1 DE 12» choca con «Mi plan». Se truncan «Repaso de hoy · 10 frases…» y la clase guardada. Los chips de «Relacionado» desbordan y el texto pisa el borde (08). Ajustes: «Gramáti…» en las barras de nivel y 3–5 textos truncados (09). Fonética: «Comple…» y «Entona…» (02). Clase: «Tu profe de inglés» ocupa 2 líneas y la tarjeta del tema crece (queda menos espacio para el chat). Repaso, informe, ejercicios y test se reacomodan bien (04, 05) | **Rotura:** en la clase la columna lateral crece y **el micro queda fuera de la pantalla** (su parte de abajo en 403 de 360 px; captura 10). Inicio, tema, ejercicios, Ajustes e informe desplazan como siempre en horizontal, sin desbordes |

En ninguna combinación aparece scroll horizontal ni scroll de página del documento.

### Referencia: (b), zoom de toda la interfaz
Rompe la regla del Inicio en cuanto sube: `.tab-content` desplaza 22–95 px con 1,15 y 131–243 px con 1,3 (Temas y
Gramática, en los tres tamaños verticales). Ajustes desplaza 72–211 px, y con 1,3 aparecen más cortes, también en la
fonética de la clase. Además agranda márgenes y botones, que no lo necesitan. **Descartado**, como decidió el dueño.

### La letra del sistema Android (clave para la madre)
- **Hoy la app no controla el `textZoom` del WebView:**
  - `capacitor.config.ts` no tiene ninguna opción de texto;
  - `node_modules/@capacitor/android/capacitor/src/main/java/com/getcapacitor/Bridge.java:588-618` solo fija JavaScript,
    DOM storage, la reproducción automática, el user agent y `setBuiltInZoomControls(zoomEnabled)`; no llama a
    `setTextZoom`;
  - `MainActivity.java` no toca `WebSettings`.
  - Queda, por tanto, el valor por defecto del WebView.
- **Ese valor por defecto:** el WebView de Android (Chromium) inicializa `textZoom` con la escala de fuente del sistema
  (`Configuration.fontScale` × 100). Por eso es tan común el arreglo `webView.getSettings().setTextZoom(100)` para que la
  letra del sistema no descoloque una web. **No lo he podido comprobar en el teléfono** (regla: sin `adb`).
- **Consecuencia probable:** si el Galaxy A11 de la madre tiene la letra del sistema en «Grande» (1,15–1,3, habitual en
  Samsung), **la app ya está hoy en el caso «solo texto 1,15–1,3» medido arriba**: chips desbordados, segmentos que se
  salen y, en horizontal (que ella usa forzado), el micro de la clase fuera de la pantalla.
- **Qué comprobar en el teléfono (orquestador):**
  1. Leer la escala: `adb -s <A11> shell settings get system font_scale`.
  2. Medir el efecto con el APK debug y CDP: el alto de un `<span style="font-size:100px">Ag</span>`, comparado con el
     del navegador del PC. `getComputedStyle` no refleja `textZoom`.
  3. Mirar la clase en horizontal: ¿se ve el micro?
- **Cómo combinarlo** (respetar la letra del sistema por defecto y aplicar el ajuste de la app encima, con tope):
  1. En `MainActivity.onCreate`, tras `super.onCreate`: `wv.getSettings().setTextZoom(100)`. Así el WebView deja de
     escalar a ciegas y la app decide.
  2. Pasar la escala del sistema al JavaScript sin dependencias nuevas: un método en un plugin propio que ya existe
     (`OrientationPlugin.getFontScale()` → `getResources().getConfiguration().fontScale`). El plugin oficial
     `@capacitor/text-zoom` haría lo mismo, pero es otra dependencia nativa y la conexión es lenta. Volver a leerla al
     volver a primer plano (`lifecycle.ts`), por si se cambió en Ajustes de Android.
  3. Escala efectiva = `clamp(fontScaleSistema × escalaApp, 0,85, topePantalla)`, en la variable `--fs` de `<html>`.
     «Normal» (1) es la letra del sistema tal cual; las otras opciones se multiplican encima.

### Recomendación

**Mecanismo:** tipografía en **8 tokens** que multiplican una variable CSS `--fs`. No conviene pasar los px a rem y subir
el `font-size` de `<html>`: en Tailwind 4 el espaciado también va en rem (`--spacing: 0.25rem`), así que crecerían
márgenes y alturas como con el zoom (b).
```css
/* src/index.css */
:root { --fs: 1; }
@theme {
  --text-micro: calc(11px * var(--fs));    /* hoy 10–11.5 px: 33 usos */
  --text-cap: calc(12.5px * var(--fs));    /* 12–12.5 px + text-xs: 140 */
  --text-small: calc(13.5px * var(--fs));  /* 13–13.5 px + text-sm: 206 */
  --text-body: calc(15px * var(--fs));     /* 14–15.5 px: 141 */
  --text-lead: calc(17px * var(--fs));     /* 16–18 px + text-base/lg: 58 */
  --text-title: calc(22px * var(--fs));    /* 19–24 px + text-xl/2xl: 36 */
  --text-h1: calc(28px * var(--fs));       /* 26–34 px + text-3xl: 17 */
  --text-display: calc(44px * var(--fs));  /* 38–58 px (números grandes, «B1»): 9 */
}
```
Recuento actual en `src/`: 327 `text-[NNpx]` en 45 archivos (36 tamaños distintos, de 10 a 58 px) y 184 `text-xs…3xl`.
La migración se puede hacer con un script de sustitución (tabla tamaño → token) y luego revisión visual. Algunos tamaños
redondean ±0,5 px (13 → 13,5; 14 → 13,5 o 15): cambio visual mínimo.

**Valores y topes:**

| Opción en la app | × sobre el sistema | Tope de la escala efectiva |
|---|---|---|
| Pequeña | 0,9 | — |
| Normal (por defecto) | 1 | — |
| Grande | 1,15 | Vertical 1,3 · horizontal 1,15 |
| Muy grande | 1,3 | Vertical 1,3 (1,15 hasta que estén los arreglos 1–8) · horizontal 1,15 |

En horizontal (alto ≤ 420 px CSS), el tope de 1,15 se debe al micro de la clase. Si una combinación supera el tope, la
vista previa lo dice: «En horizontal la limito a Grande para que se vea el micro». Con la letra del sistema a 1,3, «Muy
grande» no suma nada: ya está en el tope.

**Qué adaptar, según lo medido** (antes de permitir 1,3):
1. **Botones con alto fijo y texto** → `min-h-*` + `py-*`. Hay unos 137 `h-[NNpx]` (unos 33 directamente en `<button>`).
   Incluye los chips de «Relacionado» (`GrammarTopicScreen.tsx:219`, `h-9`), el enlace secundario de `MascotPage`
   (`MascotPage.tsx:79`, `h-10`), los 📘 de las correcciones, las palabras de «Ordena» y «Empezar».
2. **`truncate` (27 usos)** → `line-clamp-2` en: las tarjetas de Ajustes (`SettingsScreen.tsx:216-218`), «Repaso de hoy»,
   la clase guardada y el título del tema de la clase.
3. **Segmentos** (Inicio: Temas · Prácticas · Gramática; tema: Explícame · Ejercicios · Dilo tú): con `--fs` ≥ 1,15, el
   contador va debajo o se oculta.
4. **Cabecera «Lección de hoy»**: que «Mi plan» baje de línea en lugar de chocar.
5. **Barras de nivel de Ajustes**: la etiqueta de ancho fijo («Gramáti…») → `grid-cols-[auto_1fr_auto]`.
6. **`PronunciationView`** (`PronunciationView.tsx:56`, `grid-cols-4`): con `--fs` > 1, rejilla de 2 × 2 o etiquetas
   cortas.
7. **Clase en horizontal**: ocultar «Tu profe de inglés» y la línea de objetivo de la tarjeta del tema, o fijar el micro
   abajo de la columna. Con esto, el tope en horizontal puede subir.
8. **Inicio**: con clase guardada + lección + Repaso a 1,3, el panel de la lista se queda en su mínimo de 160 px
   (`InfiniteList.tsx:5`) y la página desplaza. Con `--fs` > 1,15, ocultar «¿De qué hablamos hoy?» o compactar la
   tarjeta de la mascota.
9. Iconos y botones de icono no escalan (bien); mantener ≥ 44 px de toque.

**Dónde ponerlo:** Ajustes → «Tema y mascota», renombrado **«Apariencia»**, con un bloque **«Tamaño de letra»**:
- 4 botones segmentados con «Aa» de tamaño creciente: Pequeña · Normal · Grande · Muy grande.
- Vista previa en vivo:
  - una burbuja del profe (`.tip-bubble`, con una frase en inglés y su traducción);
  - un botón principal («Empezar»);
  - una fila de lista.
- Una línea de la mascota cuando la letra del sistema ya es grande: «Tu teléfono ya tiene la letra grande: la tengo en
  cuenta».
- Ajuste nuevo `fontScale: 1` en `Settings` y `DEFAULTS` (`settings.ts`), aplicado en `App.tsx:231-241` junto a las
  variables del tema (`root.style.setProperty('--fs', …)`).
- Opcional: ofrecerlo también en la bienvenida, para que la madre lo elija antes de nada.

**Coste estimado:**

| Parte | Jornadas |
|---|---|
| Infraestructura: ajuste, `--fs`, tokens en `index.css`, `setTextZoom(100)` + `getFontScale` en Java, vista previa en Apariencia y relectura al volver a primer plano | 0,5–1 |
| Migración por script de los 511 usos de tamaño a los 8 tokens | 0,5 |
| Adaptaciones 1–8 y revisión visual de unas 25 pantallas en vertical y horizontal | 1–2 |
| Pruebas en el POCO y el A11, con letra del sistema normal y grande | 0,5 |
| **Total** | **3–4 días** |

Requiere compilar Java (P2 aún no se ha compilado).

**Pantallas a revisar** (por orden de riesgo):
1. Clase, sobre todo en horizontal: cabecera, tarjeta del tema, `PronunciationView` y micro.
2. Inicio: segmentos, lección de hoy, Repaso, clase guardada y lista (`InfiniteList`).
3. Ajustes: tarjetas y barras de nivel.
4. Tema de Gramática: «Relacionado» y botones del final.
5. `MascotPage` y `NoticeGate`: enlace secundario.
6. Ejercicios: «Ordena».
7. `CorrectionView` (📘).
8. Repaso: los botones de intervalo de 2 líneas, que hoy aguantan.
9. Test: tarea de habla, que hoy aguanta.
10. Informe, Palabras y Progreso: no medidos a fondo, pero sin cajas fijas.

### Notas
- El texto «Azure undefined» que salió en Ajustes lo provocó mi plan inventado: `azurePlan: 'S0'` no es válido (los
  válidos son `F0`, `S0batch` y `S0payg`). No es un defecto de la app. Al terminar borré los datos de Azure del origen de
  prueba.
- Severidad propuesta de REG-M-05: **media**, porque la madre podría estar ya hoy en el caso «texto 1,15–1,3» por la
  letra del sistema. Prioridad P2: primero leer `font_scale` en su A11; si es > 1,1, fijar `setTextZoom(100)` cuanto
  antes, aunque el ajuste completo llegue después.
