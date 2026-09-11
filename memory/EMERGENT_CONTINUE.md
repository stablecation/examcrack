# StudyLocus — Emergent Continuation Log

_This file is maintained by the Emergent AI after each feature and bundled into the GitHub export
so you can paste it into a new Emergent app and continue seamlessly._

## Project
- StudyLocus (repo: examcrack): JEE/NEET study dashboard. Stack: React (CRA + craco) + FastAPI + MongoDB.
- Auth: custom JWT (bcrypt), Bearer token in localStorage (`sl_token`). Same login portal for users and admin (email OR username).
- Admins: `admin@studylocus.com / admin123` and username shortcut `deep / deep8670`.

## IMPORTANT: setup after clone / migration
- `.env` files are gitignored, so they don't ship with the repo. After a fresh clone/migration run:
  `bash setup.sh && sudo supervisorctl restart backend frontend`
- Login "something went wrong" right after migration = missing `.env`. The frontend also falls back to
  same-origin (`window.location.origin`) when `REACT_APP_BACKEND_URL` is blank, so it survives host changes.

## GitHub export (admin panel)
- Admin-only: POST `/api/admin/export-github` (body: repo `owner/name`, pat, optional summary), GET `/api/admin/export-log`.
- The PAT is NEVER stored — it's used transiently for one force-push, then discarded. Only an audit record
  (repo/commit/by/time) is saved in `export_audit`. So you re-enter your PAT each export; you only need a NEW
  token if the old one expired or was revoked (classic PAT with `repo` scope, or fine-grained Contents R/W).
- On export, this file is bundled into the repo as `EMERGENT_CONTINUE.md`.

## Recent work (this session, 2026-06)
- Imported examcrack repo; recreated `.env`; added `setup.sh` + `.env.example` (migration-proof).
- Fixed recurring login CORS/stale-host bug (same-origin fallback in `src/lib/api.js`).
- Daily Agenda is now a DEFAULT card (one-time migration `newDefaults`).
- Redesigned "Add New Card" into a compact modal (`src/components/AddCardModal.js`): grid of card tiles
  (icon+name+desc), ADDED badges, Card Title/Content (Content seeds Note cards), fits viewport (no page scroll).
- Journey: `.graph-container` got `min-height:0` so legend+tip stay visible without in-card scroll.
- Countdown: static (no animation), scales with card via container queries
  (`.countdown-num` font-size `clamp(2rem, min(18cqw,44cqh), 6.5rem)`).
- Card default sizes (latest, migration `layoutV8`): top row is 3 EQUAL-width columns —
  countdown `w4 h8`, journey `w4 h6`, welcome `w4 h8`; tasks under countdown, studylog under journey,
  quote under welcome. `CARD_META` in `src/pages/Dashboard.js` holds all defaults.

## Layout migration mechanism
- `Dashboard.js` load effect runs one-time layout migrations guarded by `settings.newDefaults` (array of flags:
  `agenda`, `journeyH5`, `topRowV6`, `layoutV8`). Add a new flag to roll out future default-layout changes to
  existing users without clobbering their manual edits.

## Key files
- Backend: `backend/server.py` — auth, settings (SettingsInput incl. `newDefaults`), admin export, seeding.
- Frontend: `src/pages/Dashboard.js` (CARD_META defaults + migrations + grid), `src/components/AddCardModal.js`,
  `src/components/cards/*`, `src/lib/api.js`, `src/App.css`.

## Backlog / next ideas
- Calendar tab is still a placeholder → real month view of tests + agenda.
- Ambient soundscapes card; seconds digit on countdown; custom card titles (rename any card).
