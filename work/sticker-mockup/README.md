# Sticker mockup video

Output: `output/sticker-mockup-video.mp4` (H.264, 1080x1920, 30 fps, 18 s).

Fully local pipeline (no AI generation, no paid APIs):

1. `blender/scenes.py`: five scenes built procedurally in Blender 5.2 / Cycles
   (concrete pole, shop window, laptop lid, plaster wall, metal cabinet at dusk).
2. `render_all.sh` -> `blender/render.py`: each scene is rendered as still layers:
   the surface, the light falling on the sticker area (diffuse + specular passes),
   and a background plate with depth.
3. `animate.py`: per frame, the background is re-projected from its depth for a
   dolly-zoom camera move (the sticker plane keeps constant magnification), the
   leaf shadows on the wall are animated using the separate sun/sky light passes, and the
   **original sticker file** (`assets/sticker_original.png`) is composited at a fixed
   270 px width, centred, multiplied by the rendered light.
4. `assemble.py`: timeline 0-3-6-9-12-18 s with 8-frame dissolves, x264 encode.
5. `verify.py`: decodes the MP4 and checks sticker bbox/centroid/shape/colour in
   every frame (`checks/verify_report.json`).

Setup: `python3 -m venv .venv && .venv/bin/pip install bpy==5.2.2 numpy pillow OpenEXR`
(Blender's compositor also needs `libegl1` on headless Linux).
Previews: `./preview.sh 25 16 <scene...>`.
