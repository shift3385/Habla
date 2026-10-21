#!/bin/sh
# Captura fiel de la pantalla del POCO: sh arnes/shot.sh <nombre>  → evidencia/movil/<nombre>.png
ADB="$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe"
"$ADB" -s 60d0718c exec-out screencap -p > "evidencia/movil/$1.png"
