"""Composite the ORIGINAL sticker pixels onto rendered scene frames.

The sticker is never rendered or regenerated: its pixels come straight from
assets/sticker_original.png, resized once to the reference size (270 px wide,
exact original aspect ratio) and placed at the same pixel position in every
frame. The renderer only supplies the lighting that falls on it:

    sticker_out = sticker_rgb_linear * diffuse_light + vinyl_specular

so the sticker shows the scene's light, shadows and surface micro-texture
without its artwork, colours or geometry being altered.

usage: composite.py <exr_dir> <out_dir> [--exposure-ref FILE] [--spec K]
"""
import argparse
import glob
import json
import os

import numpy as np
import OpenEXR
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
W, H = 1080, 1920
STICKER_W = 270                      # 25% of frame width
CX, CY = W / 2, H / 2                # sticker centre = frame centre


def srgb_to_lin(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def lin_to_srgb(c):
    c = np.clip(c, 0, None)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(c, 1 / 2.4) - 0.055)


def sticker_layer(scale=1.0):
    """Original sticker -> (rgb_lin, alpha) on a full-frame canvas.
    Resampled once with a high-quality Lanczos filter on premultiplied colour;
    aspect ratio is exactly preserved (no rounding of the height)."""
    src = Image.open(os.path.join(ROOT, "assets", "sticker_original.png")).convert("RGBA")
    sw, sh = src.size
    s = STICKER_W * scale / sw                   # px per source px
    a = np.asarray(src, dtype=np.float64) / 255.0
    rgb_lin = srgb_to_lin(a[..., :3]) * a[..., 3:4]           # premultiplied, linear
    PAD = 16                                     # transparent margin so the resize box stays inside
    rgb_lin = np.pad(rgb_lin, ((PAD, PAD), (PAD, PAD), (0, 0)))
    alp = np.pad(a[..., 3], PAD)
    planes = [Image.fromarray(rgb_lin[..., i].astype(np.float32), "F") for i in range(3)]
    planes.append(Image.fromarray(alp.astype(np.float32), "F"))
    # affine map from output pixel -> source pixel, centred on the frame centre
    x0 = CX - sw * s / 2
    y0 = CY - sh * s / 2
    inv = (1 / s, 0, -x0 / s, 0, 1 / s, -y0 / s)
    # Lanczos is not available for affine transforms; downscale with resize() via
    # an intermediate exact-ratio crop instead.
    out = []
    ow = int(np.ceil(sw * s)) + 4
    oh = int(np.ceil(sh * s)) + 4
    ox, oy = int(np.floor(x0)) - 2, int(np.floor(y0)) - 2
    # source box that maps exactly onto the (ow, oh) output patch
    bx0 = (ox - x0) / s + PAD
    by0 = (oy - y0) / s + PAD
    box = (bx0, by0, bx0 + ow / s, by0 + oh / s)
    for p in planes:
        patch = p.resize((ow, oh), Image.LANCZOS, box=box)
        canvas = np.zeros((H, W), np.float32)
        canvas[oy:oy + oh, ox:ox + ow] = np.asarray(patch)
        out.append(canvas)
    alpha = np.clip(out[3], 0, 1)
    pre = np.clip(np.stack(out[:3], -1), 0, None)
    rgb = np.where(alpha[..., None] > 1e-4, pre / np.maximum(alpha[..., None], 1e-4), 0)
    rgb = np.clip(rgb, 0, 1)
    return rgb, alpha, (ox, oy, ow, oh)


def read_exr(path):
    ch = {}
    with OpenEXR.File(path, separate_channels=True) as f:
        for part in f.parts:
            for k, v in part.channels.items():
                ch[k] = v.pixels.astype(np.float32)
    def get(layer):
        return np.stack([ch[f"{layer}.{c}"] for c in "RGB"], -1)
    return get("Image"), get("Light"), get("Spec")


def soft_clip(x, knee=0.85):
    """Roll highlights above `knee` smoothly towards 1.0 (only bright scene areas)."""
    over = np.maximum(x - knee, 0)
    span = 1.0 - knee
    return np.where(x > knee, knee + span * (1 - np.exp(-over / span)), x)


def blur_sep(img, r):
    """Small separable box-blur x3 (~gaussian) for the specular pass."""
    if r <= 0:
        return img
    k = 2 * r + 1
    out = img
    for _ in range(3):
        for axis in (0, 1):
            pad = [(0, 0)] * out.ndim
            pad[axis] = (r, r)
            p = np.pad(out, pad, mode="edge")
            c = np.cumsum(p, axis=axis, dtype=np.float64)
            c = np.concatenate([np.zeros_like(np.take(c, [0], axis=axis)), c], axis=axis)
            out = ((np.take(c, range(k, c.shape[axis]), axis=axis) -
                    np.take(c, range(0, c.shape[axis] - k), axis=axis)) / k).astype(np.float32)
    return out


def contact_shadow(alpha, strength):
    """Very tight occlusion just outside the sticker edge (vinyl thickness)."""
    a = alpha.astype(np.float32)
    grown = blur_sep(a, 2)
    ring = np.clip(grown - a, 0, 1)
    return 1 - strength * ring


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("exr_dir")
    ap.add_argument("out_dir")
    ap.add_argument("--spec", type=float, default=1.0, help="vinyl specular weight")
    ap.add_argument("--target", type=float, default=0.92,
                    help="mean diffuse light on the sticker after exposure (1.0 = original colours)")
    ap.add_argument("--exposure", type=float, default=None, help="fixed exposure multiplier")
    ap.add_argument("--shadow", type=float, default=0.18)
    ap.add_argument("--knee", type=float, default=0.85)
    ap.add_argument("--first", type=int, default=None)
    ap.add_argument("--last", type=int, default=None)
    args = ap.parse_args()

    files = sorted(glob.glob(os.path.join(args.exr_dir, "f_*.exr")))
    if args.first is not None:
        files = files[args.first - 1: args.last]
    os.makedirs(args.out_dir, exist_ok=True)
    st_rgb, st_a, bbox = sticker_layer()
    a3 = st_a[..., None]
    cs = contact_shadow(st_a, args.shadow)[..., None]
    core = st_a > 0.99

    exposure = args.exposure
    if exposure is None:
        _, light0, _ = read_exr(files[0])
        lum = (light0[core] @ np.array([0.2126, 0.7152, 0.0722], np.float32))
        exposure = args.target / max(float(np.median(lum)), 1e-6)
    meta = {"exposure": exposure, "bbox": bbox, "frames": len(files)}
    print(json.dumps(meta))

    for i, fp in enumerate(files):
        img, light, spec = read_exr(fp)
        if img.shape[:2] != (H, W):
            raise SystemExit(f"{fp}: unexpected size {img.shape}")
        spec = blur_sep(spec, 1)
        sticker = st_rgb * light + args.spec * spec
        lin = img * cs * (1 - a3) + sticker * a3
        lin *= exposure
        # the tone shoulder only touches values above the knee; the sticker sits below it
        out = lin_to_srgb(soft_clip(lin, args.knee))
        Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)).save(
            os.path.join(args.out_dir, f"{i + 1:04d}.png"), compress_level=1)
    with open(os.path.join(args.out_dir, "meta.json"), "w") as f:
        json.dump(meta, f)


if __name__ == "__main__":
    main()
