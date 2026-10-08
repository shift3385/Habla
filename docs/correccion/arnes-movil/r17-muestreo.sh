#!/bin/sh
# Revisión móvil 5.9 · R17/R21 en el RELEASE (com.shift.habla, uid 10410): muestreo de ~4 min mientras el dueño usa el micro con el dedo.
# Uso: r7-muestreo.sh <archivo>
A="adb -s 60d0718c"
MSYS_NO_PATHCONV=1 $A shell "i=0; while [ \$i -lt 300 ]; do
  t=\$(date +%H:%M:%S.%N | cut -c1-12)
  h=\$(dumpsys media.audio_policy | sed -n '/^ Inputs (/,/Total Effects/p' | grep -c 10410)
  op=\$(cmd appops get com.shift.habla RECORD_AUDIO | grep -o 'running' | head -1)
  md=\$(dumpsys audio | grep -m1 'Actual mode' | tr -s ' ')
  wk=\$(dumpsys power | grep -m1 -o 'mWakefulness=[A-Za-z]*')
  top=\$(dumpsys activity activities 2>/dev/null | grep -m1 topResumedActivity | grep -c com.shift.habla)
  echo \"\$t | \$wk | habla_top=\$top | habla_in=\$h | appops=\${op:-no} |\$md\"
  i=\$((i+1)); sleep 0.4
done" > "$1" 2>&1
