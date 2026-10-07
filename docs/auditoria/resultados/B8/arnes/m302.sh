#!/bin/sh
# B8 · AUD-MIC-302 desde cero: Tema libre → doble toque (150 ms) en «Dictar por voz» → terminar → cerrar la hoja → Inicio Android → volver.
# Uso: m302.sh <timeline> <js>
ADB="$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe"; N="/c/Program Files/nodejs/node.exe"; D="$(dirname "$0")"; A="$ADB -s 60d0718c"
$A shell am force-stop com.shift.habla; sleep 1
$A shell am start -n com.shift.habla/.MainActivity >/dev/null; sleep 7
sh "$D/inject8.sh" >/dev/null
"$N" "$D/cdp8.mjs" "clickText('Continuar donde'); await s(2500); clickText('Ir al inicio'); await s(2000); clickText('Tema libre'); await s(1500); btns().join()" > "$2"
sh "$D/sampler8.sh" 70 "$1" &
sleep 2; echo "DOBLE $(date +%T)" >> "$2"
"$N" "$D/cdp8.mjs" "clickAria('Dictar por voz'); await s(150); const r2=clickAria('Dictar por voz'); await s(4000); r2+' '+st()" >> "$2"
echo "TERMINAR $(date +%T)" >> "$2"
"$N" "$D/cdp8.mjs" "clickAria('Terminar de dictar'); await s(4000); st()" >> "$2"
echo "CERRAR $(date +%T)" >> "$2"
"$N" "$D/cdp8.mjs" "clickAria('Atrás'); await s(3000); document.body.innerText.slice(0,60).replace(/\n/g,' ')+' '+st()" >> "$2"
echo "HOME $(date +%T)" >> "$2"
$A shell am start -a android.intent.action.MAIN -c android.intent.category.HOME >/dev/null 2>&1
sleep 15; echo "VUELTA $(date +%T)" >> "$2"
$A shell am start -n com.shift.habla/.MainActivity >/dev/null 2>&1; sleep 8
"$N" "$D/cdp8.mjs" "st()" >> "$2"
wait
