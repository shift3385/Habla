#!/bin/sh
# «Oyente» automático (regresión 5.10): en vez de preguntar al dueño si oye algo, lee de Android qué pistas de audio
# están sonando de verdad, por qué salida (auriculares A2DP, llamada SCO, altavoz) y a qué volumen (dB de la pista:
# así se ve si la música baja o se pausa). Uso: sh arnes/oyente.sh <segundos>  → una línea por cambio.
# Lo que dice cada voz lo registra `arnes/voz-spy.js` (texto, idioma, velocidad y tono de cada frase).
ADB="$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe"
end=$(( $(date +%s) + $1 ))
last=''
while [ "$(date +%s)" -lt "$end" ]; do
  now=$(date +%H:%M:%S.%3N)
  line=$("$ADB" -s 60d0718c shell dumpsys media.audio_flinger 2>/dev/null | awk '
    BEGIN { n["10366"]="Habla-debug"; n["10410"]="Habla"; n["10061"]="Spotify"; n["10203"]="Voz-Google"; n["1000"]="sistema" }
    /^Output thread/ { dev="" }
    /^  Output devices:/ { dev=$0; sub(/.*AUDIO_DEVICE_OUT_/, "", dev); sub(/\).*/, "", dev) }
    # Fila de pista activa: [Tipo] Id yes pid/ uid Session Port S Flags Format Chn SRate ST Usg CT G L R ...
    $0 ~ / yes +[0-9]+\/ +[0-9]+ / {
      for (i = 1; i <= NF; i++) if ($i == "yes") { uid=$(i+2); usg=$(i+11); l=$(i+14); break }
      who = (uid in n) ? n[uid] : "uid" uid
      out = out who "@" dev "(uso " usg ", " l " dB) "
    }
    END { print (out == "" ? "silencio" : out) }')
  if [ "$line" != "$last" ]; then echo "$now $line"; last=$line; fi
done
