#!/usr/bin/env bash
# Final full-resolution render of every still layer (Blender/Cycles, CPU).
cd "$(dirname "$0")"
mkdir -p logs
for S in pole glass macbook wall plate; do
  if [ "$S" = wall ]; then L="fg_lit fg_clean fg_lit_sky fg_clean_sky"; else L="fg_lit fg_clean bg"; fi
  for l in $L; do
    case $l in bg) spp=64;; *) spp=128;; esac
    if [ -f renders/$S/$l.exr ]; then echo "skip $S/$l"; continue; fi
    start=$(date +%s)
    .venv/bin/python blender/render.py $S $l $spp > logs/${S}_$l.log 2>&1
    echo "$S/$l rc=$? $(( $(date +%s) - start ))s"
  done
done
echo ALL_DONE
