-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Weeks table
create table weeks (
  id uuid primary key default uuid_generate_v4(),
  number int not null check (number between 1 and 6),
  theme text not null default 'Week',
  submission_deadline timestamptz not null,
  voting_open timestamptz not null,
  voting_close timestamptz not null,
  meeting_link text,
  is_active bool not null default false,
  created_at timestamptz not null default now()
);

-- Users table (extends Supabase auth.users)
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text not null default 'Anonymous',
  handle text unique,
  avatar_color text not null default '#AFA9EC',
  linkedin_url text,
  github_url text,
  about text,
  is_admin bool not null default false,
  created_at timestamptz not null default now()
);

-- Projects table
create table projects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  week_id uuid not null references weeks(id) on delete cascade,
  title text not null,
  description text not null,
  cover_image_url text,
  github_url text not null,
  video_url text,
  tag text not null default 'Other' check (tag in ('Tool', 'Design', 'Community', 'Other')),
  collab_open bool not null default false,
  created_at timestamptz not null default now()
);

-- Votes table
create table votes (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

-- Tasks table
create table tasks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  text text not null,
  is_done bool not null default false,
  created_at timestamptz not null default now()
);

-- Comments table
create table comments (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

-- Row Level Security
alter table weeks enable row level security;
alter table users enable row level security;
alter table projects enable row level security;
alter table votes enable row level security;
alter table tasks enable row level security;
alter table comments enable row level security;

-- Weeks: anyone can read
create policy "weeks_read" on weeks for select using (true);
create policy "weeks_admin_write" on weeks for all using (
  exists (select 1 from users where id = auth.uid() and is_admin = true)
);

-- Users: anyone can read, users can update their own
create policy "users_read" on users for select using (true);
create policy "users_insert_own" on users for insert with check (id = auth.uid());
create policy "users_update_own" on users for update using (id = auth.uid());

-- Projects: anyone can read, authenticated users can insert their own
create policy "projects_read" on projects for select using (true);
create policy "projects_insert" on projects for insert with check (user_id = auth.uid());
create policy "projects_update_own" on projects for update using (user_id = auth.uid());
create policy "projects_delete_own" on projects for delete using (user_id = auth.uid());

-- Votes: anyone can read counts, authenticated users can vote
create policy "votes_read" on votes for select using (true);
create policy "votes_insert" on votes for insert with check (user_id = auth.uid());
create policy "votes_delete_own" on votes for delete using (user_id = auth.uid());

-- Tasks: private to owner
create policy "tasks_own" on tasks for all using (user_id = auth.uid());

-- Comments: anyone can read, authenticated users can insert
create policy "comments_read" on comments for select using (true);
create policy "comments_insert" on comments for insert with check (user_id = auth.uid());
create policy "comments_delete_own" on comments for delete using (user_id = auth.uid());

-- Seed weeks
insert into weeks (number, theme, submission_deadline, voting_open, voting_close, is_active) values
  (1, 'Week 1 · Ideation', '2024-05-10 17:00:00+00', '2024-05-10 18:00:00+00', '2024-05-12 23:00:00+00', false),
  (2, 'Week 2 · Prototype', '2024-05-17 17:00:00+00', '2024-05-17 18:00:00+00', '2024-05-19 23:00:00+00', false),
  (3, 'Week 3 · Build', '2024-05-24 17:00:00+00', '2024-05-24 18:00:00+00', '2024-05-26 23:00:00+00', false),
  (4, 'Week 4 · Iterate', '2024-05-31 17:00:00+00', '2024-05-31 18:00:00+00', '2024-06-02 23:00:00+00', true),
  (5, 'Week 5 · Launch', '2024-06-07 17:00:00+00', '2024-06-07 18:00:00+00', '2024-06-09 23:00:00+00', false),
  (6, 'Week 6 · Reflect', '2024-06-14 17:00:00+00', '2024-06-14 18:00:00+00', '2024-06-16 23:00:00+00', false);

-- Enable Realtime for votes table
alter publication supabase_realtime add table votes;
