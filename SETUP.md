# Cohort Platform — Setup Guide

## 1. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the migration at `supabase/migrations/001_initial_schema.sql`
3. Go to **Storage** → Create a bucket named `project-covers` → Set to **Public**
4. Go to **Authentication** → Settings → Enable **Anonymous sign-ins**
5. Enable **Email magic links** (OTP) under Auth → Providers → Email

## 2. Environment Variables

Fill in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=your-anthropic-key
FAL_KEY=your-fal-key
NEXT_PUBLIC_COHORT_JOIN_CODE=COHORT2024
```

## 3. Make yourself admin

After signing in via magic link, run in Supabase SQL Editor:
```sql
UPDATE users SET is_admin = true WHERE email = 'your@email.com';
```

## 4. Realtime

In Supabase → Database → Replication, enable realtime for the `votes` table.

## 5. Run locally

```bash
npm run dev
```

## 6. Deploy to Vercel

1. Push to GitHub
2. Connect repo to Vercel
3. Add all env vars in Vercel dashboard
4. Set Supabase Auth redirect URL to your Vercel domain:
   - Dashboard → Auth → URL Configuration → Site URL: `https://your-app.vercel.app`
   - Add redirect: `https://your-app.vercel.app/**`

## Join link

Share with cohort: `https://your-app.vercel.app/join?code=COHORT2024`
