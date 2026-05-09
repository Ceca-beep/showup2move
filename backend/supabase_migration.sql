-- Enable UUID generation
create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  display_name text not null,
  bio text,
  photo_url text,
  lat float,
  lng float,
  skill_level text check (skill_level in ('beginner','intermediate','advanced')),
  available_today boolean default false,
  created_at timestamptz default now()
);

create table if not exists sports (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  min_players int not null default 2,
  max_players int not null default 10
);

insert into sports (name, min_players, max_players) values
  ('Football', 10, 14),('Basketball', 6, 10),('Tennis', 2, 4),
  ('Volleyball', 6, 12),('Badminton', 2, 4),('Running', 1, 20),
  ('Cycling', 1, 20),('Swimming', 1, 10),('Table Tennis', 2, 4),('Rugby', 10, 16)
on conflict (name) do nothing;

create table if not exists user_sports (
  user_id uuid references users(id) on delete cascade,
  sport_id uuid references sports(id) on delete cascade,
  skill_level text default 'beginner',
  primary key (user_id, sport_id)
);

create table if not exists availability (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  date date not null,
  is_available boolean not null,
  responded_at timestamptz default now(),
  unique (user_id, date)
);

create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  sport_id uuid references sports(id),
  captain_id uuid references users(id),
  status text default 'forming' check (status in ('forming','confirmed','completed','cancelled')),
  max_size int not null default 10,
  created_at timestamptz default now()
);

create table if not exists group_members (
  group_id uuid references groups(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  status text default 'pending' check (status in ('pending','confirmed','declined')),
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  creator_id uuid references users(id),
  title text not null,
  location_name text,
  lat float,
  lng float,
  starts_at timestamptz,
  status text default 'planned' check (status in ('planned','active','completed','cancelled'))
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  sender_id uuid references users(id),
  content text not null,
  sent_at timestamptz default now()
);

create table if not exists polls (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  question text not null,
  options jsonb not null,
  closes_at timestamptz
);

create table if not exists poll_votes (
  poll_id uuid references polls(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  choice text not null,
  primary key (poll_id, user_id)
);

create table if not exists ai_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  group_id uuid references groups(id) on delete cascade,
  score int check (score between 0 and 100),
  reason text,
  computed_at timestamptz default now(),
  unique (user_id, group_id)
);

create index if not exists idx_availability_date on availability(date, is_available);
create index if not exists idx_group_members_user on group_members(user_id);
create index if not exists idx_messages_group on messages(group_id, sent_at desc);
create index if not exists idx_users_available on users(available_today);
