---
name: Cohort Platform Project
description: Community platform for 80-person startup cohort built with Next.js, Supabase, and Tailwind CSS
type: project
---

Full-stack community platform built at /Users/steffi/Documents/github/project_management_tool.

**Why:** To give a startup cohort a warm, playful space to share weekly projects, vote, and collaborate.

**How to apply:** When user asks about this project, reference the SETUP.md for env vars and Supabase setup steps needed to run it.

Tech stack: Next.js 16 (App Router), Tailwind CSS, Supabase (auth + DB + realtime + storage), Anthropic Claude API, fal.ai.

Build status: Complete — all pages built, builds successfully. Needs Supabase credentials in .env.local to run against real data.

Pages built: / (projects board), /submit, /room, /members, /my-project, /admin, /join.
Features: Anonymous auth → magic link upgrade, realtime vote counts, room presence, AI description polish, AI cover art generation, admin panel.
