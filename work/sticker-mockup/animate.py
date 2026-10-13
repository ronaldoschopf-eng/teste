"""Build the animated frames of one scene from its still render layers.

The ORIGINAL sticker file is composited here; it is never rendered, redrawn or
generated. Per frame:

  1. Camera move (dolly zoom): the background plate is re-projected with its depth
     pass for the camera distance of that frame. The sticker plane has constant
     magnification by construction, so the sticker and the surface it sits on do
     not move or scale at all.
  2. Foreground surface (fg_clean) is laid over the background.
  3. Sticker: original pixels (resized once to 270 px wide, exact aspect ratio,
     centred on the frame) multiplied by the rendered light that falls on it
     (fg_lit Light pass) plus the vinyl's specular sheen (fg_lit Spec pass).

usage: animate.py <scene> [--pct 100] [--frames a:b] [--out DIR]
"""
import argparse
import json
import math
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

import composite as K

ROOT = os.path.dirname(os.path.abspath(__file__))
# Timeline at 30 fps. Scene k is on screen from CUTS[k] to CUTS[k+1]; scenes are
# rendered with XF/2 extra frames on each side for the cross-dissolves.
ORDER = ["pole", "glass", "macbook", "wall", "plate"]
CUTS = [0, 90, 180, 270, 360, 540]          # 0-3-6-9-12-18 s
XF = 8                                      # dissolve length in frames


def scene_frames(name):
    k = ORDER.index(name)
    head = XF // 2 if k > 0 else 0
    tail = XF // 2 if k < len(ORDER) - 1 else 0
    return CUTS[k + 1] - CUTS[k] + head + tail
LUMA = np.array([0.2126, 0.7152, 0.0722], np.float32)


# ------------------------------------------------------------------ io
def load(path):
    import OpenEXR
    ch = {}
    with OpenEXR.File(path, separate_channels=True) as f:
        for part in f.parts:
            for k, v in part.channels.items():
                ch[k] = v.pixels.astype(np.float32)

    def get(layer, n=3):
        return np.stack([ch[f"{layer}.{c}"] for c in "RGBA"[:n]], -1)
    return {
        "img": get("Image", 4), "light": get("Light"), "spec": get("Spec"),
        "diffcol": get("DiffCol"), "depth": ch["Depth.R"],
    }


# ------------------------------------------------------------------ sampling
def bilinear(img, x, y):
    h, w = img.shape[:2]
    x = np.clip(x, 0, w - 1.001)
    y = np.clip(y, 0, h - 1.001)
    x0 = np.floor(x).astype(np.int32)
    y0 = np.floor(y).astype(np.int32)
    fx = (x - x0)[..., None] if img.ndim == 3 else x - x0
    fy = (y - y0)[..., None] if img.ndim == 3 else y - y0
    a = img[y0, x0]
    b = img[y0, x0 + 1]
    c = img[y0 + 1, x0]
    d = img[y0 + 1, x0 + 1]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


def smooth_inv_depth(depth, r):
    """Blur 1/depth (well-behaved for the sky's huge depth values)."""
    inv = 1.0 / np.maximum(depth, 1e-3)
    return K.blur_sep(inv.astype(np.float32), r)


class DollyWarp:
    """Re-project the bg plate (rendered at camera distance d0) for distance d.

    A point at depth D0 from the plate camera moves to depth D0 + (d - d0); with the
    lens scaled by d/d0 its distance to the principal point scales by
        ratio = (d / d0) * D0 / (D0 + d - d0)
    which is exactly 1 on the sticker plane (D0 = d0) and d/d0 at infinity.
    """

    def __init__(self, plate, inv_depth, d0, out_w, out_h):
        self.plate, self.inv, self.d0 = plate, inv_depth, d0
        ph, pw = plate.shape[:2]
        self.pcx, self.pcy = pw / 2.0, ph / 2.0
        yy, xx = np.mgrid[0:out_h, 0:out_w].astype(np.float32)
        self.ox = xx + 0.5 - out_w / 2.0
        self.oy = yy + 0.5 - out_h / 2.0

    def ratio(self, inv_d0, d):
        D0 = 1.0 / np.maximum(inv_d0, 1e-6)
        return (d / self.d0) * D0 / np.maximum(D0 + d - self.d0, 1e-3)

    def __call__(self, d, img=None, fixed_depth=None):
        img = self.plate if img is None else img
        icx, icy = img.shape[1] / 2.0, img.shape[0] / 2.0      # warp about that image's own centre
        if fixed_depth is not None:
            r = self.ratio(np.float32(1.0 / fixed_depth), d)
            sx, sy = self.ox / r, self.oy / r
        else:
            r = np.full(self.ox.shape, d / self.d0, np.float32)
            for _ in range(4):                       # fixed-point on the source position
                sx, sy = self.ox / r, self.oy / r
                inv = bilinear(self.inv, sx + self.pcx - 0.5, sy + self.pcy - 0.5)
                r = self.ratio(inv, d)
            sx, sy = self.ox / r, self.oy / r
        return bilinear(img, sx + icx - 0.5, sy + icy - 0.5)


# ------------------------------------------------------------------ leaf shadows
def leaf_canopy(seed, w, h):
    """Procedural foliage silhouettes (branch + leaves) for dappled sunlight.
    Returns a list of leaf ellipses in canopy space and branch polylines."""
    rng = np.random.default_rng(seed)
    leaves, branches = [], []
    for _ in range(9):
        x, y = rng.uniform(-0.2, 1.2) * w, rng.uniform(-0.1, 1.1) * h
        ang = rng.uniform(0, 2 * math.pi)
        pts = []
        for _ in range(14):
            pts.append((x, y))
            ang += rng.normal(0, 0.35)
            step = rng.uniform(0.025, 0.045) * w
            x += math.cos(ang) * step
            y += math.sin(ang) * step
            for _ in range(rng.integers(2, 5)):
                la = ang + rng.choice([-1, 1]) * rng.uniform(0.5, 1.3)
                L = rng.uniform(0.025, 0.05) * w
                leaves.append((x + math.cos(la) * L * 0.7, y + math.sin(la) * L * 0.7, L, L * 0.42, la,
                               rng.uniform(0, 2 * math.pi)))
        branches.append(pts)
    return leaves, branches


def leaf_shadow(canopy, w, h, t, blur_px, stretch, sway_px, ss=0.5):
    """Sun visibility map in [0,1] (1 = lit) for time t (seconds)."""
    leaves, branches = canopy
    W2, H2 = int(w * ss), int(h * ss)
    im = Image.new("L", (W2, H2), 255)
    dr = ImageDraw.Draw(im)
    gx = sway_px * (0.6 * math.sin(2 * math.pi * 0.23 * t) + 0.4 * math.sin(2 * math.pi * 0.41 * t + 1.3))
    gy = sway_px * 0.35 * math.sin(2 * math.pi * 0.17 * t + 0.7)
    for pts in branches:
        p = [((x + gx * 0.6) * ss, (y + gy * 0.6) * ss) for x, y in pts]
        dr.line(p, fill=0, width=max(1, int(0.006 * w * ss)))
    for (x, y, L, Wd, a, ph) in leaves:
        flutter = 0.25 * sway_px * math.sin(2 * math.pi * 0.9 * t + ph)
        cx = (x + gx + flutter) * ss
        cy = (y + gy + 0.5 * flutter) * ss
        aa = a + 0.12 * math.sin(2 * math.pi * 0.7 * t + ph)
        poly = []
        for k in range(16):
            th = 2 * math.pi * k / 16
            px, py = L * 0.5 * math.cos(th) * ss, Wd * 0.5 * math.sin(th) * ss
            poly.append((cx + px * math.cos(aa) - py * math.sin(aa), cy + px * math.sin(aa) + py * math.cos(aa)))
        dr.polygon(poly, fill=0)
    # sun at a grazing angle elongates the shadows horizontally
    im = im.resize((int(W2 * stretch), H2), Image.BILINEAR)
    left = (im.width - W2) // 2
    im = im.crop((left, 0, left + W2, H2))
    im = im.filter(ImageFilter.GaussianBlur(blur_px * ss))
    im = im.resize((w, h), Image.BICUBIC)
    v = np.asarray(im, np.float32) / 255.0
    return v


def sun_vis(near, far, w, h, t, sc):
    """Two foliage layers: a nearer, crisper one and a farther, softer one."""
    a = leaf_shadow(near, w, h, t, 13 * sc, 1.45, 12 * sc)
    b = leaf_shadow(far, w, h, t + 3.7, 40 * sc, 1.45, 18 * sc)
    return a * (0.35 + 0.65 * b)


# ------------------------------------------------------------------ main
def ease(t, kind):
    if kind == "inout":
        return t * t * (3 - 2 * t)
    if kind == "out":
        return 1 - (1 - t) ** 2
    return t


def vignette(w, h, strength):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    nx = (xx - w / 2) / (w / 2)
    ny = (yy - h / 2) / (h / 2)
    r2 = nx ** 2 * 0.9 + ny ** 2 * 0.55
    return (1 - strength * np.clip(r2 - 0.15, 0, None) ** 1.3)[..., None]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("scene")
    ap.add_argument("--pct", type=int, default=100)
    ap.add_argument("--frames", default=None)
    ap.add_argument("--out", default=None)
    ap.add_argument("--every", type=int, default=1)
    args = ap.parse_args()

    rdir = os.path.join(ROOT, "renders", args.scene if args.pct == 100 else f"{args.scene}_p{args.pct}")
    cfg = json.load(open(os.path.join(rdir, "config.json")))
    out_dir = args.out or os.path.join(ROOT, "frames", args.scene)
    os.makedirs(out_dir, exist_ok=True)

    lit = load(os.path.join(rdir, "fg_lit.exr"))
    clean = load(os.path.join(rdir, "fg_clean.exr"))
    h, w = clean["img"].shape[:2]
    sc = w / K.W

    # sticker layer at this resolution (full res: 270 px wide, centred)
    st_rgb, st_a, _ = K.sticker_layer(scale=sc) if sc == 1 else _scaled_sticker(sc, w, h)
    a3 = st_a[..., None]
    cshadow = K.contact_shadow(st_a, 0.22)[..., None] if sc == 1 else 1.0

    bg = warp = None
    if os.path.exists(os.path.join(rdir, "bg.exr")):
        bg = load(os.path.join(rdir, "bg.exr"))
        inv = smooth_inv_depth(bg["depth"], max(2, int(12 * sc)))
        warp = DollyWarp(bg["img"][..., :3], inv, cfg["d_plate"], w, h)

    wall_sky = None
    if "leaves" in cfg:
        lit_sky = load(os.path.join(rdir, "fg_lit_sky.exr"))
        clean_sky = load(os.path.join(rdir, "fg_clean_sky.exr"))
        wall_sky = (lit_sky, clean_sky)
        canopy = leaf_canopy(cfg["leaves"]["seed"], w, h)
        canopy_far = leaf_canopy(cfg["leaves"]["seed"] + 101, w, h)

    # exposure from the sticker light at frame 0 (keeps the sticker near its original colours)
    core = st_a > 0.99
    light0 = lit["light"]
    if wall_sky is not None:
        v0 = sun_vis(canopy, canopy_far, w, h, 0.0, sc)
        light0 = wall_sky[0]["light"] + (lit["light"] - wall_sky[0]["light"]) * v0[..., None]
    # Exposure + white balance, like a photographer metering and white-balancing on the
    # sticker: the mean light on the sticker maps to neutral grey `target`, so the
    # sticker keeps its original colours while the rest of the scene keeps its
    # relative light/colour.
    mean_rgb = light0[core].mean(0)
    exposure = (cfg["target"] / mean_rgb).astype(np.float32)
    vig = vignette(w, h, cfg.get("vignette", 0.2))
    glass = cfg.get("glass")

    n = scene_frames(args.scene)
    rng = range(n)
    if args.frames:
        a, b = map(int, args.frames.split(":"))
        rng = range(a, b)
    meta = dict(exposure=exposure.tolist(), frames=n)
    for i in rng:
        if i % args.every:
            continue
        t = ease(i / max(n - 1, 1), cfg.get("ease", "inout"))
        d = cfg["d_start"] + (cfg["d_end"] - cfg["d_start"]) * t
        fg = clean["img"]
        fa = fg[..., 3:4]
        if wall_sky is not None:
            v = sun_vis(canopy, canopy_far, w, h, i / 30.0, sc)[..., None]
            ls, cs_ = wall_sky
            base = cs_["img"][..., :3] + (fg[..., :3] - cs_["img"][..., :3]) * v
            light = ls["light"] + (lit["light"] - ls["light"]) * v
            spec = ls["spec"] + (lit["spec"] - ls["spec"]) * v
        else:
            if glass:
                behind = warp(d) * np.array(glass["tint"], np.float32)
                # reflections live in the glass pixels of fg (alpha < 1); they are a virtual
                # image far behind the glass, so they follow the far-field dolly ratio
                opaque = (fa >= 0.97).astype(np.float32)
                refl_w = _refl_warp(warp, fg, fa, d, glass["refl_depth"], w, h)
                base = opaque * fg[..., :3] + (1 - opaque) * (refl_w + (1 - fa) * behind)
            else:
                behind = warp(d) if warp is not None else 0.0
                base = fg[..., :3] + (1 - fa) * behind
            light, spec = lit["light"], lit["spec"]
        spec = K.blur_sep(spec, 1)
        sticker = st_rgb * light + cfg.get("spec", 1.0) * spec
        lin = base * cshadow * (1 - a3) + sticker * a3
        lin = lin * exposure * vig
        out = K.lin_to_srgb(K.soft_clip(lin, 0.85))
        Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)).save(
            os.path.join(out_dir, f"{i + 1:04d}.png"), compress_level=1)
        print(f"{args.scene} frame {i + 1}/{n}", flush=True)
    json.dump(meta, open(os.path.join(out_dir, "meta.json"), "w"))


def _refl_warp(warp, fg, fa, d, depth, w, h):
    """Warp the glass reflections (fg colour in non-opaque pixels) like a far image."""
    glass_px = (fa < 0.97).astype(np.float32)
    refl = fg[..., :3] * glass_px
    num = warp(d, img=np.concatenate([refl, glass_px], -1), fixed_depth=depth)
    return num[..., :3] / np.maximum(num[..., 3:4], 1e-3) * glass_px


def _scaled_sticker(sc, w, h):
    """Preview-resolution sticker layer (same placement, scaled)."""
    rgb, a, bbox = K.sticker_layer()
    im_a = Image.fromarray(a.astype(np.float32), "F").resize((w, h), Image.BILINEAR)
    chans = [Image.fromarray((rgb[..., c] * a).astype(np.float32), "F").resize((w, h), Image.BILINEAR)
             for c in range(3)]
    aa = np.asarray(im_a)
    pre = np.stack([np.asarray(c) for c in chans], -1)
    return np.clip(pre / np.maximum(aa[..., None], 1e-4), 0, 1), np.clip(aa, 0, 1), bbox


if __name__ == "__main__":
    main()
