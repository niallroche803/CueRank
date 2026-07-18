# CueRank

An ELO-based ranking system for pool/billiards. Tracks player ratings, match history, tournaments, and includes a live chat with polls.

## Features

- ELO leaderboard with win/loss tracking and streaks
- Match recording with automatic ELO calculation
- Player profiles with head-to-head records and ELO history charts
- Single-elimination tournament brackets with automatic bye resolution
- Live chat with poll creation and voting
- Daily ELO snapshots for rank history
- Admin mode (passcode-protected) for match deletion, stat repair, and moderation

## Tech Stack

- React 18 + Vite
- Supabase (PostgreSQL)
- Tailwind CSS + shadcn/ui
- TanStack React Query
- React Router

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env.local` file:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

4. Run the app: `npm run dev`

## Admin Features

Admin mode is unlocked by clicking the lock icon in the header and entering the passcode. The passcode is checked server-side by a Supabase Edge Function (`supabase/functions/admin-login`) rather than a client env var — deploy it with `supabase functions deploy admin-login` and set `ADMIN_PASSCODE` and `ADMIN_TOKEN_SECRET` via `supabase secrets set`. Admins can:

- Delete matches (with automatic ELO revert)
- Repair player stats (replays all matches from ELO 1200 to correct any drift)
- Record matches between other players
- Create, close, and delete polls
- Delete chat messages
- Create and delete tournaments, set bracket results

## Deployment

The app is deployed on Vercel. Set the same two environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in the Vercel dashboard under Project → Settings → Environment Variables.

The `admin-login` Edge Function is deployed separately to Supabase, not Vercel — see the Admin Features section above.
