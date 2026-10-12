"""Copy and web-optimize the paper figures used by the showcase site.

Sources are the LaTeX asset folder of the manuscript project. Nothing is
uploaded from the manuscript's full text; only figures shown in the paper.
"""
from __future__ import annotations

import os
import shutil
from PIL import Image

SRC = r"C:\Users\张\Enve1\DI论文投稿\CCL2026_TaskSellection_latex"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "img")

# (source name, output stem, max width px)
PLAN = [
    ("Method-3.png", "pipeline", 1600),
    ("Scene-VR.png", "scene-vr", 900),
    ("System-4.png", "system", 1900),
    ("图片-6.png", "gaze-heatmaps", 1500),
    ("图片-1.jpg", "author-1", 320),
    ("图片-2.jpg", "author-2", 320),
    ("图片-3.jpg", "author-3", 320),
    ("图片-4.jpg", "author-4", 320),
    ("图片-5.jpg", "author-5", 320),
]


def optimize(src: str, dst_stem: str, max_w: int) -> list[str]:
    im = Image.open(src)
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        flat = Image.new("RGB", im.size, (13, 17, 23))
        flat.paste(im, mask=im.split()[-1])
        im = flat
    else:
        im = im.convert("RGB")

    if im.width > max_w:
        h = round(im.height * max_w / im.width)
        im = im.resize((max_w, h), Image.LANCZOS)

    written = []
    webp = os.path.join(OUT, dst_stem + ".webp")
    im.save(webp, "WEBP", quality=86, method=6)
    written.append(webp)
    return written


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    total = 0
    for name, stem, max_w in PLAN:
        src = os.path.join(SRC, name)
        if not os.path.exists(src):
            print(f"MISSING  {name}")
            continue
        before = os.path.getsize(src)
        files = optimize(src, stem, max_w)
        after = sum(os.path.getsize(f) for f in files)
        total += after
        print(
            f"OK  {name:>16} -> {os.path.basename(files[0]):<22}"
            f"{before/1024:8.0f} KB -> {after/1024:7.0f} KB"
        )
    print(f"\nTotal web figure payload: {total/1024/1024:.2f} MB")


if __name__ == "__main__":
    main()
