#!/bin/sh
# Espera a que la pantalla pase a Asleep/Dozing (máx. 5 min), luego cuenta 60 s.
ADB="$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe"; A="$ADB -s 60d0718c"; i=0
while [ $i -lt 300 ]; do w=$($A shell "dumpsys power | grep -m1 -o 'mWakefulness=[A-Za-z]*'" | tr -d '\r'); case "$w" in *Asleep*|*Dozing*) echo "Bloqueo detectado $(date +%T) ($w)"; sleep 60; echo "60 s cumplidos $(date +%T): DESBLOQUEAR"; exit 0;; esac; i=$((i+1)); sleep 1; done
echo "No se detectó bloqueo en 5 min"; exit 1
