#!/bin/sh
# B8 · Inyecta la instrumentación de B3 (micro real, red falsa «sorda» al audio) + ayudas. Uso: inject8.sh [cfg-js]
D="$(dirname "$0")"; N="/c/Program Files/nodejs/node.exe"; B3="$D"
DEF='window.__B3CFG={fake:false,deafAudio:true,netDelay:400};'
CFG="${1:-$DEF}"
"$N" "$D/cdp8.mjs" -f "$B3/instr.js" "$CFG"
"$N" "$D/cdp8.mjs" -f "$B3/helpers.js"
