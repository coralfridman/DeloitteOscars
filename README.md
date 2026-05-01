# Deloitte Oscars

A Kahoot-style real-time polling game built with Next.js 15, Tailwind CSS, and Supabase.

This is the product direction:

- Host creates a multi-question game.
- Each question can include a background image URL.
- Players join with a PIN or QR code.
- Host controls the live question progression.
- Players answer using color-coded answer tiles.
- Supabase Realtime updates the host and players without manual refresh.
- Scoring is based on correctness and response speed.

## Routes

- `/create` - Create a multi-question game.
- `/{gameCode}` - Player join and answer screen.
- `/host/{gameCode}` - Host screen with PIN, QR code, live question, and leaderboard.

## Excel Import

The create screen can download an Excel template, then import completed `.xlsx`, `.xls`, or `.csv` files.

Template columns:

- `Question`
- `Correct Answer`
- `Answer 1` through `Answer 10`
- `Background Image URL`
- `Time Limit Seconds`

After bulk upload, the creator stays on `/create` in a design review state to edit question text, answers, timers, and background images before hosting.

## Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Copy `.env.example` to `.env.local` and fill:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

4. Install and run:

```bash
npm install
npm run dev
```

## Realtime

The app subscribes to Supabase Realtime changes on:

- `games`
- `players`
- `submissions`

Scores are calculated by the `submit_answer` Postgres RPC based on correctness and response speed.

## Deployment

Deploy on Vercel or any Next.js host.

Required environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```
