---
name: Precision Gantt
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#c7c4d8'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#918fa1'
  outline-variant: '#464555'
  surface-tint: '#c3c0ff'
  primary: '#c3c0ff'
  on-primary: '#1d00a5'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#4d44e3'
  secondary: '#6bd8cb'
  on-secondary: '#003732'
  secondary-container: '#29a195'
  on-secondary-container: '#00302b'
  tertiary: '#ffb599'
  on-tertiary: '#5a1c00'
  tertiary-container: '#aa3b00'
  on-tertiary-container: '#ffd1c1'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#89f5e7'
  secondary-fixed-dim: '#6bd8cb'
  on-secondary-fixed: '#00201d'
  on-secondary-fixed-variant: '#005049'
  tertiary-fixed: '#ffdbce'
  tertiary-fixed-dim: '#ffb599'
  on-tertiary-fixed: '#370e00'
  on-tertiary-fixed-variant: '#7f2b00'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
  canvas-light: '#F8FAFC'
  canvas-dark: '#0F172A'
  surface-light: '#FFFFFF'
  surface-dark: '#1E293B'
  border-light: '#E2E8F0'
  border-dark: '#334155'
  primary-hover: '#6366F1'
  status-standard: '#0D9488'
  status-standard-alt: '#14B8A6'
  status-critical: '#EA580C'
  status-critical-alt: '#F97316'
  status-milestone: '#7C3AED'
  status-completed: '#059669'
  status-warning: '#D97706'
  status-error: '#DC2626'
  subdued-tick: '#64748B'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: -0.005em
  section-title:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  table-cell:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  data-mono:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  timeline-tick:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.05em
  badge-label:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 0.25rem
  badge-py: 0.125rem
  badge-px: 0.375rem
  hit-resize: 0.375rem
  cell-py: 0.375rem
  cell-px: 0.75rem
  panel-p: 1rem
  gutter-canvas: 1rem
---

## Brand & Style

This design system embodies a high-density, workstation-grade design philosophy tailored for technical project leads, systems engineers, and delivery managers. It replaces generic conversational chatbot interfaces with the precision, direct manipulation, and density of professional IDEs and CAD environments.

### Core Visual Principles
- **Utilitarian Density:** Space is treated as a premium analytical asset. Whitespace is intentional and compact rather than expansive, allowing operators to parse complex multi-threaded project plans without losing contextual scope.
- **Explainable System Surface:** AI-generated artifacts are treated as inspectable hypotheses. Ambiguities, parse assumptions, and entity extractions are revealed directly in the canvas using dual visual affordances (hatch patterns, confidence chips, and inline validation markers).
- **Direct Spatial Manipulation:** High frame-rate direct canvas interactions—scrubbing, drag-to-shift, edge-resizing, and dependency snapping—provide tactile confidence during timeline orchestration.
- **Zero Decorative Noise:** Visual decoration without functional purpose is eliminated. Hierarchy is established strictly via structural gridlines, tone transitions, and disciplined semantic status signaling.

## Colors

The design system leverages a strict slate foundation complemented by targeted semantic accents. Chromatic vibrancy is reserved exclusively for task states, dependencies, critical paths, and parse diagnostics.

### Role Allocation
- **Neutral (`#0F172A` Dark / `#F8FAFC` Light):** Establishes the operational stage. In dark mode, `#0F172A` anchors deep canvas contrast, while `#1E293B` isolates interactive panels and tables. In light mode, `#F8FAFC` grounds the application canvas with `#FFFFFF` cards.
- **Primary (`#4F46E5` - Deep Indigo):** Dedicated to high-intent primary interactions, focus outlines (`#6366F1`), and the active timeline cursor.
- **Secondary (`#0D9488` - Teal):** Designates standard baseline tasks and nominal workflow nodes.
- **Tertiary (`#EA580C` - Coral):** Highlights critical path sequences and zero-slack scheduling dependencies.

### Semantic Status Mappings
- **Milestone (`#7C3AED` - Royal Violet):** Allocated to instantaneous checkpoints and key deliverables.
- **Completed (`#059669` - Emerald):** Closed work items and verified historical baselines.
- **Warning (`#D97706` - Amber):** LLM parsing ambiguities, constraint conflicts, and low-confidence extractions. Always combined with diagonal hatch textures or warning glyphs.
- **Error (`#DC2626` - Crimson):** Dependency cycles, invalid date ranges, and syntax parse failures.
- **Subdued Canvas Elements (`#64748B`):** Non-intrusive timeline division lines, time tick headers, and secondary coordinates.

## Typography

The type system is built on a single, highly flexible font: `Inter`. It uses dense vertical metrics, deliberate font-feature toggles, and compact letterforms optimized for complex desktop layouts.

### Tabular Figures & Numerics
All data points involving time, coordinates, duration counters, sequence indices, and dates must enforce the OpenType feature `font-feature-settings: "tnum" 1`. This prevents layout shifts and alignment jitter when scrubbing timelines or editing numerical durations.

### Hierarchy & Scale
Scale is compressed between `11px` and `18px`. Hierarchy is established through weight transitions (`400`, `500`, `600`) and case styling (e.g., uppercase date units) rather than excessive size jumps, maintaining high data density throughout the workbench.

## Layout & Spacing

The layout is built as a precision workstation centered around a 4px coordinate grid. The timeline canvas takes spatial precedence, claiming at least 65% of screen width and height.

### Workstation Grid Architecture
- **Master-Detail Split:** Fixed-width or collapsible task tree / meta-grid on the left (`320px` to `420px`), paired with a primary horizontally scrollable SVG/Canvas timeline on the right (occupying the remaining `≥65%` viewport width).
- **Sticky Matrix Headers:** Both the left task column headers and the timeline date markers (Day/Week/Month) lock to top offsets during vertical plan scrolling.
- **Inspection Drawer:** A contextual 360px slide-over sheet anchors to the right edge for task node editing, dependency loop inspection, and LLM extraction telemetry.

### Form Factors & Adapters
- **Widescreen Desktop (`≥1440px`):** Default standard workstation view. Left data grid, central Gantt canvas, and collapsed/right inspector operate concurrently without modal masking.
- **Laptop / Compact Desktop (`1024px` to `1439px`):** Prompt tray collapses to an accordion top ribbon; task grid switches to compact mode showing Task Name, Duration, and Status columns only.
- **Tablet / Small Viewports (`<1024px`):** Read-only consumption mode. Left task grid and right Gantt timeline switch to stacked view tabs with swipe panning.

## Elevation & Depth

This design system avoids soft consumer drop-shadows and blurred glassmorphism in favor of structured architectural layering and crisp tonal boundaries.

### Layer Hierarchy
1. **Canvas Substrate (Z: 0):** Baseline slate canvas hosting vertical date ticks, weekend striping, and non-interactive grid dividers.
2. **Connector Vector Layer (Z: 10):** SVG dependency lines rendered behind task elements. Paths use crisp 90-degree orthogonal routing or subtle cubic Bézier transitions with arrows.
3. **Task Nodes & Milestones (Z: 20):** Gantt bar containers, progress track fills, and diamond milestone glyphs.
4. **Sticky Structure Controls (Z: 30):** Frozen timeline headers, column headers, and split-pane dividers.
5. **Floating Overlays & Popovers (Z: 40):** Active drag state proxies, inline entity inspection popovers, and warning tooltips. Rendered with sharp 1px borders (`#334155` dark / `#E2E8F0` light) and minimal ambient elevation (`box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25)`).
6. **Task Detail Drawer (Z: 50):** Right-anchored analytical inspector masking secondary actions.

## Shapes

The design system uses a sharp, technical aesthetic with low corner radiuses (`roundedness: 1` / `0.25rem` / `4px`). This maintains visual structure across nested task grids, Gantt bars, and tabular controls.

### Shape Language
- **Gantt Task Bars:** `4px` corner radius on outer containers. Internal progress fill bars share identical left-side curvature.
- **Milestones:** Rotated `12px × 12px` square forming a clean `45°` diamond rhombus (`◆`).
- **Badges & Inline Chips:** `4px` corner radius (`rounded`) with micro-padding (`2px` vertical, `6px` horizontal) to preserve table row height constraints.
- **Focus Rings:** Non-rounded, exact bounding box offset (`outline: 2px solid #6366F1`, `outline-offset: 2px`).

## Components

### Buttons
- **Primary Action (Generate Plan / Commit):** Solid Deep Indigo (`#4F46E5`), text `#FFFFFF`, 4px radius, `px-3 py-1.5`, `13px` font weight `600`. Hover: `#6366F1`.
- **Secondary Action (Filter / Zoom):** Transparent base, 1px solid border (`#334155` dark / `#E2E8F0` light), text slate-200. Hover: background `#1E293B`.
- **Icon / Gripper Affordance:** `24px × 24px` hit target, transparent background with `⠿` reorder icon.

### Chips & Meta Badges
- **Status Badges:** Compact inline elements (`font-size: 11px`, `line-height: 14px`, `py-0.5 px-1.5`, 4px radius). Completed: `#059669` tint; Critical: `#EA580C` tint; Warning: `#D97706` tint with `⚠️` glyph.
- **Confidence Chips:** Tabular percentage display (`tnum`) indicating LLM parsing confidence score. Scores `<80%` take the warning border treatment.

### Gantt Task Bars
- **Nominal Task Bar:** Solid Teal (`#0D9488`), interior percentage fill `#14B8A6`. Height: `24px`.
- **Critical Path Bar:** Solid Coral (`#EA580C`), interior percentage fill `#F97316`.
- **Parse Warning Bar:** Amber border (`#D97706`) with interior 45-degree diagonal repeating hatch pattern (`repeating-linear-gradient(45deg, rgba(217, 119, 6, 0.15), rgba(217, 119, 6, 0.15) 6px, transparent 6px, transparent 12px)`).
- **Interactive Resizer Edge:** `6px` hit target on the terminal edge of each task bar; hover switches cursor immediately to `col-resize`.

### Input Fields & Parsing Workbench
- **Prompt Textarea:** Monospaced or clean sans input panel with 1px border (`#334155`). When the prompt is in-flight, it transitions to a read-only lock with an extraction pulse. Parsed entities (dates, durations, dependencies) feature dashed bottom underlines.
- **Cell Inputs:** Edge-to-edge inputs within the left task grid, zero default border, displaying a 1px primary focus ring on active selection.

### Tables & Grids
- **Header Row:** Height `32px`, uppercase `11px` typography, subtle bottom border.
- **Data Rows:** Height `36px`, alignment matching the timeline's horizontal row rhythm, hover highlighting the entire row and its corresponding Gantt bar.

### Dependency Connectors (SVG)
- Orthogonal routing lines with 1.5px stroke width. Default: `#64748B`. Critical path: `#EA580C`. Dynamic collision avoidance ensures lines remain legible across dense task configurations.