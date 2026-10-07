#!/bin/sh
# B8 · Actualiza una fila de progreso.md.  Uso: prog.sh <nº fila> "<estado>" "<veredicto>" "<sev>" "<evidencia>"
F="$(dirname "$0")/../progreso.md"
node_line=$(grep -n "^| $1 | " "$F" | cut -d: -f1)
[ -z "$node_line" ] && { echo "fila $1 no encontrada"; exit 1; }
id=$(sed -n "${node_line}p" "$F" | awk -F'|' '{gsub(/^ +| +$/,"",$3); gsub(/^ +| +$/,"",$4); print $3" | "$4}')
new="| $1 | $id | $2 | $3 | $4 | $5 |"
awk -v n="$node_line" -v l="$new" 'NR==n{print l; next}{print}' "$F" > "$F.tmp" && mv "$F.tmp" "$F"
sed -n "${node_line}p" "$F"
