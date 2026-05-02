# AGENTS.md

## ⚠️ CRITICAL RULE
ALWAYS READ THIS FILE FIRST BEFORE MAKING ANY CHANGES.

If this file is ignored, the implementation is considered INVALID.

---

## 📌 PROJECT CONTEXT
This is the CLASS-APP repository.

The system is:
- Mobile-first (HIGH PRIORITY)
- iOS + Android compatible
- PWA-enabled
- Performance-optimized
- Clean, minimal, futuristic UI (glassmorphism)

---

## 🧠 CORE BEHAVIOR RULES (STRICT MODE)

Codex MUST:

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

➡️ Codex MUST stop and explain before proceeding.

---

## 📱 iOS COMPATIBILITY (MANDATORY)

Every change MUST be verified for iOS Safari behavior:

Check for:
- touch event compatibility (no hover-only interactions)
- button click reliability
- viewport issues (100vh bugs, safe areas)
- font scaling issues
- overflow scrolling issues
- PWA install behavior on iOS
- audio/video autoplay restrictions

If something may break on iOS:
➡️ Fix it OR explicitly flag it.

---

## 🔁 SOFTWARE UPDATE (MANDATORY AFTER EVERY CHANGE)

After ANY feature, fix, or UI update:

1. Update the **Software Update page**
2. Include:

- Update Title
- Date
- New Features
- Improvements
- Bug Fixes

❌ DO NOT SKIP THIS
Even small UI fixes must be logged.

---

## 🧩 CACHE VERSION CONTROL (MANDATORY)

After ANY change affecting frontend:

You MUST update version identifiers in:

- `index.html`
- `script.js`
- `sw.js`

This prevents stale cache issues.

Failure to update cache = BROKEN DEPLOYMENT.

---

## 🛡️ CODE SAFETY CHECKLIST (RUN BEFORE FINISHING)

Codex MUST verify:

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

---

## 🚫 DO NOT BREAK WORKING SYSTEMS

- Do NOT rewrite stable features without reason
- Do NOT delete code unless justified
- Do NOT introduce new frameworks unless necessary

Always:
✔ Extend existing logic
✔ Patch instead of rebuild
✔ Keep changes minimal and safe

---

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

---

## 🧱 ARCHITECTURE RULES

- Keep HTML mainly in `index.html` (unless specified)
- Separate feature logic into folders
- Avoid clutter
- Maintain clean structure

---

## ⚡ PERFORMANCE RULES

- Avoid unnecessary re-renders
- Avoid heavy loops on UI thread
- Lazy load when possible
- Optimize images/assets

---

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

---

## ❗ FINAL RULE

If Codex is unsure:
➡️ It MUST say it is unsure
➡️ It MUST NOT hallucinate fixes
➡️ It MUST suggest verification steps

Accuracy > confidence.
