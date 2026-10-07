#!/bin/sh
# B8 · AUD-MIC-303 desde cero: Prácticas → Debate → «Lo propongo yo» → «Dictar por voz» → flecha Atrás (paso 1) → 20 s → volver al paso 2 → terminar.
# Uso: m303.sh <timeline> <js>
ADB="$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe"; N="/c/Program Files/nodejs/node.exe"; D="$(dirname "$0")"; A="$ADB -s 60d0718c"
$A shell am force-stop com.shift.habla; sleep 1
$A shell am start -n com.shift.habla/.MainActivity >/dev/null; sleep 7
sh "$D/inject8.sh" >/dev/null
"$N" "$D/cdp8.mjs" "clickText('Continuar donde'); await s(2500); clickText('Ir al inicio'); await s(2000); clickText('Prácticas'); await s(800); clickText('Debate'); await s(1500); clickText('Lo propongo yo'); await s(1200); btns().join()" > "$2"
sh "$D/sampler8.sh" 50 "$1" &
sleep 2; echo "DICTAR $(date +%T)" >> "$2"
"$N" "$D/cdp8.mjs" "clickAria('Dictar por voz'); await s(3000); st()" >> "$2"
echo "ATRAS $(date +%T)" >> "$2"
"$N" "$D/cdp8.mjs" "clickAria('Atrás'); await s(2000); document.body.innerText.slice(0,80).replace(/\n/g,' ')+' | '+st()" >> "$2"
sleep 18; echo "PASO1+20s $(date +%T)" >> "$2"
$A exec-out screencap -p > "$(dirname "$2")/m303-paso1-grabando.png"
"$N" "$D/cdp8.mjs" "st()" >> "$2"
echo "VUELVE-PASO2-Y-TERMINA $(date +%T)" >> "$2"
"$N" "$D/cdp8.mjs" "clickText('Lo propongo yo'); await s(1200); const b=btns().filter(x=>/escucho|Dictar/.test(x)).join(); clickAria('Terminar de dictar'); await s(6000); b+' | '+st()+' | '+(document.body.innerText.match(/No te he[^\n]*/)||[''])[0]" >> "$2"
wait
