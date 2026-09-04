---
name: web-design-guidelines
description: Modern web design standards derived from Vercel Labs, covering performance-first UI, responsive layouts, image optimization, accessibility (WCAG AA), and clean typography.
---

# Web Design Guidelines (Performance & UI/UX Best Practices)

Use this skill to guide frontend architecture, image loading performance, and responsive layout decisions.

## 1. Asset & Image Loading Performance
- **Modern Formats**: Always prefer `.webp` or `.avif` over raw `.jpg` or `.png`. Compress images to appropriate display resolution (never serve 2000px images for 350px cards).
- **Above-The-Fold Eager Loading**: Images visible immediately on screen load should use `loading="eager"`, `fetchpriority="high"`, and `decoding="async"`. Avoid `loading="lazy"` on above-the-fold content as it delays initial paint.
- **Preloading Critical Assets**: For key visual assets, use `<link rel="preload" as="image" href="..." type="image/webp" fetchpriority="high">` in `<head>`.
- **Graceful Fallbacks**: Provide immediate fallback behavior for network drops using `onerror` handlers.

## 2. Layout & Typography Rules
- **Text Wrap Protection**: Apply `text-wrap: balance` on headings to prevent single-word wrap breaks. Apply `whitespace-nowrap` on action buttons with short labels (e.g. "详情说明", "下载") to prevent mid-word layout wrapping.
- **Responsive Flex/Grid Hierarchies**: Ensure card action bars use flex wrapping (`flex-wrap`) with `justify-between` and clear gaps so mobile screens don't compress action buttons.
- **Contrast & Accessibility (WCAG 2.2 AA)**:
  - Text on light backgrounds must have contrast ratio >= 4.5:1.
  - Interactive elements must maintain visible focus rings (`:focus-visible`).
  - Dark mode backgrounds should avoid muddy gray; use solid, deep tones (`#090d16` or `#0a0a0a`).

## 3. Interaction & Animation Restraint
- **Speed**: Snappy UI with transitions between 120ms and 200ms.
- **Reduced Motion Support**: Always include `@media (prefers-reduced-motion: reduce)` rules to eliminate decorative animations for users with vestibular sensitivities.
