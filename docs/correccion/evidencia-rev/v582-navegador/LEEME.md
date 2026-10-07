# Evidencia de la 5.8.2 en navegador (2026-10-07)

Chromium headless (Playwright) sobre la app real con Vite. Datos ficticios (perfil «Rev», clave `AIzaTEST-NO-REAL…`).
Toda petición externa interceptada y simulada: **0 llamadas reales** a Google o Azure.

| Captura | Qué demuestra |
|---|---|
| `clase-en-progreso-320x640.png`, `-780x360.png`, `-640x320.png` | AUD-FLU-206: el texto nuevo cabe sin scroll en el Galaxy A11 (vertical y horizontal) |
| `bienvenida-clave-mala-*.png` | AUD-E2E-604: clave no válida (400 `API_KEY_INVALID`) → «Esa clave no es válida: cópiala otra vez desde Google AI Studio…», sin «Revísala en Ajustes» |
| `bienvenida-azure-320x640.png` | AUD-FLU-211: texto nuevo de Azure (ese paso ya tenía scroll en la v5.8; el texto añade una línea) |
| `aviso-claves-320x640.png`, `-780x360.png` | AUD-FLU-211: aviso de las claves, sin scroll |
| `importar-v41.png` | REV-U3-1: una copia v4.1 (4 tablas, sin consultas ni tarjetas) se importa: diálogo «La copia tiene 1 sesiones y 1 errores…», después 1 sesión, 1 error, 0 consultas, 0 tarjetas y el perfil de la copia |
| `ajustes-clave-429.png` | REV-U4-1: Ajustes → Modelos, clave nueva con 429 → texto sin «prueba otro modelo»; la clave anterior se conserva |
| `inicio-reducido.png` | «Reducir movimiento»: bucles decorativos parados, mascota a 4,8 dibujos/s (normal: 11,7), sin errores |

Medidas (consola):
- AUD-RES-703 (`PlanCard` real, Google con 503): 1.ª visita 5 peticiones; 5 idas y vueltas de pestaña → 0 más (la auditoría midió 10). Con el plan creado por otro camino, el error viejo no vuelve y no aparece «Reintentar» (que antes podía crear un plan nuevo encima). Al cambiar de modelo con la tarjeta montada, se reintenta solo (5 peticiones).
- Mascotas en reposo, 30 s: flame 12,2 · aqua 12,4 · terra 16,7 · aero 22,4 dibujos/s (v5.8: 60–120).
