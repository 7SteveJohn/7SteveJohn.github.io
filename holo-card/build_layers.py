#!/usr/bin/env python3
"""Build holographic card layers from the avatar line art (per create-holographic-card skill)."""
from __future__ import annotations
import json
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

SRC = Path("D:/HTML/assets/images/avatar.jpg")
OUT = Path("D:/HTML/holo-card")
OUT.mkdir(exist_ok=True)

CANVAS_W, CANVAS_H = 1060, 1484  # 5:7 @ spec resolution
PAPER = (251, 251, 253)  # near-white cool paper

# ---------- 1. card face: fit height, pad width with paper ----------
art = Image.open(SRC).convert("RGB")
scale = CANVAS_H / art.height
fitted_w = round(art.width * scale)
face = Image.new("RGB", (CANVAS_W, CANVAS_H), PAPER)
resized = art.resize((fitted_w, CANVAS_H), Image.LANCZOS)
face.paste(resized, ((CANVAS_W - fitted_w) // 2, 0))
face.save(OUT / "card-face.jpg", quality=92)
print(f"card-face: {face.size}, art fitted {fitted_w}x{CANVAS_H}, pad {(CANVAS_W - fitted_w)//2}px/side")

# ---------- 2. background plate: paper white (foil target) ----------
bg = Image.new("RGB", (CANVAS_W, CANVAS_H), PAPER)
bg.save(OUT / "background.png")

# ---------- 3. subject layer: border-connected white removal ----------
px = np.asarray(face).astype(np.int16)
r, g, b = px[..., 0], px[..., 1], px[..., 2]
mx = px.max(axis=2)
mn = px.min(axis=2)
# paper-like: bright and low chroma (JPEG-tolerant)
paperish = (mn > 225) & ((mx - mn) < 22)

h, w = paperish.shape
visited = np.zeros((h, w), dtype=bool)
dq = deque()
for x in range(w):
    for y in (0, h - 1):
        if paperish[y, x] and not visited[y, x]:
            visited[y, x] = True
            dq.append((y, x))
for y in range(h):
    for x in (0, w - 1):
        if paperish[y, x] and not visited[y, x]:
            visited[y, x] = True
            dq.append((y, x))
while dq:
    y, x = dq.popleft()
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        ny, nx2 = y + dy, x + dx
        if 0 <= ny < h and 0 <= nx2 < w and paperish[ny, nx2] and not visited[ny, nx2]:
            visited[ny, nx2] = True
            dq.append((ny, nx2))

alpha = np.where(visited, 0, 255).astype(np.uint8)
coverage = 1 - alpha.mean() / 255
print(f"subject coverage: {coverage:.2%}")
if not (0.01 <= coverage <= 0.94):
    raise SystemExit("alpha coverage out of safe range, aborting")

mask = Image.fromarray(alpha, "L").filter(ImageFilter.GaussianBlur(0.8))
subject = face.convert("RGBA")
subject.putalpha(mask)
subject.save(OUT / "subject.png")

# ---------- 4. presentation IR (silver mode, pearl) ----------
presentation = {
    "version": 2,
    "frame": {"style": "narrow", "width": 0.65, "color": "#9aa4b2", "colorMode": "fixed"},
    "radius": {"outer": 5.8, "inner": 5.15},
    "surface": {"color": "#f4f6f9", "accent": "#7fa8d9", "material": "pearl"},
    "foil": {"enabled": True, "target": "background",
             "colors": ["#b3bac6", "#d3d7dc", "#a9b2bd", "#e2e3e1", "#bec6d0", "#8f99a8"],
             "intensity": 0.28},
    "texture": {"kind": "micro-grain", "target": "background", "intensity": 0.32},
    "sparkle": {"enabled": False, "target": "background", "intensity": 0},
    "glare": {"enabled": True, "target": "surface", "intensity": 0.36},
    "depth": {"parallaxX": 1.45, "parallaxY": 1.25, "lift": 19,
              "shadowOpacity": 0.18, "shadowBlur": 16, "rimIntensity": 0},
    "motion": {"maxX": 14, "maxY": 14, "scale": 1.024, "smoothing": 0.18},
    "constraints": {"keepInsideFrame": True},
}
(OUT / "presentation.json").write_text(json.dumps(presentation, ensure_ascii=False, indent=2), encoding="utf-8")
print("presentation.json written (silver/pearl, foil .28 texture .32 glare .36)")
