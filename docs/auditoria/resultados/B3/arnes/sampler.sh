#!/bin/sh
# B3 · Muestreo independiente de Android cada ~1 s.  Uso: sampler.sh <muestras> <archivo>
# habla_in = nº de líneas del bloque «Inputs» de audio_policy con el uid de Habla (10410) → capturas de micro de Habla.
ADB="$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe"
N=$1; OUT=$2
"$ADB" shell "i=0; while [ \$i -lt $N ]; do
  t=\$(date +%H:%M:%S.%N | cut -c1-12)
  blk=\$(dumpsys media.audio_policy | sed -n '/^ Inputs (/,/Total Effects/p')
  n=\$(echo \"\$blk\" | head -1 | tr -d ' ')
  h=\$(echo \"\$blk\" | grep -c 10410)
  fl=\$(echo \"\$blk\" | grep -o 'AUDIO_INPUT_FLAG_[A-Z_]*' | sort -u | tr '\n' ',')
  op=\$(cmd appops get com.shift.habla RECORD_AUDIO | grep -v 'Uid mode' | sed 's/rejectTime=[^;]*;//' | tr '\n' ' ' | cut -c1-110)
  md=\$(dumpsys audio | grep -E 'Actual mode' | tr -s ' ')
  top=\$(dumpsys activity activities 2>/dev/null | grep -m1 topResumedActivity | grep -c com.shift.habla)
  echo \"\$t | habla_top=\$top | \$n habla_in=\$h \$fl | appops: \$op |\$md\"
  i=\$((i+1)); sleep 0.5
done" > "$OUT" 2>&1
