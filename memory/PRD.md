# StudyLocus — JEE 2027 Study Tracker (PRD)

## Original Problem
Build a 1:1 copy of the user's own StudyLocus dashboard (GitHub repo, dark GitHub-style theme) for JEE 2027, on our stack, so the user can modify it further.

## User Choices
- Auth: email/password (JWT)
- Persistence: MongoDB backend (data synced across devices per account)
- Quotes: built-in rotating list
- Replicate the screenshot 1:1 first

## Architecture
- Frontend: React (CRA + CRACO), Tailwind, react-grid-layout (drag/resize/delete), recharts, lucide-react
- Backend: FastAPI, JWT auth (Bearer token in localStorage `sl_token`), Motor/MongoDB
- Ported faithfully from the user's original vanilla-JS StudyLocus repo (`/app/studylocus`)

## Implemented (2026-06)
- Login/Register page (JWT), protected dashboard
- Draggable / resizable / deletable card grid, layout + visible-cards persisted to /api/settings
- Cards: Countdown (live to exam date), Journey heatmap (Jan 1 → exam day, past/today/future/test/exam), My Tasks (add/toggle/delete + progress %), Study Log (timer, LOG, manual entry, today's log + total), Welcome, Mock Test Progress (recharts line chart, avg/best/trend, subject toggles, target line, history), Test Planner (date+name), Quote (rotating built-in list)
- Navbar: sval.tech | JEE 2027, Dashboard/Calendar/Statistics tabs, online badge, user/sign-out, + / gear / info / focus / zen buttons
- Backend CRUD: /api/tasks, /api/studylogs, /api/tests, /api/scores, /api/settings — all per-user, 401 protected
- Admin seeded: admin@studylocus.com / admin123
- Verified: backend 16/16 tests, frontend 10/10 E2E flows (incl. persistence + per-user data isolation)

## Placeholders / Not yet built (from original repo — deferred)
- Calendar & Statistics views (currently "coming soon" placeholders)
- Themes (Cyberpunk/Dracula/etc.), Super Focus & Zen modes, Ambient soundscapes, Pomodoro card, YouTube/Sticky-note/Daily-agenda/Analytics cards, Settings modal (exam type/year/subjects picker), onboarding tour

## Backlog (P1/P2)
- P1: Settings modal to change exam (JEE Mains/Adv/NEET/custom) + year → updates countdown/journey/title; add extra card types via the "+" menu
- P1: Statistics view (streak, consistency, total time, analytics chart)
- P2: Themes, Focus/Zen modes, Calendar view, ambient sounds

## Update 2 (2026-06) — Advanced feature set
- Settings/Customize modal (gear): switch exam (JEE Mains/Advanced/NEET/Custom) + year (or custom date), edit subjects, pick theme → countdown/title/journey update instantly & persist
- 13 Themes ported from original (GitHub Dark, Cyberpunk, Dracula, Forest, Ocean, Rose Gold, Sunset, Nordic, Lavender, Crimson, Coffee, Alakh Pandey, God Mode) via data-theme on <html>
- Statistics tab: current streak, consistency %/grade, total logged, mock count, Study Hours bar chart (7/30 toggle), subject breakdown
- New cards: Pomodoro (modes + editable durations + beep), Sticky Note (persisted), YouTube embed, Daily Agenda (per-day tasks with date nav)
- Journey heatmap now clickable: click any day → Add Test modal prefilled with that date (adds to Test Planner + shows as test cell)
- All header/nav icons now functional: + (add card), gear (settings), info (help+shortcuts), focus (fullscreen Focus mode w/ live clock), zen (hides chrome); card icons: collapse, resize (cycle width), delete; keyboard shortcuts F/Z/N/C/Esc
- Backend: settings doc extended with `theme` + `cardData` (stores note/youtube/pomodoro/agenda + layout blob w/ visible+collapsed)
- Verified: backend 18/18, frontend 100% new features + regression (iteration_2.json)

## Remaining backlog
- Calendar tab still a placeholder (full month view)
- Optional: replace native date input with a styled calendar; ambient soundscapes; onboarding tour

## Update 3 (2026-06) — Layout control
- Added "Reset Layout to Default" in Settings modal (restores default positions/sizes/visibility, clears collapsed, persists)
- Replaced grow-to-any-width with dense auto-packing (packDense): empty gaps are covered by pulling lower cards up on move/resize/delete; cards keep their own size
- Standard usable sizes via CARD_META (per-card default + minW/minH/maxW); applyConstraints clamps width & attaches RGL constraints so cards can't be resized to an unusable size; resize button cycles standard widths within each card's max
- Collapse relaxes minH/maxH (withCollapse) to avoid RGL warnings
- Verified by testing agent: iteration_4.json 10/10 frontend cases pass

## 2026-09-11 — Admin console + GitHub export + local auth persistence
- Admin shortcut login: username `deep` / `deep8670` (role admin) via same portal (Email or username field). Normal users still use email.
- Local persistence: backend/data/users.json (hashed) + login_activity.json, updated each register/login; synced on startup.
- Admin-only Admin Console (Navbar shield button) -> export full /app source to a PRIVATE GitHub repo (PAT + owner/name), creates repo if missing, force-push, bundles memory/EMERGENT_CONTINUE.md as EMERGENT_CONTINUE.md in the repo.
- Endpoints: POST /api/admin/export-github, GET /api/admin/export-log (admin-only; 401/403 guarded).
- Verified: iteration_8 backend 11/11 + frontend 100%. Real GitHub push (happy path) needs a real PAT -> user-verified manually.

## 2026-06 (this session) — Import + migration-proofing + Add Card redesign
- Imported examcrack GitHub repo, recreated gitignored .env files; added setup.sh + .env.example so migrations are self-healing.
- Fixed recurring login failure: REACT_APP_BACKEND_URL pointed at a stale host (CORS). src/lib/api.js now falls back to window.location.origin (same-origin), and frontend/.env ships blank — migration-proof.
- Daily Agenda ("agenda") is now a DEFAULT card; one-time migration adds it to existing users (guarded by settings.newDefaults).
- Redesigned Add Card: new AddCardModal.js — grid of card tiles (icon+name+desc), selected highlight, ADDED badges, Card Title/Content inputs, Cancel/Add Card. Content seeds Note cards.
- Backend: SettingsInput extended with newDefaults: Optional[List[str]].

## 2026-06 — Card sizing bug fixes (iteration_9, verified 100%)
- Journey card: added `min-height:0` to `.graph-container` so heatmap scrolls internally and legend+tip stay visible without in-card scroll at default size; bumped default h:7/minH:6 for new layouts.
- Countdown card: replaced fixed text-5xl/6xl with CSS container-query sizing (.countdown-wrap container-type:size; .countdown-num clamp(1.3rem,26cqmin,4.2rem)) so numbers scale with card size when shrunk/expanded — no clipping.

## 2026-06 — Countdown/Journey aesthetic revert
- Reverted Countdown to original large size; now scales by WIDTH only (container-type: inline-size; .countdown-num clamp(2rem,13cqw,3.75rem)) so it's big on normal cards and only shrinks on narrow ones to prevent clipping (no more tiny numbers).
- Reverted Journey default height to h:5 (removed oversized h:7 empty space); kept .graph-container min-height:0 so legend+tip stay visible. Added one-time migration (newDefaults 'journeyH5') to reset accounts that persisted the oversized height.


## 2026-06 — Countdown reverted to static + enlarged (iteration_10, verified)
- Removed the flip animation (was continuous: Unit was defined inside render -> remounted every second). Unit moved to module scope; renders plain static numbers, no keyframes.
- Countdown numbers enlarged and scale to card: .countdown-num font-size clamp(2rem, min(17cqw,46cqh), 6rem); fits without clipping (~47-66px depending on card width).
- Top-row cards (countdown/journey/welcome) remain aligned at h:6.
