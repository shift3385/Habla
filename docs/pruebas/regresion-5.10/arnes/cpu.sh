#!/bin/sh
# CPU de Habla debug y de su renderer: sh arnes/cpu.sh <etiqueta>  (2 ventanas de 30 s)
ADB="$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe"
for i in 1 2; do
  echo "== $1 ventana $i"
  "$ADB" -s 60d0718c shell "top -b -n 2 -d 30 -o PID,%CPU,ARGS | sed -n '/PID/,\$p' | tail -n +2 | grep -E 'com.shift.habla.debug|sandboxed_process|webview' | sort -k2 -nr | head -4"
done
