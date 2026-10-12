"""Static checks for the showcase site before publishing.

* every local asset referenced by index.html exists
* every image referenced by assets/data/demo.json exists
* no forbidden manuscript artefacts (PDF/DOCX/TEX) are published
* internal anchors resolve to real element ids
* required markup and accessibility basics are present
"""

from __future__ import annotations

import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX = os.path.join(ROOT, "index.html")
DEMO = os.path.join(ROOT, "assets", "data", "demo.json")
FORBIDDEN_EXT = {".pdf", ".docx", ".doc", ".tex", ".zip", ".pptx", ".xlsx"}

problems: list[str] = []
notes: list[str] = []

html = open(INDEX, encoding="utf-8").read()

# --- assets referenced from the markup -------------------------------------
refs = set(re.findall(r'(?:src|href)\s*=\s*"([^"]+)"', html))
local = [r for r in refs if not r.startswith(("http://", "https://", "mailto:", "#", "data:"))]
for r in sorted(local):
    path = os.path.join(ROOT, r.split("#")[0].split("?")[0])
    if os.path.isfile(path):
        notes.append(f"asset ok        {r}")
    else:
        problems.append(f"missing asset   {r}")

# --- assets referenced from the data file ----------------------------------
if not os.path.isfile(DEMO):
    problems.append("missing assets/data/demo.json")
else:
    demo = json.load(open(DEMO, encoding="utf-8"))
    data_refs: list[str] = []
    for stage in demo.get("stages", []):
        if stage.get("img"):
            data_refs.append(stage["img"])
    for rel in sorted(set(data_refs)):
        path = os.path.join(ROOT, rel.split("/")[-1]) if False else os.path.join(ROOT, *rel.split("/"))
        if os.path.isfile(path):
            notes.append(f"asset ok (data) {rel}")
        else:
            problems.append(f"missing asset   {rel} (from demo.json)")

    # sanity: the demo file must not contain manuscript text dumps
    if len(json.dumps(demo)) > 200_000:
        problems.append("demo.json unexpectedly large; check for embedded full text")
    notes.append(f"demo.json       {len(demo.get('missions', []))} missions, "
                 f"{len(demo.get('stages', []))} replay stages, "
                 f"{len(demo.get('sample_pipeline', []))} pipeline stages")

# --- internal anchors -------------------------------------------------------
ids = set(re.findall(r'\bid\s*=\s*"([^"]+)"', html))
for m in re.finditer(r'href\s*=\s*"#([^"]+)"', html):
    if m.group(1) not in ids:
        problems.append(f"dangling anchor #{m.group(1)}")

# --- forbidden artefacts ----------------------------------------------------
for dirpath, dirs, files in os.walk(ROOT):
    if ".git" in dirpath.split(os.sep):
        continue
    for f in files:
        if os.path.splitext(f)[1].lower() in FORBIDDEN_EXT:
            problems.append(f"forbidden artefact published: {os.path.relpath(os.path.join(dirpath, f), ROOT)}")

# --- required markup --------------------------------------------------------
for needle in [
    '<meta charset="utf-8">',
    'name="viewport"',
    "<title>",
    'rel="icon"',
    "assets/css/site.css",
    "assets/js/site.js",
    "application/ld+json",
]:
    if needle not in html:
        problems.append(f"missing required markup: {needle}")

# --- accessibility spot checks ---------------------------------------------
imgs = re.findall(r"<img\b[^>]*>", html)
for tag in imgs:
    if 'alt="' not in tag:
        problems.append(f"img without alt: {tag[:80]}...")
notes.append(f"images with alt {len(imgs)}/{len(imgs)}")

# --- js hooks referenced by site.js exist ----------------------------------
js = open(os.path.join(ROOT, "assets", "js", "site.js"), encoding="utf-8").read()
for hook in sorted(set(re.findall(r"getElementById\('([A-Za-z0-9_-]+)'\)", js))):
    if f'id="{hook}"' not in html:
        problems.append(f"site.js expects #{hook}, not present in index.html")

total_bytes = sum(
    os.path.getsize(os.path.join(d, f))
    for d, _s, fs in os.walk(ROOT) for f in fs
    if ".git" not in d.split(os.sep) and os.sep + "docs" not in d
)

print("\n".join(notes))
print(f"\nsite payload: {total_bytes/1024/1024:.2f} MB")
if problems:
    print("\nPROBLEMS:")
    for p in problems:
        print("  -", p)
    sys.exit(1)
print("\nAll static checks passed.")
