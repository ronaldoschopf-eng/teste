#!/usr/bin/env bash
# Low-res preview of scenes: ./preview.sh <pct> <samples> scene...
set -e
cd "$(dirname "$0")"
pct=$1; spp=$2; shift 2
for S in "$@"; do
  if [ "$S" = wall ]; then L="fg_lit fg_clean fg_lit_sky fg_clean_sky"; else L="fg_lit fg_clean bg"; fi
  for l in $L; do .venv/bin/python blender/render.py $S $l $spp $pct 2>&1 | grep -E "Error|Traceback|line [0-9]+," | grep -vE "EGL|CUEW" || true; done
  rm -rf frames/${S}_p$pct
  .venv/bin/python animate.py $S --pct $pct --every 40 --out frames/${S}_p$pct > /dev/null
done
