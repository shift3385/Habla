#!/bin/sh
# Revisión móvil 5.9 · R12: CPU del proceso de la app (debug) en la clase en reposo, 30 s por situación:
# A = tal cual · B = sin el brillo de la tarjeta (card-glow) · C = sin brillo ni bucle de la mascota (rAF congelado).
D="$(dirname "$0")"; N="/c/Program Files/nodejs/node.exe"; A="adb -s 60d0718c"
P=$($A shell pidof com.shift.habla.debug | tr -d '\r')
mide() { MSYS_NO_PATHCONV=1 $A shell "t() { set -- \$(cut -d' ' -f14,15 /proc/$P/stat); echo \$((\$1+\$2)); }; a=\$(t); sleep 30; b=\$(t); echo \$(( (b-a)*100/3000 ))"; }
echo "A tal cual: $(mide)% de un núcleo"
"$N" "$D/cdp8.mjs" "const st=document.createElement('style'); st.id='r12-noglow'; st.textContent='.card-glow,.card-glow::after{animation:none!important}.card-glow::after{opacity:0!important}'; document.head.appendChild(st); 'sin brillo'" >/dev/null
echo "B sin brillo de la tarjeta: $(mide)%"
"$N" "$D/cdp8.mjs" "window.__rafFreeze=true; const o=window.requestAnimationFrame; window.requestAnimationFrame=(cb)=>window.__rafFreeze?0:o(cb); 'rAF congelado'" >/dev/null
echo "C sin brillo ni mascota: $(mide)%"
"$N" "$D/cdp8.mjs" "document.getElementById('r12-noglow')?.remove(); 'brillo repuesto (la mascota sigue congelada hasta recargar)'" >/dev/null
