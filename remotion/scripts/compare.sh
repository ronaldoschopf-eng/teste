#!/usr/bin/env bash
# Uso: scripts/compare.sh <video-referencia.mp4> <saida.png> [frames...]
# Renderiza os frames pedidos e monta: linha de cima = referência, linha de baixo = nosso vídeo.
set -euo pipefail
REF=$1; OUT=$2; shift 2
FRAMES=${@:-30 150 400}
TMP=$(mktemp -d)
top=(); bot=()
for f in $FRAMES; do
  npx remotion still Stories "$TMP/our-$f.png" --frame="$f" --log=error >/dev/null
  ffmpeg -v error -y -i "$REF" -vf "select=eq(n\,$f),scale=-2:960" -frames:v 1 "$TMP/ref-$f.png"
  ffmpeg -v error -y -i "$TMP/our-$f.png" -vf "scale=-2:960" "$TMP/our-s-$f.png"
  ffmpeg -v error -y -i "$TMP/ref-$f.png" -i "$TMP/our-s-$f.png" -filter_complex "[0][1]hstack" "$TMP/pair-$f.png"
  top+=("-i" "$TMP/pair-$f.png")
done
n=$(echo $FRAMES | wc -w)
ffmpeg -v error -y "${top[@]}" -filter_complex "hstack=inputs=$n" "$OUT"
rm -rf "$TMP"
