---
name: impeccable
description: Use when the user wants to design, redesign, shape, critique, audit, polish, clarify, distill, harden, optimize, adapt, animate, colorize, extract, or otherwise improve a frontend interface. Covers websites, landing pages, dashboards, product UI, app shells, components, forms, settings, onboarding, and empty states. Handles UX review, visual hierarchy, information architecture, cognitive load, accessibility, performance, responsive behavior, theming, anti-patterns, typography, fonts, spacing, layout, alignment, color, motion, micro-interactions, UX copy, error states, edge cases, i18n, and reusable design systems or tokens. Also use for bland designs that need to become bolder or more delightful, loud designs that should become quieter, live browser iteration on UI elements, or ambitious visual effects that should feel technically extraordinary. Not for backend-only or non-UI tasks.
---

Designs and iterates production-grade frontend interfaces. Real working code, committed design choices, exceptional craft.

Two steps before any design work. Both are required. Skipping either produces generic output that ignores the project.

### 1. Context gathering
Two files at the project root, case-insensitive:

- **PRODUCT.md** — required. Users, brand, tone, anti-references, strategic principles.
- **DESIGN.md** — optional, strongly recommended. Colors, typography, elevation, components.

### 2. Register
Every design task is **brand** (marketing, landing, campaign, long-form content, portfolio — design IS the product) or **product** (app UI, admin, dashboard, tool — design SERVES the product).

### Color
- Use OKLCH. Reduce chroma as lightness approaches 0 or 100 — high chroma at extremes looks garish.
- Never use `#000` or `#fff`. Tint every neutral toward the brand hue (chroma 0.005–0.01 is enough).
- Pick a **color strategy** before picking colors. Four steps on the commitment axis:
  - **Restrained** — tinted neutrals + one accent ≤10%. Product default; brand minimalism.
  - **Committed** — one saturated color carries 30–60% of the surface. Brand default for identity-driven pages.
  - **Full palette** — 3–4 named roles, each used deliberately. Brand campaigns; product data viz.
  - **Drenched** — the surface IS the color. Brand heroes, campaign pages.

### Theme
Dark vs. light is never a default. Not dark "because tools look cool dark." Not light "to be safe."
Before choosing, write one sentence of physical scene: who uses this, where, under what ambient light, in what mood.

### Typography
- Cap body line length at 65–75ch.
- Hierarchy through scale + weight contrast (≥1.25 ratio between steps). Avoid flat scales.

### Layout
- Vary spacing for rhythm. Same padding everywhere is monotony.
- Cards are the lazy answer. Use them only when they're truly the best affordance. Nested cards are always wrong.
- Don't wrap everything in a container. Most things don't need one.

### Motion
- Don't animate CSS layout properties.
- Ease out with exponential curves (ease-out-quart / quint / expo). No bounce, no elastic.

### Absolute bans
Match-and-refuse. If you're about to write any of these, rewrite the element with different structure.
- **Side-stripe borders.** `border-left` or `border-right` greater than 1px.
- **Gradient text.** `background-clip: text`.
- **Glassmorphism as default.**
- **The hero-metric template.** Big number, small label.
- **Identical card grids.**
- **Modal as first thought.**

### Copy
- Every word earns its place.
- **No em dashes.** Use commas, colons, semicolons, periods, or parentheses. Also not `--`.

### The AI slop test
If someone could look at this interface and say "AI made that" without doubt, it's failed.
