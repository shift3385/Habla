#!/bin/sh
# B8 · M5/M6: micrófono al BLOQUEAR LA PANTALLA durante una clase. Requiere al dueño (pulsa el botón de encendido cuando se indique).
# Uso: bloqueo.sh <escenario: M5|M6> <carpeta_evidencia>
#  M5 = clase reanudada en reposo (micro abierto por diseño) → bloquear 60 s → desbloquear.
#  M6 = clase reanudada con el botón de hablar PULSADO por CDP (grabando) → bloquear 60 s → desbloquear.
# Muestreo independiente cada ~0,85 s: audio_policy (entrada de Habla, uid 10366), appops RECORD_AUDIO, modo de audio, Habla en primer plano
# y además el estado de pantalla (mWakefulness / bloqueo) para fijar el instante exacto del bloqueo.
ADB="$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe"; N="/c/Program Files/nodejs/node.exe"; D="$(dirname "$0")"; A="$ADB -s 60d0718c"
SC=${1:-M5}; E=${2:-$D/../evidencia}; TL="$E/bloqueo-$SC-timeline.txt"; JS="$E/bloqueo-$SC-js.txt"
L="$D/../../.telefono.lock"; [ -e "$L" ] && { echo "Teléfono ocupado: $(cat "$L")"; exit 1; }; echo "B8 $(date +%H:%M) bloqueo $SC" > "$L"
$A shell am force-stop com.shift.habla.debug; sleep 1
$A shell am start -n com.shift.habla.debug/com.shift.habla.MainActivity >/dev/null; sleep 7
sh "$D/inject8.sh" >/dev/null
"$N" "$D/cdp8.mjs" "window.pd=(id,type)=>{const b=document.querySelector('button[aria-label=\"Mantener para hablar\"]'); if(!b) return 'sin boton'; const r=b.getBoundingClientRect(); b.dispatchEvent(new PointerEvent(type,{pointerId:id,isPrimary:true,bubbles:true,clientX:r.x+r.width/2,clientY:r.y+r.height/2,pointerType:'touch'})); return type+id}; clickText('Continuar donde'); await s(2500); clickText('Continuar mi clase'); await s(12000); st()" > "$JS"
# muestreador con estado de pantalla (en segundo plano, ~150 muestras ≈ 2 min)
$A shell "i=0; while [ \$i -lt 150 ]; do
  t=\$(date +%H:%M:%S.%N | cut -c1-12)
  blk=\$(dumpsys media.audio_policy | sed -n '/^ Inputs (/,/Total Effects/p')
  h=\$(echo \"\$blk\" | grep -c 10366)
  op=\$(cmd appops get com.shift.habla.debug RECORD_AUDIO | grep -o 'running' | head -1)
  md=\$(dumpsys audio | grep -m1 'Actual mode' | tr -s ' ')
  wk=\$(dumpsys power | grep -m1 -o 'mWakefulness=[A-Za-z]*')
  top=\$(dumpsys activity activities 2>/dev/null | grep -m1 topResumedActivity | grep -c com.shift.habla.debug)
  echo \"\$t | \$wk | habla_top=\$top | habla_in=\$h | appops=\${op:-no} |\$md\"
  i=\$((i+1)); sleep 0.5
done" > "$TL" 2>&1 &
sleep 3
if [ "$SC" = "M6" ]; then "$N" "$D/cdp8.mjs" "pd(1,'pointerdown')" >> "$JS"; echo "Grabando (botón pulsado por CDP)."; fi
echo "================================================================="
echo ">>> DUEÑO: PULSA AHORA EL BOTÓN DE ENCENDIDO (bloquear pantalla). $(date +%T)"
echo "================================================================="
echo "BLOQUEAR $(date +%T)" >> "$JS"
sleep 60
echo "================================================================="
echo ">>> DUEÑO: DESBLOQUEA AHORA el teléfono (huella/patrón) y deja Habla delante. $(date +%T)"
echo "================================================================="
echo "DESBLOQUEAR $(date +%T)" >> "$JS"
sleep 25
"$N" "$D/cdp8.mjs" "st()" >> "$JS"
[ "$SC" = "M6" ] && "$N" "$D/cdp8.mjs" "pd(1,'pointerup'); await s(4000); st()" >> "$JS"
wait
$A shell am force-stop com.shift.habla.debug; $A forward --remove tcp:9333 2>/dev/null; rm -f "$L"
echo "Fin. Línea de tiempo: $TL  ·  JS: $JS"
