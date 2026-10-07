#!/bin/sh
# Fase C: tras desbloquear, espera 20 s, lee estado JS, suelta (M6), para muestreo, cierra todo.
ADB="$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe"; N="/c/Program Files/nodejs/node.exe"; D="$(dirname "$0")"; A="$ADB -s 60d0718c"
SC=${1:-M5}; E="$D/../evidencia"; TL="$E/bloqueo-$SC-timeline.txt"; JS="$E/bloqueo-$SC-js.txt"; L="$D/../../.telefono.lock"
echo "DESBLOQUEADO (dueño) $(date +%T)" >> "$JS"; sleep 20
"$N" "$D/cdp8.mjs" "st()" >> "$JS"
[ "$SC" = "M6" ] && "$N" "$D/cdp8.mjs" "pd(1,'pointerup'); await s(4000); st()" >> "$JS"
sleep 3; MSYS_NO_PATHCONV=1 $A shell touch /data/local/tmp/b8stop; sleep 3; MSYS_NO_PATHCONV=1 $A shell rm -f /data/local/tmp/b8stop
$A shell am force-stop com.shift.habla; $A forward --remove tcp:9333 2>/dev/null; rm -f "$L"
echo "Fin $(date +%T). Muestras: $(wc -l < "$TL")"
