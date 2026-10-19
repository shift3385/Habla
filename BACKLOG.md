# Habla · Pendientes e ideas

Anotado el 2026-10-01 para retomar más adelante. **No implementado todavía.**
Estado de cada idea: 🟢 aprobada · 🟡 a debatir · 🔴 descartada

---

## Objetivo general: que la app sirva para cualquier persona 🟢

Ahora mismo la app está hecha a medida para un único usuario: el perfil semilla es fijo (`src/lib/profile.ts`) y hay escenarios personales (gestorías, entrevista de ingeniero de IA). Para que la pueda usar otra persona:

- [x] (v4.5) Quitar el perfil fijo: el perfil inicial es neutro. Paso obligatorio **"Tu perfil"** (nombre, a qué se dedica, para qué quiere el inglés, temas favoritos) antes del test, editable en *Ajustes → Mi perfil*.
- [x] (v4.5) Prácticas generales según el perfil: **Entrevista de trabajo** (según su profesión) y **Explicar a qué me dedico** (o su día a día, si no trabaja).
- [x] (v4.5) Prompts sin datos ni niveles escritos a mano: el profe recibe nombre, ocupación, motivos, intereses, niveles reales y debilidades del test (que antes no llegaban al prompt). "Sorpréndeme" prioriza los temas favoritos.
- [ ] Idioma nativo distinto del español (por ahora la app asume hispanohablantes).
- [ ] ⚠️ Decidir cómo accede cada persona a la IA (ver "Puntos a debatir").

## 1. Test de calibración inicial ✅ hecho en v4.0 (idea del usuario)

> **Implementado:** es obligatorio para todo perfil sin test (incluido el que ya existía) y el nivel no se puede editar a mano. Tiene gramática y vocabulario adaptativos (15 preguntas, banco A1–C2 generado por Gemini), 2 textos de lectura, 2 audios de audición (3 reproducciones como máximo) y 3 tareas de habla evaluadas con rúbrica. El nivel de habla evoluciona con la práctica (±1 escalón, como mucho uno por semana, según la nota media de 5 sesiones) y hay re-test cada 28 días. Código: `src/lib/calibration.ts`, `src/lib/levels.ts`, `src/screens/Calibration.tsx`.
> **Pendiente:** adaptar al nivel también la cantidad de correcciones del profe, y avisar en el Inicio cuando el re-test esté disponible.

Un test riguroso, como la evaluación inicial que hicimos, que asigne un nivel MCER a cada habilidad y adapte el profe a ese perfil.

- [ ] **Gramática y vocabulario:** preguntas adaptativas. La dificultad sube o baja según aciertas, y el test termina cuando el nivel se estabiliza (unas 15–25 preguntas).
- [ ] **Audición:** audios con la voz del profe (TTS) a distintas velocidades y niveles, con preguntas de comprensión.
- [ ] **Lectura:** textos cortos por nivel, con preguntas.
- [ ] **Habla:** 3 o 4 tareas por voz (presentarse, describir, opinar, contar algo en pasado). Gemini las evalúa con una rúbrica: fluidez, gramática, vocabulario, pronunciación y coherencia. Se usan también las métricas locales (palabras por minuto, pausas).
- [ ] **Resultado:** nivel por habilidad, nivel global, puntos fuertes y débiles detectados, que se guardan en el perfil.
- [ ] **Adaptación del profe:** vocabulario, velocidad de la voz, largo de las frases, cuánto corrige y qué estructuras practicar.
- [ ] Reutilizar el mismo motor para el **re-test cada 4 semanas** (fase 5 de la hoja de ruta).

## 2. Consultas de palabras en contexto ✅ hecho en v4.2 (idea del usuario)

> **Implementado:**
> - Pestaña **Palabras**: palabra más frase opcional; funciona del inglés al español y del español al inglés.
> - En clase, al tocar cualquier palabra del profe se abre la consulta con su frase como contexto.
> - La respuesta incluye el significado aquí y por qué, la fonética, el audio, otros significados con ejemplos, el registro, las colocaciones y el aviso de falso amigo.
> - Historial de consultas y palabras guardadas, que también aparecen en *Progreso → Palabras*.
> - Código: `src/lib/lookup.ts`, `src/screens/WordsScreen.tsx`, `src/components/LookupSheet.tsx`, `src/components/TappableText.tsx`.
>
> **Pendiente:** dictar la palabra por voz, consultar desde el resumen del tema y el informe, y llevar las palabras guardadas al repaso espaciado (propuesta A).

No es un traductor literal: explica qué significa una palabra **en la frase concreta** donde apareció.

- [ ] **Entrada:** palabra o expresión más su contexto (la frase donde apareció). Por ejemplo, "*run*" en "*run a business*" frente a "*run a marathon*".
- [ ] **Cómo se abre:**
  - Mantener pulsada cualquier palabra de una burbuja del profe, del resumen del tema o del informe.
  - Desde una sección propia, donde pegar o dictar la frase.
- [ ] **Respuesta:**
  - El significado en ese contexto y su equivalente natural en español.
  - Por qué ahí significa eso.
  - Otros significados frecuentes, con un ejemplo de cada uno.
  - Registro (formal, informal, jerga) y colocaciones típicas.
  - Pronunciación, con TTS y transcripción fonética.
  - Si es un falso amigo, un aviso.
- [ ] Botón **"Guardar"**, que añade la palabra al vocabulario y al repaso espaciado (fase 3).
- [ ] Historial de consultas.

## 4. Observaciones de uso real (2026-10-01) 🟢

Notas tras probar la v3.0, ya con más personas usando la app (por ejemplo, la madre del usuario).

### 4.1 Corrección de pronunciación real (Azure Speech)
**Problema:** Gemini entiende lo que quisiste decir aunque lo pronuncies mal, y casi nunca corrige la pronunciación. Por ejemplo, no avisa si "world" sale mal.

**Propuesta:** integrar **Azure AI Speech, Pronunciation Assessment**. Puntúa precisión, fluidez y completitud por palabra **y por fonema**, a partir del audio y del texto de referencia.
- [ ] Texto de referencia: la transcripción de Gemini en el turno libre, o la frase exacta en ejercicios de repetición (encaja con la propuesta B, shadowing).
- [ ] Ojo con el formato: Azure no acepta webm. Hay que convertir en el teléfono a WAV PCM 16 kHz mono (decodificar con AudioContext, como ya hace `speech.ts`) o usar OGG/Opus.
- [ ] Ajustes: clave y región de Azure, guardadas solo en el teléfono, igual que la de Gemini. Tiene capa gratuita mensual.
- [ ] UI: palabras mal pronunciadas subrayadas en tu burbuja; al tocarlas, el sonido correcto (TTS) y el fonema que falló.

### 4.2 Voz del profe más humana (suspiros, risas, pausas, respiración)
**Problema:** la voz suena a lectura plana. Una risa se lee como "jajaja" y no hay pausas, respiraciones ni emoción.

**Propuesta:** pasar de la voz del teléfono (TTS nativo) a una voz expresiva con **etiquetas de emoción**:
- **ElevenLabs v3** (idea del usuario): etiquetas entre corchetes como `[sighs]`, `[laughs]`, `[whispers]`, `[short pause]`. Calidad muy alta, pero es otro proveedor con coste por carácter.
- **Alternativa a valorar:** **TTS de Gemini** (`gemini-3.8-flash-tts`). Usa la misma clave que ya tenemos, controla estilo y emoción con instrucciones en lenguaje natural y tiene voces masculinas y femeninas.
- [ ] El prompt del profe genera el texto con las etiquetas, con moderación y solo cuando encajen (no en cada frase).
- [ ] El texto que se ve en pantalla va limpio, sin las etiquetas.
- [ ] Caché de audio y modo sin conexión: si falla la voz en la nube, se usa la del teléfono.

### 4.3 Leo debe tener voz masculina 🐞
**Problema:** Emma y Leo suenan igual, con la misma voz femenina. Bajar el tono no basta.
- [~] **Arreglo rápido (v3.1), insuficiente:** la app ya elige automáticamente una voz masculina en-GB para Leo y una femenina en-US para Emma, según el código de la voz de Google (`gbb`, `gbd`, `rjs`… = masculinas), y si no la encuentra baja el tono.
  - **Resultado en el teléfono del usuario (POCO 23122PCD1G, HyperOS):** Leo sigue sonando femenino. El único motor es "Speech Recognition & Synthesis" de Google, y el usuario no encontró cómo descargar una voz masculina. Probablemente el teléfono no tiene voces masculinas descargadas o no las expone.
  - [ ] Botón **"Instalar voces"** en *Profe y voz*: `TextToSpeech.openInstall()` del plugin abre la pantalla de datos de voz de Android.
  - [ ] Mostrar en *Profe y voz* qué voces detecta la app y su género, para diagnosticar sin capturas.
  - **Conclusión:** depender de las voces del teléfono no es fiable. La solución real es la voz en la nube (4.2).
- [ ] **Arreglo definitivo:** con la voz en la nube (4.2), una voz fija para cada profe: femenina en-US para Emma y masculina en-GB para Leo.

### 4.4 Pensar en usuarios no técnicos
La app ya la usan otras personas.
- [ ] Revisar textos y botones para quien no conoce la app: ayuda en la primera clase y mensajes de error más claros.
- [ ] Cada persona necesita su propio perfil y nivel, lo que refuerza la prioridad del test de calibración (punto 1).

### 4.5 Sección de fonemas del inglés (anotado 2026-10-19) 🟡
Idea del dueño: una sección con **todos los fonemas del inglés** (sonido, símbolo IPA, ejemplos y cómo se articula), como en este reel: https://www.instagram.com/reel/DenIef3B8mf/ . Encaja con la fonética de Azure (las «palabras a cuidar» ya dicen el sonido que falló: se podría enlazar a su fonema). **No para la 5.10**: para más adelante.

## 3. Propuestas para debatir 🟡

| # | Propuesta | Por qué | Esfuerzo |
|---|---|---|---|
| A | ✅ **Repaso espaciado (FSRS)** de errores y palabras guardadas, **hecho en v4.7** (fase 3). Ejercicio oral evaluado por Gemini, nota sugerida y cola de sesión. | Sin repaso se olvida lo corregido; es lo que fija el aprendizaje. | Medio |
| B | **Pronunciación / shadowing:** el profe dice una frase, tú la repites y Gemini puntúa la pronunciación palabra por palabra. | Ataca directamente "hablar", la habilidad más baja de un perfil típico. | Medio |
| C | **Situaciones a medida:** describes una situación real que tienes por delante (entrevista, médico, reunión con un cliente) y el profe la ensaya contigo. | Práctica útil e inmediata; muy motivadora. | Bajo |
| D | ✅ **Hecho en v5.0.** **Plan diario y recordatorios:** lección del día y una notificación local para no romper la racha. Ya está planificado como fase 4. | Constancia, que es el factor nº 1 para aprender un idioma. | Medio |
| E | **Dictado y comprensión auditiva:** escuchas una frase y la escribes o resumes. | Entrena el oído además del habla. | Bajo |
| F | **Otros idiomas de destino** (francés, alemán…) y otros idiomas nativos. | Amplía el público si la app es para otras personas. | Alto |

## Puntos a debatir antes de abrir la app a otras personas

1. **Acceso a la IA:** pedir a cada persona su propia clave de Gemini es inviable para alguien no técnico. Opciones:
   - Mantener la clave propia, como opción avanzada.
   - Un **backend o proxy propio** con cuentas de usuario y límites de uso, que implica coste mensual y que cada usuario se registre.
   - Un modelo de pago o suscripción que cubra el coste de la IA.
2. **Distribución:** instalar un APK a mano funciona para una persona. Para varias, conviene publicar en Play Store (con una cuenta de desarrollador) o usar pruebas cerradas.
3. **Privacidad:** se envían audios a Google. Hace falta una política de privacidad y el consentimiento del usuario en la bienvenida.
4. **Datos:** ¿siguen solo en el teléfono, o se sincronizan en la nube con cuenta de usuario?
