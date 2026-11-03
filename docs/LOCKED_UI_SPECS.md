# TripSplit Locked UI Specifications

## 1. Signature Curved Floating Navigation Bar (`CurvedFloatingTabBar`)
**Component**: `src/components/navigation/CurvedFloatingTabBar.tsx`  
**Layout Integration**: `app/(tabs)/_layout.tsx` via `tabBar={(props) => <CurvedFloatingTabBar {...props} />}`

### Design Rules & Geometry
* **Pill Capsule Dimensions**: 
  * Height: `60px`
  * Corner Radius: `borderRadius: 30` (full smooth capsule, never squarish)
  * Bar Color: Dark Slate / Jet Black (`#0F172A`)
  * Elevation: `12`, Shadow: `{ width: 0, height: 8 }`, `shadowOpacity: 0.35`, `shadowRadius: 14`
  * Floating Outer Margin: `left: 16`, `right: 16`, `bottom: bottomInset`
  * Horizontal Inset for Tabs: `PAD_X = 16`
* **Sliding Concentric Cutout (Scoop)**:
  * Compact Width: `64px`, Height: `26px`
  * SVG Path: `d="M 0 0 A 6 6 0 0 1 5.82 4.55 A 27 27 0 0 0 58.21 4.55 A 6 6 0 0 1 64.03 0 Z"`
  * Fill: `M3Colors.surface` (`#F3FCF4`), perfectly matching screen background with no overhang on capsule ends.
  * Uniform halo gap: exact `6px` concentric distance on all sides.
* **Unified Hardware-Accelerated Sliding**:
  * The SVG Scoop and the Elevated Active Badge are both children of `slidingScoopWrapper`.
  * Animated via `Animated.spring(translateXAnim)` with `useNativeDriver: true`.
  * Physics: `damping: 18`, `stiffness: 240`, `mass: 0.6` (ultra-fast, responsive, 60/120fps glide).
  * Scale pop: `scaleAnim` springs `0.75 -> 1` (`friction: 6`, `tension: 160`, `useNativeDriver: true`).
* **Active Circle Badge**:
  * Diameter: `42px` (`borderRadius: 21`)
  * Position: `top: -23px`, centered in scoop at `left: 11px`
  * Color: Vibrant Emerald Green (`#10B981`)
  * Icon: `size: 26`, White (`#FFFFFF`)
  * Shadow: `shadowColor: '#10B981'`, `shadowOffset: { width: 0, height: 6 }`, `shadowOpacity: 0.45`, `shadowRadius: 8`
* **Center '+' Add Expense Action Button**:
  * Raised 20px above the bar top line: `top: -20px`
  * Diameter: `52px` (`borderRadius: 26`)
  * Background: Soft Lavender / Indigo Purple (`#818CF8`)
  * Border: `borderWidth: 2`, `borderColor: '#6366F1'`
  * Icon: White plus (`#FFFFFF`), `size: 30`
  * Shadow: Soft Lavender Glow (`shadowColor: '#818CF8'`, `shadowOffset: { width: 0, height: 6 }`, `shadowOpacity: 0.5`, `shadowRadius: 10`, `elevation: 10`)
* **Inactive Tab Icons**:
  * Prominent & Bold: `size: 26`, Color: Slate Gray (`#94A3B8`)
