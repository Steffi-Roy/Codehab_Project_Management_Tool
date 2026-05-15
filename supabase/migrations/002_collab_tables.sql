-- Collab listings
create table collab_listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  title text not null,
  description text not null,
  skills_offered text[] not null default '{}',
  looking_for text[] not null default '{}',
  github_url text,
  linkedin_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- One active listing per user
create unique index one_active_listing_per_user
  on collab_listings(user_id)
  where is_active = true;

-- Listing replies
create table listing_replies (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references collab_listings(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

-- RLS
alter table collab_listings enable row level security;
alter table listing_replies enable row level security;

create policy "collab_listings_read" on collab_listings for select using (true);
create policy "collab_listings_insert" on collab_listings for insert with check (user_id = auth.uid());
create policy "collab_listings_update_own" on collab_listings for update using (user_id = auth.uid());

create policy "listing_replies_read" on listing_replies for select using (true);
create policy "listing_replies_insert" on listing_replies for insert with check (user_id = auth.uid());

-- Realtime for listing replies
alter publication supabase_realtime add table listing_replies;
