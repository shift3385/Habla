#!/bin/sh
# Inyecta instrumentación (micro real, red falsa con respuesta «sorda» al audio) + ayudas en el WebView del teléfono.
D="$(dirname "$0")"; N="/c/Program Files/nodejs/node.exe"
"$N" "$D/cdp.mjs" -f "$D/instr.js" "window.__B3CFG={fake:false,deafAudio:true,netDelay:400};"
"$N" "$D/cdp.mjs" -f "$D/helpers.js"
