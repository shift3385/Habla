#!/bin/sh
# B7 · CPU de Habla (proceso de la app + renderer del WebView) leyendo /proc/<pid>/stat (utime+stime, ticks de 10 ms).
# Uso (en el PC): adb -s 60d0718c shell sh -s <APP_PID> <RENDER_PID> <SEGUNDOS> <PASO> < cpu7.sh
A=$1; RP=$2; N=$3; S=${4:-10}
t() { set -- $(cut -d' ' -f14,15 /proc/$1/stat 2>/dev/null); echo $(( ${1:-0} + ${2:-0} )); }
a0=$(t $A); r0=$(t $RP); i=0
echo "seg app_ticks render_ticks app_%cpu render_%cpu"
while [ $i -lt $N ]; do sleep $S; i=$((i+S)); a=$(t $A); r=$(t $RP)
  echo "$i $((a-a0)) $((r-r0)) $(( (a-a0) / i )) $(( (r-r0) / i ))"; done
