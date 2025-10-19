# Design Guidelines: Route Planner Prototype

## Design Approach: Material Design System

**Selected Approach**: Design System - Material Design 3
**Justification**: Route planning is a utility-focused, data-intensive application requiring clear information hierarchy, efficient workflows, and strong visual feedback for user actions (adding points, calculating routes, viewing results).

**Key Design Principles**:
- Clarity over decoration - every element serves a functional purpose
- Instant visual feedback for all user actions
- Scannable information architecture for route data
- Progressive disclosure - show complexity only when needed

## Core Design Elements

### A. Color Palette

**Light Mode**:
- Primary: 220 90% 56% (Trust-inspiring blue for CTAs and active states)
- Surface: 0 0% 100% (Clean white background)
- Surface Container: 220 20% 97% (Subtle gray for cards/inputs)
- On Surface: 220 15% 20% (Near-black text)
- Success: 142 76% 36% (Route calculation confirmation)
- Error: 0 72% 51% (Validation warnings)

**Dark Mode**:
- Primary: 220 90% 65% (Lighter blue for dark backgrounds)
- Surface: 220 18% 12% (Deep charcoal)
- Surface Container: 220 15% 18% (Elevated surfaces)
- On Surface: 220 10% 92% (Off-white text)

### B. Typography

**Font Family**: 'Inter' (Google Fonts) - exceptional readability for data-heavy UIs
- Display: 600 weight, tracking -0.02em (Page titles)
- Headlines: 500 weight (Section headers, route steps)
- Body: 400 weight (Input labels, descriptions)
- Data/Numeric: 'JetBrains Mono' 500 weight (Coordinates, distances)

**Hierarchy**:
- Page Title: text-3xl font-semibold
- Section Headers: text-xl font-medium
- Input Labels: text-sm font-medium uppercase tracking-wide
- Body Text: text-base
- Data Values: text-lg font-mono

### C. Layout System

**Spacing Primitives**: Tailwind units 2, 4, 6, 8, 12, 16
- Component padding: p-6 (cards), p-4 (inputs)
- Section spacing: space-y-8 (main sections), space-y-4 (form elements)
- Gap between elements: gap-4 (grids), gap-6 (major sections)

**Grid Structure**:
- Desktop: Two-column layout (40% input panel | 60% results panel)
- Mobile: Single column, stacked vertically
- Container: max-w-7xl mx-auto px-6

### D. Component Library

**Core Components**:

1. **Point Input Form**
   - Elevated card (shadow-lg) with rounded-2xl corners
   - Text inputs with floating labels
   - Icon buttons for add/remove actions
   - Drag handles for reordering points
   - Clear visual states: default, focus, filled, error

2. **Route Display Panel**
   - Ordered list with step numbers in circular badges
   - Distance metrics in monospace font with units
   - Total distance prominently displayed in larger type
   - Directional arrows between route points

3. **Action Buttons**
   - Primary: "Calculate Route" (filled, primary color)
   - Secondary: "Add Point" (outlined)
   - Destructive: "Clear All" (text only, error color)
   - Icon buttons: Minimal, 40x40px touch targets

4. **Data Cards**
   - Point cards: Compact, with point number, coordinates, reorder controls
   - Summary card: Total distance, number of stops, calculation time
   - Elevated appearance with subtle border

5. **Empty States**
   - Centered illustrations/icons
   - Clear instructional text: "Add your first point to begin"
   - Primary CTA to start adding points

**Animations**:
- Route calculation: Subtle progress indicator during computation
- Point addition/removal: Slide in/fade out (150ms)
- Reordering: Smooth position transitions (200ms)
- All animations using ease-in-out timing

### E. Page Structure

**Application Layout**:
1. **Header** (sticky, h-16): Logo/title, theme toggle, action buttons
2. **Main Content** (two-column desktop, stacked mobile):
   - Left: Point management panel with add/edit controls
   - Right: Route results panel with optimized sequence
3. **Footer** (minimal): Credits, version info

**Responsive Behavior**:
- Desktop (lg:): Side-by-side panels with fixed input panel width
- Tablet (md:): Slightly narrower columns, maintained layout
- Mobile: Full-width stacked sections, input panel collapses to accordion

### Interaction Patterns

**User Workflows**:
1. Point Entry: Click "Add Point" → Form appears → Enter data → Validate → Add to list
2. Route Calculation: Minimum 2 points → "Calculate" becomes enabled → Loading state → Results display
3. Modification: Edit point → Auto-recalculate → Update results instantly

**Visual Feedback**:
- Input validation: Inline error messages below fields
- Calculation status: Loading spinner with "Optimizing route..." text
- Success state: Green checkmark with result summary
- Point count badge: Updates dynamically in header

### Accessibility & Quality

- All inputs have clear labels and placeholders
- Focus indicators: 2px primary color ring
- Keyboard navigation: Tab order follows logical flow
- ARIA labels for icon-only buttons
- Sufficient color contrast (WCAG AA minimum)
- Consistent dark mode across all inputs and surfaces

**Critical Implementation Notes**:
- No hero section needed - this is a utility app
- Focus on functional clarity over decorative elements
- Ensure instant visual response to all user interactions
- Maintain clear visual hierarchy: Actions → Inputs → Results