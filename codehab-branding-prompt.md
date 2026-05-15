# Claude Code — Codehab branding integration

## Name
The platform is called **Codehab**. Update every instance of "Cohort" or any placeholder name across the entire codebase to **Codehab**.

---

## Logo / wordmark

Replace the current nav logo with:

```
Codehab ⬡
```

- Wordmark: `Codehab` in font-weight 600
- Symbol: a hexagon icon (⬡) using Tabler icon `ti-hexagon` placed after the wordmark
- The hexagon should use the current accent colour (`--accent-text`)
- Keep the logo compact — it should sit comfortably in the top nav without taking up space

---

## Favicon

Generate a simple favicon using the hexagon symbol:
- 32x32 SVG favicon
- Hexagon shape filled with `#3C3489` (purple accent)
- Letter `C` in white inside the hexagon, font-weight 700
- Save as `public/favicon.svg` and reference in `app/layout.tsx`

---

## Page title and metadata

In `app/layout.tsx`, update:

```tsx
export const metadata = {
  title: 'Codehab',
  description: 'A habitat for builders — share projects, find collaborators, and ship together.',
  openGraph: {
    title: 'Codehab',
    description: 'A habitat for builders — share projects, find collaborators, and ship together.',
    siteName: 'Codehab',
  }
}
```

---

## Text replacements across the app

Find and replace all instances of:
- `"Cohort"` → `"Codehab"`
- `"cohort platform"` → `"Codehab"`
- Any placeholder app name → `"Codehab"`

Strings that should NOT be changed:
- `"cohort"` when used in a descriptive sentence (e.g. "your 6-week cohort", "cohort members") — these are descriptive, not the app name
- Database table or column names — do not rename those

---

## Nav update

Top nav should read:
```
Codehab ⬡    Projects · Collab · Schedule · My project    [theme toggle] [user avatar]
```

The logo on the left links to `/` (projects page).

---

## Empty states and copy

Update any placeholder copy to use the Codehab name:
- Sign in page: "Welcome to Codehab"
- Empty projects board: "No projects yet — be the first to submit on Codehab"
- Join page: "You've been invited to Codehab"
- Magic link email subject: "Your Codehab sign-in link"
