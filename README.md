# CLASS-APP — My School Portfolio

A mobile-first school app (PWA + Android) for a BSIT class: class chat, shared folders and files,
announcements and subjects, AI study tools, a Code Lab, personal tools, a School Lobby and an
Arcade of games.

**Live app:** https://class-app-1.onrender.com

> **Developers and AI agents: start with [`WORK-TASK-REPORT.md`](WORK-TASK-REPORT.md).** It has
> the current state of the app, setup, architecture, change history and open issues. Then follow
> [`CLAUDE.md`](CLAUDE.md) (Claude) or [`AGENTS.md`](AGENTS.md) (other agents).

## Features

- **Accounts:** sign in / create account, saved sessions, profiles, online status
- **Chat:** group and private chat in real time (edit, pin, react, delete), push notifications
- **Class content:** folders and files with permissions, announcements, subjects by year and semester
- **AI tools:** ask AI, file summarizer, quizzes, reviewers, a shared AI board (Gemini + Groq)
- **Code Lab:** run Java and Python, coding lessons
- **Personal tools:** notepad, alarm clock, calculator, calendar, themes and backgrounds, music and YouTube
- **School Lobby:** a shared space where online classmates walk around and chat
- **Arcade:** Pokémon World 3D, Battle Royale 3D (play together in rooms), Battle Royale Classic,
  Dungeon of Knowledge, Candy Match, Tetris, Pac-Man
- **Software Update page:** what changed in each version

## Tech stack

| Part | Uses |
|---|---|
| Frontend | Plain HTML/CSS/JS single-page app (`index.html`, `script.js`, `features/*`), service worker (`sw.js`) |
| Backend | Node 22, Express, Socket.io (`server.js`) |
| Database | Supabase (Postgres + row-level security), migrations in `supabase/migrations/` |
| File storage | Cloudflare R2 |
| Hosting | Render (Docker, `render.yaml`), auto-deploys from `main` |
| Android | Capacitor 8 in `native-app/` (loads the live site) |
| 3D game | Godot 4.7 in `godot/royale3d/` |

## Run locally

```bash
npm install
cp .env.example .env     # then fill in the values (Supabase, JWT_SECRET, R2, AI keys...)
npm start                # http://localhost:3000
```

Without a filled-in `.env` the pages load but nobody can sign in.

## Checks

```bash
npm run check                    # syntax check of the main JS files
npm test                         # server tests
node scripts/version-check.js    # ?v=N cache versions match in index.html and sw.js
```

## Making changes

Every change needs a `features/updates/changelog.js` entry, `?v=N` bumps for each changed file
in both `index.html` and `sw.js`, a new `CACHE_VERSION`, and an update to
[`WORK-TASK-REPORT.md`](WORK-TASK-REPORT.md). The full rules are in [`CLAUDE.md`](CLAUDE.md).

## More docs

- [`WORK-TASK-REPORT.md`](WORK-TASK-REPORT.md): current state, setup, architecture, history
- [`native-app/README.md`](native-app/README.md): building the Android APK
- [`godot/royale3d/README.md`](godot/royale3d/README.md): Battle Royale 3D build and test
- [`app-hardening.md`](app-hardening.md): plan for the last hardening phase (CSP tightening)
- [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md): licences for third-party assets
