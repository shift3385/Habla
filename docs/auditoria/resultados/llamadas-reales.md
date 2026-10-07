# Presupuesto de llamadas reales a IA (autorizado por el dueño el 2026-10-05)

Total autorizado: **10** (Gemini + Azure). Reparto: B4 = 2, B6 = 6, B8 = 2.
Cada bot anota aquí cada llamada real: bot · hora · destino · motivo.

| # | Bot | Hora | Destino | Motivo |
|---|---|---|---|---|
| B4-1 | B4 | 21:17 | Gemini `generateContent` (modelo rápido) desde el POCO, botón «¿Qué digo?» en la clase reanudada | Comprobar que con v5.8 la petición nativa real no deja clave, cabeceras ni textos en logcat (P-B4-07) |
| B6-1 | B6 | 22:38 | Gemini `generateContent` (modelo principal) desde el POCO · turno de clase reanudada con WAV sintético (Zira) | E2E-011/002: transcripción, corrección, TTS y guardado en `turns` |
| B6-2 | B6 | 22:38 | Azure Speech `stt.speech.microsoft.com` (solo si la fonética está activa en el POCO) · mismo turno | Nota de pronunciación real en `turns[].pronunciation` (máx. 1 de Azure) |
| B6-3 | B6 | 22:39 | Gemini `generateContent` · 2.º turno con «Inicio» de Android durante «Pensando…» | E2E-015 / AUD-FLU-215: ¿habla el profe en segundo plano? |
| B6-4 | B6 | 22:40 | Gemini `generateContent` (modelo rápido) · «¿Qué digo?» | E2E-018: ideas reales |
| B6-5 | B6 | 22:41 | Gemini `generateContent` · consulta tocando una palabra del profe en la clase (LookupSheet) | E2E-008: consulta real y guardado en `lookups` |
| B6-6 | B6 | — | no usada | Reserva sin usar. Total B6: 5 reales (4 Gemini + 1 Azure Speech). Nota: al abrir Ajustes → Modelos la app pide `models?pageSize=1000`; esa petición la bloqueó el arnés (no es real). |
