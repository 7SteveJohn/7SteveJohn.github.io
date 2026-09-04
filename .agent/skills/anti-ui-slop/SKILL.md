---
name: anti-ui-slop
description: Enforce high-standard, product-specific UI design and eliminate generic AI aesthetic tropes (no purple/rainbow gradients, no floating glowing blobs, no excessive glassmorphism, no AI buzzword copy).
---

# Anti-UI-Slop Guidelines & Quality Gate

Use this skill whenever designing, reviewing, or refactoring frontend interfaces to eliminate generic "AI-generated" looks and enforce authentic, human-crafted design quality.

## 1. Eliminate Visual AI Cliches (Zero Tolerance)
- **NO Floating Blur Orbs / Blobs**: Never add random `blur-3xl bg-blue-500/20` glowing colored circles floating behind page content.
- **NO Excessive Glassmorphism**: Do not put `backdrop-blur-md bg-white/80` with thick semi-transparent borders on every container. Use solid, crisp background colors with subtle 1px border lines.
- **NO Unnecessary Text Animations**: Avoid letter-by-letter blur-ins, character typing effects, or slow element zooms that delay comprehension.
- **NO Rainbow Gradients on Text**: Avoid multi-stop gradients like `from-blue-600 via-purple-500 to-pink-500` for standard text or headings unless requested for a specialized gaming brand.
- **NO Flashlight / Spotlight Cursor Trackers**: Do not track mouse cursor coordinates (`--mx`, `--my`) just to draw a faint radial gradient on hover.

## 2. Eliminate Copywriting AI Cliches
- **NO Vacuous Self-Praise**: Ban phrases like "数字花园", "个人试验田", "探索新技术的全栈开发者", "致力于赋能数字化未来", "记录技术踩坑与思考随笔".
- **Grounded, Authentic Tone**: Speak plainly like an experienced engineer. Say what you build, what tools you use, and why you built it.
- **Concrete Technical Details**: Highlight real constraints (e.g. "零网络权限", "端侧 Ollama 运行", "压低 1% Low 帧生成时间抖动") instead of vague claims.

## 3. Visual Craftsmanship Standards
- **Typography**: Clean hierarchy with high contrast. Use tabular numbers for metrics (`tabular-nums`). Prevent isolated widow words with `text-wrap: balance`.
- **Spacing**: Maintain consistent padding and margin tokens (e.g. 4px, 8px, 12px, 16px, 24px, 32px).
- **Fast Micro-Interactions**: Keep transitions under 200ms (`transition: all 0.15s ease`). Micro feedback on press (`active:scale-[0.98]`).
- **Real Imagery**: Use actual software screenshots, realistic desk mockups, or minimalist icon/typography headers rather than abstract 3D sci-fi illustrations.
