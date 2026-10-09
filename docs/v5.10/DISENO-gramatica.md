# Habla 5.10 · «Gramática» — Diseño para aprobar

Fecha: 2026-10-09. Estado: **APROBADO por el dueño (2026-10-09)**. Versión: **5.10** (función nueva visible → MINOR).

## Decisiones del dueño (2026-10-09)
- Todo en **una sola versión, la 5.10** (sin repartir en 5.11/5.12).
- Nombre de la pestaña: **Gramática** (tercera pestaña del Inicio: Temas · Prácticas · Gramática).
- Estilo **lista con scroll propio**, como Palabras y Progreso (`InfiniteList`), para poder añadir secciones en el futuro.
- Incluir **los temas que falten** y sean necesarios para explicar el idioma, como entradas nuevas de Gramática.
- Todo se consulta **dentro de Gramática**: el usuario busca lo que quiera (buscador).
- **La clase y el profe se nutren de este contenido.**
- **Practicar hablando** en Gramática (con pronunciación) **suma a la meta diaria**.
- **Nombre de cada tema = nombre técnico** con el que un profesor titula la clase, en inglés (*Present Perfect Continuous*, *Second Conditional*), con el nombre en español debajo (*Presente perfecto continuo*); el buscador encuentra por los dos.
- **«Pregúntale a <mascota>»**: dudas libres a Gemini con el nombre de **la mascota elegida** (Gota, Chispa, Musgo o Brisa).
- Catálogo de §2 **aprobado**, incluidas las secciones 7–12. Explicaciones en español, ejemplos en inglés.
- Contenido **mixto**: explicación y ejercicios fijos (dentro de la app, sin conexión, sin coste); Gemini solo para evaluar lo que dices y para ejemplos o dudas extra.

## 1. Pantallas

### 1.1 Inicio → pestaña «Gramática»
Panel con scroll propio (`InfiniteList`, alto hasta la barra inferior; sin scroll de página en el Inicio). Arriba, un buscador y, si hay, la fila «Para ti». Después, una fila por sección, con el número de temas y el progreso.

```
 [ Temas 3 ] [ Prácticas 5 ] [ Gramática 12 ]
 🔍 Busca: «wish», «pasado», «debería»…
 ⭐ Para ti: Pasado simple · Artículos · 2.º condicional   ← tus errores + tu plan
 ┌───────────────────────────────────────────┐
 │ 🕐 Tiempos verbales      17 temas · 3 ✓ › │
 │ 🚫 Negaciones y preguntas 10 temas      › │  ← scroll dentro del panel
 │ …                                          │
 └───────────────────────────────────────────┘
```

### 1.2 Sección (p. ej. «Tiempos verbales»)
Lista de temas con nivel (A1–C2), estado (**nuevo · visto · dominado**), ⭐ si es «para ti» y ▶/⏸ con un ejemplo.

### 1.3 Tema (p. ej. «Pasado simple»): cuatro partes
1. **Explícame:** la mascota explica en español cuándo se usa; **fórmula** en afirmativa, negativa y pregunta; 4–6 **ejemplos** en inglés con traducción y ▶/⏸; **errores típicos del hispanohablante** («I have 30 years» → «I am 30»); relación con otros temas (enlaces).
2. **Ejercicios:** 5–8 de elegir, completar u ordenar. Al fallar, la mascota explica por qué cada opción está mal. Lo fallado va al **Repaso** como tarjeta.
3. **Dilo tú:** la mascota te pide una frase con la estructura (en español o con una situación). Gemini la evalúa como en el Repaso (correcta, casi o aún no, más el porqué). Con la fonética activa, Azure puntúa **lo que dijiste** (criterio E2 de la 5.9.1). **Lo hablado suma a la meta diaria y a la racha** (`addPracticeSeconds`).
4. **Practicar en una clase:** abre una clase con el profe centrada en ese tema (ver §4).

Con la regla de siempre: todo funciona en horizontal y en 320×640, y el ▶/⏸ es el de la 5.9.1.

**Además: «Pregúntale a <mascota>»** (en el tema y en el buscador; nombre de la mascota del tema elegido): dudas libres respondidas por Gemini con el modelo rápido («¿cuándo uso *would* y cuándo *will*?»), en español, con ejemplos en inglés y enlaces a los temas relacionados.

## 2. Catálogo (12 secciones, ~100 temas)
Las seis primeras son la lista del dueño; de la 7 a la 12 son secciones nuevas necesarias. Entre paréntesis, el nivel MCER orientativo.

1. **Tiempos verbales:** presente simple (A1); presente continuo (A1); presente simple frente a continuo (A2); pasado simple, verbos regulares e irregulares (A1–A2); pasado continuo (A2); presente perfecto: experiencias, *for/since*, *just/already/yet* (B1); presente perfecto frente a pasado simple (B1); presente perfecto continuo (B1); pasado perfecto (B1); pasado perfecto continuo (B2); futuro con *will* (A2); futuro con *going to* (A2); presente continuo para planes (A2); futuro continuo (B2); futuro perfecto (B2); *used to* / *would* para hábitos pasados (B1); *be used to* / *get used to* (B2).
2. **Negaciones y preguntas:** negación con *do/does/did* (A1); negación con *be* y otros auxiliares (*isn't, haven't, won't*) (A1); contracciones (A1); preguntas con *do/does/did* (A1); preguntas con *Wh-* (A1); respuestas cortas (*Yes, I do*) (A1); *never / nothing / nobody / any*, sin doble negación (A2); preguntas de sujeto y de objeto (*Who called? / Who did you call?*) (B1); *question tags* (B1); preguntas indirectas (*Can you tell me where…*) (B1).
3. **Verbos modales:** *can / can't* (A1); *could* (A2); *may / might* (B1); *must / mustn't* frente a *have to / don't have to* (B1); *should / ought to* (A2); *would* (B1); *will / shall* para ofertas y promesas (A2); *need / needn't* (B1); *be able to* (B1); *had better* (B1); deducción (*must be, can't be, might be*) (B1); modales en pasado (*should have, could have, must have, might have*) (B2).
4. **Verbos no modales:** auxiliares *be / do / have* (A1); verbos regulares e irregulares, con tabla (A1); *have got* (A1); *there is / there are* (A1); *make* frente a *do* (A2); verbos de estado frente a verbos de acción (B1); verbo + *-ing* frente a verbo + *to* (*enjoy doing / want to do*) (B1); verbos que cambian de significado (*stop to / stop -ing*, *remember*) (B2); *phrasal verbs* básicos (B1).
5. **Debería, podría, tendría, desearía…:** *should / could / would*: «debería», «podría», «-ría» (A2); tener que (*have to / has to / had to / will have to*) (A2); *would like / would rather / would prefer* (B1); *wish* + pasado («desearía que…») (B1); *wish* + pasado perfecto (lamentos) (B2); *if only* (B2); *it's time* + pasado (B2); «tendría que haber…» (*should have / would have had to*) (B2).
6. **«Si… entonces…» (condicionales)**, cada uno en positivo, negativo y pregunta: condicional cero (A2); primer condicional (A2); segundo condicional (B1); *if I were you* (B1); tercer condicional (B2); *unless / as long as / provided that* (B2); *in case* frente a *if* (B2); condicionales mixtos (C1).
7. **Voz pasiva (nueva):** pasiva en presente y pasado (B1); pasiva en perfecto y con modales (B2); *have something done* (B2).
8. **Estilo indirecto (nueva):** contar lo que alguien dijo (B1); preguntas indirectas en estilo indirecto (B1); órdenes y peticiones (*told me to…*) (B2).
9. **Artículos y cantidades (nueva; categoría de error `article` / `uncountable`):** *a / an* (A1); *the* y sin artículo (A2); contables e incontables (A2); *some / any* (A1); *much / many / a lot of / a few / a little* (A2).
10. **Preposiciones (nueva; categoría `preposition`):** *in / on / at* de tiempo (A1); *in / on / at* de lugar (A1); *for / since / during / ago* (A2); *by / until* (B1); verbo + preposición (*depend on, listen to*) (B1).
11. **Orden y conectores (nueva; categoría `word_order`):** orden básico de la frase (A1); adverbios de frecuencia (A2); orden de los adjetivos (B1); oraciones de relativo (*who / which / that / where / whose*) (B1); conectores (*although, however, despite, because of, so*) (B1); comparativos y superlativos (A2); *as… as* y *the more… the more* (B1).
12. **Falsos amigos y pronombres (nueva; categoría `false_friend`):** falsos amigos frecuentes (*actually, embarrassed, sensible, assist, library*) (A2–B1); pronombres de sujeto, de objeto y posesivos (A1); reflexivos (A2).

## 3. «Para ti»
- **Tus errores:** las correcciones de la clase ya traen una categoría (`tense`, `auxiliary`, `article`, `uncountable`, `preposition`, `word_order`, `false_friend`…). Además, el profe marcará **el tema exacto** de cada corrección (§4). Se recomiendan los temas con más fallos recientes que aún no estén dominados.
- **Tu plan:** la lección del día enlaza a su tema («Cuenta tu fin de semana en pasado» → «Pasado simple»).
- **Tu nivel:** se priorizan los temas de tu nivel y del siguiente.

## 4. La clase y el profe se nutren de Gramática
- **Corrección → tema:** el esquema de respuesta del profe añade a cada corrección un `grammarTopic` elegido de la lista de identificadores (se le pasan solo los ids, ~1 KB). Debajo de la corrección aparece «📘 Ver en Gramática: Pasado simple».
- **Clase centrada en un tema:** desde el tema, «Practicar en una clase» abre una clase cuyo prompt incluye el resumen y la fórmula del tema. El profe crea situaciones para usarlo y corrige sobre todo eso.
- **Plan de 12 semanas:** cada lección de la semana se enlaza al tema más cercano, por su foco.
- **Informe de la clase:** «Para repasar en Gramática» con los temas de tus errores.

## 5. Datos y almacenamiento
- **Contenido:** `src/grammar/<seccion>.json`, un archivo por sección, con su **validador** (`scripts/validate-grammar.mjs`, como `validate-bank.mjs`). Una sección nueva = un archivo nuevo, sin tocar las pantallas.
- **Separado del banco del test:** los ejercicios **no reutilizan** ítems de `src/bank/` (195 de gramática): si se ven antes del re-test, el test deja de medir el nivel real.
- **Progreso:** tabla nueva de Dexie `grammar` (tema → visto, aciertos, dominado, último uso). La migración solo añade y la tabla **entra en las copias de seguridad** como opcional (las copias antiguas sin ella se aceptan).
- **Repaso:** las tarjetas de Gramática usan `source: 'grammar'` en `cards`.
- **Coste:** explicación y ejercicios sin red. Gemini solo en «Dilo tú», «Pregúntale a <mascota>» y la clase centrada en un tema.

## 6. Cómo se hará (orquestación)
- **Contenido:** subagentes «autores» (uno por bloque de secciones) escriben los JSON siguiendo un formato común. Después, un subagente **revisor de contenido** (profesor de inglés para hispanohablantes) comprueba la exactitud de explicaciones, ejemplos y claves, y el validador revisa el formato.
- **Código:** subagente `dev` (pestaña, pantallas, buscador, progreso, Dexie, copias, «Dilo tú», integración con la clase y el plan) y `rev` (revisión en PC con navegador y red falsa), según `docs/correccion/REGLAS.md`.
- **Comprobaciones:** `tsc`, lint, `npm test` (pruebas nuevas: catálogo, buscador, «Para ti», migración y copia), `validate-bank` y `validate-grammar`; navegador en 390×844, 780×360 y 320×640; después el POCO.
- **Entrega:** `version.json` 5.10 / build 38, entrada «5.10» en Novedades, documentación y NC en `docs/correccion/NC-v5.10.md`. Commit y push solo con la aprobación del dueño.

## 7. Formato del contenido
Ver `docs/v5.10/FORMATO-contenido.md`.
