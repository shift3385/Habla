#!/bin/sh
# Orquestador · Repetición de la prueba de segundo plano (B7, NC-14) con Habla «sin restricciones». Uso: fondo-orq.sh <minutos>
ADB="$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe"; N="/c/Program Files/nodejs/node.exe"; A="$ADB -s 60d0718c"
D="$(dirname "$0")"; B8="$D/../../B8/arnes"; OUT="$D/../evidencia/fondo-sin-restricciones.txt"; L="$D/../../.telefono.lock"; M=${1:-10}
[ -e "$L" ] && { echo "Teléfono ocupado: $(cat "$L")"; exit 1; }; echo "Orquestador $(date +%H:%M) fondo" > "$L"
$A shell am force-stop com.shift.habla; sleep 1; $A shell am start -n com.shift.habla/.MainActivity >/dev/null; sleep 7
sh "$B8/inject8.sh" >/dev/null
"$N" "$B8/cdp8.mjs" "clickText('Continuar donde'); await s(2500); clickText('Continuar mi clase'); await s(12000); st()" > "$D/../evidencia/fondo-js-inicio.txt"
$A shell am start -a android.intent.action.MAIN -c android.intent.category.HOME >/dev/null; sleep 2
AP=$($A shell pidof com.shift.habla | tr -d '\r')
RP=$($A shell "dumpsys activity processes | grep 'uid=10410 ISOLATED' -B2 | grep -o 'ProcessRecord{[^ ]* [0-9]*' | grep -o '[0-9]*$' | head -1" | tr -d '\r')
{ echo "inicio $(date +%T) · app=$AP renderer=$RP · minutos=$M · Habla: ahorro de batería SIN RESTRICCIONES, notificaciones concedidas"
  echo "min app_ticks_acum render_ticks_acum app_%cpu_min render_%cpu_min top wakelocks habla_in appops modo_audio"; } > "$OUT"
MSYS_NO_PATHCONV=1 $A shell "A=$AP; R=$RP; M=$M"'
t() { set -- $(cut -d" " -f14,15 /proc/$1/stat 2>/dev/null); echo $(( ${1:-0} + ${2:-0} )); }
a0=$(t $A); r0=$(t $R); pa=$a0; pr=$r0; i=0
while [ $i -lt $M ]; do sleep 60; i=$((i+1)); a=$(t $A); r=$(t $R)
 top=$(dumpsys activity activities 2>/dev/null | grep -m1 topResumedActivity | grep -c com.shift.habla)
 wl=$(dumpsys power | grep -iE "10410|habla" | grep -ic wake)
 h=$(dumpsys media.audio_policy | sed -n "/^ Inputs (/,/Total Effects/p" | grep -c 10410)
 op=$(cmd appops get com.shift.habla RECORD_AUDIO | grep -o running | head -1)
 md=$(dumpsys audio | grep -m1 "Actual mode" | tr -s " ")
 echo "$i $((a-a0)) $((r-r0)) $(( (a-pa)*100/6000 )) $(( (r-pr)*100/6000 )) $top $wl $h ${op:-no} $md"; pa=$a; pr=$r; done' >> "$OUT" 2>&1
echo "fin $(date +%T)" >> "$OUT"
$A shell am force-stop com.shift.habla; $A forward --remove tcp:9333 2>/dev/null; rm -f "$L"
