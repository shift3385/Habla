# B4 · Plan de pruebas dinámicas (fase 2)

Reglas: `REGLAS-COMUNES.md`. Navegador con `preview_start name:"habla-dev"`; teléfono solo con `.telefono.lock`. Nunca imprimir valores de `habla.settings`: solo `hasKey`, longitud y como mucho 4 caracteres. Arneses en `resultados/B4/arnes/`.

## Llamadas reales

**Pido 1 de mis 2 llamadas reales (la otra queda en reserva).**
- **R-1 (Gemini, 1 turno de clase en el teléfono):** confirmar con logcat (P-B4-07) que en v5.8 una petición real con la clave verdadera no deja `AIza`, `x-goog-api-key` ni transcripción en logcat. Con red falsa no se puede probar porque el camino nativo de `CapacitorHttp` solo se ejercita de verdad contra el servidor real. Se anota en `llamadas-reales.md`.
- **Reserva (Azure):** solo si el dueño tiene fonética activada y B6 no cubre una petición de Azure con logcat abierto; si B6 la hace, comparto su logcat en vez de gastar la mía.
- Todo lo demás con red falsa (sin gastar cupo).

## Pruebas

| ID | Dónde | Qué | Cómo | Resultado que cierra |
|---|---|---|---|---|
| P-B4-01 | Navegador, red falsa | Recorrido completo (tutorial → clave falsa → test → clase → palabras → informe → repaso) registrando **todas** las peticiones | Arnés que intercepta `fetch` (en web `CapacitorHttp` cae a `fetch`) y devuelve respuestas falsas; volcar host, método, cabeceras (clave enmascarada), tamaño y campos del cuerpo | Confirmar `mapa-datos.md` D1–D13; ningún destino no listado; clave nunca en URL |
| P-B4-02 | Navegador, red falsa | Región de Azure maliciosa (`evil.com#`, `a/b`, `x.evil.com`) | Guardar en Ajustes → Azure y pulsar «Guardar y comprobar» | Ninguna petición sale fuera de `*.microsoft.com` (DESCARTAR inyección) |
| P-B4-03 | Navegador, red falsa | **AUD-FUG-401**: Resource ID `@127.0.0.1:8099/x` y `.evil.example/x` | Red falsa responde al token de `login.microsoftonline.com` con un token ficticio; observar a qué host va el `GET` de métricas y si lleva `Authorization`; comprobar que no pide huella | Pasa a CONFIRMADO si el Bearer va al host ajeno |
| P-B4-04 | Navegador | `localStorage` tras el recorrido | Listar claves y campos de `habla.netlog`, `habla.quota`, `habla.azureUsage`, `CapacitorStorage.*` (solo nombres de campo y tamaños) | Netlog sin datos personales; documentar que en web las claves están en `localStorage` |
| P-B4-05 | Teléfono | Exportar copia y resumen del test (**lo hace el dueño**) | `adb shell ls -l /sdcard/Documents/Habla/`; con `run-as` **solo** `ls -l cache/` (no `cat` de prefs); revisar el JSON exportado: lista de tablas y campos, `grep -c` de `AIza`/`azureKey` = 0 | AUD-FUG-403 confirmado (copia en `cache/` persiste) |
| P-B4-06 | Teléfono | Exclusión de copias | `adb shell bmgr list transports` y `dumpsys backup` (sin `adb backup` de datos reales a disco salvo acuerdo; nunca restaurar) | Confirmar que `CapacitorStorage.xml` no entra |
| P-B4-07 | Teléfono | logcat durante clase y al guardar ajustes (con R-1) | `adb logcat -c` no (no borrar logs ajenos): marcar hora y `adb logcat -d -T '<hora>'`; contar (`grep -c`) `AIza`, `x-goog-api-key`, `Ocp-Apim`, `Capacitor/Console`, `HablaAudio`; guardar solo líneas `HablaAudio` enmascaradas | AUD-FUG-402 (si quedan `AIza` antiguos en el buffer) y AUD-FUG-405 |
| P-B4-08 | Teléfono, CDP | Resumen de `habla.settings` y `habla.savedClass` | Evaluación CDP que devuelve solo `{hasKey, len, prefix4}` y la lista de campos de `savedClass` | AUD-FUG-404 confirmado sin copiar valores |
| P-B4-09 | Teléfono | Diagnóstico | Abrir Ajustes → Diagnóstico y, sin compartir de verdad, leer el texto que se generaría (CDP: llamar a la función de líneas) | Sin claves ni transcripciones |
| P-B4-10 | Teléfono | `Download/Habla*.apk` | `adb shell ls /sdcard/Download/Habla*.apk` (solo nombres) | Saber si quedan APK ≤5.7 con logs (AUD-FUG-402) |

No haré: `run-as cat` de `CapacitorStorage.xml`, `pm clear`, instalar APK, restaurar copias, ni reactivar `loggingBehavior`.

## Resultado de la fase 2 (2026-10-05, 21:05–21:20)

| ID | Resultado |
|---|---|
| P-B4-01 | Hecho en parte (clase reanudada con fonética, «¿Qué digo?», Palabras, Ajustes/Modelos, plan). Sin tutorial, test, informe ni repaso (no hacían falta para el mapa). `evidencia/nav-red-falsa.md` |
| P-B4-02 | Hecho → inyección por región DESCARTADA |
| P-B4-03 | Hecho → AUD-FUG-401 CONFIRMADO |
| P-B4-04 | Hecho (navegador y POCO) → netlog sin datos personales |
| P-B4-05 | Hecho sin exportar: 1 copia en `Documents/Habla` (estructura sin valores); `cache/` sin copias |
| P-B4-06 | No comprobable: Backup Manager desactivado en el POCO |
| P-B4-07 | Hecho con la llamada real B4-1 → logcat limpio; `HablaAudio` no ejercitado (sin auriculares BT) |
| P-B4-08 | Hecho → AUD-FUG-404 CONFIRMADO |
| P-B4-09 | Cubierto por P-B4-04 (el texto compartido sale solo de los campos del netlog) |
| P-B4-10 | Hecho → no hay `Habla*.apk` en `Download/` |

Llamadas reales: 1 (B4-1). La segunda (Azure) no se usó. Incidencias: mi sonda creó por error una BD `habla-draft` vacía y la borré en el acto (`evidencia/tel-almacen-resumen.md`); durante la sesión apareció un segundo dispositivo en adb (Samsung SM-A115U): todos los comandos se fijaron con `-s 60d0718c`. Al terminar: Habla con force-stop, forward 9333 quitado, lock borrado, servidor de Vite parado y ajustes de Azure ficticios del navegador retirados.
