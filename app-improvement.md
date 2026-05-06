# CLASS-APP Improvement & Security Audit

**Last Updated**: 2026-05-06  
**Status**: Phase 1 ✅ COMPLETE | Phase 2-4 PENDING

---

## 📊 COMPREHENSIVE AUDIT RESULTS

### Initial Assessment Ratings (0-10 Scale)

| Dimension | Rating | Status |
|-----------|--------|--------|
| **Security** | 6/10 | Moderate risk — needs hardening |
| **Performance** | 8/10 | Good — minor optimizations possible |
| **UX/Design** | 8/10 | Strong — clean, modern UI |
| **Accessibility** | 6/10 | Needs work — keyboard nav, screen reader support |
| **Stability** | 8/10 | Stable — protected core systems intact |
| **Documentation** | 5/10 | Minimal — needs RLS/API docs |

**Overall**: 6.8/10 → Target: 10/10 across all dimensions

---

## 🔍 CRITICAL ISSUES FOUND

### Security Vulnerabilities

#### 1. **Token Storage** (CRITICAL)
- **Problem**: Tokens stored in localStorage (vulnerable to XSS)
- **Impact**: Session hijacking via JavaScript injection
- **Status**: ✅ FIXED (Phase 1.1)
- **Solution**: HttpOnly cookies + localStorage fallback

#### 2. **Admin Status Not Server-Verified** (HIGH)
- **Problem**: Admin status cached client-side, no server refresh
- **Impact**: User could spoof admin flag by modifying localStorage
- **Status**: ✅ FIXED (Phase 1.2)
- **Solution**: Server-driven validation polling every 60s

#### 3. **No Input Validation** (HIGH)
- **Problem**: Folder/file names unlimited length, no character restrictions
- **Impact**: UI truncation, potential SQL injection via names
- **Status**: ✅ FIXED (Phase 1.4)
- **Solution**: 50-char limit, alphanumeric+space/dash/underscore/period

#### 4. **No Rate Limiting** (MEDIUM)
- **Problem**: Users can spam unlimited requests
- **Impact**: DoS attacks, resource exhaustion
- **Status**: ✅ FIXED (Phase 1.4)
- **Solution**: 10 req/min for folder/file ops, 10 req/min for messages

#### 5. **XSS Risk in User Content** (MEDIUM)
- **Problem**: User-generated content rendered via innerHTML
- **Impact**: Potential XSS if escaping missed
- **Status**: ✅ VERIFIED SAFE (Phase 1.3)
- **Solution**: Audit complete — all content properly escaped

#### 6. **Missing Global Error Handler** (LOW)
- **Problem**: Unhandled promise rejections silently fail
- **Impact**: Silent failures, hard to debug
- **Status**: ✅ FIXED (Phase 1.6)
- **Solution**: Global handlers for rejections + runtime errors

#### 7. **No RLS Documentation** (LOW)
- **Problem**: RLS policies exist but not documented
- **Impact**: Developers don't understand database security model
- **Status**: ✅ DOCUMENTED (Phase 1.5)
- **Solution**: RLS Policy Reference in CLAUDE.md

### Performance Issues

#### 1. **No Request Batching**
- **Problem**: Each action sends individual API requests
- **Impact**: High network overhead, especially on slow connections
- **Status**: ⏳ PENDING (Phase 3-4)
- **Solution**: Batch operations where possible

#### 2. **No Image Optimization**
- **Problem**: Avatars/uploads served at full resolution
- **Impact**: High bandwidth usage on mobile
- **Status**: ⏳ PENDING (Phase 4)
- **Solution**: Lazy load + thumbnail generation

### UX/Design Issues

#### 1. **Folder Name Truncation**
- **Problem**: Long folder names cut off in UI
- **Impact**: Confusing for users with similarly-named folders
- **Status**: ✅ FIXED (Phase 1.4 — 50 char limit)
- **Solution**: Enforce 50-char limit

#### 2. **No Loading State Feedback**
- **Problem**: Some operations have no visual feedback
- **Impact**: Users don't know if action is processing
- **Status**: ⏳ PENDING (Phase 2)
- **Solution**: Add spinners/progress indicators

#### 3. **Limited Keyboard Navigation**
- **Problem**: Some modals not keyboard-accessible
- **Impact**: Accessibility issues
- **Status**: ⏳ PENDING (Phase 3-4)
- **Solution**: Full keyboard nav support

### Accessibility Issues

#### 1. **No ARIA Labels**
- **Problem**: Screen readers can't identify interactive elements
- **Impact**: Users with visual impairments blocked
- **Status**: ⏳ PENDING (Phase 3-4)
- **Solution**: Add ARIA labels to buttons/inputs

#### 2. **Color Contrast**
- **Problem**: Some text has insufficient contrast
- **Impact**: Hard to read for users with color blindness
- **Status**: ⏳ PENDING (Phase 4)
- **Solution**: Audit and fix contrast ratios

#### 3. **No Alt Text**
- **Problem**: Images missing alt text
- **Impact**: Screen readers provide no description
- **Status**: ⏳ PENDING (Phase 2-3)
- **Solution**: Add meaningful alt text

### Stability Issues

#### 1. **Session Timeout Not Enforced**
- **Problem**: Users stay logged in indefinitely
- **Impact**: Security risk if device is shared
- **Status**: ⏳ PENDING (Phase 3)
- **Solution**: 30-min idle timeout

#### 2. **No Multi-Tab Logout Sync**
- **Problem**: Logout on one tab doesn't affect others
- **Impact**: User thinks they're logged out but aren't
- **Status**: ⏳ PENDING (Phase 3)
- **Solution**: Use storage events to sync state

---

## 📋 4-PHASE IMPROVEMENT PLAN

### ✅ PHASE 1: SECURITY HARDENING (COMPLETE)

**Objective**: Fix critical security vulnerabilities without breaking existing features.

#### 1.1 Token Storage Migration ✅
- Implement HttpOnly cookie support
- Add fallback chain: HttpOnly → in-memory → localStorage
- Backward compatible with existing tokens
- **Files**: script.js (lines 169-207), server.js (already supports)

#### 1.2 Server-Driven Admin Status ✅
- Add `/api/session/validate` endpoint
- Poll admin status every 60 seconds
- Update `currentUser.isAdmin` from server
- Integrate into login/logout lifecycle
- **Files**: script.js (lines ~2200-2270), server.js (new endpoint)

#### 1.3 XSS Escaping Audit ✅
- Audit all innerHTML calls with user content
- Verify escapeHTML/esc/escapeHtml applied
- No unescaped user content found
- **Files**: script.js, reviewers.js, notepad.js, file-summarizer.js

#### 1.4 API Input Validation + Rate Limiting ✅
- Username validation: `/^[a-zA-Z0-9_@]+$/` (added @ support)
- Folder/file names: 50 char max, `/^[a-zA-Z0-9\s\-_.]{1,50}$/`
- Rate limiting: 10 req/min for folders/files, 10 req/min for messages
- Applied to: POST/PUT/DELETE /api/folders, POST/DELETE /api/files, POST /api/messages
- **Files**: server.js (validation functions + middleware)

#### 1.5 RLS Policy Verification ✅
- Documented critical RLS policies in CLAUDE.md
- Verified database-level access control
- Clarified frontend checks are UX only
- **Files**: CLAUDE.md (new RLS Policy Reference section)

#### 1.6 Global Error Handling ✅
- Catch unhandled promise rejections
- Catch runtime errors
- Display toast + log to console
- **Files**: script.js (top of file, lines 6-16)

**Status**: ✅ MERGED TO `claude/audit-class-app-7z6ST`  
**PR**: #58 (Draft)  
**Commit**: 53d4888

---

### ⏳ PHASE 2: FRONTEND HARDENING (NOT STARTED)

**Objective**: Prevent malicious client-side code injection and enforce data contracts.

**Estimated Effort**: 4-6 hours

#### 2.1 Form Input Validation (Frontend)
**Goal**: Validate all user inputs before sending to server.

**Tasks**:
1. Create validation functions in script.js:
   - `validateFolderInput(name)` — 1-50 chars, alphanumeric+space/dash/underscore/period
   - `validateFileName(name)` — 1-50 chars, same rules
   - `validateUsername(username)` — 3-24 chars, alphanumeric+underscore+@
   - `validateChatMessage(text)` — 1-5000 chars, no null bytes
2. Apply to modals before API calls:
   - Create/rename folder modals
   - Create note modal
   - Send message input
   - Upload file dialogs
3. Show clear error messages on failure
4. Disable submit buttons during validation/sending

**Expected Impact**: UX improvement + data integrity

#### 2.2 Data Type Enforcement
**Goal**: Validate all API responses match expected schema.

**Tasks**:
1. Create type validators:
   - `isValidFolder(obj)` — {id, name, owner, permissions, parent}
   - `isValidFile(obj)` — {id, name, folder_id, uploader, url}
   - `isValidUser(obj)` — {username, display_name, avatar, isAdmin}
   - `isValidMessage(obj)` — {id, sender, text, time, attachment}
2. Validate ALL responses before storing in state
3. Log type mismatches (development only)
4. Fall back to empty state on validation failure

**Expected Impact**: Catch corrupted/malicious API responses

#### 2.3 Sanitize Display Data
**Goal**: Prevent UI breakage from long/malicious strings.

**Tasks**:
1. Create sanitizer functions:
   - `sanitizeDisplayName(name)` — max 30 chars, trim whitespace
   - `sanitizeUsername(username)` — max 24 chars
   - `sanitizeFolderName(name)` — max 50 chars
   - `sanitizeNote(text)` — max 10000 chars
2. Apply BEFORE rendering in innerHTML
3. Add "…" if truncated

**Expected Impact**: Better UX, prevents layout breakage

#### 2.4 CSRF Token (Optional)
**Goal**: Add CSRF protection if server supports it.

**Tasks**:
1. Check if `/api/csrf-token` endpoint exists
2. If yes, fetch on login and include in state
3. Add `X-CSRF-Token` header to state-modifying requests
4. If no, document as limitation

**Expected Impact**: Prevent cross-site request forgery

**Files to Modify**: script.js, features/*.js

---

### ⏳ PHASE 3: SESSION & LIFECYCLE HARDENING (NOT STARTED)

**Objective**: Prevent session hijacking and unauthorized access.

**Estimated Effort**: 5-7 hours

#### 3.1 Token Expiration & Refresh
**Goal**: Prevent expired token failures.

**Tasks**:
1. Add to server.js:
   - `/api/session/refresh` endpoint (returns new token)
   - Store issued_at in JWT payload
   - Enforce 7-day expiration
2. Add to script.js:
   - Refresh token when < 1 day remains (24h before expiration)
   - Call `/api/session/refresh` automatically
   - Store new token in HttpOnly + localStorage
   - On refresh failure: logout with "Session expired" message

**Expected Impact**: No surprise logouts

#### 3.2 Session Timeout
**Goal**: Auto-logout after idle time.

**Tasks**:
1. Track last activity (mouse/keyboard/scroll)
2. At 25 min idle: show warning "Logout in 5 minutes"
3. At 30 min idle: auto-logout with message
4. Reset timer on any activity

**Expected Impact**: Prevent unauthorized access on shared devices

#### 3.3 Multi-Tab Session Sync
**Goal**: Keep login state synchronized across tabs.

**Tasks**:
1. Listen to localStorage events
2. If token removed → logout this tab
3. If token added → verify it matches current user
4. If user changed → refresh page

**Expected Impact**: Better multi-device experience

#### 3.4 Logout Cleanup
**Goal**: Fully clear session data on logout.

**Tasks**:
1. Clear on logout:
   - localStorage (all keys)
   - sessionStorage (all keys)
   - In-memory vars (serverAuthToken, currentUser, isAdmin, etc.)
   - Stop admin validation poller
   - Close WebSocket connections
   - Expire browser cookies (server-set)
2. Redirect to login page
3. Show "Logged out successfully"

**Expected Impact**: No session leakage

**Files to Modify**: script.js, server.js

---

### ⏳ PHASE 4: ADVANCED HARDENING & MONITORING (NOT STARTED)

**Objective**: Add logging, monitoring, and defense against advanced attacks.

**Estimated Effort**: 6-8 hours

#### 4.1 Client-Side Activity Logging
**Goal**: Audit trail for critical actions.

**Tasks**:
1. Create logger in script.js:
   - `logActivity(action, details)` → POST `/api/activity-log`
   - Batch logs (every 10 logs or 5 minutes)
   - Don't log every keystroke (too noisy)
2. Log:
   - Login/logout
   - Folder created/deleted/renamed
   - File uploaded/deleted
   - Content shared (announcements, reviewers, notes)
   - Admin actions
3. Add to server.js:
   - Store logs in Supabase `activity_logs` table
4. Add admin UI:
   - `/admin/activity-log` page to view audit trail

**Expected Impact**: Audit trail for compliance

#### 4.2 Suspicious Activity Detection
**Goal**: Flag and block abnormal behavior.

**Tasks**:
1. Detect:
   - > 50 failed logins in 1h → temporarily block account
   - > 100 requests from same IP in 1m → temporarily block IP
   - Username changed > 3 times in 1 day → flag for review
   - > 1000 files created in 1h → flag for review
2. Server tracking:
   - Simple in-memory counters
   - Return 429 "Too many requests" if exceeded
3. Log all suspicious activity

**Expected Impact**: Early detection of attacks

#### 4.3 Content Security Policy (CSP) Hardening
**Goal**: Tighten and verify CSP rules.

**Tasks**:
1. Review current CSP (server.js, helmet config)
2. Verify:
   - ✅ No `'unsafe-eval'`
   - ✅ `scriptSrc` restricted
   - ✅ `connectSrc` restricted to known domains
   - ✅ `frameSrc` restricted to YouTube
3. Add `report-uri` for violation reporting (optional)
4. Test doesn't break features (AI, YouTube embeds)

**Expected Impact**: Stronger XSS protection

#### 4.4 Security Headers
**Goal**: Ensure all security headers present.

**Tasks**:
1. Verify in server.js:
   - ✅ Content-Security-Policy (helmet)
   - ✅ X-Content-Type-Options: nosniff (helmet)
   - ✅ X-Frame-Options: DENY (helmet)
   - ✅ X-XSS-Protection (helmet)
   - Add: Strict-Transport-Security: max-age=31536000; includeSubDomains
   - Add: Referrer-Policy: strict-origin-when-cross-origin
   - Add: Permissions-Policy: geolocation=(), microphone=(), camera=()
2. Test headers present:
   ```bash
   curl -I https://class-app.example.com | grep -i "x-\|content-security"
   ```

**Expected Impact**: Defense-in-depth against various attacks

#### 4.5 Dependency Security
**Goal**: Audit and update npm packages.

**Tasks**:
1. Run `npm audit` and fix critical/high vulnerabilities
2. Update to latest stable versions (non-breaking)
3. Test app still works
4. Document breaking changes

**Expected Impact**: No known vulnerabilities in dependencies

**Files to Modify**: script.js, server.js, package.json

---

## 🎯 EXPECTED FINAL RATINGS (After All Phases)

| Dimension | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Final |
|-----------|---------|---------|---------|---------|-------|
| **Security** | 7/10 | 8/10 | 8.5/10 | 9/10 | **9/10** |
| **Performance** | 8/10 | 8/10 | 8/10 | 8/10 | **8/10** |
| **UX/Design** | 8/10 | 8.5/10 | 8.5/10 | 8.5/10 | **8.5/10** |
| **Accessibility** | 6/10 | 6.5/10 | 7/10 | 7/10 | **7/10** |
| **Stability** | 8/10 | 8/10 | 9/10 | 9/10 | **9/10** |
| **Documentation** | 5/10 | 5.5/10 | 6/10 | 8/10 | **8/10** |

**Overall**: 6.8/10 → **8.3/10** ✨

### Rating Rationale
- **Security 9/10 (not 10)**: Significantly hardened with all critical vulnerabilities fixed + defense layers added. No system achieves perfect security; room remains for advanced threats.
- **Overall 8.3/10**: Solid improvement (21% increase) without over-claiming perfection. Realistic given scope and constraints of not breaking existing systems.

---

## 📝 IMPLEMENTATION NOTES

### Branch & Commits
- **Current Branch**: `claude/audit-class-app-7z6ST`
- **Current PR**: #58 (Draft)
- **Phase 1 Commit**: 53d4888 ("Phase 1: Security Hardening — HttpOnly tokens, server-driven admin validation, XSS prevention, input validation, rate limiting, RLS documentation")

### For Next Chat Sessions
1. Read this file: `app-improvement.md`
2. Read CLAUDE.md for all development rules
3. Start with Phase 2.1 (Form Input Validation)
4. Implement one sub-phase at a time
5. Commit after each completed phase
6. Test thoroughly on iOS Safari
7. Update Software Update page with changelog
8. Bump cache versions in index.html + sw.js

### Protected Core Systems (DO NOT BREAK)
- Login/authentication
- Session persistence
- Loading screen logic
- App startup/initialization
- Main menu/sidebar
- Navigation
- Service worker cache
- Software Update page

See CLAUDE.md for full list and regression checks.

---

## 🔗 Related Files

- **CLAUDE.md** — Development rules, protected systems, cache versioning, RLS policies
- **server.js** — Backend API, authentication, rate limiting, input validation
- **script.js** — Frontend, auth flow, admin polling, error handlers
- **supabase/migrations/003_rls_policies.sql** — Database RLS rules
- **supabase/migrations/015_admin_table_and_rls_hardening.sql** — Admin table + RLS

---

**Document Version**: 1.0  
**Last Updated**: 2026-05-06  
**Status**: Phase 1 ✅ Complete | Phase 2-4 Ready for Implementation
