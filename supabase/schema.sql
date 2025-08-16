-- Players table
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  username text unique,
  balance numeric(18,2) not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

-- Admin table
create table if not exists admin (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

-- Rounds table
create table if not exists rounds (
  id uuid primary key default gen_random_uuid(),
  server_id text not null check (server_id in ('server1','server2')),
  series bigint not null,
  status text not null default 'open',
  timer_ends_at timestamptz,
  next_result int,
  admin_override_next_result int,
  created_at timestamptz not null default now()
);

-- Bets table
create table if not exists bets (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references players(id) on delete cascade,
  round_id uuid references rounds(id) on delete cascade,
  bet_type text not null,
  amount numeric(18,2) not null check (amount > 0),
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- Admin adjustments for silent override
create table if not exists admin_adjustments (
  id uuid primary key default gen_random_uuid(),
  bet_id uuid references bets(id) on delete cascade,
  override_bet_type text,
  override_amount numeric(18,2),
  created_at timestamptz not null default now(),
  created_by uuid references admin(id)
);

-- Withdrawals
create table if not exists withdrawals (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references players(id) on delete cascade,
  amount numeric(18,2) not null check (amount > 0),
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- Messages chat
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references players(id) on delete cascade,
  sender text not null check (sender in ('user','admin')),
  text text,
  image_url text,
  created_at timestamptz not null default now()
);