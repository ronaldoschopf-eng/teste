"""Assemble the per-scene frame sequences into the final 540-frame timeline with
short cross-dissolves, then encode MP4 (H.264, 1080x1920, 30 fps).

Because the sticker sits on exactly the same pixels in every scene, a dissolve
only changes the surface around it; the artwork never moves or morphs.

usage: assemble.py [--out ../../output/sticker-mockup-video.mp4]
"""
import argparse
import os
import shutil
import subprocess

import numpy as np
from PIL import Image

from animate import CUTS, ORDER, XF

ROOT = os.path.dirname(os.path.abspath(__file__))


def local_index(k, f):
    head = XF // 2 if k > 0 else 0
    return f - CUTS[k] + head + 1                     # 1-based file index


def frame_path(k, f):
    return os.path.join(ROOT, "frames", ORDER[k], f"{local_index(k, f):04d}.png")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(ROOT, "..", "..", "output", "sticker-mockup-video.mp4"))
    ap.add_argument("--crf", type=int, default=16)
    args = ap.parse_args()

    final_dir = os.path.join(ROOT, "final_frames")
    shutil.rmtree(final_dir, ignore_errors=True)
    os.makedirs(final_dir)
    half = XF // 2
    for f in range(CUTS[-1]):
        k = max(i for i in range(len(ORDER)) if CUTS[i] <= f)
        dst = os.path.join(final_dir, f"{f + 1:04d}.png")
        if k > 0 and f < CUTS[k] + half:
            # dissolve from scene k-1 into scene k around the cut at CUTS[k]
            w = (f - (CUTS[k] - half) + 0.5) / XF
            a = np.asarray(Image.open(frame_path(k - 1, f)), np.float32)
            b = np.asarray(Image.open(frame_path(k, f)), np.float32)
            Image.fromarray(np.clip(a * (1 - w) + b * w + 0.5, 0, 255).astype(np.uint8)).save(dst, compress_level=1)
        elif k < len(ORDER) - 1 and f >= CUTS[k + 1] - half:
            w = (f - (CUTS[k + 1] - half) + 0.5) / XF
            a = np.asarray(Image.open(frame_path(k, f)), np.float32)
            b = np.asarray(Image.open(frame_path(k + 1, f)), np.float32)
            Image.fromarray(np.clip(a * (1 - w) + b * w + 0.5, 0, 255).astype(np.uint8)).save(dst, compress_level=1)
        else:
            shutil.copyfile(frame_path(k, f), dst)

    out = os.path.abspath(args.out)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-framerate", "30", "-i", os.path.join(final_dir, "%04d.png"),
           "-vf", "scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p",
           "-c:v", "libx264", "-preset", "slow", "-crf", str(args.crf), "-profile:v", "high",
           "-tune", "film", "-r", "30", "-color_primaries", "bt709", "-color_trc", "bt709",
           "-colorspace", "bt709", "-color_range", "tv", "-movflags", "+faststart", out]
    subprocess.run(cmd, check=True)
    print(out)


if __name__ == "__main__":
    main()
