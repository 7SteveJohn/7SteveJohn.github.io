#!/usr/bin/env python3
"""Assemble standalone holographic card preview HTML (engine + textures + layers inlined)."""
from __future__ import annotations
import base64
import json
import re
from pathlib import Path

TPL = Path("C:/Users/SevenJohn/.workbuddy/skills/create-holographic-card-skill/assets/react-template")
OUT = Path("D:/HTML/holo-card")

def data_uri(path: Path, mime: str) -> str:
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode()

def clean_module(src: str) -> str:
    lines = src.splitlines()
    keep = []
    for line in lines:
        s = line.strip()
        if s.startswith("import ") and " from " in s:
            continue
        if s.startswith("export") and " from " in s:
            continue
        if s.startswith("export {") and s.endswith("};"):
            continue
        line = re.sub(r"^export (?=(const|function|class|let|var)\b)", "", line)
        keep.append(line)
    return "\n".join(keep)

def wrap_module(src: str, exports: list[str]) -> str:
    body = clean_module(src)
    ret = ", ".join(exports)
    return f"const MOD_{exports[0]} = (() => {{\n{body}\nreturn {{ {ret} }};\n}})();\n"

optical = wrap_module((TPL / "optical-state.js").read_text(encoding="utf-8"),
                      ["perceptualIntensity", "expandFoilColors", "idlePoint", "interactionReveal", "computeOpticalState", "IDLE_REVEAL"])
palette = wrap_module((TPL / "frame-palette.js").read_text(encoding="utf-8"),
                      ["paletteFromColor", "analyzeFramePixels", "extractFramePalette"])
pointer = wrap_module((TPL / "pointer-motion.js").read_text(encoding="utf-8"),
                      ["createPointerMotionController"])
engine_src = (TPL / "holo-engine.js").read_text(encoding="utf-8")
engine_src = clean_module(engine_src)
# engine's stripped import -> pull symbols from optical module
engine_src = ("const { IDLE_REVEAL, expandFoilColors, idlePoint, interactionReveal, perceptualIntensity } = MOD_perceptualIntensity;\n"
              + engine_src)
engine = ("const MOD_createHolographicRenderer = (() => {\n" + engine_src +
          "\nreturn { createHolographicRenderer, MATERIAL_PROFILES };\n})();\n"
          "const { createHolographicRenderer, MATERIAL_PROFILES } = MOD_createHolographicRenderer;\n"
          "const { createPointerMotionController } = MOD_createPointerMotionController;\n"
          "const { computeOpticalState } = MOD_perceptualIntensity;\n"
          "const { paletteFromColor } = MOD_paletteFromColor;\n")

# texture URLs -> data URIs (pearl family only gets loaded, but map all names safely)
tex_map = {}
for name in ("pearl", "blue-noise", "micro-grain"):
    tex_map[name] = data_uri(TPL / "holo-textures" / f"{name}.webp", "image/webp")
for name in ("clear-coat", "brushed-metal", "spectral-lines", "etched-holo", "cosmic-flake", "star-holo"):
    tex_map[name] = ''  # never fetched with material=pearl
tex_js = "const TEX = {\n" + ",\n".join(f'  "{k}": "{v}"' for k, v in tex_map.items()) + "\n};\n"
engine = re.sub(r'new URL\("\./holo-textures/([\w-]+)\.webp", import\.meta\.url\)\.href',
                lambda m: f'TEX["{m.group(1)}"]', engine)

presentation = json.loads((OUT / "presentation.json").read_text(encoding="utf-8"))
bg_uri = data_uri(OUT / "background.png", "image/png")
subject_uri = data_uri(OUT / "subject.png", "image/png")

css_module = (TPL / "HolographicCard.module.css").read_text(encoding="utf-8")

controller = r"""
const presentation = %s;
const recipe = MATERIAL_PROFILES[presentation.surface.material];
const cardEl = document.getElementById('card');
const canvas = document.getElementById('material');
const bgImg = document.getElementById('bg');
const frontEl = document.getElementById('front');
const errEl = document.getElementById('err');
const statusEl = document.getElementById('status');

const framePalette = paletteFromColor(presentation.frame.color);
frontEl.style.setProperty('--frame-color', framePalette.base);
frontEl.style.setProperty('--frame-highlight', framePalette.highlight);
frontEl.style.setProperty('--frame-shadow', framePalette.shadow);
cardEl.style.setProperty('--outer-radius', presentation.radius.outer + '%%');
cardEl.style.setProperty('--inner-radius', presentation.radius.inner + '%%');
cardEl.style.setProperty('--frame-width', presentation.frame.width + '%%');
cardEl.style.setProperty('--tilt-duration', Math.round(presentation.motion.smoothing * 1000) + 'ms');

let renderer = null, motion = null, ready = false;
const point = { x: 50, y: 50 };
const clampN = (v, a, b) => Math.min(b, Math.max(a, v));
const pct = v => v + '%%';

function write(x, y, driveRenderer = false, now) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const nx = reduced ? 0.48 : (x - 50) / 50;
  const ny = reduced ? -0.36 : (y - 50) / 50;
  const state = computeOpticalState(presentation, nx, ny, recipe);
  const distance = Math.min(1, Math.hypot(nx, ny));
  cardEl.style.setProperty('--rotate-x', reduced ? '0deg' : state.rotateX + 'deg');
  cardEl.style.setProperty('--rotate-y', reduced ? '0deg' : state.rotateY + 'deg');
  cardEl.style.setProperty('--card-scale', reduced ? '1' : String(state.scale));
  cardEl.style.setProperty('--subject-x', pct(nx * presentation.depth.parallaxX));
  cardEl.style.setProperty('--subject-y', pct(ny * presentation.depth.parallaxY));
  cardEl.style.setProperty('--subject-z', (reduced ? 0 : distance * presentation.depth.lift) + 'px');
  if (driveRenderer) {
    cardEl.style.setProperty('--tilt-duration', '0ms');
    cardEl.style.setProperty('--tilt-ease', 'linear');
    renderer && renderer.renderPointerFrame(nx, ny, now);
  }
}

function reset() {
  motion && motion.release();
  point.x = 50; point.y = 50;
  cardEl.style.setProperty('--tilt-duration', '1200ms');
  cardEl.style.setProperty('--tilt-ease', 'cubic-bezier(.18,1.38,.32,1)');
  write(50, 50, false);
  renderer && renderer.releasePointer();
}

cardEl.addEventListener('pointermove', e => {
  if (!ready) return;
  const samples = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
  const sample = samples && samples.length ? samples[samples.length - 1] : e;
  motion && motion.moveClient(sample.clientX, sample.clientY);
});
cardEl.addEventListener('pointerleave', reset);
cardEl.addEventListener('pointercancel', reset);

function fail(msg) { errEl.textContent = 'Holographic preview unavailable: ' + msg; errEl.style.display = 'grid'; cardEl.style.display = 'none'; }

function initRenderer() {
  try {
    renderer = createHolographicRenderer({ canvas, image: bgImg, presentation, onError: fail });
  } catch (e) { fail(String(e && e.message || e)); return; }
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduce = () => {
    renderer.setReducedMotion(media.matches);
    if (media.matches) write(74, 32, false); else write(point.x, point.y, false);
  };
  reduce();
  media.addEventListener('change', reduce);
  motion = createPointerMotionController({
    smoothing: presentation.motion.smoothing,
    getBounds: () => cardEl.getBoundingClientRect(),
    onFrame: (next, now) => { point.x = next.x; point.y = next.y; write(next.x, next.y, true, now); },
  });
  let resizeFrame = 0;
  const scheduleResize = () => { if (!resizeFrame) resizeFrame = requestAnimationFrame(() => { resizeFrame = 0; renderer.resize(); }); };
  new ResizeObserver(scheduleResize).observe(canvas);
  const visibility = () => renderer.setPaused(document.hidden);
  document.addEventListener('visibilitychange', visibility);
  visibility();
  renderer.ready().then(() => {
    ready = true;
    cardEl.classList.remove('pending');
    statusEl.textContent = 'READY - move your pointer across the card';
    statusEl.setAttribute('data-ready', '1');
  }).catch(fail);
}

if (bgImg.complete && bgImg.naturalWidth > 0) initRenderer();
else bgImg.addEventListener('load', initRenderer);
bgImg.addEventListener('error', () => fail('background image could not be loaded.'));
write(50, 50, false);
""" % json.dumps(presentation)

html = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SevenJohn - Holographic Card Preview</title>
<style>
:root { color-scheme: dark; }
body { margin:0; min-height:100vh; display:grid; place-items:center; gap:0;
  background: radial-gradient(1200px 800px at 50%% 20%%, #10151f 0%%, #070a0f 60%%);
  font: 500 13px/1.6 system-ui, "Segoe UI", "Microsoft YaHei", sans-serif; color: #93a1b5; }
.wrap { display:grid; place-items:center; gap:18px; padding:40px 0; }
h1 { font-size:13px; font-weight:600; letter-spacing:.18em; text-transform:uppercase; color:#5c6a7e; margin:0; }
#status { font-size:12px; color:#4d5a6d; letter-spacing:.08em; min-height:18px; }
#status.ready, #status[data-ready="1"] { color:#7fa8d9; }
#err { display:none; width:min(70vw,420px); aspect-ratio:5/7; place-items:center; padding:2rem;
  border:1px solid #7f8a99; border-radius:1.4rem; background:#070a0f; color:#eef3f7; text-align:center; }
%s
.card { width:min(70vw,420px); }
.subjectShadow { filter: brightness(0) saturate(0); }
</style>
</head>
<body>
<div class="wrap">
  <h1>Holographic Card &middot; Pearl / Silver</h1>
  <article id="card" class="card pending" tabindex="0" aria-label="blue pencil sketch girl holographic card">
    <div class="rotator">
      <div id="front" class="front">
        <canvas id="material" class="materialCanvas" aria-hidden="true"></canvas>
        <img id="bg" class="background" src="%s" alt="">
        <img class="subjectShadow" src="%s" alt="" aria-hidden="true">
        <img class="subject" src="%s" alt="" aria-hidden="true">
      </div>
    </div>
  </article>
  <div id="status">loading WebGL2 renderer...</div>
  <div id="err" role="alert"></div>
</div>
<script>
%s
%s
%s
%s
%s
%s
</script>
</body>
</html>
""" % (css_module, bg_uri, subject_uri, subject_uri,
       tex_js, optical, palette, pointer, engine, controller)

# status ready hook
html = html.replace("statusEl.textContent = 'READY - move your pointer across the card';",
                    "statusEl.textContent = 'READY - move your pointer across the card'; statusEl.setAttribute('data-ready','1');")

out_path = OUT / "holographic-card.html"
out_path.write_text(html, encoding="utf-8")
print(f"written {out_path} ({out_path.stat().st_size/1024:.0f} KB)")
