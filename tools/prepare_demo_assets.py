"""Build the system-demo assets from the recorded P01 / M1 trial.

Source trial
------------
P01_Proposed_M1_20260530_143223 — one real trial of the proposed condition:
216 frames at 1920x960 stereo (two 960x960 eyes side by side), 182 gaze
samples, 16 kHz audio, 6.65 s completion time.

Outputs (web-optimised WebP). The trial's real numbers live in the hand-curated
assets/data/demo.json, which is the page's single source of truth.

    assets/img/demo-*.webp   cropped headset frames along the timeline
"""

from __future__ import annotations

import glob
import json
import os
from PIL import Image

TRIAL = (
    r"C:\Users\张\Enve1\正式实验数据\P01\ProposedPackages\P01"
    r"\P01_Proposed_M1_20260530_143223"
)
MANUSCRIPT_IMG = r"C:\Users\张\Enve1\DI论文投稿\CCL2026_TaskSellection_latex"

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG_OUT = os.path.join(ROOT, "assets", "img")
DATA_OUT = os.path.join(ROOT, "assets", "data")

# Stereo frame layout: strip the black margin, then keep the left eye.
CROP = (150, 40, 1770, 940)

# Frame indices chosen to bracket the trial's phases (216 frames total).
STEPS = [
    ("idle", 6, "Standby — mission instruction on screen"),
    ("speech", 24, "Speech onset — the utterance anchors the episode"),
    ("gaze", 90, "Gaze window — attention accumulates on candidates"),
    ("fusion", 150, "Fusion — candidates scored and ranked"),
    ("done", 205, "Execution — targets move to the destination"),
]


def eye_frame(path: str, width: int) -> Image.Image:
    im = Image.open(path).convert("RGB").crop(CROP)
    if im.width > width:
        h = round(im.height * width / im.width)
        im = im.resize((width, h), Image.LANCZOS)
    return im


def main() -> None:
    os.makedirs(IMG_OUT, exist_ok=True)
    os.makedirs(DATA_OUT, exist_ok=True)

    frames = sorted(glob.glob(os.path.join(TRIAL, "frame_*.jpg")))
    if not frames:
        raise SystemExit(f"no frames found in {TRIAL}")
    print(f"source frames: {len(frames)}")

    meta = json.load(open(os.path.join(TRIAL, "trial_meta.json"), encoding="utf-8"))

    # ---------------------------------------------------------- timeline strip
    for name, idx, caption in STEPS:
        idx = min(idx, len(frames) - 1)
        im = eye_frame(frames[idx], 1100)
        out = os.path.join(IMG_OUT, f"demo-{name}.webp")
        im.save(out, "WEBP", quality=84, method=6)
        t = round(idx / 30.0, 1)  # captures are ~30 fps
        print(f"  demo-{name:<7} frame {idx:>3} (~{t:>4}s)  {os.path.getsize(out)/1024:6.1f} KB  {caption}")

    # ------------------------------------------------------------- gaze figure
    gaze_src = os.path.join(MANUSCRIPT_IMG, "图片-6.png")
    if os.path.exists(gaze_src):
        im = Image.open(gaze_src).convert("RGB")
        if im.width > 1400:
            im = im.resize((1400, round(im.height * 1400 / im.width)), Image.LANCZOS)
        im.save(os.path.join(IMG_OUT, "demo-gaze.webp"), "WEBP", quality=84, method=6)
        print("  demo-gaze.webp from manuscript figure")

    # ----------------------------------------------------------- gaze track
    track = []
    with open(os.path.join(TRIAL, "gaze.jsonl"), encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                track.append(json.loads(line))

    start = meta["speech_start_ts"] - meta["recording_start_ts"]
    end = meta["speech_end_ts"] - meta["recording_start_ts"]
    window = [g for g in track if start <= g["t"] <= end]

    print(f"\ntrial summary (keep assets/data/demo.json in step with this):")
    print(f"  instruction   {meta['instruction']}")
    print(f"  targets       {meta['target_objects']['value']} -> {meta['target_region']}")
    print(f"  speech window {start:.2f} s -> {end:.2f} s  ({len(window)} of {len(track)} gaze samples)")
    print(f"  completion    {meta['completion_time_ms'] / 1000:.2f} s")
    print(f"  capture       {meta['frame_count']} frames @ {meta['audio_sample_rate'] / 1000:.0f} kHz")


if __name__ == "__main__":
    main()
