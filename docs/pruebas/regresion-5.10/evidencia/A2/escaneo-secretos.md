# Escaneo de secretos (A2, 2026-10-20) — sin valores
Objetos blob escaneados (git cat-file --batch-all-objects, incluye inalcanzables): 1397
Ramas: main v5.10-gramatica remotes/origin/HEAD->origin/main remotes/origin/claude/peaceful-fermi-ua55yq remotes/origin/main remotes/origin/v5.10-gramatica 
Stashes: 0 · inalcanzables (fsck --unreachable --no-reflogs): 14 blob, 3 commit, 20 tree · tmp_pack_* (5, comprimidos): 0 coincidencias en crudo
Patrones: AIza{20,}, hex32, client secret Q~, Bearer, ?key=/&key=, Ocp-Apim-Subscription-Key con valor

blob | línea | tipo | longitud | valoración | ruta
12ac680e7f | 32 | gemini | 36 | ficticia | docs/auditoria/entorno.md
260b97c2d0 | 34 | gemini | 36 | ficticia | docs/auditoria/resultados/B7/arnes/seed7.js
374dbe8720 | 101 | gemini | 37 | ficticia | docs/v5.10/evidencia-510b/arnes-sinonimos-clase.mjs
62a344f839 | 274 | gemini | 36 | ficticia | docs/correccion/arnes-rev/rev-mic.js
647fab22c8 | 15 | gemini | 36 | ficticia | docs/correccion/REVISION-MOVIL.md
9e882b3826 | 15 | gemini | 36 | ficticia | docs/correccion/REVISION-MOVIL.md
a4e58bd8fd | 3 | gemini | 36 | ficticia | docs/auditoria/resultados/B5/plan-dinamico.md
a598b84be0 | 29 | gemini | 36 | ficticia | docs/correccion/REVISOR-MOVIL.md
b4da48cf1b | 15 | gemini | 36 | ficticia | docs/correccion/REVISION-MOVIL.md
c50b0b1b96 | 101 | gemini | 37 | ficticia | docs/v5.10/evidencia-510b/arnes-sinonimos-palabras.mjs
d3bd99e534 | 13 | gemini | 36 | ficticia | docs/auditoria/resultados/B8/arnes/nav8.js
d3bd99e534 | 13 | gemini | 36 | ficticia | docs/auditoria/resultados/B8/arnes/nav8.js
df6a730a70 | 29 | gemini | 36 | ficticia | docs/correccion/REVISOR-MOVIL.md
e8cbbbc028 | 34 | gemini | 36 | ficticia | docs/correccion/arnes-movil/onboard.js
ee1563e58a | 29 | gemini | 36 | ficticia | docs/correccion/REVISOR-MOVIL.md

Clave real de Gemini = 39 caracteres (AIza + 35). Ninguna coincidencia tiene 39: todas 36-37 y con palabras de prueba.
Árbol de trabajo (sin node_modules/apk/build): 0 claves de 39, 0 hex32, 0 Q~, 0 Bearer/key=/Ocp con valor.
dist/ y APK 5.9, 5.9.1, 5.9.1-debug, 5.10, 5.10-debug: 0 AIza, 0 hex32, 0 Q~ ; sin keystore ni keystore.properties dentro.
keystore/: ignorado por .gitignore:27; nunca en el historial (git log --all --name-only).
