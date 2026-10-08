#!/bin/sh
# Revisión móvil 5.9 (copia adaptada de docs/auditoria/resultados/ORQ/arnes/fondo-orq.sh) · R8 / NC-14:
# clase abierta en com.shift.habla.debug (uid 10366) → Inicio de Android → <minutos> en segundo plano midiendo CPU, wakelocks,
# captura de micro (audio_policy y appops) y modo de audio. Uso: fondo-orq.sh <minutos>
ADB="$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe"; N="/c/Program Files/nodejs/node.exe"; A="$ADB -s 60d0718c"
D="$(dirname "$0")"; OUT="$D/../evidencia-movil/R8-fondo-clase.txt"; M=${1:-10}
$A shell am force-stop com.shift.habla.debug; sleep 1; $A shell am start -n com.shift.habla.debug/com.shift.habla.MainActivity >/dev/null; sleep 8
sh "$D/inject8.sh" 'window.__B3CFG={fake:true,deafAudio:false,netDelay:400};' >/dev/null
"$N" "$D/cdp8.mjs" -f "$D/helpers.js" >/dev/null
"$N" "$D/cdp8.mjs" "clickText('Continuar donde'); await s(2500); for(let i=0;i<6&&!/De qué hablamos/.test(document.body.innerText);i++){['Entendido','Ir al inicio','Más tarde','Vale','Hecho','Ahora no'].forEach(t=>clickText(t)); await s(1500)} clickAria('Sorpréndeme'); await s(2000); clickText('Empezar nueva'); for(let i=0;i<20&&!document.querySelector('button[aria-label=\"Tocar para hablar\"]');i++) await s(1000); document.body.innerText.slice(0,80).replace(/\n/g,' | ')+' '+st()" > "$D/../evidencia-movil/R8-js-inicio.txt"
$A shell am start -a android.intent.action.MAIN -c android.intent.category.HOME >/dev/null; sleep 2
AP=$($A shell pidof com.shift.habla.debug | tr -d '\r')
RP=$($A shell "dumpsys activity processes | grep -E 'com.shift.habla.debug:sandboxed|isolated.*habla' -B2 | grep -o 'ProcessRecord{[^ ]* [0-9]*' | grep -o '[0-9]*$' | head -1" | tr -d '\r')
{ echo "inicio $(date +%T) · app=$AP renderer=${RP:-?} · minutos=$M"
  echo "min app_ticks_acum render_ticks_acum app_%cpu_min render_%cpu_min top wakelocks habla_in appops modo_audio"; } > "$OUT"
MSYS_NO_PATHCONV=1 $A shell "A=$AP; R=${RP:-0}; M=$M"'
t() { set -- $(cut -d" " -f14,15 /proc/$1/stat 2>/dev/null); echo $(( ${1:-0} + ${2:-0} )); }
a0=$(t $A); r0=$(t $R); pa=$a0; pr=$r0; i=0
while [ $i -lt $M ]; do sleep 60; i=$((i+1)); a=$(t $A); r=$(t $R)
 top=$(dumpsys activity activities 2>/dev/null | grep -m1 topResumedActivity | grep -c com.shift.habla.debug)
 wl=$(dumpsys power | grep -iE "10366|habla" | grep -ic wake)
 h=$(dumpsys media.audio_policy | sed -n "/^ Inputs (/,/Total Effects/p" | grep -c 10366)
 op=$(cmd appops get com.shift.habla.debug RECORD_AUDIO | grep -o running | head -1)
 md=$(dumpsys audio | grep -m1 "Actual mode" | tr -s " ")
 echo "$i $((a-a0)) $((r-r0)) $(( (a-pa)*100/6000 )) $(( (r-pr)*100/6000 )) $top $wl $h ${op:-no} $md"; pa=$a; pr=$r; done' >> "$OUT" 2>&1
echo "fin $(date +%T)" >> "$OUT"
