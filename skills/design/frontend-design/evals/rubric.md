# Evaluation Rubric — frontend-design

Each criterion is independently verifiable by reading the HTML/CSS output.
"Required" failures block acceptance. "Recommended" failures are warnings.

---

## Required (all must pass)

### Aesthetic direction
- [ ] The response opens with a paragraph naming the aesthetic direction chosen.
      The paragraph must not use "modern", "clean", "minimal", or "professional"
      as the direction. It must describe the direction in specific visual terms
      (e.g. "editorial brutalism", "quiet luxury", "dark technical").
- [ ] The aesthetic direction is consistent with the product described in the input.
      A children's toy app and a developer monitoring tool should produce visibly
      different directions.

### Typography
- [ ] A named typeface is explicitly loaded or declared. The font name appears in
      a `<link>` tag or `@import`, and in the CSS `font-family`.
- [ ] The primary typeface is NOT Inter, Roboto, Open Sans, Lato, or Source Sans Pro.
      These strings must not appear as the first item in any `font-family` stack for
      headings or body text.
- [ ] The output contains at least two distinct font-size levels with a difference
      of at least 24px between the largest and smallest text element.
- [ ] The display/heading font-size is at least 40px (or uses `clamp()` with a
      minimum of 2.5rem).

### Color
- [ ] All color values are defined as CSS custom properties on `:root`.
      No raw hex values (e.g. `#3b82f6`) appear in CSS rules outside of `:root`.
- [ ] The strings `#667eea`, `#764ba2`, and the word `purple` do not appear
      anywhere in the output.
- [ ] The background is not pure white (`#ffffff`, `rgb(255,255,255)`, `white`)
      unless a `background-image` texture or overlay is applied on the same element.
- [ ] The background is not pure black (`#000000`, `rgb(0,0,0)`, `black`)
      unless modified with a texture, gradient, or noise layer.
- [ ] A single accent color is used. No more than one hue is used for primary
      interactive and focal elements.

### Layout
- [ ] The layout is not a single centered column with uniform left-alignment.
      At least one of the following must be present:
      - CSS grid with non-equal column widths
      - Negative margin creating element overlap
      - An element positioned to bleed to the container edge
      - Oversized display text (≥ 64px) that breaks the text column

### Motion
- [ ] At least one `@keyframes` animation is defined and applied to a visible element.
- [ ] At least one interactive element has a `:hover` state that goes beyond a
      color change (must include `transform` or `box-shadow` change).
- [ ] `transition:` on interactive elements uses a `cubic-bezier()` easing function.
      `ease`, `ease-in`, `ease-out`, and `linear` alone are not acceptable for
      primary CTAs.
- [ ] A `@media (prefers-reduced-motion: reduce)` block is present and disables
      animations and transitions.

### Output format
- [ ] Output is a single self-contained HTML file with CSS in a `<style>` block.
- [ ] No external CSS frameworks are loaded (no Bootstrap, Tailwind CDN, Bulma, etc.).
- [ ] The file is syntactically valid HTML (head, body, properly closed tags).

---

## Recommended (failure is a warning, not a block)

### Typography
- [ ] `font-feature-settings` or `font-variant` is used to enable optical features
      on display text.
- [ ] A third size level (label/caption at 11–13px) is present alongside display
      and body sizes.

### Color
- [ ] Text contrast ratio is visually plausible at WCAG AA (4.5:1) for body text.
      Dark-on-dark combinations without sufficient lightness difference are a warning.

### Layout
- [ ] Spacing uses a visible scale (powers of 2, 4px base, etc.) rather than
      arbitrary values. No `margin: 23px` or `padding: 17px`.

### Motion
- [ ] Staggered animation delays are used when multiple sibling elements enter
      the viewport (cards, list items).
- [ ] On-load animations have a delay of at most 400ms on the first visible element.

### Atmosphere
- [ ] A background texture, noise layer, grid pattern, or subtle radial gradient
      is applied to the page background or a primary section.

---

## Automatic disqualification

A response is immediately rejected (regardless of other criteria) if:

1. The primary typeface is Inter, Roboto, Open Sans, Lato, or Source Sans Pro.
2. A purple-to-blue gradient (`#667eea → #764ba2` or equivalent) is present.
3. No `@keyframes` animation is defined.
4. The aesthetic direction paragraph is absent.
5. All `font-size` values are identical across heading and body text.
6. A CSS framework CDN link is present (`bootstrap`, `tailwindcss`, `bulma`).
