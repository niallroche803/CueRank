# CueRank — Base44 to Supabase Migration Plan

## Context

The app was originally built on Base44 (a BaaS platform). The goal is to run it completely independently — Supabase for the backend and Vercel for frontend hosting.

## Decisions Made

| Topic | Decision |
|---|---|
| Auth (migration) | Removed entirely — no login required |
| Auth (future) | Ericsson email login (SAML/SSO or domain restriction) |
| Player selection | Keep existing dropdown — no change needed |
| Chat updates | Keep polling (no Supabase Realtime needed) |
| Existing data | Migrate via CSV exports in `Data/` folder |
| Frontend hosting | Vercel (free tier, 24/7 uptime, zero-config Vite support) |
| RLS | On — with public read/write policy per table |
| Realtime | Off — not needed |

---

## Phase 1 — Supabase Project Setup
> Do this first — everything else depends on it.

- [x] Create a Supabase project at supabase.com
- [x] Run the SQL below in the Supabase SQL editor to create all tables
- [x] Run the RLS policy SQL below for each table
- [x] Import CSV data from `Data/` — see import notes below
- [x] Populate `.env.local` with Supabase URL and anon key:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

---

### Database Schema

#### players

```sql
CREATE TABLE players (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  elo        integer NOT NULL DEFAULT 1200,
  wins       integer NOT NULL DEFAULT 0,
  losses     integer NOT NULL DEFAULT 0,
  streak     integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | Primary key |
| name | text | NO | — | Player display name |
| elo | integer | NO | 1200 | Current ELO rating |
| wins | integer | NO | 0 | Total wins |
| losses | integer | NO | 0 | Total losses |
| streak | integer | NO | 0 | Positive = win streak, negative = losing streak |
| created_at | timestamptz | NO | now() | |

---

#### matches

```sql
CREATE TABLE matches (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  winner_id        uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  loser_id         uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  winner_name      text NOT NULL,
  loser_name       text NOT NULL,
  winner_elo_change integer NOT NULL,
  loser_elo_change  integer NOT NULL,
  winner_elo_after  integer NOT NULL,
  loser_elo_after   integer NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);
```

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | Primary key |
| winner_id | uuid | NO | — | FK → players.id, cascades on delete |
| loser_id | uuid | NO | — | FK → players.id, cascades on delete |
| winner_name | text | NO | — | Denormalised for display without joins |
| loser_name | text | NO | — | Denormalised for display without joins |
| winner_elo_change | integer | NO | — | ELO gained by winner (positive) |
| loser_elo_change | integer | NO | — | ELO lost by loser (negative) |
| winner_elo_after | integer | NO | — | Winner's ELO after the match |
| loser_elo_after | integer | NO | — | Loser's ELO after the match |
| created_at | timestamptz | NO | now() | |

---

#### tournaments

```sql
CREATE TABLE tournaments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  winner_name text,
  rounds      jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
```

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | Primary key |
| name | text | NO | — | Tournament name |
| status | text | NO | 'active' | Constrained to 'active' or 'completed' |
| winner_name | text | YES | — | Null until tournament is completed |
| rounds | jsonb | YES | — | Array of rounds: `[[{player1, player2, winner}]]` |
| created_at | timestamptz | NO | now() | |

---

#### daily_snapshots

```sql
CREATE TABLE daily_snapshots (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date        date NOT NULL UNIQUE,
  top3        jsonb,
  player_elos jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
```

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | Primary key |
| date | date | NO | — | UNIQUE — one snapshot per day (format: YYYY-MM-DD) |
| top3 | jsonb | YES | — | Array: `[{name, elo, rank}]` |
| player_elos | jsonb | YES | — | Array: `[{player_id, name, elo}]` — player_id references players.id |
| created_at | timestamptz | NO | now() | |

---

#### chat_messages

```sql
CREATE TABLE chat_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name text NOT NULL,
  message     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
```

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | Primary key |
| player_name | text | NO | — | Display name of sender |
| message | text | NO | — | Message content |
| created_at | timestamptz | NO | now() | |

---

#### polls

```sql
CREATE TABLE polls (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question   text NOT NULL,
  options    jsonb NOT NULL,
  votes      jsonb NOT NULL DEFAULT '{}',
  created_by text NOT NULL,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | Primary key |
| question | text | NO | — | Poll question |
| options | jsonb | NO | — | Array of option strings: `["Option A", "Option B"]` |
| votes | jsonb | NO | `{}` | Map of option index → array of player names: `{"0": ["Niall"], "1": []}` |
| created_by | text | NO | — | Player name who created the poll |
| is_active | boolean | NO | true | False = poll closed |
| created_at | timestamptz | NO | now() | |

---

### RLS Policies

Run this for every table. Replace `players` with each table name in turn.

```sql
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public access" ON players
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

Repeat for: `matches`, `tournaments`, `daily_snapshots`, `chat_messages`, `polls`.

---

### CSV Import Notes

> The Base44 CSV exports have extra columns that don't map to Supabase — ignore them during import.
> ELO values have been fully recalculated from scratch and corrected in the CSVs — do not recalculate again.

**Columns to ignore from every CSV:**
`created_by_id`, `created_by`, `is_sample`, `updated_date`

**Critical — ID remapping:**
Base44 uses hex string IDs (e.g. `6a1eb0ae197eed9fd1e62a65`). Supabase uses UUIDs.
This means `winner_id` and `loser_id` in `Match_export.csv` will not match the new player IDs after import.

**Recommended import order:**

1. **Import `players` first** — note down the new UUID assigned to each player name
2. **Import `matches`** — manually map old Base44 player IDs to new UUIDs for `winner_id` / `loser_id`. The easiest way is to use the Supabase SQL editor after importing players:
   ```sql
   -- Example: find the new UUID for a player by name
   SELECT id FROM players WHERE name = 'Patrick Egan';
   ```
3. **Import `tournaments`** — `rounds` column is JSON, paste as-is into the jsonb column
4. **Skip `daily_snapshots`** — these contained old incorrect ELO values and are no longer accurate. They will regenerate naturally as the app runs.
5. **Import `chat_messages`** — straightforward, no ID dependencies
6. **Skip `polls`** — CSV is empty, nothing to import

---

## Phase 2 — Replace the Backend Client

- [x] Install `@supabase/supabase-js`
- [x] Uninstall `@base44/sdk` and `@base44/vite-plugin`
- [x] Remove the Base44 plugin from `vite.config.js`
- [x] Replace `src/api/base44Client.js` with a Supabase client
- [x] Delete `src/lib/app-params.js` — entirely Base44-specific, no longer needed

---

## Phase 3 — Replace All Data Calls
> Biggest piece of work. Every `base44.entities.X` call becomes a Supabase query.
>
> Pattern: `base44.entities.Player.list()` → `supabase.from('players').select()`

Files to update:

- [ ] `src/components/rankings/Leaderboard.jsx`
- [ ] `src/components/rankings/RecordMatchForm.jsx`
- [ ] `src/components/rankings/MatchHistory.jsx`
- [ ] `src/components/rankings/PlayerProfile.jsx`
- [ ] `src/components/rankings/PlayerProfiles.jsx`
- [ ] `src/components/rankings/AddPlayerForm.jsx`
- [ ] `src/components/rankings/EloHistoryChart.jsx`
- [ ] `src/components/rankings/RankHistory.jsx`
- [ ] `src/components/chat/ChatBox.jsx`
- [ ] `src/components/chat/CreatePollForm.jsx`
- [ ] `src/components/chat/PollCard.jsx`
- [ ] `src/components/tournament/TournamentBracket.jsx`
- [ ] `src/components/tournament/TournamentHistory.jsx`
- [ ] `src/components/admin/RepairStats.jsx`
- [ ] `src/pages/Home.jsx`
- [ ] `src/pages/Tournament.jsx`

---

## Phase 4 — Remove Auth

- [ ] Delete `src/pages/Login.jsx`
- [ ] Delete `src/pages/Register.jsx`
- [ ] Delete `src/pages/ForgotPassword.jsx`
- [ ] Delete `src/pages/ResetPassword.jsx`
- [ ] Delete `src/lib/AuthContext.jsx`
- [ ] Delete `src/components/AuthLayout.jsx`
- [ ] Delete `src/components/UserNotRegisteredError.jsx`
- [ ] Delete `src/components/ProtectedRoute.jsx`
- [ ] Remove `ProtectedRoute` wrapping from `src/App.jsx` — all routes become public
- [ ] Remove the hardcoded admin email check (`18pegan006@gmail.com`) — either expose admin features to all users or add a simple hardcoded PIN

---

## Phase 5 — Commit & Deploy to Vercel

- [ ] Commit all migration changes to GitHub
- [ ] Connect the GitHub repo to Vercel (vercel.com → Import Project)
- [ ] Add environment variables in Vercel dashboard:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- [ ] Deploy — Vercel auto-detects Vite, no config needed
- [ ] Delete the `Data/` folder once data is confirmed in Supabase

---

## Future Phase — Ericsson Email Auth

Not part of this migration. When ready:

- Enable Supabase Auth with email domain restriction (`@ericsson.com`) or SAML/SSO
- Re-add a `ProtectedRoute` wrapper in `App.jsx`
- Restore admin role using Supabase user metadata instead of hardcoded email

---

## Key Files Reference

| File | Purpose | Migration action |
|---|---|---|
| `src/api/supabaseClient.js` | Supabase client | Done |
| `src/lib/app-params.js` | Base44 env var handling | Delete |
| `src/lib/AuthContext.jsx` | Auth state provider | Delete |
| `src/components/ProtectedRoute.jsx` | Route auth guard | Delete |
| `vite.config.js` | Build config | Remove Base44 plugin |
| `package.json` | Dependencies | Swap Base44 for Supabase |
| `entities/` | Base44 schema definitions | Keep as reference |
| `Data/` | CSV exports of all data | Use to populate Supabase, then delete |
