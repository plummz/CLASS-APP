# CLASS-APP — Work Task Report

> **Every agent (Claude, Codex, Copilot, Cursor, Gemini or any other) reads this file first, before
> changing anything.** It is the current state of the app: how it is set up, how it works, what has
> changed, and what is still open. After that, follow the rules in [`CLAUDE.md`](CLAUDE.md) (Claude)
> or [`AGENTS.md`](AGENTS.md) (everyone else).

| | |
|---|---|
| **Current version** | **1.14.2** (October 10, 2026) — Pokémon floating joystick |
| **Live app** | https://class-app-1.onrender.com (Render, paid plan) |
| **Repo** | https://github.com/plummz/CLASS-APP (branch `main`) |
| **Database** | Supabase project `rxpezjhsnqkjydurtayx` ("Class Application"), region ap-southeast-1 |
| **Last health check** | October 10, 2026 — site up, Supabase ACTIVE_HEALTHY, `npm run check` OK, 31/31 tests pass, `scripts/version-check.js` passes |
| **Report last updated** | October 10, 2026 by Claude |

---

## 0. How to keep this report current (MANDATORY)

Whenever you change the app, update this file **in the same commit**:

1. **Snapshot table above** — current version, date, last health check, who updated the report.
2. **Section 6 (Change history)** — add one line at the top of the newest month: version, date,
   what changed, and the agent that did it.
3. **Sections 2–5** — if you changed setup, hosting, environment variables, routes, database
   tables/migrations, file layout or a core flow, fix the matching section so it stays true.
4. **Section 7 (Open issues)** — add anything you found but did not fix; remove items you fixed.

Keep it factual and short. Never put secrets (keys, passwords, tokens) in this file — only the
*names* of environment variables.

The usual per-change rules still apply (see `CLAUDE.md`): add a `features/updates/changelog.js`
entry, bump `?v=N` for each changed file in **both** `index.html` and `sw.js`, update
`CACHE_VERSION` in `sw.js`, and run the checks in section 5.

---

## 1. What the app is

"My School Portfolio" — a mobile-first PWA for a BSIT class (Section 2). Students sign in and get:
class chat and private messages, shared folders and files, announcements, subjects by year and
semester, an AI helper (summaries, quizzes, reviewers), a Code Lab (Java/Python), personal tools
(notepad, alarm clock, calculator, calendar, themes/backgrounds, music/YouTube), a School Lobby,
and an Arcade of games (Pokémon World 3D, Battle Royale 3D, Battle Royale Classic, Dungeon of
Knowledge, Candy Match, Tetris, Pac-Man). It also ships as an Android app.

Design rules: mobile-first, iOS Safari + Android safe, glassmorphism look, light and dark themes.

---

## 2. Setup and hosting

### Where things run

| Piece | Where | Notes |
|---|---|---|
| Web app + API | **Render** web service `class-app` (`render.yaml`, Docker) | `Dockerfile`: Node 22 + OpenJDK 17 (for Code Lab Java). Health check `/api/ping`. Auto-deploys on push to `main` (about 1 min). |
| Database, auth data, realtime | **Supabase** `rxpezjhsnqkjydurtayx` | **Free tier pauses after ~1 week idle.** If the app "won't load", check Supabase first and restore it. It was paused once and restored on Oct 4, 2026. |
| Uploaded files | **Cloudflare R2** bucket `class-app-storage` | Server streams files; `/uploads/*` falls back to local disk, then R2. |
| Static copy | GitHub Pages (`plummz.github.io/CLASS-APP`) | Static only — no API. The real app is the Render URL. |
| Android app | `native-app/` (Capacitor 8, id `com.plummz.classapp`) | Loads the live Render URL, so web changes need **no** new APK. APK copy: Google Drive → `ANDROID APPS/CLASS-APP.apk` (overwrite to keep the same link). Build steps in `native-app/README.md`. |
| Battle Royale 3D | Godot 4.7.2 source in `godot/royale3d/` | Web export committed to `features/royale3d/game/`, served with its own CSP and `max-age=0`. Build/test commands in `godot/royale3d/README.md`. |
| Dungeon of Knowledge | Embedded Godot web build from `plummz.github.io/Study_Arena/dungeon/` | Lives in the separate Study_Arena repo. |
| Alarm push | Supabase Edge Function `supabase/functions/check-alarms` | Uses the new Supabase secret key, falls back to the legacy service-role key. |

### Environment variables (Render → Environment). Names only — never commit values.

- **Supabase:** `SUPABASE_URL`, `SUPABASE_ANON_KEY` (or new `sb_publishable_…`), `SUPABASE_SERVICE_KEY` / `SUPABASE_SERVICE_ROLE_KEY` (or new `sb_secret_…`), `SUPABASE_JWT_SECRET`, optional `SUPABASE_JWT_KID`
- **Auth:** `JWT_SECRET` (required in production), `ADMIN_USERNAME`, `ADMIN_PASSWORD` (must be a **bcrypt hash**, plaintext is rejected)
- **Storage:** `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`
- **AI:** `GEMINI_API_KEY`, `GROQ_API_KEY`
- **Other:** `YOUTUBE_API_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `ALLOWED_ORIGIN`, `ALARM_FUNCTION_URL`, `ALARM_CHECK_SECRET`, `PORT`, `NODE_ENV`, Code Lab Java timeouts (`CODE_LAB_JAVA_*`, `JAVA_BIN`, `JAVAC_BIN`)

Template: `.env.example`. There is no `.env` in the local clone, so the server cannot sign anyone
in locally. Test UI pieces in isolation, or test on the live site after deploying.

### Local commands

```bash
npm install
npm start               # runs scripts/cache-bust.js first, then server.js on :3000
npm run check           # node --check on the main JS files
npm test                # Jest, tests/server.test.js (31 tests)
node scripts/version-check.js   # index.html and sw.js ?v=N must match
```

Other agents (including cloud sessions) also push to this repo. **Run `git pull` before starting.**

---

## 3. How the app works (architecture)

### Frontend — one page, many "pages"

- `index.html` is the whole shell. Each screen is a `<section id="page-…">` (for example
  `page-chat`, `page-games`, `page-pokemon`). `goToPage(name)` switches the visible page.
- `script.js` (~6.8k lines) holds shared app logic. Feature code lives in `features/<name>/` (one
  folder per feature, with its own `.js` and `.css`).
- **Startup isolation (locked — see `CLAUDE.md`):**
  - `features/logging-in/loading-components.js` — Supabase client init, session restore, splash/loading screen, sign-in/register handlers. Nothing else.
  - `features/logging-in/shell-controls.js` — hamburger/sidebar, `goToPage`, nav clicks. Nothing else.
  - `features/hotfixes/interaction-guards.js` — guards against dead buttons and overlays.
- Many buttons use inline `onclick`. The CSP in `server.js` must keep allowing inline handlers
  until every handler is migrated (this broke all buttons in May 2026).
- `features/ui-rules/` (v1.14.0) — app-wide usability rules: popups close by X, Cancel, tapping
  outside or Esc; inputs at least 16px (no iOS zoom); tap targets enlarged; loading skeletons and
  helpful empty states (`ui-kit.js`).

### Feature map

| Page(s) | Files |
|---|---|
| Sign-in, splash, session | `features/logging-in/`, `features/security/session-manager.js`, `form-validation.js`, `password-toggle.*` |
| Menu / navigation | `features/logging-in/shell-controls.js` |
| Chat (group + private) | `features/chat/`, Socket.io in `server.js` |
| Online status | `features/presence/` (away after 3 min, "● N online" pill, who's-online list; exposes `window.classAppPresence`) |
| Folders and files | `features/folders/` |
| Members / users | `features/users/` |
| Subjects (y1–y4, semesters), announcements | `features/academics/` |
| AI, shared AI outputs | `features/ai/` (`ai-config.js` = model lists), `ai-service.js` on the server |
| File summarizer, reviewers, quizzes | `features/file-summarizer/`, `features/reviewers/` |
| Code Lab, coding lessons | `assets/js/codelab.js`, `coding-educational/` |
| Personal tools | `features/personal-tools/` (notepad, alarm clock, calculator, personalization), `features/calendar/`, `features/music/` |
| Social pages (PSITS, WIT-IT) | `features/social/` |
| School Lobby | `features/lobby/` (Socket.io `lobby:*` events) |
| Arcade home | `features/games/` (Continue playing row, filters, search) |
| Pokémon World 3D | `features/pokemon/` (`pokemon.js` game, `pokemon-world.js` maps, `art/` pre-rendered Blender art). Art pipeline: `tools/pokemon-art/` (Blender Python). Saves: Supabase `pokemon_saves` (cloud preferred) + per-user localStorage. |
| Battle Royale 3D | `features/royale3d/` (lobby, shop, launcher) + `game/` (Godot export); rooms in `royale-rooms.js` (Socket.io `room:*`), stats in `royale-stats.js` |
| Battle Royale Classic (2D) | `features/royale/` |
| Dungeon of Knowledge | `features/dungeon/` (iframe to the Study_Arena build) |
| Candy Match, Tetris, Pac-Man | `features/candy/`, `features/tetris/`, `features/pacman/` |
| Software Update page | `features/updates/` (`changelog.js` = `APP_VERSION` + `APP_CHANGELOG`) |

### Backend — `server.js` (Express + Socket.io)

- **Auth:** `POST /api/login`, `/api/register`, `/api/password-setup` (legacy accounts). The server
  signs a 7-day app JWT (`{ username, isAdmin }`). The browser keeps it in `localStorage.classAppToken`
  (user in `classAppUser`). `GET /api/session` validates a saved session **before** the shell opens
  (locked fix). Passwords are bcrypt hashes. The admin comes from `ADMIN_USERNAME`/`ADMIN_PASSWORD`
  plus the `admins` table.
- **Signed database pass (Oct 2026):** the browser calls `GET /api/db-token` and gets a short-lived
  Supabase JWT signed with `SUPABASE_JWT_SECRET`, carrying `class_username`.
  `features/security/db-token.js` adds it to every Supabase request. RLS reads the username from
  that verified pass (migration 033), so a browser cannot claim someone else's name. If the server
  has no secret configured, it answers 503 and requests fall back to the anon key.
- **Route groups:** config (`/api/config`), users, folders/files (`/api/folders`, `/api/files`,
  `/api/sb/*`, `/api/upload`, `/uploads/*`), messages, subjects and announcements, shared AI outputs,
  reviewers, quiz and summary history, calendar notes, AI (`/api/gemini`, `/api/groq`, `/api/quiz`,
  `/api/summarize-file`), YouTube search (`/api/yt-search`, `/api/piped-search`, `/api/yt-scrape`),
  push (`/api/push/*`), Code Lab (`/api/code-lab/*`, runs Java on the server), presence
  (`/api/session/presence`), app-open counter, diagnostics, `/api/ping`.
- **Static files:** the server only serves the app's own files from the project root (v1.12.3). Do
  not expose `.env`, `server.js` or `supabase/`.
- **Socket.io:** `identify`, `joinChat`, `sendMessage`, `updateProfile`, `lobby:*`, and Battle Royale
  3D `room:*` (create, invite, join, start, net).
- **AI (`ai-service.js` + `features/ai/ai-config.js`):** tries each model in order, then falls back
  to the other provider, then to a local summarizer. Gemini: `gemini-3.5-flash`,
  `gemini-3.5-flash-lite`, `gemini-2.5-flash`. Groq: `llama-3.3-70b-versatile`,
  `openai/gpt-oss-120b`, `llama-3.1-8b-instant`, `openai/gpt-oss-20b`. When a model is retired,
  update `ai-config.js` (retired models broke the app once).

### Database — Supabase

- Schema history is in `supabase/migrations/001…033`. New changes go in a **new numbered file** (next: `034_…`), never by editing old ones.
- Main tables: `profiles`, `folders`, `files`, `messages`, `message_reactions`, `subjects`,
  `subject_announcements`, `shared_announcements`, `shared_ai_outputs`, `reviewers`,
  `reviewer_votes`, `user_notes`, `calendar_notes`, `summary_history`, `quiz_history`, `admins`,
  `activity_log`, `operation_audit_log`, `app_open_counts`, `app_updates`, `code_lab_completions`,
  `candy_scores`/`candy_progress`/`candy_inventory`, `tetris_scores`, `push_subscriptions`,
  `lobby_scores`, `pokemon_saves`.
- **Security model:** RLS on everything. Most writes go through the server (migrations 021/024
  lock down client writes). Password hashes are unreadable from the browser (029). Users can only
  change their own profile and Pokémon save (031). Identity comes only from the signed pass (033).
  The RLS summary is in `CLAUDE.md`.

### Caching and updates (service worker)

- `sw.js` precaches the versioned `ASSETS` list. `CACHE_VERSION` identifies a release, and
  `npm start` (`scripts/cache-bust.js`) stamps it with `APP_VERSION` and a timestamp on deploy.
- Every changed frontend file needs its `?v=N` bumped in **both** `index.html` and `sw.js`, or
  phones keep the old file. `scripts/version-check.js` verifies this.
- v1.9.25 removed forced reloads on `APP_CACHE_UPDATED`. Those caused the "random loading screen".
  Don't bring them back.

---

## 4. Locked systems — do not break

Login/auth, session restore + `/api/session`, the splash/loading screen and its fallbacks,
sidebar/hamburger, `goToPage` navigation, CSP allowing inline handlers, service worker
registration, and the changelog. Full rules and the regression checklist are in `CLAUDE.md`
("PROTECTED CORE SYSTEMS", "MAY 9, 2026 STABILITY LOCK", "STARTUP ISOLATION RULE").

Also: do **not** weaken the admin password. A request to set it to `1234` was refused as a
security risk.

---

## 5. Checks before every push

1. `npm run check` and `npm test` pass.
2. `node scripts/version-check.js` passes.
3. A changelog entry was added, and `?v=N` plus `CACHE_VERSION` were bumped.
4. Test in a real browser where possible: login, splash clears, sidebar works, the edited page
   works, 3 unrelated buttons work, and the console has no errors. If you can't (no local `.env`),
   say so and list the manual steps.
5. After pushing, confirm Render serves the new version (for example
   `curl -s https://class-app-1.onrender.com/sw.js | grep CACHE_VERSION`).
6. **Update this report** (section 0).

---

## 6. Change history

Newest first. Format: `version — date — what changed (agent)`. The full user-facing notes are in
`features/updates/changelog.js`.

### October 2026 (app revived after ~5 months offline)

- **1.14.2** — Oct 10 — Pokémon: the 4 arrow buttons are replaced by a floating joystick like Battle Royale's. The base appears under the thumb, the knob follows, it allows diagonals with a dead zone, and it ignores a second finger (`setupDpad()` in `pokemon.js`, `.pk-joy-*` in `pokemon.css`; the `#pk-dpad` id is kept for layout/hide logic). Also added this report. (Claude)
- **1.14.1** — Oct 9 — Loading skeletons, empty states that offer the next step, live password/username rules on Create Account. (Claude)
- **1.14.0** — Oct 9 — App-wide usability rules (`features/ui-rules/`), new Arcade home with Continue playing, filters and search. (Claude)
- **1.13.6** — Oct 9 — Chat Send fixed on laptops (the chat bubble covered it). Signed database pass switched on (migrations 031–033). App Opens counter fixed (032). (Claude)
- **1.13.5** — Oct 9 — Pokémon controls sized to the device; trainers spot you within 3 tiles and walk up. (Claude)
- **1.13.2–1.13.4** — Oct 9 — Password hashes locked (029), `profiles.updated_at` fixed (030), support for new Supabase `sb_publishable`/`sb_secret` keys, an outage fix (only hand out passes the database accepts). (Claude)
- **1.13.1** — Oct 8 — Signed database pass for browser Supabase requests (`/api/db-token`, `features/security/db-token.js`). (Claude)
- **1.13.0** — Oct 8 — Livelier School Lobby, class members with live dots, show-password eye. (Claude)
- **1.12.3** — Oct 8 — Server only serves the app's own files from the project root. (Claude)
- **1.10.0–1.12.2** — Oct 8 — Battle Royale 3D: tactical soldiers, third person, vehicles, Isla Verde map, skin shop, lobby, profiles, match history, duo/squad, two more maps, 13 VIP skins, HUD item pictures, performance and aim-assist passes. (Claude)
- **1.9.30–1.9.31** — Oct 7 — Better online status (away detection, online pill, who's online). Battle Royale 3D rooms: invite online classmates into one match. (Claude)
- **1.9.26–1.9.29** — Oct 7 — New Battle Royale 3D (Godot, PUBG/RoS rules) with walk-in houses, interiors, crates and backpack. Old 2D game kept as "Battle Royale Classic". Candy Match special candies, swipe, hints, stars. (Claude)
- **1.9.25** — Oct 7 — Root fix for the random loading screen (no forced reload on SW update); faster start. (Claude)
- **1.9.24** — Oct 5 — Install App button and Add to Home Screen guide on iPhone/iPad. (Claude)
- **1.9.19–1.9.23** — Oct 4–5 — Pokémon World 3D (Blender art, 3D starters, trainers, Coast Gym, Pokédex, safer cloud saves), social pages fixed, background music on phones, light-mode and landscape fixes. (Claude)
- **1.9.17–1.9.18** — Oct 4 — Supabase restored after the inactivity pause. Retired AI models replaced (Gemini 2.0, Llama 3). Dungeon of Knowledge added to the Arcade. Android app (Capacitor) added. Folders, themes, music, YouTube and notes upgraded. Render switched to a paid plan. (Claude)

### April–May 2026 (original build and hardening)

- **1.9.16** — May 11 — Tetris restored; App Hardening Phases 1–6 (`app-hardening.md`).
- **1.9.2–1.9.15** — May 6–9 — Startup isolation into `loading-components.js` / `shell-controls.js`, dead-button fixes, session validation before opening the shell, auth fallback, startup watchdog, Render cold-start fix, splash failsafe, inline handlers re-enabled in CSP (**the "May 9 stability lock"**).
- **1.8.x–1.9.1** — May 5–6 — Security phases 2–5 (form validation, session lifecycle, monitoring, migration 021 lockdown), Tetris, Python Code Lab, re-quiz, light themes, sidebar redesign.
- **1.6.x–1.7.x** — Apr 30–May 4 — Identity model and RLS lockdown, server-authoritative writes, quiz/summary history, Supabase-backed subjects, CSP root cause of dead buttons.
- **≤1.5.x** — April 2026 — Original app: chat, profiles, folders, AI tools, games, PWA.

---

## 7. Open issues and to-dos

- **UptimeRobot monitor** not set up. The user needs to create an account and sign in; then add a
  monitor on `https://class-app-1.onrender.com/api/ping`.
- **Supabase free-tier pause** is still a risk after ~1 week with no traffic.
- **Pokémon joystick (1.14.2)** was tested in desktop Chrome with simulated drags only. It still
  needs a check on a real phone (Android and iPhone), portrait and landscape.
- `MUST-FIX` (old May 2026 button-bug analysis) and `app-hardening.md` are historical notes. Check
  them against the current code before acting on them.
- `README.md` is outdated (describes only the original chat app). This report is the
  up-to-date overview.
- Server log warning during tests: `[users] Admin list unavailable` (expected without a database; harmless).
