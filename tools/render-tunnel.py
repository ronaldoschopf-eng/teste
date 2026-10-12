"""Render a looping black & white "photo tunnel" video: rounded photo tiles
fly from the centre towards the camera, with the logo fixed in the middle.

Usage: python3 tools/render-tunnel.py OUT.mp4 LOGO.png PHOTO [PHOTO ...]
"""
import math
import subprocess
import sys

import cv2
import numpy as np

W, H, FPS, SECONDS = 1080, 1920, 30, 15
FRAMES = FPS * SECONDS
TEX = 640                      # texture resolution of each tile
Z_FAR, Z_NEAR = 9.0, 0.45      # depth range a tile travels per cycle
FOCAL = H * 0.42
N_TILES = 30
rng = np.random.default_rng(7)


def rounded_mask(size, radius):
    m = np.zeros((size, size), np.uint8)
    r = radius
    cv2.rectangle(m, (r, 0), (size - 1 - r, size - 1), 255, -1)
    cv2.rectangle(m, (0, r), (size - 1, size - 1 - r), 255, -1)
    for cx, cy in ((r, r), (size - 1 - r, r), (r, size - 1 - r), (size - 1 - r, size - 1 - r)):
        cv2.circle(m, (cx, cy), r, 255, -1, cv2.LINE_AA)
    return m


def make_textures(paths):
    """Several square grayscale crops per photo, so 3 photos still feel varied."""
    mask = rounded_mask(TEX, int(TEX * 0.11)).astype(np.float32) / 255
    crops = [  # (centre x, centre y, side) as fractions of the photo width
        (0.50, 0.55, 1.00), (0.55, 0.42, 0.62), (0.45, 0.70, 0.70), (0.60, 0.30, 0.50),
    ]
    out = []
    for p in paths:
        img = cv2.imread(p, cv2.IMREAD_GRAYSCALE).astype(np.float32)
        h, w = img.shape
        for fx, fy, fs in crops:
            s = int(w * fs)
            x0 = int(np.clip(fx * w - s / 2, 0, w - s))
            y0 = int(np.clip(fy * h - s / 2, 0, h - s))
            c = cv2.resize(img[y0:y0 + s, x0:x0 + s], (TEX, TEX), interpolation=cv2.INTER_AREA)
            c = np.clip((c - 128) * 1.12 + 128, 0, 255)  # a touch more contrast
            out.append(np.dstack([c, mask * 255]).astype(np.float32))
    return out


def rot(rx, ry, rz):
    cx, sx, cy, sy, cz, sz = math.cos(rx), math.sin(rx), math.cos(ry), math.sin(ry), math.cos(rz), math.sin(rz)
    Rx = np.array([[1, 0, 0], [0, cx, -sx], [0, sx, cx]])
    Ry = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]])
    Rz = np.array([[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]])
    return Rz @ Ry @ Rx


def make_tiles(n_tex):
    tiles = []
    for i in range(N_TILES):
        ang = (i * 2.399963) % (2 * math.pi) + rng.uniform(-0.2, 0.2)  # golden-angle spread
        tiles.append(dict(
            ang=ang,
            rad=rng.uniform(1.15, 1.7),
            phase=i / N_TILES + rng.uniform(-0.01, 0.01),
            size=rng.uniform(0.42, 0.58),
            rot0=rng.uniform(-0.5, 0.5, 3) * np.array([0.6, 0.6, 1.2]),
            wob=rng.uniform(0.1, 0.22, 3),
            tex=(i * 5) % n_tex,
        ))
    return tiles


def load_logo(path, width):
    im = cv2.imread(path, cv2.IMREAD_UNCHANGED)
    if im.shape[2] == 3:
        im = np.dstack([im, np.full(im.shape[:2], 255, np.uint8)])
    gray = cv2.cvtColor(im[:, :, :3], cv2.COLOR_BGR2GRAY).astype(np.float32)
    # Black strokes on white -> white strokes, transparent elsewhere.
    alpha = (255 - gray) / 255 * (im[:, :, 3].astype(np.float32) / 255)
    ys, xs = np.where(alpha > 0.05)
    alpha = alpha[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    h = int(alpha.shape[0] * width / alpha.shape[1])
    return cv2.resize(alpha, (width, h), interpolation=cv2.INTER_AREA)


def render_frame(f, tiles, textures, logo):
    t = f / FRAMES
    canvas = np.zeros((H, W), np.float32)
    span = Z_FAR - Z_NEAR
    order = []
    for tile in tiles:
        z = Z_FAR - ((t + tile["phase"]) % 1.0) * span
        order.append((z, tile))
    order.sort(key=lambda o: -o[0])

    for z, tile in order:
        tw = 2 * math.pi * t
        r = tile["rot0"] + tile["wob"] * np.array([math.sin(tw + tile["ang"]), math.cos(tw * 1 + tile["ang"] * 2), math.sin(tw + tile["ang"] * 3)])
        R = rot(*r)
        c = np.array([math.cos(tile["ang"]) * tile["rad"] * 0.62, math.sin(tile["ang"]) * tile["rad"], z])
        hs = tile["size"] / 2
        corners = np.array([[-hs, -hs, 0], [hs, -hs, 0], [hs, hs, 0], [-hs, hs, 0]]) @ R.T + c
        if corners[:, 2].min() < 0.15:
            continue
        pts = np.stack([W / 2 + corners[:, 0] * FOCAL / corners[:, 2],
                        H / 2 + corners[:, 1] * FOCAL / corners[:, 2]], 1).astype(np.float32)
        x0, y0 = np.floor(pts.min(0)).astype(int) - 40
        x1, y1 = np.ceil(pts.max(0)).astype(int) + 40
        if x1 < 0 or y1 < 0 or x0 >= W or y0 >= H or (x1 - x0) > 4 * W:
            continue
        src = np.float32([[0, 0], [TEX, 0], [TEX, TEX], [0, TEX]])
        M = cv2.getPerspectiveTransform(src, pts - np.float32([x0, y0]))
        patch = cv2.warpPerspective(textures[tile["tex"]], M, (x1 - x0, y1 - y0), flags=cv2.INTER_LINEAR)

        # Depth of field: sharp around z~1.6, softer far away; fade in from black.
        blur = max(0.0, (z - 2.0) * 2.6) + max(0.0, (1.0 - z) * 6)
        if blur > 0.5:
            k = int(blur * 3) | 1
            patch = cv2.GaussianBlur(patch, (k, k), blur)
        fade = np.clip((Z_FAR - z) / 2.5, 0, 1) * (0.55 + 0.45 * np.clip((6.5 - z) / 4.5, 0, 1))

        gx0, gy0, gx1, gy1 = max(x0, 0), max(y0, 0), min(x1, W), min(y1, H)
        p = patch[gy0 - y0:gy1 - y0, gx0 - x0:gx1 - x0]
        a = p[:, :, 1:2][:, :, 0] / 255 * fade
        region = canvas[gy0:gy1, gx0:gx1]
        canvas[gy0:gy1, gx0:gx1] = region * (1 - a) + p[:, :, 0] * fade * a

    # Soft dark halo keeps the centre clean behind the logo, then the logo itself.
    lh, lw = logo.shape
    breathe = 1 + 0.015 * math.sin(2 * math.pi * t * 3)
    lg = cv2.resize(logo, (int(lw * breathe), int(lh * breathe)), interpolation=cv2.INTER_LINEAR)
    lh, lw = lg.shape
    yy, xx = np.ogrid[:H, :W]
    d = np.sqrt(((xx - W / 2) / (lw * 0.95)) ** 2 + ((yy - H / 2) / (lh * 0.95)) ** 2)
    canvas *= np.clip(0.25 + (d - 0.6) * 0.9, 0.25, 1).astype(np.float32)
    ly, lx = (H - lh) // 2, (W - lw) // 2
    canvas[ly:ly + lh, lx:lx + lw] = canvas[ly:ly + lh, lx:lx + lw] * (1 - lg) + 255 * lg
    return np.clip(canvas, 0, 255).astype(np.uint8)


def main():
    out, logo_path, photos = sys.argv[1], sys.argv[2], sys.argv[3:]
    textures = make_textures(photos)
    tiles = make_tiles(len(textures))
    logo = load_logo(logo_path, int(W * 0.30))
    ff = subprocess.Popen([
        "ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "gray", "-s", f"{W}x{H}",
        "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18",
        "-preset", "slow", "-movflags", "+faststart", out], stdin=subprocess.PIPE)
    for f in range(FRAMES):
        ff.stdin.write(render_frame(f, tiles, textures, logo).tobytes())
    ff.stdin.close()
    ff.wait()


if __name__ == "__main__":
    main()
