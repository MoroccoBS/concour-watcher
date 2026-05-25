---
name: CNCR Watcher Design System
description: A warm, clinical, and reassuring dashboard design system for Moroccan healthcare concours tracking.
colors:
  primary: "#af4c34"
  neutral-bg: "#fcfbf9"
  neutral-card: "#faf6f0"
  neutral-text: "#1c1917"
  neutral-muted: "#78716c"
  border: "#e8e3d9"
  accent-success: "#1b4d3e"
  accent-warning: "#b36b00"
  accent-info: "#2a4f6e"
  accent-match: "#581c87"
typography:
  display:
    fontFamily: "var(--font-serif), Cormorant Garamond, serif"
    fontSize: "2.75rem"
    fontWeight: 600
    lineHeight: 1.1
  headline:
    fontFamily: "var(--font-serif), Cormorant Garamond, serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.2
  title:
    fontFamily: "var(--font-sans), Inter, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "var(--font-sans), Inter, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "var(--font-mono), Geist Mono, monospace"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.05em"
rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral-bg}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "#933e2a"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  card-container:
    backgroundColor: "{colors.neutral-card}"
    rounded: "{rounded.md}"
    padding: "24px"
---

# Design System: CNCR Watcher

## 1. Overview

**Creative North Star: "The Oasis Sanctuary"**

CNCR Watcher is designed to be a calm, reassuring, and highly-fidelity dashboard for Moroccan healthcare candidates. It replaces the chaotic, stress-inducing Ministry of Health listing pages with a serene, structured workspace that feels deeply trustworthy, professional, and rapid.

### Key Characteristics:
- **Warm & Organic Palette**: Off-white, soft cream, and sandstone tones that reduce eye strain and ambient stress.
- **Micro-Precision Borders**: Extremely crisp, thin sandstone borders (`1px`) and tight grid structures inspired by Stripe.
- **Semantic Anchors**: Distinct, highly-legible status chips representing the recruitment lifecycle in highly clear, high-contrast, yet natural tones (deep forest green, terracotta rust, deep slate blue).
- **Absolute Typography Stability**: No fluid sizes or dynamic movement; fixed system-sans elements to ensure layout stability under low bandwidth and fast page rendering.

## 2. Colors

The color palette is built on warm organic neutrals, carrying a single terracotta rust accent for actions and a clear, highly-legible vocabulary for statuses.

### Primary
- **Terracotta Rust** (`#af4c34` / `oklch(0.485 0.163 48.998)`): Used exclusively for primary user actions, active text buttons, and primary status emphasis.

### Neutral
- **Sanctuary Off-White** (`#fcfbf9` / `oklch(0.99 0.002 60)`): The global canvas background.
- **Linen Warm Sand** (`#faf6f0` / `oklch(0.975 0.005 60)`): The primary container card and table background.
- **Stone Charcoal** (`#1c1917` / `oklch(0.15 0.005 60)`): Body text color, ensuring high readability and high contrast.
- **Muted Sandstone Border** (`#e8e3d9` / `oklch(0.92 0.004 60)`): All standard borders and grid lines.

### Accent / Semantic
- **Deep Emerald** (`#1b4d3e` / `oklch(0.35 0.08 160)`): Active open notices, seats available, healthy watcher statuses.
- **Muted Ochre** (`#b36b00` / `oklch(0.55 0.12 70)`): Deadlines, urgent reviews, warning heartbeats.
- **Deep Slate Blue** (`#2a4f6e` / `oklch(0.42 0.08 240)`): Official planning documents, exam dates, and updates.
- **Royal Amethyst** (`#581c87` / `oklch(0.32 0.15 290)`): Used specifically when candidate names are successfully matched in parsed PDFs.

**The One Voice Rule.** The primary terracotta accent is used on ≤10% of any given screen. Its rarity is the point.

## 3. Typography

**Display Font:** Cormorant Garamond, serif (represented by `--font-serif`)
**Body Font:** Inter, system-ui, sans-serif (represented by `--font-sans`)
**Label/Meta Font:** Geist Mono, monospace (represented by `--font-mono`)

All typographic elements are designed to be stable, readable, and highly contrastive.

### Hierarchy
- **Display** (Medium (500) to SemiBold (600), `2.75rem`, `1.1` line height): Used for large main app titles and headers to establish a beautiful, clinical-journal look.
- **Headline** (SemiBold (600), `1.75rem`, `1.2` line height): Section headings, dialog titles.
- **Title** (SemiBold (600), `1.125rem`, `1.4` line height): Card titles, notice names, document names.
- **Body** (Regular (400), `0.875rem`, `1.5` line height): All standard descriptive and informational text. Max measure capped at `70ch` for long notes.
- **Label** (SemiBold (600), `0.75rem`, uppercase, mono-spaced, `0.05em` letter spacing): Badges, meta tags, seat stats, and technical heartbeats to create deep contrast and precise data density.

## 4. Elevation

The CNCR Watcher dashboard is flat-by-default, emphasizing structured sandstone borders, clean dividing lines, and subtle background tone shifts over shadows to maintain visual speed and layout purity.

**The State Response Rule.** Surfaces are flat and structural at rest. Shadows appear only as a reaction to interactive states, such as hovering over cards or clicking dropdown menus.

### Shadow Vocabulary
- **Interactive Focus** (`0 4px 20px oklch(0 0 0 / 4%)`): Soft, ambient shadow to indicate hover focus on main concours cards.
- **Overlay Dialog** (`0 10px 40px oklch(0 0 0 / 8%)`): Medium structural shadow used to elevate details dialogs from the background.

## 5. Components

### Buttons
- **Shape:** Rounded corners with a `6px` radius (`rounded-sm`).
- **Primary:** Terracotta background (`#af4c34`), white text. Smooth `150ms` transitions.
- **Outline:** Sandstone border, terracotta text, transparent background.
- **Ghost:** Transparent background, charcoal text, soft neutral hover.

### Chips / Badges
- **Shape:** Full pill radius (`rounded-full`) or mini tag (`rounded-sm`).
- **Status Chips:** Light background tints with dark high-contrast text. Forest green for "Open", red/ochre for "Review", slate blue for "Planning".
- **Candidate Match Pill:** Deep purple background tint (`#f3e8ff`) with sharp purple text (`#581c87`) indicating candidate name matching.

### Cards
- **Shape:** Clean corners with a `10px` radius (`rounded-md`).
- **Background:** Soft warm sand (`#faf6f0`), with a thin sandstone border (`1px` border).
- **Hover State:** Subtle shadow elevation and a tiny color tint shift.

### Dialog / Modal Overlay
- **Overlay:** Muted background backdrop-filter blur (`4px` blur).
- **Container:** Sandstone card, centered, with `DialogContent` custom padding (`24px`).

## 6. Do's and Don'ts

### Do:
- **Do** use `oklch` for theme styles, keeping colors tint-shifted to match the organic sand tones.
- **Do** keep cards and grid borders thin (`1px`) and soft sandstone color (`#e8e3d9`) to avoid looking harsh.
- **Do** align metadata fields (Exam, Deadline, Place, Radiology) in clear, predictable grids with matching icons.
- **Do** show the recruitment document lifecycle clearly, sorting notice updates chronologically.

### Don't:
- **Don't** use standard cold gray (`#cbd5e1` or `#6b7280`) for borders or text; always tint them toward the warm sand tone.
- **Don't** use neon, vibrant primary buttons or heavy gradients; they break the calm oasis feel.
- **Don't** use side-stripe borders or colored left-borders on cards or alerts; use clean fully-bordered frames instead.
- **Don't** use poorly-contrasted standard fonts without a clear hierarchy; pairing Display Serif, clean Sans body, and crisp Mono is essential.
