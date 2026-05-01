# Deloitte Oscars

A mobile-first real-time poll game built with Next.js 15, Tailwind CSS, and Supabase.

This is the product direction:

- Host creates a multi-question poll game from a phone or laptop.
- The app generates a public participant link/PIN and a private host control link.
- Participants join from their own phones and vote once per poll question.
- The host opens voting, reveals results, and advances questions from a mobile control panel.
- Results stay hidden from participants until the host reveals them.
- Revealed results appear on participant phones as bars and percentages.
- Participation scoring awards 100 points for each submitted vote.
- The host controls the pace manually.

## Routes

- `/create` - Create a multi-question poll game and receive host/participant links.
- `/join` - Enter a PIN shared by the host.
- `/{gameCode}` - Participant join, vote, wait, and result screen.
- `/host/{gameCode}?token=...` - Private host mobile control panel.

## Excel Import

The create screen can download an Excel template, then import completed `.xlsx`, `.xls`, or `.csv` files.

Template columns:

- `Question`
- `Answer 1` through `Answer 10`
- `Background Image URL`

After bulk upload, the creator stays on `/create` in a design review state to edit question text, answers, and background images before hosting.

## Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor. This is a destructive reset script for the current demo build.
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

Host controls use private-token RPC functions. Participants can vote only while a question is in the `voting` state.

## Deployment

Deploy on Vercel or any Next.js host.

Required environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Deployment source: GitHub `main`.
