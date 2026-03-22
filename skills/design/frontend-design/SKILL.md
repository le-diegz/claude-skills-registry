---
name: frontend-design
description: Builds production-grade frontend interfaces with intentional, distinctive aesthetics instead of generic AI output.
---

## When to use this skill

Use this skill when:
- The user asks to create a landing page, dashboard, UI component, or any interface where visual quality is part of the deliverable.
- The user says "build", "create", "design", or "make" and the output is a visible frontend.
- The user wants something that looks professional, polished, or memorable.

Do not use this skill when:
- The user is debugging or patching existing CSS without redesigning anything.
- The user explicitly asks for an unstyled, utility-only, or skeleton component.
- The task is purely structural (e.g. "add a form field to this page").

---

## Instructions

### Step 1 — Choose an aesthetic direction before writing a single line of code

Before touching HTML or CSS, decide on one specific aesthetic direction. Name it internally so every decision that follows is grounded in it. Examples of concrete directions:

- "Editorial brutalism: heavy weight type, raw borders, high contrast, no decoration"
- "Quiet luxury: generous whitespace, muted stone palette, single serif font, no shadows"
- "Dark technical: near-black background, monospace accents, neon green data highlights"
- "Organic warmth: off-white paper texture, variable-weight humanist sans, terracotta accents"

Do not pick a direction after writing the code. The direction must constrain every subsequent decision. If no direction comes to mind, output one sentence describing the product's personality before proceeding.

Directions to refuse: "modern", "clean", "minimal", "professional". These are not aesthetic directions — they are the absence of one. If you find yourself about to write one of these words, stop and replace it with something specific.

### Step 2 — Typography: be decisive, be distinctive

Load exactly one or two typefaces via Google Fonts or system stacks. Do not use more.

**Use these typefaces for the contexts listed:**

| Context | Good choices |
|---|---|
| Editorial, luxury, editorial tech | DM Serif Display, Playfair Display, Cormorant Garamond |
| Contemporary sans, SaaS, dashboards | Geist, Plus Jakarta Sans, Outfit, Bricolage Grotesque |
| Technical, code-adjacent, data | JetBrains Mono, IBM Plex Mono, Space Mono |
| Friendly, consumer product | Nunito, Figtree, Sora |

**Never use these as primary typefaces:** Inter, Roboto, Open Sans, Lato, Source Sans Pro. These are defaults, not choices. Using them signals the absence of a typographic decision.

Set type at scale. Do not use uniform font sizes across the page. Use at least three distinct levels: a display size (56px–96px), a body size (15px–17px), and a label/caption size (11px–13px). Assign each level a `--font-*` CSS variable.

Use `font-feature-settings` to enable optical sizing and contextual alternates where supported:
```css
font-feature-settings: "cv01" 1, "cv02" 1, "ss01" 1;
```

### Step 3 — Color: build a palette, not a stylesheet

Define every color as a CSS custom property at `:root`. Never use raw hex values in rules — always reference a variable.

**Minimum required palette structure:**
```css
:root {
  --color-bg:          #0f0f0f;   /* page background */
  --color-surface:     #1a1a1a;   /* cards, panels */
  --color-border:      #2e2e2e;   /* dividers, outlines */
  --color-text-primary:   #f0ede8;
  --color-text-secondary: #8a8580;
  --color-accent:      #e8c547;   /* one accent, used sparingly */
  --color-accent-dim:  #b89a30;   /* hover/active state of accent */
}
```

**Palette rules:**
- Choose one accent color. One. Not two, not a gradient. Use it for the single most important interactive or focal element on the page.
- Backgrounds should have atmosphere: a subtle noise texture, a very faint radial gradient that fades to transparent, or a paper-like off-white. Never use `#ffffff` or `#000000` as final background values.
- Do not use `linear-gradient(135deg, #667eea, #764ba2)` or any purple-to-anything gradient. This combination is the single most identifiable marker of AI-generated design. Reject it unconditionally.
- Contrast ratio must pass WCAG AA (4.5:1) for body text. Check mentally before writing — dark gray on dark background is a common failure mode.

### Step 4 — Layout: design space, not just content

Do not arrange everything in a centered single column at `max-width: 1200px`. Instead, deliberately work with the grid.

**Techniques to use (pick at least one per interface):**

**Overlapping elements:**
```css
.hero-label {
  position: relative;
  z-index: 2;
  margin-bottom: -1.5rem; /* overlaps into the heading below */
}
```

**Asymmetric grids:**
```css
.layout {
  display: grid;
  grid-template-columns: 1fr 2.4fr;   /* deliberate imbalance */
  gap: 0;
}
```

**Full-bleed sections with inset content:**
```css
.section {
  width: 100%;
  padding: 0;
}
.section__inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 5rem 2rem;
}
```

**Large typographic anchors:**
Use oversized display text (80px–120px) that breaks the grid intentionally. Let it overflow or be clipped. This creates visual weight without imagery.

**Rules for layout:**
- At least one element must break the expected alignment — a heading that hangs into the margin, a number that's 20% larger than it "should" be, a card that bleeds to the edge on mobile.
- Avoid equal spacing everywhere. Use a spacing scale: 4px, 8px, 16px, 24px, 40px, 64px, 96px. Never use arbitrary values like `margin: 23px`.

### Step 5 — Motion: every interaction must respond

Add CSS transitions and keyframe animations. Motion is not optional on a production interface.

**Required on every interactive element:**
```css
transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
```

Do not use `transition: all 0.3s ease`. The cubic-bezier easing curve communicates precision. `ease` communicates laziness.

**On-load entrance animations — use for key elements only (hero, first card, nav):**
```css
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

.hero {
  animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
}
```

**Stagger children for lists and grids:**
```css
.card:nth-child(1) { animation-delay: 0ms; }
.card:nth-child(2) { animation-delay: 80ms; }
.card:nth-child(3) { animation-delay: 160ms; }
```

**Hover states must be meaningful**, not just a color swap:
```css
.button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.2);
}
```

Respect `prefers-reduced-motion`:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Step 6 — Atmosphere: backgrounds and texture

Flat solid backgrounds make interfaces look like mockups. Add depth with at least one of:

**SVG noise texture (preferred — pure CSS, no external asset):**
```css
.bg-noise {
  background-image:
    url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
  background-size: 256px 256px;
}
```

**Radial gradient vignette:**
```css
background: radial-gradient(ellipse 80% 60% at 50% 0%, #1e2a1a 0%, #0d0d0d 100%);
```

**CSS grid lines (data/technical aesthetic):**
```css
background-image:
  linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
  linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
background-size: 40px 40px;
```

### Step 7 — Output format

Output a single, self-contained HTML file with all CSS in a `<style>` block in `<head>`. No external CSS frameworks. No JavaScript frameworks. Plain HTML and CSS only unless the user's codebase requires otherwise.

Structure your output as:
1. One paragraph naming the aesthetic direction you chose and why it fits the product
2. The complete HTML file

The paragraph must be concrete: "I chose an editorial brutalist direction because analytics tools are used by power users who value density and directness over approachability." Not: "I chose a clean modern design."

---

## Examples

**Input:**
> Create a pricing page for a developer tool called Forge CLI.

**Output:**

Direction chosen: dark technical — monospace font for data elements, near-black background with a faint grid texture, a single acid-green accent for the recommended plan. Forge CLI is used by engineers in terminal environments; the pricing page should feel like an extension of that world, not a departure from it.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Forge CLI — Pricing</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Geist:wght@300;500;700&display=swap" rel="stylesheet">
<style>
  :root {
    --bg:           #0a0a0a;
    --surface:      #111111;
    --border:       #1f1f1f;
    --text:         #e8e6e0;
    --muted:        #5a5855;
    --accent:       #a3e635;
    --accent-dim:   #84bf26;
    --font-mono:    'JetBrains Mono', monospace;
    --font-sans:    'Geist', system-ui, sans-serif;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: var(--bg);
    background-image:
      linear-gradient(var(--border) 1px, transparent 1px),
      linear-gradient(90deg, var(--border) 1px, transparent 1px);
    background-size: 48px 48px;
    color: var(--text);
    font-family: var(--font-sans);
    min-height: 100vh;
  }

  .header {
    padding: 2rem;
    border-bottom: 1px solid var(--border);
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--muted);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    animation: fadeDown 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .hero {
    padding: 6rem 2rem 4rem;
    max-width: 900px;
    margin: 0 auto;
    animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both;
  }

  .eyebrow {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--accent);
    letter-spacing: 0.15em;
    text-transform: uppercase;
    margin-bottom: 1.5rem;
  }

  h1 {
    font-size: clamp(3rem, 7vw, 5.5rem);
    font-weight: 700;
    line-height: 0.95;
    letter-spacing: -0.03em;
    margin-bottom: 1.5rem;
  }

  .plans {
    display: grid;
    grid-template-columns: 1fr 1.15fr 1fr;
    gap: 1px;
    background: var(--border);
    max-width: 900px;
    margin: 0 auto 6rem;
    border: 1px solid var(--border);
  }

  .plan {
    background: var(--surface);
    padding: 2.5rem;
    animation: fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .plan:nth-child(1) { animation-delay: 0.2s; }
  .plan:nth-child(2) { animation-delay: 0.3s; background: #101410; }
  .plan:nth-child(3) { animation-delay: 0.4s; }

  .plan__name {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--muted);
    margin-bottom: 1.5rem;
  }

  .plan--featured .plan__name { color: var(--accent); }

  .plan__price {
    font-size: 3rem;
    font-weight: 700;
    letter-spacing: -0.03em;
    line-height: 1;
    margin-bottom: 0.5rem;
  }

  .cta {
    display: inline-block;
    margin-top: 2rem;
    padding: 0.7rem 1.5rem;
    font-family: var(--font-mono);
    font-size: 0.8rem;
    border: 1px solid var(--border);
    color: var(--muted);
    text-decoration: none;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .cta:hover { border-color: var(--text); color: var(--text); transform: translateY(-1px); }

  .cta--featured {
    background: var(--accent);
    border-color: var(--accent);
    color: #0a0a0a;
  }

  .cta--featured:hover { background: var(--accent-dim); border-color: var(--accent-dim); color: #0a0a0a; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeDown {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
  }
</style>
</head>
<body>
  <header class="header">forge cli / pricing</header>

  <section class="hero">
    <p class="eyebrow">$ forge --plan</p>
    <h1>Pay for what<br>you ship.</h1>
  </section>

  <section class="plans">
    <div class="plan">
      <p class="plan__name">Free</p>
      <p class="plan__price">$0</p>
      <a href="#" class="cta">Get started</a>
    </div>
    <div class="plan plan--featured">
      <p class="plan__name">Pro</p>
      <p class="plan__price">$19</p>
      <a href="#" class="cta cta--featured">Start trial</a>
    </div>
    <div class="plan">
      <p class="plan__name">Team</p>
      <p class="plan__price">$49</p>
      <a href="#" class="cta">Contact us</a>
    </div>
  </section>
</body>
</html>
```

---

## What to avoid

- Do not use Inter, Roboto, Open Sans, Lato, or Source Sans Pro as the primary typeface. These are browser defaults presented as design decisions. Replace them.
- Do not use `linear-gradient(135deg, #667eea 0%, #764ba2 100%)` or any purple-to-purple gradient. This is the single most recognizable marker of AI-generated design. Never write it.
- Do not use `transition: all 0.3s ease` on everything. Reserve transitions for interactive elements and use specific properties (`transform`, `opacity`, `box-shadow`) rather than `all`.
- Do not produce a centered single-column layout where every element has the same left alignment and the same margin-bottom. This is the default browser document, not a designed interface.
- Do not name the aesthetic direction "modern", "clean", "minimal", or "professional". These are not directions — they are the absence of a decision.
- Do not use `#ffffff` or `#000000` as final background or text values. Pure white and pure black read as placeholders. Use `#f5f3ef` over `#ffffff`; use `#0d0d0d` over `#000000`.
- Do not generate shadow values with `box-shadow: 0 4px 6px rgba(0,0,0,0.1)`. This is the Tailwind default copied verbatim. Design the shadow to match the aesthetic: crisper for brutal/editorial, softer and larger-spread for luxury, colored for dark/neon palettes.
- Do not add animations "as decoration". Every animation must serve a purpose: entrance (draw attention), response to interaction (confirm feedback), or loading state (indicate progress).
- Do not produce a green CTA button on a white background with Inter and a hero image placeholder. This is the platonic AI interface and it must not exist in this registry.
