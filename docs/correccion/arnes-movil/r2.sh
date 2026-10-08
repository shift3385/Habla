#!/bin/sh
# Revisión móvil 5.9 · R2 (MIC-301 en clase, 5.9 «toca para hablar»): «Tocar para hablar» y, a ~0,45 s, Inicio de Android; 15 s fuera; volver.
# Uso: r2.sh <ronda> <dir>   (la clase ya abierta en com.shift.habla.debug)
D="$(dirname "$0")"; N="/c/Program Files/nodejs/node.exe"; A="adb -s 60d0718c"; R=$1; E=$2
sh "$D/sampler8.sh" 32 "$E/R2-$R-timeline.txt" &
sleep 1
"$N" "$D/cdp8.mjs" "window.__m0=__b3.mic.length; tapTalk()" > "$E/R2-$R-js.txt" &
sleep 0.45
$A shell am start -a android.intent.action.MAIN -c android.intent.category.HOME >/dev/null 2>&1
echo "HOME $(date +%T.%N | cut -c1-12)" >> "$E/R2-$R-js.txt"
sleep 15
$A shell am start -n com.shift.habla.debug/com.shift.habla.MainActivity >/dev/null 2>&1
echo "VUELTA $(date +%T.%N | cut -c1-12)" >> "$E/R2-$R-js.txt"
sleep 6
"$N" "$D/cdp8.mjs" "const live=__b3.mic.filter(m=>m.track&&m.track.readyState==='live').length; const rec=__b3.rec.filter(x=>x.obj.state==='recording').length; const lbl=[...document.querySelectorAll('button')].map(b=>b.getAttribute('aria-label')).filter(Boolean).join(','); 'aperturas='+(__b3.mic.length-__m0)+' live='+live+' rec='+rec+' ['+lbl+'] '+(document.body.innerText.match(/(Se cortó[^\n]*|[0-9:]+ · toca para enviar)/)||['—'])[0]+' | '+__b3.ev.slice(-5).join(' ; ')" >> "$E/R2-$R-js.txt"
wait
