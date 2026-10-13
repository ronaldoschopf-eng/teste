"""Render the still layers of one scene.

usage: python blender/render.py <scene> <layer> <samples> [percent]
  layer: fg_lit | fg_clean | bg | fg_lit_sky | fg_clean_sky
Writes renders/<scene>/<layer>.exr and renders/<scene>/config.json.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C  # noqa: E402
import scenes  # noqa: E402

BG_OVERSCAN = 1.25      # bg plate is wider than the frame so the dolly never runs out of pixels

name, layer, samples = sys.argv[1], sys.argv[2], int(sys.argv[3])
pct = int(sys.argv[4]) if len(sys.argv) > 4 else 100
sc, cfg = scenes.BUILDERS[name]()
cam = cfg["cam"]

kind = layer.replace("_sky", "")
extra = dict(cfg.get("bg_extra", {})) if kind == "bg" else {}
if layer.endswith("_sky"):
    extra["disable_lights"] = cfg["sky_only_disable"]
C.configure_layer(sc, kind, extra)
if kind != "bg":
    for ob in C.coll("BG").all_objects:
        ob.visible_transmission = False    # glass must not show the interior in the fg layer

d_plate = min(cfg["d_start"], cfg["d_end"])
C.place_camera(cam, d_plate if kind == "bg" else (cfg["d_start"] + cfg["d_end"]) / 2)
if kind == "bg":
    os_ = cfg.get("overscan", BG_OVERSCAN)
    sc.render.resolution_x = int(round(C.RES_X * os_ / 2)) * 2
    sc.render.resolution_y = int(round(C.RES_Y * os_ / 2)) * 2
    cam.data.sensor_width = C.SENSOR_W * sc.render.resolution_x / C.RES_X
sc.render.resolution_percentage = pct

root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
out_dir = os.path.join(root, "renders", name if pct == 100 else f"{name}_p{pct}")
os.makedirs(out_dir, exist_ok=True)
meta = {k: v for k, v in cfg.items() if k != "cam"}
meta.update(d_plate=d_plate, bg_res=[sc.render.resolution_x, sc.render.resolution_y] if kind == "bg" else None)
cfg_path = os.path.join(out_dir, "config.json")
old = json.load(open(cfg_path)) if os.path.exists(cfg_path) else {}
if kind == "bg":
    old["bg_res"] = meta["bg_res"]
meta["bg_res"] = old.get("bg_res")
json.dump(meta, open(cfg_path, "w"), indent=1)
C.render_layer(sc, os.path.join(out_dir, layer), samples)
