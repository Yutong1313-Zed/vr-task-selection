# Multimodal-Assisted Task-Level Selection for Dense Similar Objects in Virtual Reality

Project showcase page for our manuscript submitted to **Data Intelligence** (under review).

* Live site: <https://yutong1313-zed.github.io/vr-task-selection/>
* Repository: <https://github.com/Yutong1313-Zed/vr-task-selection>

> Zhang, Y., Yin, Y., Zhao, Y., Yu, J., & Xie, L. (2026). *Multimodal-Assisted
> Task-Level Selection for Dense Similar Objects in Virtual Reality.*
> Data Intelligence. Under review.

## What this repository is

A single-page static site (GitHub Pages) that presents the paper's problem framing,
method, user study, and results. It contains **no full text** of the manuscript —
only the figures and result tables that appear in the paper, plus a BibTeX entry
and contact details for requesting the full text.

## Contents

```
index.html                  single-page showcase
assets/css/site.css         styles
assets/js/site.js           nav, scroll UX, inline SVG charts, copy buttons
assets/img/*.webp           figures from the paper, web-optimised
assets/favicon.svg          site icon
tools/prepare_assets.py     regenerates assets/img from the LaTeX figure folder
.nojekyll                   serve files verbatim on GitHub Pages
```

## Local preview

```powershell
cd D:\vr-task-selection
python -m http.server 8000
# open http://127.0.0.1:8000/
```

## Publishing

```powershell
.\push-to-github.ps1 -User Yutong1313-Zed
```

The workflow in `.github/workflows/pages.yml` refuses to publish if any
manuscript artefact (`*.pdf`, `*.docx`, `*.doc`, `*.tex`, `*.zip`) is found in
the tree, so the full text cannot leak through this repository by accident.
After the first push, set **Settings → Pages → Build and deployment → Source =
GitHub Actions**.

## Regenerating figures

`tools/prepare_assets.py` copies and compresses the paper figures from the
manuscript's LaTeX asset folder. Adjust the `SRC` constant if the manuscript
folder moves. Requires Pillow.

## Results presented

| Metric | Ray | Proposed |
|---|---|---|
| Completion time T<sub>c</sub> | 7.7 ± 3.7 s (N=100) | 6.6 ± 2.6 s (N=99) |
| Object accuracy Acc<sub>obj</sub> | 64.1% ± 21.7% (N=96) | **77.3% ± 14.8%** (N=98) |
| Strict task success Acc<sub>trial</sub> | 75/100 (75%) | 70/99 (71%) |
| Head rotation speed | 46°/s (N=60) | 73°/s (N=55) |
| NASA–TLX total | 66.05 ± 19.65 | **42.25 ± 20.05** |
| SUS | — | 79.38 ± 14.60 |

Ablation (object-level accuracy): Full 77.3% · w/o conflict handling 71.5% ·
Speech+Vision 56.1% · Gaze+Vision 30.0% · Gaze-only 28.2% · Speech-only 16.7%.

## Contact

Corresponding author: **Yue Yin** — yinyuebuaa@126.com

## Notes

* Figures and result values are reproduced from the manuscript for presentation purposes only.
* The full text is intentionally not distributed here while the manuscript is under review.
