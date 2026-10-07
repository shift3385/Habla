#!/bin/sh
# B8 · AUD-MIC-305 (clase reanudada 60 s en reposo) + AUD-MIC-304 (segundo puntero durante una grabación) + N2 (Inicio de Android con el dedo puesto).
# Uso: m305.sh <timeline> <js>
ADB="$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe"; N="/c/Program Files/nodejs/node.exe"; D="$(dirname "$0")"; A="$ADB -s 60d0718c"; E="$(dirname "$2")"
$A shell am force-stop com.shift.habla; sleep 1
$A shell am start -n com.shift.habla/.MainActivity >/dev/null; sleep 7
sh "$D/inject8.sh" >/dev/null
"$N" "$D/cdp8.mjs" "window.pd=(id,type)=>{const b=document.querySelector('button[aria-label=\"Mantener para hablar\"]'); if(!b) return 'sin boton'; const r=b.getBoundingClientRect(); b.dispatchEvent(new PointerEvent(type,{pointerId:id,isPrimary:id===1,bubbles:true,clientX:r.x+r.width/2,clientY:r.y+r.height/2,pointerType:'touch'})); return type+id}; clickText('Continuar donde'); await s(2500); btns().join()" > "$2"
sh "$D/sampler8.sh" 150 "$1" &
sleep 2; echo "ENTRA $(date +%T)" >> "$2"
"$N" "$D/cdp8.mjs" "clickText('Continuar mi clase')" >> "$2"
sleep 60; echo "60s $(date +%T)" >> "$2"; $A exec-out screencap -p > "$E/m305-clase-60s.png"
"$N" "$D/cdp8.mjs" "st()" >> "$2"
echo "X1 dos punteros $(date +%T)" >> "$2"
"$N" "$D/cdp8.mjs" "const a=pd(1,'pointerdown'); await s(1500); const b=pd(2,'pointerdown'); await s(2000); const c=pd(2,'pointerup'); await s(300); const d=pd(1,'pointerup'); await s(6000); [a,b,c,d].join()+' '+st()" >> "$2"
sleep 14; echo "X1+20s $(date +%T)" >> "$2"
"$N" "$D/cdp8.mjs" "st()" >> "$2"
echo "N2 dedo puesto + Inicio $(date +%T)" >> "$2"
"$N" "$D/cdp8.mjs" "pd(3,'pointerdown')" >> "$2"; sleep 3
$A shell am start -a android.intent.action.MAIN -c android.intent.category.HOME >/dev/null 2>&1
sleep 12; echo "N2 VUELTA $(date +%T)" >> "$2"
$A shell am start -n com.shift.habla/.MainActivity >/dev/null 2>&1; sleep 6
"$N" "$D/cdp8.mjs" "st()+' | '+btns().filter(x=>/Mantener|suelta|Bloq|piensa|grab/i.test(x)).join()+' | '+[...document.querySelectorAll('button[aria-label=\"Mantener para hablar\"]')].map(b=>b.innerText.replace(/\s+/g,' ')).join()" >> "$2"
"$N" "$D/cdp8.mjs" "pd(3,'pointerup'); await s(5000); st()" >> "$2"
wait
