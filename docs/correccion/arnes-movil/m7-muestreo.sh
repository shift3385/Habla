#!/bin/sh
# Revisión móvil 5.9 · M7 / MIC-307 (auriculares Bluetooth): modo de audio, ruta de comunicación, captura de Habla debug
# (uid 10366) y app delante, cada ~0,7 s durante ~4 min. Uso: m7-muestreo.sh <archivo>
A="adb -s 60d0718c"
MSYS_NO_PATHCONV=1 $A shell "i=0; while [ \$i -lt 330 ]; do
  t=\$(date +%H:%M:%S.%N | cut -c1-12)
  au=\$(dumpsys audio 2>/dev/null)
  md=\$(echo \"\$au\" | grep -m1 'Actual mode' | tr -s ' ' | sed 's/.*= //')
  cd=\$(echo \"\$au\" | grep -m1 -iE 'communication device|mCommunicationDevice|Communication route' | tr -s ' ' | cut -c1-80)
  sco=\$(echo \"\$au\" | grep -m1 -iE 'mScoAudioState|SCO state|BtScoOn' | tr -s ' ' | cut -c1-60)
  h=\$(dumpsys media.audio_policy | sed -n '/^ Inputs (/,/Total Effects/p' | grep -c 10366)
  top=\$(dumpsys activity activities 2>/dev/null | grep -m1 topResumedActivity | grep -c com.shift.habla.debug)
  echo \"\$t | top=\$top | habla_in=\$h | \$md | \$cd | \$sco\"
  i=\$((i+1)); sleep 0.3
done" > "$1" 2>&1
