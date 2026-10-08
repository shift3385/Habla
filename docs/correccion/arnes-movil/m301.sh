#!/bin/sh
# B8 · AUD-MIC-301 desde cero: app recién arrancada (defaultOk=false → hasSignal 2 s), «Continuar mi clase»
# (reanuda, nunca «Empezar nueva») y botón Inicio de Android a los <retardo> s; vuelta; 2.º Inicio; vuelta.
# Uso: m301.sh <retardo_s> <archivo_timeline> <archivo_js>
ADB="$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe"; N="/c/Program Files/nodejs/node.exe"; D="$(dirname "$0")"
A="$ADB -s 60d0718c"
$A shell am force-stop com.shift.habla.debug; sleep 1
$A shell am start -n com.shift.habla.debug/com.shift.habla.MainActivity >/dev/null; sleep 7
sh "$D/inject8.sh" >/dev/null
"$N" "$D/cdp8.mjs" "clickText('Continuar donde'); await s(2500); btns().join()"
sh "$D/sampler8.sh" 60 "$2" &
sleep 2
( "$N" "$D/cdp8.mjs" "window.__clickAt=performance.now(); clickText('Continuar mi clase')" >/dev/null & )
sleep $1; echo "HOME $(date +%T.%N | cut -c1-12)"
$A shell am start -a android.intent.action.MAIN -c android.intent.category.HOME >/dev/null 2>&1
sleep 15; echo "VUELTA $(date +%T.%N | cut -c1-12)"
$A shell am start -n com.shift.habla.debug/com.shift.habla.MainActivity >/dev/null 2>&1; sleep 8
"$N" "$D/cdp8.mjs" "'click='+Math.round(__clickAt)+' '+st()" > "$3"
echo "HOME2 $(date +%T.%N | cut -c1-12)"
$A shell am start -a android.intent.action.MAIN -c android.intent.category.HOME >/dev/null 2>&1
sleep 12; echo "VUELTA2 $(date +%T.%N | cut -c1-12)"
$A shell am start -n com.shift.habla.debug/com.shift.habla.MainActivity >/dev/null 2>&1; sleep 3
"$N" "$D/cdp8.mjs" "st()" >> "$3"
"$N" "$D/cdp8.mjs" "JSON.stringify(__b3.summary().mic.map(m=>({id:m.id,req:m.req,open:m.open,close:m.close,live:m.live,stack:m.stack.slice(0,120)})))" >> "$3"
wait
