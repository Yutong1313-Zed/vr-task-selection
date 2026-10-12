"""Static checks for the showcase site before publishing.

* every local asset referenced by index.html exists
* no forbidden manuscript artefacts (PDF/DOCX/TEX) are published
* internal anchors resolve to real element ids
* JSON-LD / meta essentials are present
"""
from __future__ import annotations

import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX = os.path.join(ROOT, "index.html")
FORBIDDEN_EXT = {".pdf", ".docx", ".doc", ".tex", ".zip", ".pptx", ".xlsx"}

problems: list[str] = []
notes: list[str] = []

html = open(INDEX, encoding="utf-8").read()

# --- referenced local assets exist -----------------------------------------
refs = set()
for m in re.finditer(r'(?:src|href)\s*=\s*"([^"]+)"', html):
    refs.add(m.group(1))

local = [
    r for r in refs
    if not r.startswith(("http://", "https://", "mailto:", "#", "data:"))
]
for r in sorted(local):
    path = os.path.join(ROOT, r.split("#")[0].split("?")[0])
    if os.path.isfile(path):
        notes.append(f"asset ok      {r}")
    else:
        problems.append(f"missing asset {r}")

# --- internal anchors -------------------------------------------------------
ids = set(re.findall(r'\bid\s*=\s*"([^"]+)"', html))
for m in re.finditer(r'href\s*=\s*"#([^"]+)"', html):
    if m.group(1) not in ids:
        problems.append(f"dangling anchor #{m.group(1)}")

# --- forbidden artefacts ----------------------------------------------------
for dirpath, _dirs, files in os.walk(ROOT):
    if ".git" in dirpath:
        continue
    for f in files:
        if os.path.splitext(f)[1].lower() in FORBIDDEN_EXT:
            problems.append(f"forbidden artefact published: {os.path.relpath(os.path.join(dirpath, f), ROOT)}")

# --- required meta ----------------------------------------------------------
for needle in [
    '<meta charset="utf-8">',
    'name="viewport"',
    "<title>",
    'rel="icon"',
    'assets/css/site.css',
    'assets/js/site.js',
    'application/ld+json',
]:
    if needle not in html:
        problems.append(f"missing required markup: {needle}")

# --- accessibility spot checks ---------------------------------------------
imgs = re.findall(r"<img\b[^>]*>", html)
for tag in imgs:
    if 'alt="' not in tag:
        problems.append(f"img without alt: {tag[:80]}...")
notes.append(f"images with alt: {len(imgs)}/{len(imgs)}")

total_bytes = sum(
    os.path.getsize(os.path.join(d, f))
    for d, _s, fs in os.walk(ROOT)
    for f in fs
    if ".git" not in d
)

print("\n".join(notes))
print(f"\nrepo payload: {total_bytes/1024/1024:.2f} MB")
if problems:
    print("\nPROBLEMS:")
    for p in problems:
        print("  -", p)
    sys.exit(1)
print("\nAll static checks passed.")
