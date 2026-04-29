# Deloitte Oscars

Streamlit polling app for creating polls, sharing them by QR code, collecting named votes, and showing the winner.

## Deploy on Streamlit Community Cloud

Use these settings:

- Repository: `coralfridman/DeloitteOscars`
- Branch: `main`
- Main file path: `app.py`

## Features

- Create polls with multiple answer options
- Generate share links and QR codes
- Voters enter their name before voting
- Admin can allow multiple answers, require one vote per name, and show/hide voter names
- Results auto-refresh while poll/admin pages are open
- Winner is calculated from the most votes
- Hebrew / English interface

## Persistence note

This version stores poll data in `polls.json` on the Streamlit server. Streamlit Community Cloud may reset local files when the app restarts. For long-term production use, connect a hosted database such as Supabase, Neon, Firebase, or Google Sheets.
