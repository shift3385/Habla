#!/bin/sh
# MOV-4 · tres medidas seguidas (~30 s) mientras el dueño cuenta en voz alta: BT con procesado, BT sin procesado y
# micro del teléfono (referencia). Uso: mov4-voz3.sh <prefijo-salida>
D="$(dirname "$0")"; N="/c/Program Files/nodejs/node.exe"
"$N" "$D/cdp8.mjs" -f "$D/mov4-voz.js" "const __MOV4_OPTS={echoCancellation:true,noiseSuppression:true,autoGainControl:true};" > "$1-bt.txt"
"$N" "$D/cdp8.mjs" -f "$D/mov4-voz.js" "const __MOV4_OPTS={echoCancellation:false,noiseSuppression:false,autoGainControl:false};" > "$1-bt-raw.txt"
"$N" "$D/cdp8.mjs" -f "$D/mov4-voz.js" "const __MOV4_ROUTE='phone'; const __MOV4_OPTS={echoCancellation:true,noiseSuppression:true,autoGainControl:true};" > "$1-tel.txt"
for f in bt bt-raw tel; do printf '%s: ' $f; grep -o 'pico [0-9.]*' "$1-$f.txt" | awk '{printf "%s ", $2}'; echo; done
