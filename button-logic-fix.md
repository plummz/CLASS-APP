# Button Logic Fix Report

Date: May 7, 2026
Branch/PR: codex/button-logic-stability-fix (PR #69)

This document follows the required two-phase workflow.

## PHASE 1: Diagnosis and Mapping

### Symptoms reported
1. Shared Reviewers Page: View/Reaction/Delete buttons dead
2. My Classes / Modules / Files: Open/Summarize/Copy-Move/Delete/Back buttons dead
3. Users/Admin: “Amina Cruz” still appears; user action buttons dead
4. Random Pictures: year/folder buttons dead
5. Event Pictures: year/folder buttons dead
6. User Directory: Profile button dead
7. Social Media Pages: embedded page buttons dead
8. Tallies: app open/login + contribution counts stale/fake
9. Personal Tools: Alarm/Notepad/Calculator cards dead
10. Calendar: Prev/Next dead
11. Games: cards/Play buttons dead
12. Lobby: Delete dead

### What was inspected (repo-wide)
- Routing/page switching: `features/logging-in/shell-controls.js` (`window.goToPage`)
- Page rendering pattern: dynamic `.innerHTML` + inline `onclick` + document-level delegation (varies by feature)
- Event binding approach: sidebar uses delegation; several pages rely on `goToPage` to trigger module `init()`.
- Auth/session gating: `features/logging-in/loading-components.js` controls `pointer-events` based on `isInitializing/isAuthenticated`.
- Users seed/demo data: `data.json` contains a demo user named “Amina Cruz”.

### Root-cause hypotheses checked
- Event listeners attached before DOM exists: **likely on dynamic pages** (fixed by delegation in some modules; still needs verification per-page)
- Dynamic HTML replaced after listeners attached: **likely** for pages that re-render lists/cards
- Inline `onclick` functions missing globally: **confirmed risk**
  - `index.html` contains many `onclick="window.goToPage(...)"` calls.
  - `goToPage` is defined in `features/logging-in/shell-controls.js`.
  - If navigation throws inside `goToPage`, page init code after the throw does not run.
- Duplicate IDs: not exhaustively audited yet (requires runtime DOM inspection)
- Modals/overlays blocking clicks (z-index/pointer-events): not fully confirmed, but a thrown error in navigation can leave overlays active.
- Supabase/auth refactor breaking current user/admin: not fully confirmed in this pass
- Supabase schema/RLS breaking queries: not fully confirmed in this pass
- Console errors: **static code review indicates at least two navigation-time ReferenceError risks** (see below)

### Confirmed issues found in code

#### A) `runSafeUiAction` referenced but not defined
- File: `features/logging-in/shell-controls.js`
- Multiple calls: `runSafeUiAction('Lobby', ...)`, `runSafeUiAction('Games', ...)`, etc.
- If `runSafeUiAction` is undefined at runtime, navigation can throw and abort remaining init, leading to “dead buttons”.

#### B) `applyPageBackground(pageName)` referenced without a guaranteed global definition
- File: `features/logging-in/shell-controls.js`
- Call: `applyPageBackground(pageName)`
- There is no guaranteed `window.applyPageBackground` export; missing hook can throw during navigation.

#### C) “Amina Cruz” demo user persists from seed data
- File: `data.json`
- Entry: `{ "username": "Amina", "displayName": "Amina Cruz", ... }`
- This can re-inject the user list depending on server/user-loading fallback logic.

## PHASE 2: Safe Fix Implementation

### Fixes implemented (minimal, guarded)

#### 1) Navigation safety guards (prevents dead-click cascade)
- File: `features/logging-in/shell-controls.js`
- Changes:
  - Added `window.runSafeUiAction(label, fn)` if missing.
  - Wrapped page init calls to use `window.runSafeUiAction`.
  - Guarded `applyPageBackground` call so missing hook does not throw.

Why this is safe:
- Does not change UI, IDs, or routing names.
- Prevents single init failure from breaking all subsequent handlers.

#### 2) Remove Amina Cruz from seed/demo source
- File: `data.json`
- Changes:
  - Removed the “Amina Cruz” user object.

Safety:
- Only removed the clearly-demonstration profile entry from seed data.
- Does not delete Supabase users.

#### 3) Software Update entry
- File: `features/updates/changelog.js`
- Added entry titled **Button Logic Stability Fix** with date **May 7, 2026**.
- Also exported changelog/version to `window.CLASS_APP_VERSION` / `window.CLASS_APP_CHANGELOG`.

### Files / functions touched
- `features/logging-in/shell-controls.js`
  - `window.goToPage`
  - `window.runSafeUiAction` (new guarded helper)
- `data.json`
- `features/updates/changelog.js`

### How it was tested
This PR has **not** been executed in a live browser environment inside this coding session.

Manual test steps required:
1. Deploy PR branch (or run locally) and open DevTools console.
2. Navigate across pages: Reviewers, Users, Personal Tools, Calendar, Games, Lobby.
3. Confirm no `ReferenceError: runSafeUiAction is not defined` or `applyPageBackground is not defined`.
4. Confirm clicking year/folder cards works on Random/Event Pictures.
5. Confirm Users/Admin does not show “Amina Cruz”.

### Testing checklist (required)

Shared Reviewers:
- [ ] View works
- [ ] Like/reaction works
- [ ] Delete works with permissions

My Classes / Modules:
- [ ] Open file works
- [ ] Summarize works
- [ ] Copy/move works
- [ ] Delete works
- [ ] Back buttons work

Users/Admin:
- [ ] Amina Cruz removed permanently
- [ ] Delete user/action buttons work
- [ ] Real users still appear

User Directory:
- [ ] Profile button works
- [ ] Deleted/fake users do not appear

Random Pictures:
- [ ] Year cards open
- [ ] Nested buttons work

Event Pictures:
- [ ] Year cards open
- [ ] Nested buttons work

Social Media Pages:
- [ ] Open in App works
- [ ] Embedded/fallback behavior works
- [ ] Back navigation works

Tallies:
- [ ] App open/login count records real data
- [ ] Contribution count records original uploads only
- [ ] No fake hardcoded counts override real data

Personal Tools:
- [ ] Alarm opens
- [ ] Notepad opens
- [ ] Calculator opens
- [ ] Back navigation works

Calendar:
- [ ] Prev works
- [ ] Next works
- [ ] Calendar rerenders correctly

Games:
- [ ] Game cards open correct game
- [ ] Play buttons work
- [ ] Back/Quit buttons work

Lobby:
- [ ] Delete button works
- [ ] UI updates after delete

### Remaining risks / follow-ups
- If any page buttons are still dead *after* navigation is stabilized, those pages likely need explicit event delegation rebinding after dynamic render.
- Tallies (app-open/contribution) require verifying the current data source (server `data.json` vs Supabase tables) and ensuring no mock values override real values.
- Some “dead” interactions may be caused by overlays/pointer-events from auth gating; verify `renderAppState()` toggles and mobile overlay layers.