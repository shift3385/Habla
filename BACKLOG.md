# Habla · Pendientes e ideas

Anotado el 2026-10-01 para retomar más adelante. **No implementado todavía.**
Estado de cada idea: 🟢 aprobada · 🟡 a debatir · 🔴 descartada

---

## Objetivo general: que la app sirva para cualquier persona 🟢

Ahora mismo la app está hecha a medida para un único usuario: el perfil semilla es fijo (`src/lib/profile.ts`) y hay escenarios personales (gestorías, entrevista de ingeniero de IA). Para que la pueda usar otra persona:

- [ ] Quitar el perfil fijo. El perfil (nombre, idioma nativo, profesión, intereses, objetivos y niveles) se crea en la bienvenida a partir del test de calibración.
- [ ] Generar los escenarios de trabajo según la profesión e intereses del usuario, en lugar de tenerlos fijos.
- [ ] Hacer que los prompts del profe dependan siempre del perfil, sin datos personales en el código.
- [ ] ⚠️ Decidir cómo accede cada persona a la IA (ver "Puntos a debatir").

## 1. Test de calibración inicial 🟢 (idea del usuario)

Un test riguroso, como la evaluación inicial que hicimos, que asigne un nivel MCER a cada habilidad y adapte el profe a ese perfil.

- [ ] **Gramática y vocabulario:** preguntas adaptativas. La dificultad sube o baja según aciertas, y el test termina cuando el nivel se estabiliza (unas 15–25 preguntas).
- [ ] **Audición:** audios con la voz del profe (TTS) a distintas velocidades y niveles, con preguntas de comprensión.
- [ ] **Lectura:** textos cortos por nivel, con preguntas.
- [ ] **Habla:** 3 o 4 tareas por voz (presentarse, describir, opinar, contar algo en pasado). Gemini las evalúa con una rúbrica: fluidez, gramática, vocabulario, pronunciación y coherencia. Se usan también las métricas locales (palabras por minuto, pausas).
- [ ] **Resultado:** nivel por habilidad, nivel global, puntos fuertes y débiles detectados, que se guardan en el perfil.
- [ ] **Adaptación del profe:** vocabulario, velocidad de la voz, largo de las frases, cuánto corrige y qué estructuras practicar.
- [ ] Reutilizar el mismo motor para el **re-test cada 4 semanas** (fase 5 de la hoja de ruta).

## 2. Consultas de palabras en contexto 🟢 (idea del usuario)

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

## 3. Propuestas para debatir 🟡

| # | Propuesta | Por qué | Esfuerzo |
|---|---|---|---|
| A | **Repaso espaciado (FSRS)** de errores y palabras guardadas. Ya está planificado como fase 3. | Sin repaso se olvida lo corregido; es lo que fija el aprendizaje. | Medio |
| B | **Pronunciación / shadowing:** el profe dice una frase, tú la repites y Gemini puntúa la pronunciación palabra por palabra. | Ataca directamente "hablar", la habilidad más baja de un perfil típico. | Medio |
| C | **Situaciones a medida:** describes una situación real que tienes por delante (entrevista, médico, reunión con un cliente) y el profe la ensaya contigo. | Práctica útil e inmediata; muy motivadora. | Bajo |
| D | **Plan diario y recordatorios:** lección del día y una notificación local para no romper la racha. Ya está planificado como fase 4. | Constancia, que es el factor nº 1 para aprender un idioma. | Medio |
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
