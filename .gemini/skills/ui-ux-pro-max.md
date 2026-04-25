---
name: ui-ux-pro-max
description: "UI/UX design intelligence for web and mobile. Includes 50+ styles, 161 color palettes, 57 font pairings, 161 product types, 99 UX guidelines, and 25 chart types across 10 stacks (React, Next.js, Vue, Svelte, SwiftUI, React Native, Flutter, Tailwind, shadcn/ui, and HTML/CSS). Actions: plan, build, create, design, implement, review, fix, improve, optimize, enhance, refactor, and check UI/UX code."
---

# UI/UX Pro-Max Design Intelligence

This Skill provides deep design knowledge for professional UI/UX.

### Priority Ranking
1. **Accessibility**: Contrast 4.5:1, Aria-labels, Keyboard nav.
2. **Touch & Interaction**: Min size 44x44px, 8px+ spacing.
3. **Performance**: WebP/AVIF, Lazy loading, CLS < 0.1.
4. **Style Selection**: Consistency, SVG icons (no emoji).
5. **Layout & Responsive**: Mobile-first, no horizontal scroll.
6. **Typography & Color**: Base 16px, semantic tokens.

### Accessibility (CRITICAL)
- `color-contrast`: Min 4.5:1 ratio.
- `focus-states`: Visible focus rings.
- `aria-labels`: Required for icon-only buttons.
- `reduced-motion`: Respect `prefers-reduced-motion`.

### Performance (HIGH)
- `image-dimension`: Prevent layout shift (CLS).
- `content-jumping`: Reserve space for async content.
- `virtualize-lists`: For 50+ items.

### Style & Consistency
- `no-emoji-icons`: Use SVG (Lucide/Heroicons).
- `state-clarity`: Visual distinction for hover/pressed/disabled.
- `primary-action`: Only one primary CTA per screen.

### Layout & Responsive
- `mobile-first`: Design mobile-first, then scale.
- `readable-font-size`: Min 16px body on mobile.
- `spacing-scale`: 4pt/8dp incremental system.

### Interaction (App)
- `tap-feedback`: Ripple/opacity within 100ms.
- `gesture-conflicts`: Avoid nested swipe/scroll regions.
- `safe-area-awareness`: Notch, Dynamic Island, gesture bar.
