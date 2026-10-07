# B8 · AUD-FLU-219 en navegador (b8.localhost:5173, red falsa B6, micro falso)
1. Tema «Viajes y culturas» → saludo falso → 1 turno con micro falso → «Salir y guardar la clase»: `habla.savedClass` = sesión 7002, historial 4.
2. Importar (Ajustes → Mi perfil y datos) una copia con la sesión 7002 abierta y 2 turnos distintos («turn A»/«turn B») → «Importado: 1 sesiones y 0 errores ✓».
3. Inicio → «Clase en progreso · Music · Continuar»: la clase de título «Music» **pinta los turnos de la copia** («turn A», «turn B»).
4. Nuevo turno: la petición a Gemini lleva el historial de la clase guardada («What kind of music…»), **no** el de la copia («turn A» ausente); y el turno nuevo se guarda en la sesión 7002 importada, mezclado con los de la copia.
