#!/bin/sh
# B7 · Prueba de segundo plano (NC-14). En el teléfono: sh -s <APP_PID> <RENDER_PID> <MINUTOS>
A=$1; RP=$2; M=$3
t() { set -- $(cut -d' ' -f14,15 /proc/$1/stat 2>/dev/null); echo $(( ${1:-0} + ${2:-0} )); }
echo "inicio $(date +%T)"; a0=$(t $A); r0=$(t $RP); pa=$a0; pr=$r0; i=0
echo "min app_ticks_acum render_ticks_acum app_%cpu_ultimo_min render_%cpu_ultimo_min importancia wakelocks_habla modo_audio"
while [ $i -lt $M ]; do sleep 60; i=$((i+1)); a=$(t $A); r=$(t $RP)
  imp=$(dumpsys activity processes 2>/dev/null | grep -m1 "$A:com.shift.habla" | awk '{print $3}')
  wl=$(dumpsys power | grep -i "habla\|u0a410\|10410" | grep -ic wake)
  mo=$(dumpsys audio | grep -m1 "mode (internal)" | tr -s ' ')
  echo "$i $((a-a0)) $((r-r0)) $(( (a-pa)*100/6000 )) $(( (r-pr)*100/6000 )) $imp $wl $mo"; pa=$a; pr=$r; done
echo "fin $(date +%T)"
