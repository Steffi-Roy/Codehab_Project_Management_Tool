# Claude Code — Fixes + New Pages Prompt

Paste this into Claude Code as a follow-up to the initial build prompt.

---

## 1. Nav restructure

Remove the current nav items and replace with:

```
Projects · Collab · Schedule · My project
```

Remove `Members` and `Room` as standalone pages entirely.
Member profiles are accessible by clicking an avatar on a project card — open a modal showing their name, handle, about, LinkedIn, GitHub, and their submissions across weeks.

---

## 2. Theme system — user toggle

Add a theme toggle to the top nav (sun/moon icon, right side near user avatar).

Users can cycle between three themes. Store preference in `localStorage`. Apply by setting `data-theme` on `<html>`.

Define these CSS variables in `globals.css`:

### Warm light `[data-theme="light"]`
```css
--bg-page: #FAFAF8;
--bg-card: #FFFFFF;
--bg-surface: #F1EFE8;
--border: #E8E6DF;
--text-primary: #1A1A18;
--text-secondary: #5F5E5A;
--text-muted: #888780;
--accent-bg: #EEEDFE;
--accent-text: #3C3489;
--accent-border: #AFA9EC;
```

### Soft dawn `[data-theme="dawn"]`
```css
--bg-page: #FDF8F4;
--bg-card: #FFF9F6;
--bg-surface: #F5EDE5;
--border: #F0E6DD;
--text-primary: #1A1A18;
--text-secondary: #888780;
--text-muted: #B4B2A9;
--accent-bg: #FAECE7;
--accent-text: #712B13;
--accent-border: #F0997B;
```

### Dark maker `[data-theme="dark"]`
```css
--bg-page: #141210;
--bg-card: #1E1C19;
--bg-surface: #1A1814;
--border: #2C2A27;
--text-primary: #F1EFE8;
--text-secondary: #888780;
--text-muted: #444441;
--accent-bg: #26215C;
--accent-text: #CECBF6;
--accent-border: #534AB7;
```

Toggle cycles: light → dawn → dark → light.
Icon: sun = light/dawn, moon = dark.
Show theme name as tooltip on hover.
Default: `light`.

---

## 3. Projects page — week tabs

Add week tabs directly below the top nav bar on the Projects page.

### Week tabs
- 6 tabs: `Wk 1 · Ideation`, `Wk 2 · Validation`, `Wk 3 · Prototype`, `Wk 4 · AI tools`, `Wk 5 · Launch`, `Wk 6 · Demo day`
- Theme names pulled from `weeks` table — tabs update if admin changes the theme
- Past weeks (where `voting_close` has passed): greyed out, still clickable to browse archived projects
- Active week: highlighted with accent colour
- Future weeks: visible but dimmed

### Week banner (below tabs)
Shows for the active/selected week:
- Week icon (emoji or Tabler icon based on theme)
- Week theme name
- Submission count
- Deadline: "Submit by Thu 15 May · 5pm" — if deadline passed, show "Submissions closed"
- Right side: voting state
  - Before voting opens: "Voting opens Fri 6pm"
  - During voting: live countdown to close
  - After voting closes: "Voting closed · results in"

### Submit bar
Green banner below week banner. Only show during submission window (after week opens, before `submission_deadline`):
> "Submit your week 4 project before Thursday 5pm"
with a green Submit button.

Hide submit bar if deadline passed or user already submitted this week.

---

## 4. New database tables

Add these to the Supabase schema:

### `collab_listings`
```sql
id uuid primary key default gen_random_uuid(),
user_id uuid references users(id),
title text not null,
description text not null,
skills_offered text[], -- e.g. ['Next.js', 'Supabase']
looking_for text[], -- e.g. ['Designer', 'Figma']
is_active boolean default true,
created_at timestamptz default now()
```
Constraint: each user can only have one active listing at a time (`is_active = true`).
Enforce with a partial unique index:
```sql
create unique index one_active_listing_per_user
on collab_listings(user_id)
where is_active = true;
```

### `listing_replies`
```sql
id uuid primary key default gen_random_uuid(),
listing_id uuid references collab_listings(id) on delete cascade,
user_id uuid references users(id),
text text not null,
created_at timestamptz default now()
```

---

## 5. Collab page (`/collab`)

### Layout
- Page header: "Collab board" title + subtitle "Find people to build with · N active listings"
- "Post listing" button top right — disabled if user already has an active listing (show tooltip: "You already have an active listing")
- Filter chips below header: `All` · `Designer` · `Developer` · `Marketer` · `No-code` · `AI/ML` — filter listings by what they're looking for. "All" selected by default.

### New listing form (shown inline on button click)
Fields:
- Project/idea title (text input, required)
- Description: what you're building, what stage, what you need (textarea, required)
- Skills you bring (multi-select chips): Designer, Developer, Marketer, No-code, AI/ML, Product, Other
  - Unselected: background `#F1EFE8`, text `#5F5E5A`, border `#E8E6DF`
  - Selected: background `#E1F5EE`, text `#085041`, border `#5DCAA5`
- Looking for (multi-select chips): same options, same selected/unselected states
- GitHub URL (optional)
- LinkedIn URL (optional)
Post + Cancel buttons.
On post: insert into `collab_listings`, hide form, listing appears at top of board.

### Listing card
Each listing shows:
- User avatar + name + handle + week badge + time ago
- Listing title (larger, font-weight 500)
- Description (full text, no truncation)
- Skills offered as tag chips: background `#EEEDFE`, text `#3C3489`, border `#AFA9EC`
- Looking for as teal chips: background `#E1F5EE`, text `#085041`, border `#5DCAA5`
- GitHub + LinkedIn links if provided
- Open thread below (all replies visible to everyone)

### Thread
- Shows all replies in chronological order
- Each reply: avatar, name, timestamp, message text
- Reply input at bottom (text field + Send button)
- Anonymous users prompted for email before replying
- No reply limit, no upvotes on replies — just a flat thread

### Listing management
- Listing owner sees a "Close listing" button in the top-right corner of their own listing card (small, muted style — not prominent)
- Closing sets `is_active = false` — listing disappears from the board
- Closed listings visible to owner in My project page under "Past collab listings"

### Ordering
- Most recently posted at top
- Closed listings hidden from board

---

## 6. Schedule page (`/schedule`)

### Layout
Two-column: main content left, sidebar right (same sidebar as Projects page).

### View toggle
Top right: `List` | `Timeline` — toggles between two views of the same task data.

### List view
Tasks organised by week. Each week section shows:
- Week label chip (coloured by status: active = accent, future = muted, past = greyed)
- Task rows:
  - Checkbox (click to toggle done — updates `tasks` table)
  - Task text (strikethrough when done)
  - Due date (shown as day name if this week, "Wk N" if future week)
  - Due dates within 48 hours highlight in coral
- "Add a task for week N…" input + plus button at bottom of each week section
- Tasks are private (only visible to the owning user)

### Timeline view
Horizontal progress bars, one per task, ordered by due date:
- Left label: task name (truncated if long)
- Progress bar: fill % based on (today - task created) / (due date - task created), capped at 100%
  - Green = done
  - Purple = in progress
  - Amber = due soon (within 48h)
  - Pink = overdue
- Right label: due date or "Done" or "Wk N"

### Sidebar (same as Projects page sidebar)
- Mini calendar with standup days (green) and voting windows (amber) highlighted
- Upcoming cohort events pulled from `weeks` table: submission deadlines, voting open/close, meeting links
- Friday meeting link shown as "Join Zoom" if `meeting_link` is set for the current week

---

## 7. Build order for these fixes

1. CSS theme variables + toggle (affects everything, do first)
2. Week tabs + week banner on Projects page
3. Nav restructure (remove Members/Room, add Collab/Schedule)
4. Database tables: `collab_listings`, `listing_replies`
5. Collab page
6. Schedule page (list view first, then timeline view)
7. Member profile modal (on avatar click)
