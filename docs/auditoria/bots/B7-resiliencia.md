# B7 · Resiliencia, rendimiento y batería

**Misión:** comprobar que la app se comporta bien cuando las cosas van mal y que no gasta batería, memoria ni cuota de API sin necesidad.

## Pruebas

1. **Red.** Latencia alta, cortes a mitad de una respuesta, 429 persistente, 503 en cadena, *timeouts*: ¿cuántas llamadas hace `withRetry` en el peor caso? ¿Se reenvía el audio en cada reintento? ¿Se puede quedar un *spinner* infinito? ¿Se puede cancelar?
2. **Coste de API.** Cuenta llamadas a Gemini y Azure por clase de 10 turnos (red falsa): por turno, por «¿Qué digo?», por consulta, por informe, por tema del día. Señala llamadas duplicadas o evitables (doble montaje, efectos que se repiten al girar).
3. **Memoria.** Clase larga (50 turnos simulados): crecimiento del *heap* (CDP `Performance.getMetrics` / `HeapProfiler`), `AudioContext` sin cerrar, *blobs* retenidos, listas sin virtualizar.
4. **Batería (NC-14).** En el teléfono: `dumpsys batterystats --reset`, dejar una clase abierta y pasar a segundo plano 30 min con la pantalla apagada; después `dumpsys batterystats com.shift.habla`, `dumpsys power` (wakelocks), `dumpsys audio` (modo, SCO). Repetir con auriculares Bluetooth. Comparar con la app cerrada.
5. **Animación.** La mascota se dibuja en cada fotograma: CPU con la app visible e inactiva 5 min; ¿se pausa en segundo plano y con pantallas tapadas?
6. **Datos.** Base de datos con 1 año de uso simulado (cientos de sesiones): tiempo de arranque, Progreso, exportar/importar, tamaño del JSON.
7. **Interrupciones.** `am force-stop` durante: guardado de clase, importación, final del test. ¿Datos corruptos o a medias?
8. **Reloj.** Cambio de día, zona horaria, hora del sistema hacia atrás: racha, re-test cada 28 días, plan semanal, recordatorio.

## Salida

`resultados/B7/metricas.md` (tablas con números y método) y `resultados/B7/hallazgos.md` (`AUD-RES-*`).
