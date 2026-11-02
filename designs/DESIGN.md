---
name: TripSplit
colors:
  surface: '#f3fcf4'
  surface-dim: '#d3dcd5'
  surface-bright: '#f3fcf4'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#edf6ee'
  surface-container: '#e7f0e9'
  surface-container-high: '#e1eae3'
  surface-container-highest: '#dce5dd'
  on-surface: '#151d19'
  on-surface-variant: '#3f4943'
  inverse-surface: '#2a322d'
  inverse-on-surface: '#eaf3ec'
  outline: '#6f7a73'
  outline-variant: '#bec9c1'
  surface-tint: '#006c4c'
  primary: '#005138'
  on-primary: '#ffffff'
  primary-container: '#006c4c'
  on-primary-container: '#93eac2'
  inverse-primary: '#81d7b0'
  secondary: '#6750a4'
  on-secondary: '#ffffff'
  secondary-container: '#bba2fd'
  on-secondary-container: '#4b3486'
  tertiary: '#004e58'
  on-tertiary: '#ffffff'
  tertiary-container: '#006874'
  on-tertiary-container: '#97e4f2'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#9df4cb'
  primary-fixed-dim: '#81d7b0'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#005138'
  secondary-fixed: '#e9ddff'
  secondary-fixed-dim: '#cfbcff'
  on-secondary-fixed: '#22005d'
  on-secondary-fixed-variant: '#4f378a'
  tertiary-fixed: '#a2effd'
  tertiary-fixed-dim: '#85d2e0'
  on-tertiary-fixed: '#001f24'
  on-tertiary-fixed-variant: '#004f58'
  background: '#f3fcf4'
  on-background: '#151d19'
  surface-variant: '#dce5dd'
typography:
  display-lg:
    fontFamily: Roboto Flex
    fontSize: 57px
    fontWeight: '400'
    lineHeight: 64px
    letterSpacing: -0.25px
  display-lg-mobile:
    fontFamily: Roboto Flex
    fontSize: 40px
    fontWeight: '500'
    lineHeight: 48px
    letterSpacing: -0.2px
  display-md:
    fontFamily: Roboto Flex
    fontSize: 45px
    fontWeight: '400'
    lineHeight: 52px
  display-sm:
    fontFamily: Roboto Flex
    fontSize: 36px
    fontWeight: '400'
    lineHeight: 44px
  headline-lg:
    fontFamily: Roboto Flex
    fontSize: 32px
    fontWeight: '500'
    lineHeight: 40px
  headline-md:
    fontFamily: Roboto Flex
    fontSize: 28px
    fontWeight: '500'
    lineHeight: 36px
  headline-sm:
    fontFamily: Roboto Flex
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
  title-lg:
    fontFamily: Roboto Flex
    fontSize: 22px
    fontWeight: '500'
    lineHeight: 28px
  title-md:
    fontFamily: Roboto Flex
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0.15px
  title-sm:
    fontFamily: Roboto Flex
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.1px
  body-lg:
    fontFamily: Roboto Flex
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0.5px
  body-md:
    fontFamily: Roboto Flex
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0.25px
  body-sm:
    fontFamily: Roboto Flex
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.4px
  label-lg:
    fontFamily: Roboto Flex
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.1px
  label-md:
    fontFamily: Roboto Flex
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.5px
  label-sm:
    fontFamily: Roboto Flex
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.5px
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

The design system establishes a fluid, tactile, and expressive mobile-first experience built firmly on Material Design 3 (Material You) principles. Engineered for cooperative group travel and shared expense clarity, the visual personality balances playful approachability with analytical precision. 

The aesthetic is Modern Pastel Material: grounded in soft, airy, tinted foundation surfaces paired with deeply saturated jewel-tone botanical accents. It eliminates financial friction and anxiety through calm, optimistic color relationships, tactile surface containers, and generously rounded geometries. Visual depth relies on subtle tonal surface shifts rather than harsh drop shadows, creating an inviting, thumb-friendly tactile environment optimized for quick on-the-go reconciliation.

## Colors

The palette leverages Material Design 3 dynamic tonal relationships, anchored by deep mint/emerald (`#006C4C`) and rich tonal indigo (`#6750A4`). Soft tinted containers provide functional visual hierarchy without visual noise:

- **Primary & Tonal Family (`#006C4C`)**: Directs key interactions, primary Floating Action Buttons (FAB), affirmative ledger states ("You are owed"), and major totals. Tonal container: `#89F8C7` (light tint `#D6F5E8`, text on container `#002114`).
- **Secondary Family (`#6750A4`)**: Applied to cooperative elements, trip settings, participant avatars, and multi-user splits. Secondary container: `#EADDFF` (text on container `#21005D`).
- **Tertiary Family (`#006874` / `#386A20`)**: Manages contextual expense categories, travel logistics, and secondary metrics. Containers use `#97F0FF` and `#B7F397` respectively.
- **Surface Elevation Hierarchy**:
  - `surface`: `#FBFDF9` (baseline screen background)
  - `surface-container-lowest`: `#FFFFFF` (isolated modal/input cutouts)
  - `surface-container-low`: `#F2F5F0` (recessed track areas)
  - `surface-container`: `#ECEFEA` (standard list backgrounds)
  - `surface-container-high`: `#E6E9E4` (unselected cards, grouped modules)
  - `surface-container-highest`: `#E0E4DE` (dividers, muted segment wells)
- **Semantic Status**: Negative/debt ("You owe") uses Crimson (`#BA1A1A`, container `#FFDAD6`); positive/credit uses Mint (`#006C4C`, container `#D6F5E8`).

## Typography

The type system uses **Roboto Flex** across all structural levels, mirroring the Android Material You native posture with geometric legibility and dynamic adjustments. 

- Large financial sums and currency balances prioritize `display-lg-mobile` and `headline-lg` with tight numerical tabular lining for cross-row scanability.
- Section dividers, trip headers, and modal titles rely on `title-lg` and `title-md`.
- Ledger transactions, receipt metadata, and itemized breakdowns utilize `body-lg` and `body-md` for sustained legibility under high information density.
- Category indicators, pill badges, and status labels map to `label-md` and `label-sm` with widened letter-spacing (`0.5px`) for contrast against tinted pastel chips.

## Layout & Spacing

The layout is built around a mobile-first 4-column grid spanning a standard phone canvas (360dp–412dp), adapting to 8 columns on foldables/tablets and 12 columns on large displays:

- **Mobile Viewport Grid**: 4 columns with `16px` (`1rem`) gutters and `16px` (`1rem`) screen edge margins. All interactive touch targets strictly maintain a minimum size of `48px x 48px`.
- **Rhythm & Padding**: Vertical rhythm is governed by an 8dp baseline grid (`space-xs` = 4px, `space-sm` = 8px, `space-md` = 16px, `space-lg` = 24px, `space-xl` = 32px).
- **Navigation Insets**: Canvas elements respect system-level gestures, providing `80px` clear elevation at the viewport base to accommodate the standard Material 3 Navigation Bar, along with `16px` lateral clearance for the Floating Action Button.

## Elevation & Depth

In alignment with Material 3, the design system avoids heavy structural drop shadows, using **tonal elevation** as the primary layer separator. Surfaces receive variable color tinting from the Primary palette as elevation increases:

- **Level 0 (Flat)**: `surface` (`#FBFDF9`) — Root canvas and scrolling viewports. Zero drop shadow.
- **Level 1 (Low Container)**: `surface-container-low` (`#F2F5F0`) — Inactive cards, transaction history rows, search bars. Subtle shadow: `0px 1px 3px 1px rgba(0, 108, 76, 0.05)`.
- **Level 2 (Raised Cards)**: `surface-container` (`#ECEFEA`) — Active trip cards, interactive expense modules. Shadow: `0px 2px 6px 2px rgba(0, 0, 0, 0.06)`.
- **Level 3 (Interactive Floating Elements)**: Floating Action Buttons (FAB) and dynamic bottom sheets utilize primary/secondary tonal fills paired with `0px 4px 8px 3px rgba(0, 0, 0, 0.10)`.
- **Level 4 & 5 (Modals & Pickers)**: Modal bottom sheets and split configuration dialogs use `surface-container-high` (`#E6E9E4`) with `0px 8px 12px 6px rgba(0, 0, 0, 0.12)`.

## Shapes

The design system uses high-radius pill curvature (Level 3), accentuating Material You's organic, friendly geometry:

- **Full Pill (`rounded-full` / 9999px)**: Floating Action Buttons, segmented control pills, category chips, status badges, avatar bounding rings, and primary action buttons.
- **Extra Large (`28px` / `rounded-3xl`)**: Bottom sheets, modal dialog enclosures, and focused entry surfaces.
- **Large (`16px` to `24px` / `rounded-2xl`)**: Trip summary cards, individual expense items, and breakdown containers.
- **Medium (`12px` / `rounded-xl`)**: Text input text boxes and segment option containers.

## Components

### Buttons & FAB
- **Filled Primary Button**: Height 40dp, pill-shaped (9999px radius), filled with `#006C4C`, text/icon `#FFFFFF`. Elevation Level 0 resting, Level 1 on press.
- **Tonal Button**: Filled with Primary Container `#D6F5E8`, text `#002114`. Used for non-destructive secondary actions like "Add Receipt".
- **Floating Action Button (FAB)**: Primary standard FAB (56x56dp) or Extended FAB (height 56dp, pill-shaped) filled with Primary Container `#89F8C7` or Secondary Container `#EADDFF`, elevation Level 3. Always anchored 16dp above the bottom navigation bar.

### Chips & Badges
- **Category Chips**: Height 32dp, pill-shaped, surface `#F2F5F0` with a 1dp border `#707973` at 20% opacity. When active, shifts to Category Pastel Fill (e.g., Food `#EADDFF`, Transit `#97F0FF`, Lodging `#B7F397`) with bold icon and label.
- **Status Badges**: Mini-pills (height 24dp, horizontal padding 8dp) indicating balance status: `#D6F5E8` container for "Settled/Owed", `#FFDAD6` container for "Owes You".

### Inputs & Text Fields
- **Filled Input**: Background `#ECEFEA`, top-only rounded corners (12dp) transitioning down to an active indicator line (2dp `#006C4C` when focused).
- **Outlined Input**: 12dp border radius, 1dp border `#707973` resting, shifting to 2dp `#006C4C` upon focus, floating label in `label-md`.
- **Currency Field**: Display-style numerical input with auto-formatting, anchored with prominent currency prefix in `headline-md`.

### Segmented Buttons
- **Split Configuration Segment**: Multi-option pill track (e.g., "Equally", "Unequally", "By Shares"). Height 40dp, container `#E0E4DE`. The selected segment animates with a full-pill container `#006C4C`, label `#FFFFFF`, unselected label `#404943`.

### Cards & Lists
- **Trip Card**: 20dp border-radius, background `surface-container-low` (`#F2F5F0`), no border, elevation Level 1. Content organized into distinct balance and participant clusters.
- **Expense List Tile**: 16dp rounded card, horizontal padding 16dp, vertical padding 12dp. Left-anchored 40dp category icon circle, centered two-line title/timestamp, right-aligned amount displaying green (`#006C4C`) or dark red (`#BA1A1A`) depending on personal balance impact.

### Navigation Bar
- **M3 Bottom Navigation**: Height 80dp, container `#F2F5F0`. Selected item indicated by an active pill-shaped indicator (`#D6F5E8`, 64x32dp) surrounding the active icon, paired with `label-md` bold caption below.
