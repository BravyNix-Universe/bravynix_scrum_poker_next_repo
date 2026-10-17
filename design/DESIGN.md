## Brand & Style
The design system establishes a focused, tactile, and quietly playful desktop environment tailored for agile engineering and product squads. The aesthetic strips away speculative tech hyperbole, neon casino metaphors, and distracting decorative effects in favor of physical software clarity. 

Key attributes:
- **Quietly Playful & Tactile:** Physical metaphors are expressed through distinct surface geometry, pressed states, and structured card tokens without relying on skeuomorphic bevels or gloss.
- **Deliberate Minimalism:** Strict exclusion of glassmorphism, background blurs, multi-stop gradients, and decorative casino visual tropes (spades, chips, velvet tables).
- **Tone:** Methodical, sharp, collegial, and engineered. Sentence case is applied across every typographic hierarchy level without exception.

## Layout & Spacing
The desktop workspace is tailored to a primary viewport target of 1440px with a structural, fixed-width content boundary maxing out at 1392px.

### Structural Framework
- **Canvas Base:** Full bleed `Mist` (`#F5F6FA`).
- **Main Layout Structure:** 
  - Top phase tracker navigation: 64px fixed height.
  - Workspace: 3-column asymmetric layout (Backlog drawer/list: 320px; Active Estimation Room: Flexible min 720px; Summary Sidebar: 320px).
- **Grid:** 12-column fluid internal grid for room layouts with `gutter` of 24px (`1.5rem`) and outer canvas padding `margin` of 32px (`2rem`).

### Component Spacing Discipline
- `space-xs` (4px): Micro gap between icons and text tags; badge inner padding.
- `space-sm` (8px): Gaps between adjacent deck cards in the hand tray; input field internal padding Y.
- `space-md` (16px): Standard padding for modular story blocks, attendee seat arrangement gaps.
- `space-lg` (24px): Card container margins, room boundary insets.
- `space-xl` (32px): Inter-section canvas breaks.

## Elevation & Depth
Elevation avoids dramatic dropshadows and fuzzy ambient light. Hierarchy is communicated through flat tonal stacking, crisp borders, and subtle physical push offsets.

### Layering Hierarchy
1. **Level 0 (Canvas):** Mist `#F5F6FA`. Unseated regions, background canvas.
2. **Level 1 (Structural Inset):** Fog `#ECEEF5` with a dashed `#7C82A0` 1.5px border. Reserved for waiting participant seats and skeleton loaders.
3. **Level 2 (Panels & Story Cards):** White `#FFFFFF` with a 1px solid `#DADDEA` border. Standard resting elevation.
4. **Level 3 (Tactile Poker Cards):** Single sharp contact shadow: `0px 2px 0px 0px #DADDEA`. When selected or hovered, card elements translate -4px along the Y axis with a crisp contact drop: `0px 6px 0px 0px #DADDEA`.
5. **Level 4 (Drawers & Dialogs):** Pure white container with border `1px solid #DADDEA` and an offset containment shadow: `0 8px 24px -4px rgba(22, 27, 51, 0.08)`. No backdrop blur is permitted on dialog scrims; use `rgba(22, 27, 51, 0.4)` solid overlay.

## Components

### Buttons
- **Primary:** Background Indigo 700 (`#2F3C86`), label White (`#FFFFFF`), border radius 8px. Hover: Indigo 800 (`#26316F`). Active: translateY(1px).
- **Secondary / Ghost:** White background, 1px solid Line (`#DADDEA`), text Ink (`#161B33`). Hover: Background Fog (`#ECEEF5`).
- **Reveal Action (Phase-Specific):** Marigold 400 (`#F4A62A`), text Ink (`#161B33`), font weight 600. Hover: `#E0931B`.

### Poker Estimation Cards
- **Hand Cards (Bottom Dock):** Dimensions 68px × 96px, border radius 12px. Crisp border 1px solid `#DADDEA`. Distinct value colors driven by value scale token. Active/Selected state: border 2px solid Indigo 700 (`#2F3C86`) and translateY(-8px).
- **Voter Card Back (Face Down):** Indigo 900 (`#1E2752`) with a subtle geometric 1px Line (`#2F3C86`) inner border inset 4px.
- **Revealed Card Face:** Dynamic background corresponding to numeric value scale, bold Bricolage Grotesque numeral centered.

### Table & Participant Seats
- **Active Participant Slot:** White card container (80px × 110px), rounded-lg (12px), 1px solid Line (`#DADDEA`), name badge positioned underneath with pastel avatar.
- **Empty / Waiting Seat:** Fog (`#ECEEF5`) background, dashed border 1.5px using `#7C82A0`, empty label centered in Slate (`#4A5070`).

### Phase Tracker
- Pill or segmented container: Mist background with 1px solid Line.
- Active stage: Indigo 50 (`#EEF0FA`) pill with Indigo 700 (`#2F3C86`) text and bold label. Inactive stages: Slate (`#4A5070`) text with regular weight.

### Input Fields
- White background, 1px solid `#7C82A0`, border radius 8px, padding 8px 12px.
- Focus: Outline 2px solid Indigo 700 (`#2F3C86`), outline-offset 0px. Text: Ink (`#161B33`). Placeholder: Haze (`#5F6585`).

### Consensus & Summary Banner
- Appears upon reveal: Background White, border 2px solid Marigold 400 (`#F4A62A`), radius 16px.
- Highlights the most common value with a 48px display badge in Marigold 400 with Ink text.