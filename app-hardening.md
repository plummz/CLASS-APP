# CLASS-APP Hardening Roadmap

## Purpose

This file is the single source of truth for future stabilization work on CLASS-APP.

Use it when opening a new chat or starting a new phase so the work stays consistent, safe, and aware of past fixes.

## Locked Context From May 9, 2026

The following issues were already fixed and must not be casually broken again:

- startup getting stuck on logo / splash
- stale saved sessions restoring a broken signed-in shell
- dead buttons caused by CSP blocking inline handlers
- hamburger menu / sidebar navigation regressions
- chat bubble, game cards, and personal tool cards appearing clickable but doing nothing

### Protected fixes already in place

- startup/session validation before restoring the shell
- auth fallback back to login when session is invalid
- CSP allowing inline handler attributes while the app still depends on inline `onclick` / similar attributes
- cache/version bump discipline for Render + Android PWA updates

## Non-Negotiable Rules For Every Phase

1. Do not rewrite startup, auth, menu, sidebar, page switching, or CSP broadly.
2. Do not remove working fallback logic unless replacing it with a verified safer system.
3. Do not tighten CSP until the affected inline handlers for that phase are fully migrated and tested.
4. Every phase must be independently shippable.
5. No phase may depend on a future unfinished phase to keep the app working.
6. Every phase must be tested in a real browser before push.
7. Every phase must preserve mobile behavior, especially Android PWA and iOS Safari safety.

## Required Regression Checks For Every Phase

- open app after refresh
- confirm splash/logo clears correctly
- confirm login works
- confirm invalid saved session falls back safely
- confirm hamburger opens/closes
- confirm sidebar nav still switches pages
- confirm chat bubble behavior
- confirm at least 3 unrelated previously working buttons still work
- check console for new errors
- verify latest deployed assets actually loaded

## Phase Roadmap

### Phase 1 — Shell Lock

**Goal**
- Protect startup, splash, auth restore, hamburger, sidebar, chat bubble, `goToPage`, and CSP behavior.

**Scope**
- Only core shell safety and stability.
- No broad feature migration.

**Likely files**
- `CLAUDE.md`
- `server.js`
- `script.js`
- `features/logging-in/loading-components.js`
- `features/logging-in/shell-controls.js`

**Ship condition**
- App starts reliably.
- No logo lock.
- No dead shell from stale session.
- Hamburger/sidebar works after refresh.

**Prompt for a new chat**
```text
You are working on CLASS-APP.

Read `CLAUDE.md` first, then read `app-hardening.md`.

You are working on Phase 1 — Shell Lock.

Important context:
- Startup/logo freeze, stale-session shell restore, dead hamburger/menu states, and CSP-related dead inline buttons were already fixed on May 9, 2026.
- Do not remove or weaken those fixes.
- Do not rewrite startup/auth/menu broadly.

Your goal in this phase is ONLY to harden startup, splash, auth restore, hamburger, sidebar, chat bubble, `goToPage`, and CSP safety without touching unrelated feature logic.

Strict rules:
- Make the smallest safe patch only.
- Do not depend on future phases.
- Test in a real browser before push.
- Keep the phase independently shippable.

After changes:
- verify splash clears
- verify login works
- verify stale session fallback works
- verify hamburger works
- verify sidebar navigation works
- verify chat bubble works
- verify at least 3 unrelated buttons still work
```

### Phase 2 — Interaction Standard

**Goal**
- Define one safe interaction pattern for future migrations.

**Scope**
- Decide the standard for stable button wiring.
- Avoid mass migration in this phase.

**Recommended standard**
- delegated listeners + `data-action` / stable feature-owned handlers

**Likely files**
- `script.js`
- `features/logging-in/shell-controls.js`
- optionally one shared helper file

**Ship condition**
- A documented, adopted interaction pattern exists.
- No app-wide behavior regression.

**Prompt for a new chat**
```text
You are working on CLASS-APP.

Read `CLAUDE.md` first, then read `app-hardening.md`.

You are working on Phase 2 — Interaction Standard.

Important context:
- Phase 1 fixes must remain intact.
- The app still contains mixed interaction wiring: inline handlers, direct listeners, duplicated patterns, and dynamic rendering behavior.
- Do not broadly migrate all buttons in this phase.

Your goal is ONLY to define and introduce one safe interaction standard that future phases can follow without breaking current startup/menu/auth behavior.

Strict rules:
- No large rewrites.
- No dependency on future phases.
- Do not break inline handlers that are still required.
- Keep current CSP compatibility unless a fully tested replacement exists.
```

### Phase 3 — Core Navigation Migration

**Goal**
- Migrate global navigation controls first.

**Scope**
- sidebar items
- year dropdowns
- semester nav
- chat bubble
- top-level shell navigation controls

**Likely files**
- `index.html`
- `script.js`
- `features/logging-in/shell-controls.js`

**Ship condition**
- Global navigation no longer relies on fragile mixed behavior.
- Major page switching remains stable after refresh and login.

**Prompt for a new chat**
```text
You are working on CLASS-APP.

Read `CLAUDE.md` first, then read `app-hardening.md`.

You are working on Phase 3 — Core Navigation Migration.

Important context:
- Startup/auth/hamburger/CSP fixes from May 9, 2026 are protected.
- This phase is only for shell navigation controls, not feature-page actions.

Your goal is to stabilize sidebar navigation, dropdown navigation, semester navigation, and chat bubble navigation using the interaction standard chosen earlier, without breaking startup, auth restore, or menu behavior.

Strict rules:
- Keep this phase independently shippable.
- Do not depend on later feature migrations.
- Re-test hamburger, sidebar, chat bubble, and major page transitions before push.
```

### Phase 4 — Personal Tools And Games

**Goal**
- Fix card-open and back-navigation patterns in contained feature areas.

**Scope**
- Personal Tools cards
- Alarm / Notepad / Calculator / Personalization open-back flow
- Games cards
- Pokémon / Royale / Pacman / Candy open-back flow

**Likely files**
- `features/personal-tools/personal-tools.js`
- `features/personal-tools/alarm-clock.js`
- `features/personal-tools/notepad.js`
- `features/personal-tools/calculator.js`
- `features/personal-tools/personalization.js`
- `features/games/games.js`
- related game feature files if needed

**Ship condition**
- Tool cards open correctly.
- Game cards open correctly.
- Back/return flow works.

**Prompt for a new chat**
```text
You are working on CLASS-APP.

Read `CLAUDE.md` first, then read `app-hardening.md`.

You are working on Phase 4 — Personal Tools And Games.

Important context:
- Startup/menu/auth/CSP fixes are protected and must not be disturbed.
- Core navigation should already be treated as locked for this phase.

Your goal is ONLY to stabilize Personal Tools card actions, tool open/back behavior, Games card actions, and game open/back behavior.

Strict rules:
- Do not touch unrelated pages.
- Do not introduce a broad global refactor here.
- Keep this phase independently shippable.
- Test tool cards, game cards, back buttons, hamburger, chat bubble, and 3 unrelated buttons before push.
```

### Phase 5 — Music And Calendar

**Goal**
- Stabilize dynamic feature actions and page-specific controls.

**Scope**
- YouTube search
- uploaded music search/actions
- play/open behavior
- calendar prev/next
- save/delete/date actions

**Likely files**
- `features/music/music.js`
- `features/calendar/calendar.js`
- `script.js` only if required minimally
- `index.html` only if required minimally

**Ship condition**
- Searches work or fail gracefully.
- Calendar controls respond consistently.

**Prompt for a new chat**
```text
You are working on CLASS-APP.

Read `CLAUDE.md` first, then read `app-hardening.md`.

You are working on Phase 5 — Music And Calendar.

Important context:
- Protected startup/auth/menu/CSP fixes must remain untouched unless absolutely necessary.
- This phase focuses only on Music Hub and Calendar interactions.

Your goal is to stabilize YouTube/music actions and calendar actions without changing the rest of the app’s navigation or startup systems.

Strict rules:
- Minimal safe patching only.
- Keep the phase independently deployable.
- Test music search/action behavior, calendar prev/next, save/delete behaviors, hamburger, and 3 unrelated buttons before push.
```

### Phase 6 — Academic And Content Features

**Goal**
- Stabilize the highest-value student workflows.

**Scope**
- My Classes
- subject/semester/folder/file actions
- reviewers
- announcements
- user directory profile buttons
- gallery/event/random picture flows

**Likely files**
- `features/folders/folders.js`
- `features/reviewers/reviewers.js`
- `features/users/users.js`
- `features/gallery/gallery.js`
- `script.js` only for truly shared minimal fixes

**Ship condition**
- Core student actions become dependable.

**Prompt for a new chat**
```text
You are working on CLASS-APP.

Read `CLAUDE.md` first, then read `app-hardening.md`.

You are working on Phase 6 — Academic And Content Features.

Important context:
- Startup, menu, auth, and CSP fixes from May 9, 2026 are protected.
- Earlier phases must be preserved.

Your goal is to stabilize academic/content workflows: folders, files, reviewers, announcements, directory actions, and gallery navigation.

Strict rules:
- Do not rewrite startup or shell systems.
- Keep the phase independently shippable.
- Test edited actions plus hamburger, chat bubble, login/startup, and 3 unrelated buttons before push.
```

### Phase 7 — CSP Tightening Last

**Goal**
- Only after the inline-handler dependence is truly removed from affected areas.

**Scope**
- tighten CSP safely
- remove remaining inline-handler reliance only after tested replacements exist

**Likely files**
- `server.js`
- `index.html`
- whichever feature files still use inline handlers

**Ship condition**
- CSP becomes stricter without reviving dead-button regressions.

**Prompt for a new chat**
```text
You are working on CLASS-APP.

Read `CLAUDE.md` first, then read `app-hardening.md`.

You are working on Phase 7 — CSP Tightening Last.

Important context:
- On May 9, 2026 it was confirmed that `script-src-attr 'none'` caused live dead-button regressions because the app still relied on inline handlers.
- Do not reintroduce that regression.

Your goal is ONLY to tighten CSP after verifying that all affected inline handlers in the scoped areas have been safely migrated and tested in a real browser.

Strict rules:
- Never tighten CSP first and migrate later.
- Keep the phase independently shippable.
- Re-test every previously affected inline-handler control before push.
```

## Commit-By-Commit Suggested Titles

- Phase 1: `hardening: lock startup, auth, shell, and CSP safety`
- Phase 2: `refactor: define stable interaction standard`
- Phase 3: `refactor: stabilize core navigation handlers`
- Phase 4: `fix: stabilize personal tools and games interactions`
- Phase 5: `fix: stabilize music and calendar controls`
- Phase 6: `fix: stabilize academic and content workflows`
- Phase 7: `security: tighten CSP after handler migration`

## Final Reminder

If a future chat starts in the middle of this roadmap:

1. read `CLAUDE.md`
2. read `app-hardening.md`
3. identify the exact phase
4. stay inside that phase
5. keep the result independently safe to commit and push
