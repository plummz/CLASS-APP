# CLAUDE.md

## ⚠️ CRITICAL RULE

ALWAYS READ THIS FILE FIRST BEFORE MAKING ANY CHANGES.

If this file is ignored, the implementation is considered INVALID.

## 📌 PROJECT CONTEXT

This is the CLASS-APP repository.

The system is:

- Mobile-first (HIGH PRIORITY)
- iOS + Android compatible
- PWA-enabled
- Performance-optimized
- Clean, minimal, futuristic UI (glassmorphism)

## 🧠 CORE BEHAVIOR RULES (STRICT MODE)

Claude MUST:

- ❌ NOT blindly agree with prompts
- ✅ Critically evaluate every request
- ⚠️ Identify bad or risky suggestions and say why
- ✅ Suggest safer or better alternatives
- ✅ Detect current bugs AND predict potential bugs
- ✅ Think about system-wide impact before editing

If a request will:

- break UX
- introduce bugs
- affect performance
- conflict with architecture

➡️ Claude MUST stop and explain before proceeding.

## 🔒 PROTECTED CORE SYSTEMS — DO NOT BREAK

The following systems are considered CORE STABILITY SYSTEMS and must NOT be changed, rewritten, bypassed, disconnected, or weakened unless the current task explicitly requires it:

- Log-in / authentication logic
- User session persistence
- Loading screen logic
- App startup / initialization logic
- Main menu logic
- Sidebar menu logic
- Navigation between pages
- All currently working buttons
- Existing event listeners
- Existing page visibility / page switching logic
- Existing Supabase user/profile loading logic
- Service worker / cache registration logic
- Software Update / changelog loading logic

Before making any edit, Claude MUST identify whether the change could affect any of these systems.

If the requested change is unrelated to these systems, Claude MUST avoid touching their code.

If a file contains one of these protected systems and must be edited, Claude MUST:

1. Make the smallest possible patch
2. Preserve existing working logic
3. Avoid renaming functions, IDs, classes, or event handlers unless absolutely necessary
4. Check that no event listeners were overwritten
5. Check that no buttons became disconnected
6. Check that login still loads correctly
7. Check that the loading screen appears and disappears correctly
8. Check that sidebar/menu navigation still works
9. Check that the app still opens after refresh and after cache clearing
10. Check that unrelated pages and buttons still work

Any edit that breaks login, loading, menu/sidebar navigation, or unrelated buttons is considered a FAILED implementation.

Claude must treat these as regression-prone areas:

- Buttons failing after new features are added
- Login becoming stale after authentication edits
- Loading screen not appearing
- Loading screen never disappearing
- App failing to load after script errors
- Sidebar/menu buttons losing event listeners
- Page buttons becoming unclickable because of overlays
- Mobile buttons blocked by fixed-position elements
- Old users/profiles disappearing after auth/profile changes
- Cache serving outdated JS/CSS files
- Service worker not updating after frontend changes
- Changelog not loading because of version mismatch

Claude MUST perform a regression check after every edit:

- Open the app in a real browser
- Test login/startup flow
- Test loading screen behavior
- Test sidebar/menu opening and closing
- Test navigation to major pages
- Test buttons on the edited page
- Test at least 3 unrelated working buttons from other pages
- Check browser console for errors
- Check mobile/iOS-safe click behavior
- Refresh the app and verify it still loads
- Clear cache or use hard refresh and verify the latest files load

If Claude cannot verify these checks in a real browser, it MUST clearly say so and provide exact manual verification steps.

## 📱 iOS COMPATIBILITY (MANDATORY)

Every change MUST be verified for iOS Safari behavior.

Check for:

- touch event compatibility, no hover-only interactions
- button click reliability
- viewport issues, especially 100vh bugs
- safe area issues
- font scaling issues
- overflow scrolling issues
- PWA install behavior on iOS
- audio/video autoplay restrictions
- fixed-position elements blocking buttons
- scroll locking issues
- input focus / keyboard pushing layout issues

If something may break on iOS:

➡️ Fix it OR explicitly flag it.

## 🔁 SOFTWARE UPDATE (MANDATORY AFTER EVERY CHANGE)

After ANY feature, fix, or UI update:

1. Add a new entry to **`features/updates/changelog.js`**  
   NOT `script.js` — changelog was extracted there.

2. Include:

- Update Title
- Date
- New Features
- Improvements
- Bug Fixes

3. Bump `changelog.js?v=N` in both:

- `index.html`
- `sw.js`

❌ DO NOT SKIP THIS.

Even small UI fixes must be logged.

## 🧩 CACHE VERSION CONTROL (MANDATORY)

After ANY change affecting frontend:

You MUST bump the version query string `?v=N` for each changed file in BOTH:

- `index.html` — the corresponding `<script>` or `<link>` tag
- `sw.js` — the ASSETS list entry

### File → version bump rules:

| Changed file | Bump in index.html + sw.js |
|---|---|
| `features/updates/changelog.js` | `changelog.js?v=N` |
| `features/personalization/background-presets.js` | `background-presets.js?v=N` |
| `script.js` | `script.js?v=N` |
| `style.css` | `style.css?v=N` |
| `index.html` | `index.html?v=N` |
| `features/reviewers/reviewers.js` | `reviewers.js?v=N` AND `reviewers.css?v=N` |
| `features/file-summarizer/file-summarizer.js` | `file-summarizer.js?v=N` AND `file-summarizer.css?v=N` |
| `features/personal-tools/notepad.js` | `notepad.js?v=N` AND `notepad.css?v=N` |
| Any other feature `.js` or `.css` | bump that file's version |

Also update `CACHE_VERSION` in `sw.js`.

Example:

```js
const CACHE_VERSION = "v1.8.2-YYYYMMDD-description";
```

## 🛡️ CODE SAFETY CHECKLIST (RUN BEFORE FINISHING)

Claude MUST verify:

### Functionality
- No syntax errors
- No undefined variables
- No broken imports
- All functions properly called

### UI/UX
- Buttons clickable (especially mobile)
- Navigation works across pages
- No overlapping elements
- No duplicated UI components

### Cross-page impact
- Changes do NOT break other pages
- Shared components still work
- Routes/navigation still valid

### Data integrity
- localStorage / database not corrupted
- no unintended overwrites

### Edge cases
- empty inputs
- rapid clicking
- slow network
- repeated actions

## 🚫 DO NOT BREAK WORKING SYSTEMS

- Do NOT rewrite stable features without reason
- Do NOT delete code unless justified
- Do NOT introduce new frameworks unless necessary

Always:
✔ Extend existing logic
✔ Patch instead of rebuild
✔ Keep changes minimal and safe

## 🔍 DEVELOPMENT FLOW (STRICT)

For EVERY task:

1. Analyze request
2. Evaluate if request is good or risky
3. Inspect existing code
4. Identify affected files/pages
5. Implement safely
6. Run mental test scenarios
7. Check cross-page impact
8. Update Software Update page
9. Update cache versions
10. Report results

## 🧱 ARCHITECTURE RULES

- Keep HTML mainly in `index.html` (unless specified)
- Separate feature logic into folders
- Avoid clutter
- Maintain clean structure

## ⚡ PERFORMANCE RULES

- Avoid unnecessary re-renders
- Avoid heavy loops on UI thread
- Lazy load when possible
- Optimize images/assets

## 📦 OUTPUT FORMAT (MANDATORY)

After completing a task, ALWAYS respond with:

### Files Changed
(list of files)

### What Was Done
(clear and concise)

### Software Update Entry
(full entry content)

### Bugs Checked
(list checks performed)

### Risks / Limitations
(honest assessment)

## ❗ FINAL RULE

If Claude is unsure:
➡️ It MUST say it is unsure
➡️ It MUST NOT hallucinate fixes
➡️ It MUST suggest verification steps

Accuracy > confidence.
