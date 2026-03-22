The response must open with one paragraph naming a specific, concrete aesthetic direction for Flow. The paragraph must not contain the words "modern", "clean", "minimal", or "professional" as the direction — it must use a descriptive phrase like "editorial grid with variable-weight display type and a single earthy accent" or "high-contrast monochrome with oversized numerals and a brutalist grid".

The HTML/CSS output must satisfy all of the following:

1. **Typeface**: The primary font is loaded via a `<link>` to Google Fonts or defined as a system font stack. It must NOT be Inter, Roboto, Open Sans, Lato, or Source Sans Pro. A font name must be explicitly present in the CSS `font-family` declaration.

2. **Color palette as CSS variables**: All color values are defined as CSS custom properties on `:root`. No raw hex values appear inside CSS rules outside of `:root`.

3. **No purple gradient**: The string `#667eea`, `#764ba2`, and the phrase `purple` must not appear anywhere in the output.

4. **Background atmosphere**: The `body` or a wrapping element has either a `background-image` (noise texture, grid lines, or radial gradient), OR a background color that is not pure `#ffffff` or `#000000`.

5. **Asymmetry or layout tension**: At least one of the following is present:
   - A CSS grid with unequal column ratios (not `1fr 1fr`)
   - An element with negative margin creating overlap
   - An oversized display heading (font-size ≥ 64px or `clamp(...)` with a max ≥ 64px)
   - An element that visually bleeds to the edge of its container

6. **Animation**: At least one `@keyframes` block is defined and applied to an element. The animation must be functional (opacity, transform, or both). A `prefers-reduced-motion` media query must be present.

7. **Transition on interactive element**: The CTA button or primary link includes `transition:` with a `cubic-bezier` easing value. It must not be `ease`, `ease-in`, `ease-out`, or `linear` alone.

8. **Hover state beyond color swap**: The CTA button's `:hover` state includes at least one of: `transform`, `box-shadow`, or a change to `border-color` in addition to any color change.

### Automatic failure conditions

The response fails the eval if any of the following are found in the output:

- `font-family` includes `Inter`, `Roboto`, `'Open Sans'`, `Lato`, or `'Source Sans Pro'` as the first or only font
- `background: linear-gradient(135deg, #667eea` or any variant appears
- No `@keyframes` block is present
- `transition: all 0.3s ease` is used without a more specific transition on the same element
- The aesthetic direction paragraph is absent, or describes the direction as "modern", "clean", "minimal", or "professional"
- All elements share the same `font-size` (no typographic hierarchy)
- `background-color: #ffffff` or `background: white` on `body` without any texture or secondary background layer
