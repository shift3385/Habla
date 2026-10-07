#!/bin/sh
# B8 · AUD-RES-700/701: CPU en el Inicio de la app en reposo con 4 modos (base, CSS pausado, rAF congelado, ambos). Uso: res700.sh <salida>
ADB="$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe"; N="/c/Program Files/nodejs/node.exe"; D="$(dirname "$0")"; A="$ADB -s 60d0718c"; O="$1"
P=$($A shell pidof com.shift.habla | tr -d '\r'); R=${2:-0}
echo "pid app=$P render=$R $(date +%T)" > "$O"
"$N" "$D/cdp8.mjs" "window.__oraf=window.__oraf||window.requestAnimationFrame; window.mode8=(css,raf)=>{let st=document.getElementById('b8css'); if(css&&!st){st=document.createElement('style');st.id='b8css';st.textContent='*{animation-play-state:paused!important}';document.head.appendChild(st)} if(!css&&st) st.remove(); window.requestAnimationFrame = raf ? (()=>0) : window.__oraf; if(!raf) window.__kick&&0; return 'css='+css+' raf='+raf}; document.body.innerText.slice(0,50).replace(/\n/g,' ')" >> "$O"
for m in "false,false" "true,false" "false,true" "true,true"; do
  "$N" "$D/cdp8.mjs" "mode8($m)" >> "$O"; sleep 3
  $A shell sh -s $P $R 20 < "$D/cpu8.sh" >> "$O"
done
echo "fin $(date +%T)" >> "$O"
