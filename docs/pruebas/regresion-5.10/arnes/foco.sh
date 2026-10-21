#!/bin/sh
# Muestrea el foco de audio y el estado de Spotify: sh arnes/foco.sh <segundos> > archivo
ADB="$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe"
end=$(( $(date +%s) + $1 ))
while [ $(date +%s) -lt $end ]; do
  "$ADB" -s 60d0718c shell 'echo "$(date +%H:%M:%S.%3N) foco=[$(dumpsys audio | sed -n "/Audio Focus stack/,/^$/p" | grep -o "pack: [^ ]* .* gain: [A-Z_]*" | sed "s/ -- client.*gain:/:/" | tr "\n" ";")] spotify=$(dumpsys media_session | grep -A15 "package=com.spotify.music" | grep -o "state=[A-Z]*([0-9])" | head -1) modo=$(dumpsys audio 2>/dev/null | grep -m1 "mode (internal)" | sed "s/.*= //") com=$(dumpsys audio | grep -m1 -i "communication device" | head -c 90)"' 2>/dev/null
done
