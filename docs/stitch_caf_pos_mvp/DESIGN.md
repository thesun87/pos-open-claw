---
name: Obsidian — High-Contrast Light
colors:
  surface: '#fbf8ff'
  surface-dim: '#d9d8e9'
  surface-bright: '#fbf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f2fe'
  surface-container: '#eeecfa'
  surface-container-high: '#e8e7f5'
  surface-container-highest: '#e2e1f2'
  on-surface: '#30323e'
  on-surface-variant: '#5d5e6c'
  inverse-surface: '#0d0e14'
  inverse-on-surface: '#9d9ca4'
  outline: '#797988'
  outline-variant: '#b1b1c0'
  surface-tint: '#684cb6'
  primary: '#684cb6'
  on-primary: '#fdf7ff'
  primary-container: '#a589f8'
  on-primary-container: '#230062'
  inverse-primary: '#a589f8'
  secondary: '#5e5e67'
  on-secondary: '#faf8ff'
  secondary-container: '#e3e1ec'
  on-secondary-container: '#515159'
  tertiary: '#006d4b'
  on-tertiary: '#e6ffef'
  tertiary-container: '#6bffc1'
  on-tertiary-container: '#006042'
  error: '#a8364b'
  on-error: '#fff7f7'
  error-container: '#f97386'
  on-error-container: '#6e0523'
  primary-fixed: '#a589f8'
  primary-fixed-dim: '#987cea'
  on-primary-fixed: '#000000'
  on-primary-fixed-variant: '#2e007c'
  secondary-fixed: '#e3e1ec'
  secondary-fixed-dim: '#d4d3dd'
  on-secondary-fixed: '#3e3f47'
  on-secondary-fixed-variant: '#5a5b63'
  tertiary-fixed: '#6bffc1'
  tertiary-fixed-dim: '#5af0b4'
  on-tertiary-fixed: '#004b33'
  on-tertiary-fixed-variant: '#006b4a'
  primary-dim: '#5b3fa9'
  secondary-dim: '#52525b'
  tertiary-dim: '#005f41'
  error-dim: '#6b0221'
  background: '#fbf8ff'
  on-background: '#30323e'
  surface-variant: '#e2e1f2'
typography:
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  body-md:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
---

# Obsidian — High-Contrast Light

## North Star: "Precision in Light"
Developer-grade light UI. High-clarity white surfaces, crisp zinc-gray text, and precise accent colors. Clean, fast-feeling, and functional.

## Colors
- **Primary (`#a78bfa`):** Soft violet — interactive elements, links, focus rings.
- **Background (`#ffffff`):** Pure white for maximum clarity.
- **Tertiary (`#34d399`):** Emerald green — success states, positive indicators, code highlights.
- **Surface scale:** Zinc-based grays (`#f4f4f5` → `#d4d4d8`). Subtle darkening for nested elements.
- Red (`#ef4444`) for errors only. No decorative color use.

## Typography
- **All fonts:** Geist — modern, clean, developer-friendly.
- Tight letter-spacing on headings (-0.02em). Standard on body.
- `#18181b` for primary text, `#71717a` for secondary. High contrast always.

## Elevation
- Minimal shadows. Use border-based separation: `1px solid #e4e4e7`.
- Active/hover states: subtle background shifts to darker surface tiers (e.g., from White to Zinc-100).
- Focus rings: `2px solid #a78bfa` with `2px offset`.

## Components
- **Buttons:** Primary = solid violet fill with white text. Secondary = transparent + Zinc-300 border. Ghost = text only, visible on hover.
- **Cards:** `surface_container` (white) background, thin `outline_variant` border, 8px radius.
- **Inputs:** `surface_container` (off-white) fill, `outline_variant` border, violet focus ring.
- **Code blocks:** `surface_container_highest` (light gray) background, monospace font.

## Rules
- Never use dark backgrounds for main content. Maintain zinc gray consistency.
- Borders over shadows for separation. Keep the interface flat and precise.
- Accent colors for function, never decoration.