"""Contact sheet of frames: python checks_sheet.py out.png img1 img2 ..."""
import sys
from PIL import Image
ims = [Image.open(p).convert("RGB") for p in sys.argv[2:]]
h = 640
ims = [im.resize((int(im.width * h / im.height), h), Image.LANCZOS) for im in ims]
W = sum(i.width for i in ims) + 8 * (len(ims) - 1)
sheet = Image.new("RGB", (W, h), "white")
x = 0
for im in ims:
    sheet.paste(im, (x, 0)); x += im.width + 8
sheet.save(sys.argv[1])
