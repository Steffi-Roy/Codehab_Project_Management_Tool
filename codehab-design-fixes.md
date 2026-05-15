# Claude Code — Design & UX fixes

## Priority 1 — Apply theme variables everywhere

The CSS variables are defined but components are still using hardcoded Tailwind colour classes. Do a full audit and replace all hardcoded colour references with CSS variables.

Replace across all components:
- `bg-white` / `bg-gray-50` / `bg-gray-100` → `var(--bg-card)` / `var(--bg-page)` / `var(--bg-surface)`
- `border-gray-200` / `border-gray-100` → `var(--border)`
- `text-gray-900` / `text-gray-800` → `var(--text-primary)`
- `text-gray-500` / `text-gray-400` → `var(--text-secondary)` / `var(--text-muted)`
- `bg-purple-100` / `text-purple-700` → `var(--accent-bg)` / `var(--accent-text)`

Every surface, border, and text colour in the app must use CSS variables so themes work correctly.

---

## Priority 2 — Projects page

### Week tabs
- Tabs must scroll horizontally on overflow — add `overflow-x: auto; scrollbar-width: none` to the tab container so Wk 6 is never cut off
- Add a subtle fade gradient on the right edge to hint there are more tabs
- Past weeks: `opacity: 0.4`, still clickable
- Active week: background `var(--accent-bg)`, text `var(--accent-text)`, border `var(--accent-border)`, font-weight 600
- Future weeks: `opacity: 0.7`

### Week banner
- Make it visually distinct — give it a background of `var(--bg-surface)`, rounded 14px, padding 16px
- Left: week number badge (small chip) + theme name (larger, font-weight 500) + submission count
- Right: voting state in its own chip:
  - Submissions open → green chip "Open · closes Thu 5pm"
  - Voting open → amber chip with live countdown "Voting closes in 2d 4h"
  - All closed → muted chip "Closed"

### Empty state
When no projects exist for a week, show a warm encouraging empty state:
- Seedling emoji or illustration
- Heading: "No projects yet this week"
- Subtext: "Be the first to submit — the board opens up when you do"
- If within submission window: a green "Submit your project" button centred below

### Filter chips
Style all filter chips consistently:
- Default: `background: var(--bg-card)`, `border: 0.5px solid var(--border)`, `color: var(--text-secondary)`, border-radius 99px, padding 5px 14px
- Active/selected: `background: var(--accent-bg)`, `color: var(--accent-text)`, `border-color: var(--accent-border)`

### Calendar sidebar
- Colour-code dates properly:
  - Standup Fridays: `background: #E1F5EE`, `color: #085041`
  - Voting window days (Fri–Sun): `background: #FAEEDA`, `color: #633806`
  - Today: `background: var(--accent-bg)`, `color: var(--accent-text)`, font-weight 600
- "This week" section must pull from the correct active week — check that the active week query uses today's date to find the current week, not a hardcoded value

---

## Priority 3 — Collab page

### Post listing button
Change from dark navy to: `background: #085041`, `color: #E1F5EE`, border-radius 99px — warmer and consistent with the green CTA used elsewhere.

### New listing form
- Add visible field labels above each input: "What are you building?" and "Describe your idea, stage, and what you need"
- Give the form a card treatment: `background: var(--bg-card)`, border `var(--accent-border)`, border-radius 14px, padding 20px
- Chip toggle states:
  - Unselected: `background: var(--bg-surface)`, `color: var(--text-muted)`, `border: 0.5px solid var(--border)`
  - Selected (skills you bring): `background: #EEEDFE`, `color: #3C3489`, `border-color: #AFA9EC`
  - Selected (looking for): `background: #E1F5EE`, `color: #085041`, `border-color: #5DCAA5`

### Empty state
- Centre the handshake emoji with more vertical padding (at least 80px top padding)
- Below "No listings yet": add a secondary CTA "Looking for a collaborator? Post a listing — it takes 2 minutes"

### Filter chips
Same style as Projects page filter chips.

---

## Priority 4 — Schedule page

### Week label chips
Distinguish weeks visually by status:
- Past weeks: `background: var(--bg-surface)`, `color: var(--text-muted)`, muted border
- Active week: `background: var(--accent-bg)`, `color: var(--accent-text)`, `border-color: var(--accent-border)`
- Future weeks: `background: var(--bg-surface)`, `color: var(--text-secondary)`, dashed border

### Empty task rows
Replace "No tasks" plain text with a lighter placeholder:
- Show a dashed empty row: `border: 0.5px dashed var(--border)`, `color: var(--text-muted)`, text "No tasks yet — add one below"
- Only show one empty placeholder per week, not a repeated "No tasks" line

### Calendar sidebar
Same fixes as Projects page — colour-code standup and voting days.

---

## Priority 5 — My project page

This page is too empty. Add:

### Submit CTA (when user has no submissions yet)
Large warm card centred on the page:
- Icon: seedling or rocket
- Heading: "You haven't submitted yet this week"
- Subtext: "Share what you're building — the cohort wants to see it"
- Button: "Submit your project →" (green, links to /submit)

### After first submission
Show the submission as a card with:
- Cover image
- Title and description
- Week badge
- Vote count
- Edit button (if within submission window)
- A timeline below showing all 6 weeks — grey dots for weeks with no submission, coloured dots for weeks with a submission

### Tasks panel
Move "My Tasks" from a sidebar into the main page body — it's too hidden. Give it its own section below the projects timeline with the same list treatment as the Schedule page.

---

## Priority 6 — Global typography and spacing

The app needs more visual warmth. Apply these globally:

- Page background: `var(--bg-page)` — should be cream (`#FAFAF8`), not pure white or browser default grey
- Card border-radius: 14px on all cards, 99px on all chips/pills
- Card border: `0.5px solid var(--border)` — thin, not the default 1px browser border
- Font: add `font-family: 'Inter', -apple-system, sans-serif` — install Inter via next/font if not already set
- Page padding: 24px on desktop, 16px on mobile
- Section headings: font-size 22px, font-weight 600, color `var(--text-primary)` — not the default browser bold
- Subtext under headings: font-size 13px, color `var(--text-muted)`

---

## Priority 7 — Nav polish

- Logo: "Codehab" should be font-weight 600, with the hexagon icon in `var(--accent-text)` colour
- Active nav pill background should be `var(--bg-surface)` not a heavy purple fill — the active state is too heavy right now
- Nav background: `var(--bg-card)` with a bottom border of `0.5px solid var(--border)`
- Add 1px of letter-spacing to nav items for readability

---

## Build order

1. CSS variable audit — replace all hardcoded colours (this unblocks everything)
2. Global typography and spacing
3. Nav polish
4. Filter chips (same component used on both Projects and Collab)
5. Calendar date colouring (same component used on Projects and Schedule)
6. Projects page — week tabs, week banner, empty state
7. My project page — submit CTA and submission card
8. Collab page — form labels, button colour, empty state
9. Schedule page — week chip states, empty task placeholder
