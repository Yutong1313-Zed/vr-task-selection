# Multimodal-Assisted Task-Level Selection for Dense Similar Objects in Virtual Reality

System demo page for our prototype and the user study behind it, submitted to
**Data Intelligence** (under review).

* Live site: <https://yutong1313-zed.github.io/vr-task-selection/>
* Repository: <https://github.com/Yutong1313-Zed/vr-task-selection>

> Zhang, Y., Yin, Y., Zhao, Y., Yu, J., & Xie, L. (2026). *Multimodal-Assisted
> Task-Level Selection for Dense Similar Objects in Virtual Reality.*
> Data Intelligence. Under review.

## What the page shows

It is written as a **system demo** rather than a paper landing page:

| Section | Content |
|---|---|
| Live trial | Frame-by-frame replay of one real recorded trial, with a headset viewport, stage timeline and the real timings |
| Pipeline | The eight runtime stages with their measured per-stage latency, replayed into a terminal |
| System | Client–server architecture, module list, object registry, response packet, trial capture format |
| Data | The four synchronised streams and why the speech anchor is needed |
| Missions | The five tasks exactly as they were spoken, with real target IDs |
| Validation | The 20-participant study against ray casting, ablation and weight sensitivity |

The replay frames are cropped from the original 1920×960 stereo captures of trial
`P01_Proposed_M1_20260530_143223`. Instructions, object IDs, gaze counts, frame
counts and completion time are read from that trial's recorded metadata — see
`tools/prepare_demo_assets.py`.

**No full text is published here.** Only the figures and result tables that
appear in the paper, plus contact details for requesting the manuscript.

## Layout

```
index.html                  the showcase page
assets/data/demo.json       every number the page renders (single source of truth)
assets/css/site.css         styles
assets/js/site.js           data rendering, replay + pipeline runs, inline SVG charts
assets/img/*.webp           demo frames, pipeline and architecture figures
assets/favicon.svg          site icon
tools/prepare_demo_assets.py  rebuild the demo frames from the recorded trials
tools/prepare_assets.py       rebuild the manuscript figures for the web
tools/check_site.py           static checks (assets, anchors, alt text, no artefacts)
tools/publish_via_api.py      publish a commit through the GitHub API
.nojekyll                   serve files verbatim on GitHub Pages
```

## Local preview

```powershell
cd D:\vr-task-selection
python -m http.server 8000
# open http://127.0.0.1:8000/

# static checks before pushing
python tools\check_site.py
```

A `?noreveal=1` query parameter renders the page without scroll animations and
without the counter tween, which keeps automated screenshots deterministic.

## Rebuilding the demo frames

`tools/prepare_demo_assets.py` reads the recorded trial from
`C:\Users\张\Enve1\正式实验数据\P01\ProposedPackages\...`, crops the left eye out of
the stereo frames, and writes web-optimised WebP plus
`assets/data/trial-m1.json`. Adjust the `TRIAL` constant if the data moves.

## Publishing

Pages serves the `main` branch root — there is no CI workflow, because pushing a
workflow file requires a Personal Access Token with the extra `workflow` scope.
To republish after editing:

```powershell
git add -A
git commit -m "Update showcase"
git push
```

`push-to-github.ps1` wraps first-time setup (create repo, push, enable Pages).
Pass a token with the `repo` scope via `-Token` or `$env:GITHUB_TOKEN`; otherwise
Git Credential Manager opens a browser sign-in.

If `git push` cannot reach `github.com` on your network while `api.github.com`
still works, publish the commit through the REST API instead:

```powershell
python tools\publish_via_api.py --repo Yutong1313-Zed/vr-task-selection `
  --message "Update showcase" --token $env:GITHUB_TOKEN
```

**Never commit a token.** Keep it in Windows Credential Manager or an
environment variable, and revoke any token that has been shared in plain text.

### No full text, by construction

`.gitignore` excludes `*.pdf`, `*.docx`, `*.doc`, `*.tex` and `*.zip`, and
`tools/check_site.py` fails if any such file exists in the tree.

## Results presented

| Metric | Ray | Proposed |
|---|---|---|
| Completion time T<sub>c</sub> | 7.7 ± 3.7 s | 6.6 ± 2.6 s |
| Object accuracy Acc<sub>obj</sub> | 64.1% ± 21.7% | **77.3% ± 14.8%** |
| Strict task success Acc<sub>trial</sub> | 75 / 100 (75%) | 70 / 99 (71%) |
| Head rotation speed | 46°/s | 73°/s |
| NASA–TLX total | 66.05 ± 19.65 | **42.25 ± 20.05** |
| SUS | — | 79.38 ± 14.60 |

Ablation (object-level accuracy): Full 77.3% · w/o conflict handling 71.5% ·
Speech+Vision 56.1% · Gaze+Vision 30.0% · Gaze-only 28.2% · Speech-only 16.7%.

## Contact

Corresponding author: **Yue Yin** — yinyuebuaa@126.com
