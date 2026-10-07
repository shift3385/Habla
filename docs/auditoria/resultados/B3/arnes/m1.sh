#!/bin/sh
# M1 + M4: clase reanudada 3 min sin hablar, luego Inicio de Android 15 s, volver 15 s.
ADB="$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe"; N="/c/Program Files/nodejs/node.exe"; D="$(dirname "$0")"; E="$D/../evidencia"
"$ADB" shell am start -n com.shift.habla/.MainActivity >/dev/null; sleep 7
sh "$D/inject.sh" >/dev/null
"$N" "$D/cdp.mjs" "clickText('Continuar donde'); await s(2500); clickText('Ir al inicio'); await s(1500); clickText('Prácticas'); await s(600); clickText('Entrevista de trabajo'); await s(800); btns().filter(b=>/Reanudar/.test(b)).join()"
sh "$D/sampler.sh" 260 "$1" &
sleep 2
echo "ENTRA $(date +%T)"; "$N" "$D/cdp.mjs" "clickText('Reanudar la anterior')"
sleep 90; "$ADB" exec-out screencap -p > "$E/tel-M1-clase-90s.png"; echo "CAPTURA $(date +%T)"
sleep 90; echo "3MIN $(date +%T)"; "$N" "$D/cdp.mjs" "st()"
"$ADB" shell am start -a android.intent.action.MAIN -c android.intent.category.HOME >/dev/null 2>&1; echo "HOME $(date +%T)"
sleep 15; "$ADB" shell am start -n com.shift.habla/.MainActivity >/dev/null 2>&1; echo "VUELTA $(date +%T)"
sleep 15; "$N" "$D/cdp.mjs" "st()"; "$ADB" exec-out screencap -p > "$E/tel-M4-vuelta.png"
wait
