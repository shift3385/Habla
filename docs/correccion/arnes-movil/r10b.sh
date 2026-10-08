#!/bin/sh
# Revisión móvil 5.9 · R10b (MIC-301 en el test): «Grabar» y, a ~0,45 s, Inicio de Android; 15 s fuera; volver. Uso: r10b.sh <ronda> <dir>
D="$(dirname "$0")"; N="/c/Program Files/nodejs/node.exe"; A="adb -s 60d0718c"; R=$1; E=$2
sh "$D/sampler8.sh" 32 "$E/R10b-$R-timeline.txt" &
sleep 1
"$N" "$D/cdp8.mjs" "window.__m0=__b3.mic.length; clickAria('Grabar')" > "$E/R10b-$R-js.txt" &
sleep 0.45
$A shell am start -a android.intent.action.MAIN -c android.intent.category.HOME >/dev/null 2>&1
echo "HOME $(date +%T.%N | cut -c1-12)" >> "$E/R10b-$R-js.txt"
sleep 15
$A shell am start -n com.shift.habla.debug/com.shift.habla.MainActivity >/dev/null 2>&1
echo "VUELTA $(date +%T.%N | cut -c1-12)" >> "$E/R10b-$R-js.txt"
sleep 6
"$N" "$D/cdp8.mjs" "const live=__b3.mic.filter(m=>m.track&&m.track.readyState==='live').length; const rec=__b3.rec.filter(x=>x.obj.state==='recording').length; const lbl=[...document.querySelectorAll('button')].map(b=>b.getAttribute('aria-label')).filter(Boolean).join(','); 'aperturas='+(__b3.mic.length-__m0)+' live='+live+' rec='+rec+' ['+lbl+'] '+__b3.ev.slice(-6).join(' ; ')" >> "$E/R10b-$R-js.txt"
wait
