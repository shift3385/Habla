#!/bin/sh
# B8 · CPU (utime+stime en ticks de 10 ms → % de un núcleo) de dos PIDs durante N s. Uso: sh -s <pidApp> <pidRender> <N> < cpu8.sh
t() { set -- $(cut -d' ' -f14,15 /proc/$1/stat 2>/dev/null); echo $(( ${1:-0} + ${2:-0} )); }
a0=$(t $1); r0=$(t $2); sleep $3; a=$(t $1); r=$(t $2)
echo "app=$(( (a-a0) / $3 ))% render=$(( (r-r0) / $3 ))%"
