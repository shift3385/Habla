# B8 · AUD-FLU-202 en navegador (b8.localhost:5173, commit 16e6240)
Perfil de prueba con `calibratedAt` y `tests[0].date` a hace 60 días → al entrar: «¡Te toca el re-test!» con «Más tarde» / «Hacer el re-test ahora».
1. «Hacer el re-test ahora» → página 1 «¡Toca tu re-test!…»: botones = [«Siguiente»] (sin salir ni volver).
2. `Capacitor.Plugins.App.notifyListeners('backButton')` (equivale al atrás de Android) → misma página, nada cambia.
3. «Siguiente» → página 2: [«Atrás», «Siguiente»] («Atrás» = página anterior del test); atrás de Android → nada.
Control: tras recargar, Ajustes → Modelos + el mismo `backButton` → vuelve a la lista de Ajustes (el evento sí llega a la app).
Tras recargar, el re-test no se retoma solo: vuelve la invitación con «Más tarde».
