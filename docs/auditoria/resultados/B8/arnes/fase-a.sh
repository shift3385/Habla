#!/bin/sh
# Fase A (orquestador): abre la clase, inyecta red falsa, arranca el muestreo (hasta /data/local/tmp/b8stop) y, en M6, pulsa hablar.
ADB="$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe"; N="/c/Program Files/nodejs/node.exe"; D="$(dirname "$0")"; A="$ADB -s 60d0718c"
SC=${1:-M5}; E="$D/../evidencia"; TL="$E/bloqueo-$SC-timeline.txt"; JS="$E/bloqueo-$SC-js.txt"
L="$D/../../.telefono.lock"; [ -e "$L" ] && { echo "Teléfono ocupado: $(cat "$L")"; exit 1; }; echo "Orquestador $(date +%H:%M) bloqueo $SC" > "$L"
MSYS_NO_PATHCONV=1 $A shell rm -f /data/local/tmp/b8stop
$A shell am force-stop com.shift.habla; sleep 1
$A shell am start -n com.shift.habla/.MainActivity >/dev/null; sleep 7
sh "$D/inject8.sh" >/dev/null
"$N" "$D/cdp8.mjs" "window.pd=(id,type)=>{const b=document.querySelector('button[aria-label=\"Mantener para hablar\"]'); if(!b) return 'sin boton'; const r=b.getBoundingClientRect(); b.dispatchEvent(new PointerEvent(type,{pointerId:id,isPrimary:true,bubbles:true,clientX:r.x+r.width/2,clientY:r.y+r.height/2,pointerType:'touch'})); return type+id}; clickText('Continuar donde'); await s(2500); clickText('Continuar mi clase'); await s(12000); st()" > "$JS"
nohup $A shell "i=0; while [ ! -e /data/local/tmp/b8stop ] && [ \$i -lt 900 ]; do
  t=\$(date +%H:%M:%S.%N | cut -c1-12)
  h=\$(dumpsys media.audio_policy | sed -n '/^ Inputs (/,/Total Effects/p' | grep -c 10410)
  op=\$(cmd appops get com.shift.habla RECORD_AUDIO | grep -o 'running' | head -1)
  md=\$(dumpsys audio | grep -m1 'Actual mode' | tr -s ' ')
  wk=\$(dumpsys power | grep -m1 -o 'mWakefulness=[A-Za-z]*')
  top=\$(dumpsys activity activities 2>/dev/null | grep -m1 topResumedActivity | grep -c com.shift.habla)
  echo \"\$t | \$wk | habla_top=\$top | habla_in=\$h | appops=\${op:-no} |\$md\"
  i=\$((i+1)); sleep 0.5
done" > "$TL" 2>&1 &
sleep 3
if [ "$SC" = "M6" ]; then "$N" "$D/cdp8.mjs" "pd(1,'pointerdown')" >> "$JS"; echo "Grabando (botón pulsado por CDP)."; fi
echo "BLOQUEAR (aviso) $(date +%T)" >> "$JS"
echo "Fase A lista $(date +%T). Muestras hasta ahora: $(wc -l < "$TL")"; tail -2 "$TL"
