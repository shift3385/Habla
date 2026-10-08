#!/bin/sh
# B8 · AUD-MIC-308: hilo JS ocupado 8 s justo cuando se pulsa Inicio con la clase abierta (micro abierto). ¿Cierra algo nativo?
ADB="$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe"; N="/c/Program Files/nodejs/node.exe"; D="$(dirname "$0")"; A="$ADB -s 60d0718c"
$A shell am force-stop com.shift.habla.debug; sleep 1
$A shell am start -n com.shift.habla.debug/com.shift.habla.MainActivity >/dev/null; sleep 7
sh "$D/inject8.sh" >/dev/null
"$N" "$D/cdp8.mjs" "clickText('Continuar donde'); await s(2500); clickText('Continuar mi clase'); await s(9000); st()" > "$2"
sh "$D/sampler8.sh" 40 "$1" &
sleep 3; echo "BUSY+HOME $(date +%T.%N | cut -c1-12)" >> "$2"
( "$N" "$D/cdp8.mjs" "window.__busy0=performance.now(); setTimeout(()=>{const t=performance.now(); while(performance.now()-t<8000){}; window.__busy1=performance.now()},0); 'busy'" >> "$2" & )
sleep 1; $A shell am start -a android.intent.action.MAIN -c android.intent.category.HOME >/dev/null 2>&1; echo "HOME $(date +%T.%N | cut -c1-12)" >> "$2"
sleep 20; echo "VUELTA $(date +%T.%N | cut -c1-12)" >> "$2"
$A shell am start -n com.shift.habla.debug/com.shift.habla.MainActivity >/dev/null 2>&1; sleep 4
"$N" "$D/cdp8.mjs" "'busy '+Math.round(__busy0)+'-'+Math.round(__busy1)+' '+st()" >> "$2"
wait
