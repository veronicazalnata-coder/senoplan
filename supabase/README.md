# Supabase Setup

1. Create a new Supabase project.
2. In SQL Editor, run `schema.sql` then `policies.sql`.
3. Create a Storage bucket named `chat-images` and make it public or sign-URL as needed.
4. Enable Realtime on tables: players, bets, rounds, withdrawals, messages.
5. Create a service role key for admin app usage (server-side functions).
6. Copy `.env.example` to `.env` and fill values for local usage.