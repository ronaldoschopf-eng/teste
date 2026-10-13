"""Check every frame of the final MP4: is the sticker unchanged, unmoved, unscaled?

For each decoded frame it measures, against the reference (original sticker file
placed at 270 px wide, centred):
  * position/size: bounding box and centroid of the sticker's magenta ink
  * shape: IoU of the magenta-ink mask with the reference mask
  * artwork: normalised cross-correlation of luminance inside the sticker
  * colour: mean CIE76 Delta E of the sticker pixels (lighting included)
Writes checks/verify_report.json and a contact sheet with crops per scene.

usage: verify.py <video.mp4>
"""
import json
import os
import subprocess
import sys

import numpy as np
from PIL import Image

import composite as K
from animate import CUTS, ORDER

ROOT = os.path.dirname(os.path.abspath(__file__))
W, H = 1080, 1920


def to_lab(rgb8):
    c = K.srgb_to_lin(rgb8 / 255.0)
    M = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
    xyz = c @ M.T / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


def ink_mask(rgb):
    r, g, b = (rgb[..., i].astype(np.int16) for i in range(3))
    return (r - g > 70) & (b - g > 25)


def main():
    video = sys.argv[1]
    rgb, a, (ox, oy, ow, oh) = K.sticker_layer()
    ref = (K.lin_to_srgb(rgb) * 255 + 0.5).astype(np.uint8)
    core = a > 0.99
    ref_ink = ink_mask(ref) & core
    ys, xs = np.nonzero(ref_ink)
    ref_box = (xs.min(), ys.min(), xs.max(), ys.max())
    ref_cen = (xs.mean(), ys.mean())
    y0, y1, x0, x1 = oy, oy + oh, ox, ox + ow
    ref_l = ref[y0:y1, x0:x1].astype(np.float32) @ np.array([0.299, 0.587, 0.114])
    cm = core[y0:y1, x0:x1]
    ref_lab = to_lab(ref[y0:y1, x0:x1].astype(np.float64))

    proc = subprocess.Popen(["ffmpeg", "-loglevel", "error", "-i", video, "-f", "rawvideo",
                             "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    rows, crops = [], {}
    i = 0
    while True:
        buf = proc.stdout.read(W * H * 3)
        if len(buf) < W * H * 3:
            break
        fr = np.frombuffer(buf, np.uint8).reshape(H, W, 3)
        ink = ink_mask(fr) & core
        yy, xx = np.nonzero(ink)
        box = (int(xx.min()), int(yy.min()), int(xx.max()), int(yy.max())) if len(xx) else None
        cen = (float(xx.mean()), float(yy.mean())) if len(xx) else (np.nan, np.nan)
        iou = (ink & ref_ink).sum() / max((ink | ref_ink).sum(), 1)
        lum = fr[y0:y1, x0:x1].astype(np.float32) @ np.array([0.299, 0.587, 0.114])
        p, q = lum[cm] - lum[cm].mean(), ref_l[cm] - ref_l[cm].mean()
        ncc = float((p * q).sum() / np.sqrt((p * p).sum() * (q * q).sum()))
        de = float(np.linalg.norm(to_lab(fr[y0:y1, x0:x1].astype(np.float64))[cm] - ref_lab[cm], axis=-1).mean())
        k = max(j for j in range(len(ORDER)) if CUTS[j] <= i)
        rows.append(dict(frame=i + 1, scene=ORDER[k], box=box, cen=cen, iou=float(iou), ncc=ncc, dE=de))
        mid = (CUTS[k] + CUTS[k + 1]) // 2
        if i == mid:
            crops[ORDER[k]] = fr.copy()
        i += 1
    proc.wait()

    summary = {"frames": i, "ref_box": [int(v) for v in ref_box], "ref_centroid": ref_cen, "scenes": {}}
    for s in ORDER:
        r = [x for x in rows if x["scene"] == s and x["box"]]
        bd = max(max(abs(a - b) for a, b in zip(x["box"], ref_box)) for x in r)
        cd = max(max(abs(x["cen"][0] - ref_cen[0]), abs(x["cen"][1] - ref_cen[1])) for x in r)
        summary["scenes"][s] = dict(
            frames=len(r), max_bbox_dev_px=int(bd), max_centroid_dev_px=round(cd, 2),
            min_iou=round(min(x["iou"] for x in r), 4), min_ncc=round(min(x["ncc"] for x in r), 4),
            mean_dE=round(float(np.mean([x["dE"] for x in r])), 2), max_dE=round(max(x["dE"] for x in r), 2))
    os.makedirs(os.path.join(ROOT, "checks"), exist_ok=True)
    json.dump({"summary": summary, "frames": rows}, open(os.path.join(ROOT, "checks", "verify_report.json"), "w"),
              indent=1)
    print(json.dumps(summary, indent=1))

    # contact sheet: each scene's middle frame + 1:1 crop of the sticker, plus the reference
    tiles = []
    pad = 30
    for s in ORDER:
        fr = crops[s]
        small = Image.fromarray(fr).resize((360, 640), Image.LANCZOS)
        crop = Image.fromarray(fr[y0 - pad:y1 + pad, x0 - pad:x1 + pad])
        tiles.append((small, crop))
    refimg = np.zeros((H, W, 3), np.uint8) + 255
    refimg = (refimg * (1 - a[..., None]) + ref * a[..., None]).astype(np.uint8)
    rc = Image.fromarray(refimg[y0 - pad:y1 + pad, x0 - pad:x1 + pad])
    cw, ch = tiles[0][1].size
    sheet = Image.new("RGB", (360 * 5 + 8 * 4, 640 + 8 + ch), "white")
    for j, (small, crop) in enumerate(tiles):
        sheet.paste(small, (j * 368, 0))
        sheet.paste(crop, (j * 368 + (360 - cw) // 2, 648))
    sheet.save(os.path.join(ROOT, "checks", "verify_sheet.png"))
    rc.save(os.path.join(ROOT, "checks", "reference_crop.png"))


if __name__ == "__main__":
    main()
