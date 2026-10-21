#!/bin/sh
# Igual que foco.sh pero solo imprime cuando cambia el estado: sh arnes/cambios.sh <segundos>
sh "$(dirname "$0")/foco.sh" "$1" 2>/dev/null | awk '{k=$0; sub(/^[^ ]+ /,"",k); if (k!=last) {print; last=k}}'
