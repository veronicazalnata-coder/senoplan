-- Enable RLS
alter table players enable row level security;
alter table bets enable row level security;
alter table rounds enable row level security;
alter table withdrawals enable row level security;
alter table messages enable row level security;

-- Players can select/insert their own bets
create policy player_select_own_bets on bets
for select using (player_id = auth.uid());

create policy player_insert_own_bets on bets
for insert with check (player_id = auth.uid());

-- Players can read their own messages
create policy player_select_own_messages on messages
for select using (player_id = auth.uid());

create policy player_insert_own_messages on messages
for insert with check (player_id = auth.uid());

-- Admin service role bypasses RLS when using service key (no explicit policy required)