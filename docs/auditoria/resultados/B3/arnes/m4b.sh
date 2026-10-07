#!/bin/sh
# Uso: m4b.sh <retardo_home_s> <archivo_timeline>   (reinicia Habla, llega al diálogo, reanuda la clase y pulsa Inicio)
ADB="$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe"; N="/c/Program Files/nodejs/node.exe"; D="$(dirname "$0")"
"$ADB" shell am force-stop com.shift.habla; sleep 1
"$ADB" shell am start -n com.shift.habla/.MainActivity >/dev/null; sleep 7
sh "$D/inject.sh" >/dev/null
"$N" "$D/cdp.mjs" "clickText('Continuar donde'); await s(2500); clickText('Ir al inicio'); await s(1500); clickText('Prácticas'); await s(600); clickText('Entrevista de trabajo'); await s(800); btns().filter(b=>/Reanudar/.test(b)).join()"
sh "$D/sampler.sh" 55 "$2" &
sleep 2
( "$N" "$D/cdp.mjs" "window.__clickAt=performance.now(); clickText('Reanudar la anterior')" >/dev/null & )
sleep $1; echo "HOME $(date +%T.%N | cut -c1-12)"
"$ADB" shell am start -a android.intent.action.MAIN -c android.intent.category.HOME >/dev/null 2>&1
sleep 15; echo "VUELTA $(date +%T.%N | cut -c1-12)"
"$ADB" shell am start -n com.shift.habla/.MainActivity >/dev/null 2>&1; sleep 8
"$N" "$D/cdp.mjs" "'click='+Math.round(__clickAt)+' '+st()"
echo "HOME2 $(date +%T.%N | cut -c1-12)"
"$ADB" shell am start -a android.intent.action.MAIN -c android.intent.category.HOME >/dev/null 2>&1
sleep 12; echo "VUELTA2 $(date +%T.%N | cut -c1-12)"
"$ADB" shell am start -n com.shift.habla/.MainActivity >/dev/null 2>&1; sleep 3
"$N" "$D/cdp.mjs" "st()"
wait
