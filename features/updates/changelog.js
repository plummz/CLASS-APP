const APP_VERSION = '1.8.9';
const APP_CHANGELOG = [
  {
    version: '1.8.9',
    date: 'May 6, 2026',
    title: 'Phase 4: Advanced Hardening & Monitoring',
    summary: 'Extended the activity audit trail, added a lightweight suspicious-activity detector, tightened the Content Security Policy, and added an explicit Permissions-Policy header to restrict unused browser features.',
    changes: [
      'Feature: Activity audit trail extended — folder create/rename/delete, subfolder create/delete, file upload/delete, profile update, and logout are now all recorded in the activity_log table.',
      'Security: Suspicious-activity detector (Phase 4.2) — a rolling 60-second window tracks destructive actions. If ≥4 folder deletes or ≥5 file deletes occur in a minute, the pattern is logged as "suspicious_activity" for admin review.',
      'Security (CSP): Added formAction "\'self\'" — blocks form submissions to external URLs. Added baseUri "\'self\'" — blocks base-tag injection attacks. Added objectSrc "\'none\'" — disables Flash and browser plugins.',
      'Security (Headers): Added Permissions-Policy response header — explicitly disables camera, microphone, geolocation, and interest-cohort (FLoC) for all responses.',
      'Assessment (Dependencies): 5 moderate npm vulnerabilities identified. 4 are in transitive AWS SDK/bn.js dependencies with no exploit path in this app. 1 (ip-address XSS via express-rate-limit) has no safe non-breaking fix available; IP addresses are never rendered as HTML in this codebase so actual risk is negligible.',
    ],
  },
  {
    version: '1.8.8',
    date: 'May 6, 2026',
    title: 'Phase 3: Session & Lifecycle Hardening',
    summary: 'Added automatic token refresh (7-day JWT lifecycle), 30-minute idle timeout with a 5-minute warning banner, cross-tab logout synchronisation, and clean session teardown on logout.',
    changes: [
      'Feature: Token auto-refresh — client checks JWT expiry every 30 minutes and calls /api/session/refresh when less than 24 hours remain. Fresh 7-day token issued server-side and stored in both HttpOnly cookie and localStorage fallback.',
      'Feature: Idle timeout — 25 minutes idle shows a persistent warning banner ("Session expiring in 5 min — tap to stay logged in"). 30 minutes idle triggers automatic logout. Any interaction resets the timer.',
      'Feature: Multi-tab logout sync — if another tab clears the auth token from localStorage (logs out), all other open tabs detect the storage event and log out simultaneously.',
      'Feature: Session manager lifecycle — sessionManager.init() starts all three systems on login; sessionManager.destroy() cleanly stops them on logout, preventing timer leaks.',
      'Server: New POST /api/session/refresh endpoint — re-issues a fresh 7-day JWT and sets a new HttpOnly cookie for authenticated users.',
      'Improvement: window.setServerAuthToken now exposed globally so the session-manager module can update the stored token after a refresh.',
    ],
  },
  {
    version: '1.8.7',
    date: 'May 6, 2026',
    title: 'Phase 2: Frontend Hardening — Form Validation & Data Safety',
    summary: 'Added a centralized form-validation module that validates folder names before API calls, enforces chat message length limits, guards rendering against malformed API data, and truncates long names in the UI to prevent layout breakage.',
    changes: [
      'Feature: New `features/security/form-validation.js` — centralized validation utility module (Phase 2).',
      'Security: Folder name validation runs client-side before all folder/subfolder/profile-folder creation and rename operations. Rejects empty names, names over 50 characters, and names with unsafe characters (< > " \' ` \\).',
      'Security: Chat message length is now validated client-side (max 2,000 characters) before the send request is made.',
      'Improvement: Folder and file render loops now skip malformed API items that are missing required id or name fields, preventing JS errors and blank cards.',
      'Improvement: Long folder names (>40 chars), file names (>55 chars), and profile folder names (>40 chars) are now truncated with an ellipsis in the UI. Full name is preserved in the title attribute for accessibility.',
      'Improvement: All validation in `form-validation.js` is optional-chained — app degrades safely if the module fails to load.',
    ],
  },
  {
    version: '1.8.6',
    date: 'May 5, 2026',
    title: 'Fix: Splash Screen Stuck on Logo (Loading Hang)',
    summary: 'Fixed a critical bug where the splash screen could get permanently stuck, preventing the app from reaching the login screen. Root cause was the canvas particle animation blocking the entire dismissal system on failure.',
    changes: [
      'Fix: Splash dismissal logic is now completely independent of the canvas particle animation. Previously, if canvas.getContext() threw (low memory, canvas limit) or the canvas element was missing, the entire IIFE exited early — no fallback timer, no event listener, no dismiss ever. Splash stayed forever.',
      'Fix: Canvas animation is now wrapped in try/catch. Any canvas failure is silently ignored and execution always falls through to the dismissal setup.',
      'Improvement: Added a 10-second hard failsafe that force-removes the splash screen no matter what — catches any edge case where all other dismissal paths fail.',
      'Improvement: Soft fallback timer increased from 1200ms to 2000ms, giving script.js more time to load on slow mobile connections before the fallback fires (prevents a brief blank-screen flash).',
      'Improvement: dismissSplash now guards against double-invocation even when the splash element is already gone.',
    ],
  },
  {
    version: '1.8.5',
    date: 'May 5, 2026',
    title: 'Tetris Leaderboard, Quick-Drop, and Loading Fix',
    summary: 'Fixed the app not opening due to a corrupted service worker cache version. Added quick-drop (held fast-fall) to Tetris, a persistent database-backed leaderboard, and safeguards to protect all existing scores and tallies from resetting.',
    changes: [
      'Fix: Service worker CACHE_VERSION had an embedded carriage return that made the constant undefined in some browsers, causing the app to fail loading after SW cache wipe. Repaired and bumped to v1.8.5.',
      'Feature: Tetris quick-drop button (⏬) — hold to make the piece fall fast without instantly placing it. Release to return to normal speed. Distinct from hard drop (⬇) which places instantly.',
      'Feature: Tetris leaderboard — top scores are saved to Supabase and shown on the canvas overlay at idle and after game over. Top 5 displayed; #1 highlighted in gold.',
      'Feature: Keyboard F key = held quick-drop for keyboard players.',
      'Improvement: Tetris controls reorganized into 2 rows — movement (hold/left/rotate/right) on top, drops (quick-drop / hard-drop) on bottom, for better touch targets on mobile.',
      'Improvement: Leaderboard pre-loads on game init so scores are visible before the first play.',
      'Data safety: All leaderboard scores, lobby star scores, login-count tally, contribution tally, and study streaks are preserved — only INSERT is used for new scores, never DELETE or TRUNCATE.',
    ],
  },
  {
    version: '1.8.4',
    date: 'May 5, 2026',
    title: 'Fix startup blank screen and service worker cache drift',
    summary: 'Aligned the service worker cache version with the real app version source, prevented cache-busting from corrupting startup, and made service worker install resilient when assets drift.',
    changes: [
      'Fix: `scripts/cache-bust.js` now reads the real app version from `features/updates/changelog.js` instead of stale `package.json`, so prestart no longer rewrites `sw.js` onto the wrong version line.',
      'Fix: `scripts/cache-bust.js` is now idempotent and refuses to touch `sw.js` if the CACHE_VERSION pattern is ambiguous, preventing destructive repeated rewrites.',
      'Fix: Service worker install now caches assets best-effort instead of failing the entire install when a single asset is missing or stale.',
      'Fix: Cache cleanup now targets only CLASS APP caches, helping users escape stale broken service worker states safely.',
      'Improvement: Service worker registration now logs failures without risking app boot flow, and cache references were bumped to force clients onto the repaired build.',
    ],
  },
  {
    version: '1.8.3',
    date: 'May 5, 2026',
    title: 'Tetris Game',
    summary: 'Fully playable Tetris game added to the Games Hub with standard SRS mechanics, hold piece, ghost piece, hard drop, and mobile D-pad controls.',
    changes: [
      'Feature: Tetris game added to Games Hub — stack tetrominoes, clear lines, and survive as speed increases with each level.',
      'Feature: All 7 standard tetrominoes (I, O, T, S, Z, J, L) with bag randomizer for fair distribution.',
      'Feature: Ghost piece shows where the active piece will land.',
      'Feature: Hold piece — swap your current piece with a held one using the hold button or C key.',
      'Feature: Hard drop — instantly drops the piece to the bottom (Space or ⬇ button).',
      'Feature: DAS (Delayed Auto Shift) — hold left/right to slide pieces smoothly.',
      'Feature: Swipe gestures on the canvas — swipe left/right to move, swipe down to soft drop, tap to rotate.',
      'Feature: Keyboard controls — Arrow keys / WASD, Space for hard drop, C for hold, P to pause.',
      'Performance: Tetris script lazy-loaded on first visit like other games.',
    ],
  },
  {
    version: '1.8.2',
    date: 'May 5, 2026',
    title: 'Fix: Games Blank Page & Battle Royale Stuck Loading',
    summary: 'Fixed first-play blank screen on Pac-Man, Pokémon, and Candy Match, and fixed Battle Royale getting stuck on the loading screen with no way to exit.',
    changes: [
      'Fix: Pac-Man, Pokémon, and Candy Match no longer show a blank page on the first play. The game now initialises correctly after its script finishes lazy-loading.',
      'Fix: Battle Royale no longer gets stuck on the "Generating map…" loading screen — the game initialises on first visit.',
      'Fix: Battle Royale back button (← Games) is now always visible and clickable even when the loading screen is active, so users can always exit.',
    ],
  },
  {
    version: '1.8.1',
    date: 'May 5, 2026',
    title: 'Background Darkness Fix & Pac-Man Overlap Fix',
    summary: 'Darkened overly-light page backgrounds for better readability, and fixed Pac-Man return/start buttons overlapping the score/lives topbar.',
    changes: [
      'Fix: Page backgrounds darkened — the v1.8.0 pastel backgrounds were too light; replaced with medium-dark hues that still distinguish pages.',
      'Fix: Text color reverted to white on dark backgrounds for proper contrast.',
      'Fix: Pac-Man return and start buttons were overlapping the SCORE/LIVES topbar on small screens; fixed with proper top-padding on the wrapper.',
      'Docs: Updated CLAUDE.md to reflect that changelog entries go in features/updates/changelog.js, not script.js.',
    ],
  },
  {
    version: '1.8.0',
    date: 'May 5, 2026',
    title: 'Security Hardening, Python Code Lab, Re-Quiz, Light Themes & Sidebar Redesign',
    summary: 'Major security fixes, Python execution sandbox, re-quiz from history, notepad subject tags, light page backgrounds, lavender/neon sidebar redesign, and Phase 5 performance improvements.',
    changes: [
      'Security: Added requireAuth to /api/code-lab/run-java, /api/code-lab/validate, and /api/code-lab/java-status — unauthenticated users can no longer execute code on the server.',
      'Security: R2 document uploads now served with Cache-Control: private instead of public — prevents CDN caching of private files.',
      'Security: Socket.io lobby:chat limited to 1 message/second per user to prevent flooding.',
      'Security: Chat messages capped at 500 characters server-side.',
      'Security: JWT HttpOnly cookie set on login/register as secondary auth mechanism (Bearer token still supported).',
      'Security: Filled empty migration 016 with proper RLS lockdown for folders, files, and messages tables.',
      'Feature: Python 3 Code Lab environment — write and run Python in a sandboxed backend executor with blocklist.',
      'Feature: Re-quiz from history — quiz questions are now stored and a Retake button appears on history items.',
      'Feature: Notepad subject tagging — add comma-separated tags to notes, search by tag, and see tag chips on note cards.',
      'Stability: Push subscriptions now persist to Supabase (fallback to data.json) to survive Render redeploys.',
      'Stability: Lobby scores now persist to Supabase on each star collection.',
      'UI: All page backgrounds changed to light pastel versions for better readability.',
      'UI: Sidebar redesigned with lavender/neon gradients and glassmorphism hover effects.',
      'UI: Text bolder and darker for better contrast against light backgrounds.',
      'Performance: APP_CHANGELOG extracted to features/updates/changelog.js (removed ~1500 lines from script.js).',
      'Performance: Background presets extracted to features/personalization/background-presets.js.',
      'Performance: Game scripts (Pokemon, Royale, Pacman, Candy) now lazy-loaded on first visit.',
    ],
  },
  {
    version: '1.7.4',
    date: 'May 5, 2026',
    title: 'Supabase-Backed Subjects + Server Admin Guard + Summarize Restored',
    summary: 'Admin-created subjects now persist to Supabase instead of localStorage — surviving browser data clears and visible across all devices. Admin writes are enforced server-side. The Summarize button on subject cards is restored.',
    changes: [
      'Fix: Admin-added subjects now save to Supabase (subjects table) via /api/subjects POST — no longer localStorage-only. Subjects survive browser data clears and work across all devices.',
      'Fix: /api/subjects POST and DELETE require a valid admin JWT on the server — a non-admin cannot insert subjects even by calling the API directly from a console.',
      'Fix: Supabase subjects table uses a unique constraint on (grid_key, code) — duplicate subjects blocked at the database level, not just in the frontend.',
      'Fix: On login and session restore, subject grids are refreshed from Supabase (/api/subjects) and the localStorage cache is updated. First paint still uses the cache for instant load.',
      'Fix: "Summarize" button on subject cards is now visible and functional — it correctly navigates to the File Summarizer.',
      'Security: /api/subjects GET has no auth requirement. Write routes (POST, DELETE) require requireAuth + requireAdmin.',
    ],
  },
  {
    version: '1.7.5',
    date: 'May 5, 2026',
    title: 'Compact Subject Cards + Admin Subject Creation',
    summary: 'All year-level pages now use compact glassmorphism subject cards with a 2-column mobile layout. Admins can manually add subjects to any year/semester.',
    changes: [
      'UI: Subject cards are now compact — reduced padding, 20px icon, 13px subject name, 11px teacher text.',
      'UI: Upload grid now defaults to 2 columns on mobile (≤500 px) for better density.',
      'UI: Added themed hover glows for 2nd Year (blue), 3rd Year (purple), and 4th Year (pink) subject cards.',
      'Feature: Admin-only "Add Subject" button on every year/semester page.',
      'Feature: Admin add-subject modal with validation — required name, length limit, XSS character guard, duplicate prevention.',
      'Feature: Newly added subjects appear instantly as clickable glassmorphism cards.',
    ],
  },
  {
    version: '1.7.4',
    date: 'May 4, 2026',
    title: 'Bug Fixes: Quiz Delete, YouTube Search, Past Users Restored',
    summary: 'Fixed three critical bugs: quiz history items can now be deleted, YouTube/Music Hub search works correctly again, and past/legacy users reappear in the user directory.',
    changes: [
      'Bug Fix: Added missing DELETE /api/quiz-history/:id server route — quiz history items can now be deleted from File Summarizer history. Previously the delete button triggered a 404, showing "Delete failed" alert.',
      'Bug Fix: Quiz history delete errors now show a friendly in-app toast instead of a raw browser alert. Exact Supabase errors are logged to console.',
      'Bug Fix: Music Hub YouTube search now sends the auth Bearer token with search requests. Previously serverFetch used plain fetch without auth headers, causing all three search methods (YouTube API, Piped, InnerTube) to fail with 401, leaving the search stuck.',
      'Bug Fix: serverFetch no longer retries indefinitely on JSON 502/503 responses. It now only retries when the server returns an HTML page (Render cold-start), not when the app itself returns a JSON error. Total retry window reduced from 90s to 45s.',
      'Bug Fix: Past/legacy users (registered before Supabase profile sync) now reappear in the user directory as offline/past users. The /api/users endpoint now merges Supabase profiles with local state entries, so users who exist only in data.json are no longer invisible.',
      'Safety: Restored past users are shown as offline — they are never shown as online unless they have an active presence session.',
    ],
  },
  {
    version: '1.7.3',
    date: 'May 4, 2026',
    title: 'Fix: Login No Longer Hangs After Successful Sign-In',
    summary: 'Fixed a critical bug where the app froze after login — the Sign In button stayed disabled as "Signing in..." indefinitely and the dashboard never loaded.',
    changes: [
      'Bug Fix (Critical): The presence sync call (persistLastSeen) inside finalizeLogin was awaited with no timeout. On slow connections or cold Render starts, this fetch could hang forever — blocking establishSession(), leaving the dashboard empty, and keeping the Sign In button permanently disabled.',
      'Fix: persistLastSeen is now fire-and-forget inside finalizeLogin. The app shell and dashboard load immediately after a successful sign-in.',
      'Resilience: Added a 5-second AbortController timeout to the /api/session/presence fetch inside persistLastSeen, preventing any single slow network call from blocking background presence sync.',
    ],
  },
  {
    version: '1.7.2',
    date: 'May 4, 2026',
    title: 'Critical Fix: All Buttons Now Working (CSP Root Cause)',
    summary: 'Found and fixed the true root cause of all buttons failing across the app: Helmet v8 generates a "script-src-attr: none" CSP directive by default, silently blocking every onclick handler on every page.',
    changes: [
      'Bug Fix (Critical): Added scriptSrcAttr: ["unsafe-inline"] to the server Content Security Policy. Helmet v8.1.0 sets script-src-attr: none by default, which blocks ALL inline onclick event handlers (goToPage, openChat, switchAdminTab, epSelectYear, etc.) even when scriptSrc has unsafe-inline. This was the root cause of every button being non-functional.',
      'Bug Fix: Modules modal Back/Close/New Subfolder/Upload/Open/Summarize/Move/Delete buttons now work.',
      'Bug Fix: Games/Arcade Play Now buttons (Pokemon, Battle Royale, Pac-Man, Candy Match) now work.',
      'Bug Fix: Event Pictures and Random Pictures year cards (First/Second/Third/Fourth Year) now work.',
      'Bug Fix: Social Media page Open in App cards now work.',
      'Bug Fix: Admin Dashboard Users and Activity Log tabs, and Delete User button now work.',
      'Bug Fix: User Directory Search, filter dropdowns, and Profile buttons now work.',
    ],
  },
  {
    version: '1.7.1',
    date: 'May 4, 2026',
    title: 'Global Mobile Button Fix',
    summary: 'Fixed widespread button non-responsiveness on mobile/PWA across the entire app. All interactive elements now correctly handle touch events on iOS Safari and Android PWA.',
    changes: [
      'Bug Fix: Added touch-action: manipulation globally to all interactive elements — buttons, links, cards, chat items, game cards, folder cards, nav items, and all onclick-bearing elements. This prevents iOS Safari from swallowing taps as scroll gestures inside overflow-y: auto containers.',
      'Bug Fix: Fixed Announcement/Calendar "Share to Everyone" failing with Supabase PGRST204 error — removed the non-existent text column from the shared_announcements INSERT payload.',
      'Bug Fix: Added event delegation fallback for chat-item divs so Group Chat, To-Do Group, and Private Chat navigation works even if inline onclick fails on iOS PWA.',
      'Bug Fix: Restored reliable tap handling for: Modules/Folders, Chat, User Directory, Social Pages, Personal Tools, Music Hub, Gallery, Games/Arcade, and Admin Dashboard buttons.',
    ],
  },
  {
    version: '1.7.0',
    date: 'May 4, 2026',
    title: 'Battle Royale Blood Skin Picker Fixed',
    summary: 'Fixed the broken Blood Effect button in Battle Royale — clicking 🩸 Blood now opens a skin picker to choose between Red, Dark Red, Neon, and Black blood effects.',
    changes: [
      'Bug Fix: Battle Royale 🩸 Blood button now works — openBloodSkinMenu() was missing from the public API and has been implemented.',
      'Feature: Blood skin selection (Red, Dark Red, Neon, Black) is now persistent across sessions via localStorage.',
      'Bug Fix: Selected blood skin is restored on next game launch automatically.',
    ],
  },
  {
    version: '1.6.9',
    date: 'May 2, 2026',
    title: 'Startup + Button Stability Repair',
    summary: 'Made login and initial loading responsive even during server cold starts, and prevented Supabase-dependent buttons from failing when the client is still initializing.',
    changes: [
      'Performance: Auth modal and app shell now reveal immediately on DOM ready (no longer blocked behind Supabase init).',
      'Bug Fix: Login no longer waits for Supabase client readiness before showing the main app UI.',
      'Bug Fix: Announcements and OUTPUT-AI now wait for Supabase readiness and provide a visible Retry instead of silently failing.',
      'Bug Fix: Folder/file actions now guard against missing Supabase client during cold start, preventing broken Delete/Upload/Explorer buttons.',
      'PWA: Splash screen now dismisses as soon as the UI is usable (with a short fallback timer).'
    ]
  },
  {
    version: '1.6.8',
    date: 'May 2, 2026',
    title: 'Fast Boot Optimization',
    summary: 'Drastically improved app loading time by unblocking the boot sequence and deferring heavy game assets.',
    changes: [
      'Performance: Unblocked the boot sequence from waiting on the 3-second splash screen timer.',
      'Performance: Unblocked the initial boot sequence from waiting on Supabase initialization for logged-out users.',
      'Performance: Added defer attributes to heavy game scripts so they do not block the browser parser.',
    ]
  },
  {
    version: '1.6.7',
    date: 'May 1, 2026',
    title: 'App Performance & History Button Fixes',
    summary: 'Fixed slow startup times and repaired broken delete/refresh buttons on the Announcements and File Summarizer history sections.',
    changes: [
      'Performance: Added defer to heavy game scripts so the UI loads instantly without blocking the browser.',
      'Performance: Removed blocking await from App Open tallies so the splash screen drops faster.',
      'Bug Fix: Repaired the Announcement Refresh button and Search input by replacing inline events with safe delegated listeners.',
      'Bug Fix: Fixed UUID SyntaxErrors in Announcement and File Summarizer History delete buttons, allowing safe deletion of saved notes and quizzes.',
    ]
  },
  {
    version: '1.6.6',
    date: 'May 1, 2026',
    title: 'Share Actions & Button Reliability',
    summary: 'Fixed backend routes and frontend response handling for all shared boards. Reviewer buttons now function correctly. Fixed "Unexpected token" errors.',
    changes: [
      'Bug Fix: AI Assistant and Calendar now correctly share to public boards using dedicated backend routes.',
      'Bug Fix: File Summarizer and Notepad sharing to Reviewers now uses backend routes instead of direct client queries.',
      'Bug Fix: Shared Reviewers action buttons (Like, View, Delete) no longer break due to UUID syntax formatting errors.',
      'Security: Implemented safe JSON response checks across all authenticated fetches to show friendly errors instead of raw parse failures.',
    ]
  },
  {
    version: '1.6.5',
    date: 'May 1, 2026',
    title: 'Startup Recovery & XSS Security',
    summary: 'Fixed a syntax error that caused the app to freeze permanently on the BSIT splash screen. Hardened rendering to prevent XSS and adjusted mobile UI layering.',
    changes: [
      'Bug Fix: Restored missing syntax in the boot sequence so the app correctly proceeds past the splash screen.',
      'Bug Fix: Lowered the chat bubble z-index and made the live clock click-through so they do not block buttons on mobile.',
      'Security: Hardened Music Hub search results against cross-site scripting (XSS).',
      'Security: Applied 2MB payload limits to the backend JSON parser to prevent crashes.',
      'Diagnostics: Added server logs to warn about ephemeral filesystem usage on Render.'
    ]
  },
  {
    version: '1.6.4',
    date: 'May 1, 2026',
    title: 'Global Button & Interaction Fix',
    summary: 'Fixed a critical issue where all buttons became unclickable after logging in due to an invalid CSS pointer-events property on Safari/iOS devices.',
    changes: [
      'Bug Fix: Replaced invalid "pointer-events: all" with "pointer-events: auto" to restore touch and click interactions across all pages.',
      'Diagnostics: Added internal routing and click event logs to verify button responsiveness.',
      'Routing: Verified Personal Tools (Alarm Clock, Notepad, Calculator) correctly route to their respective pages.',
      'Safety: Added inline pointer-events overrides to ensure pages become clickable even if the stylesheet fails to load.'
    ]
  },
  {
    version: '1.6.3',
    date: 'May 1, 2026',
    title: 'Startup Reliability Fix',
    summary: 'Fixed a critical bug that caused the app to freeze on the BSIT splash screen due to unhandled initialization timeouts.',
    changes: [
      'Bug Fix: Added strict timeouts to Supabase initialization so offline or slow connections do not block the app from loading.',
      'Bug Fix: Added an absolute safety net to forcibly remove the splash screen if normal boot sequence hangs.',
      'UX: Added a friendly error screen with a "Reload App" button in case of total boot failure instead of a blank screen.',
      'Developer Tool: Added explicit [BOOT] console logs to track startup progress.'
    ]
  },
  {
    version: '1.6.2',
    date: 'May 1, 2026',
    title: 'Shared Boards Security & Mobile Layout Fixes',
    summary: 'Repaired RLS errors when sharing to AI Whiteboard, Reviewers, and Announcements. Fixed broken Personal Tools buttons and cleaned up mobile header overlaps.',
    changes: [
      'Security: Migrated all shared board writes (OUTPUT-AI, Reviewers, Announcements) to the authenticated backend API to prevent RLS failures and unauthorized spoofing.',
      'Security: Added migration 023 to lock down client writes on shared tables.',
      'Bug Fix: The Announcement board delete button now correctly works for admins and the original poster.',
      'Bug Fix: The "Open" buttons for Alarm Clock, Notepad, and Calculator on the Personal Tools page now respond properly.',
      'UX: Mobile headers no longer cramp together. The live clock was moved to the bottom left on small screens to free up space.',
      'UX: The floating chat bubble is now hidden on the Personal Tools page so it does not block the bottom cards.'
    ],
  },
  {
    version: '1.6.1',
    date: 'May 1, 2026',
    title: 'Quiz & Summary History Integration',
    summary: 'Finished frontend integration for the new quiz and summary history backend routes, allowing seamless tracking of generated study materials.',
    changes: [
      'Feature: Added a History panel to the File Summarizer with tabs for Summaries and Quizzes.',
      'Feature: Quiz completions are now securely logged to your backend account.',
      'Feature: Users can delete past quizzes and summaries directly from the history panel.',
      'UX: Offline quiz completions safely merge with cloud history so your progress isn\'t lost during connection drops.',
      'Cleanup: Removed orphaned staging SQL files to prevent database confusion.'
    ],
  },
  {
    version: '1.6.0',
    date: 'April 30, 2026',
    title: 'Security Hardening: Identity Model & RLS Lockdown',
    summary: 'Removed the spoofable x-class-username browser header from the Supabase client. Repaired and extended pending SQL migrations (015–022) to lock down all direct client writes on folders, files, and messages. Hardened backend endpoints with auth, rate limits, and Supabase as source of truth for reads. Socket.io broadcasts now restricted to authenticated rooms.',
    changes: [
      'Security: Removed x-class-username header injection from the Supabase JS client — editing localStorage can no longer impersonate another user or admin.',
      'Security: Added migration 021 that drops all client INSERT/UPDATE/DELETE policies on folders, files, messages, and calendar_notes; only backend (service role) can write to these tables.',
      'Security: Repaired migrations 015–020 for safe sequential execution after migration 014.',
      'Security: Admin login now requires ADMIN_PASSWORD to be a bcrypt hash; plaintext fallback removed.',
      'Security: /api/yt-scrape, /api/piped-search, /api/yt-search now require login (requireAuth).',
      'Security: /api/static-check and /api/search-test now require admin auth.',
      'Security: /api/app-open-count GET now requires login.',
      'Performance: Added per-user upload rate limiter (20/min) and video search rate limiter (30/min).',
      'Backend: GET /api/folders and GET /api/files now read from Supabase when configured, fixing the dual-store inconsistency.',
      'Backend: PUT /api/users/:username now syncs profile fields to Supabase.',
      'Backend: Registration now blocks pre-seeded accounts without a password from being overwritten.',
      'Backend: Calendar notes, summary history, and quiz history have dedicated authenticated API routes.',
      'Socket.io: User presence, message, and count broadcasts now target the authenticated group room instead of all sockets.',
      'Gallery: Folder create, rename, and delete now use authenticated backend API instead of direct Supabase client calls.',
      'UI: Added CSS bottom safe zone using env(safe-area-inset-bottom) for iOS PWA overlap fix.',
      'UI: Added reusable empty-state CSS classes for consistent empty UI across pages.',
      'Student: Summary history is now saved to the backend after every successful file summarization.',
      'Student: Added quiz history API routes (/api/quiz-history) for future score tracking.',
      'PWA: Cache version bumped to v1.6.0 to force fresh asset delivery.',
    ],
  },
  {
    version: '1.5.68',
    date: 'April 30, 2026',
    title: 'Final Security Migration: Server Authoritative Writes',
    summary: 'Migrated all remaining client-side writes to the backend. Enforced Row Level Security (RLS) across all sensitive tables, and fully synchronized the PWA cache assets.',
    changes: [
      'Security: Migrated file, folder, and message creation off spoofable client inserts to authenticated backend routes.',
      'Security: Applied strict Row Level Security (RLS) policies on Supabase tables to block direct browser manipulation.',
      'PWA: Corrected service worker cache drift so the newest security logic actually updates on mobile devices.',
      'Architecture: Fully integrated authFetch everywhere, completely detaching the application from the legacy trust model.'
    ],
  },
  {
    version: '1.5.67',
    date: 'April 30, 2026',
    title: 'Profile security and admin isolation',
    summary: 'Moved profile updates to the trusted backend API to prevent arbitrary table modifications. Cascading username changes now happen securely via service role credentials instead of client queries. Migrated the admin user deletion feature off spoofable RPCs to an authenticated backend route.',
    changes: [
      'Security: Moved profile updates to the trusted backend API to prevent arbitrary table modifications from the browser.',
      'Security: Cascading username changes now happen securely via server-side service role credentials instead of risky bulk client queries.',
      'Security: Migrated the admin user deletion feature off spoofable RPCs to an authenticated backend route.'
    ],
  },
  {
    version: '1.5.66',
    date: 'April 30, 2026',
    title: 'Tighten cache checks and stale-tooling gaps',
    summary: 'Presence now marks hidden tabs offline, app-open fallback writes no longer trust caller-supplied usernames, stale version drift now fails loudly, and broken legacy/test paths were cleaned up enough to verify safely.',
    changes: [
      'PWA: The version-check script now fails on real cache drift instead of only warning, and the missing personal-tools assets were added back to the service worker asset list.',
      'Presence: Hidden tabs now publish offline status instead of incorrectly keeping users marked online the whole time.',
      'Integrity: The app-open API fallback now authenticates the caller server-side, so app-open counts can no longer be polluted with arbitrary usernames.',
      'Maintainability: The admin delete-user cancel path now resolves cleanly instead of leaving a pending promise behind.',
      'Maintainability: The broken legacy notepad module now passes syntax checking, and the Jest command ignores `.claude/worktrees` so cloned worktrees stop colliding with the main repo test scan.',
    ],
  },
  {
    version: '1.5.65',
    date: 'April 30, 2026',
    title: 'Protect uploads and stabilize notepad sync',
    summary: 'Blocked risky upload types from being served as app-origin content, fixed Notepad reconnect overwrites, and made generated notes follow the same sync path across devices.',
    changes: [
      'Security: Uploads now use an explicit safe-file allowlist and safer response headers so HTML, SVG, and other scriptable files cannot round-trip back from the app origin as active content.',
      'Reliability: Notepad no longer registers duplicate online/offline listeners on every page open, and reconnect sync now saves local unsynced notes before merging cloud state.',
      'Reliability: Local-only notes are no longer marked as “already imported” just because the user first logged in while offline.',
      'Consistency: File Summarizer and Reviewers now save through the Notepad sync module so generated notes can reach cloud sync instead of living only in localStorage.',
      'Compatibility: The File Summarizer now matches the backend and accepts PPTX instead of advertising unsupported legacy PPT uploads.',
      'UX: Announcement now shows a clear unavailable state instead of rendering blank when Supabase is not ready.',
    ],
  },
  {
    version: '1.5.64',
    date: 'April 30, 2026',
    title: 'Harden auth boundaries and private APIs',
    summary: 'Moved sign-in, registration, and presence updates onto trusted server routes, upgraded password handling to bcrypt with legacy migration, and closed unauthenticated reads on private data APIs.',
    changes: [
      'Security: Registration now completes through the server instead of a browser-side profiles insert, so account creation no longer depends on direct anonymous profile writes.',
      'Security: Real user passwords now verify with bcrypt and legacy SHA-256 hashes are upgraded on successful sign-in instead of staying in the weaker format.',
      'Security: Login responses now return a sanitized profile to the browser, removing the need to fetch password hashes into frontend session code.',
      'Security: Messages, folders, and files API reads now require authentication, and private message history checks that the caller is part of the conversation.',
      'Resilience: Login, registration, and logout no longer fail just because Supabase config or presence wiring is slow to initialize on the client.',
    ],
  },
  {
    version: '1.5.63',
    date: 'April 30, 2026',
    title: 'Fix close buttons across modals',
    summary: 'Added a shared close-handler fallback so modal close buttons keep working even when inline handlers fail on mobile or stale cached markup.',
    changes: [
      'Improved: Modal close controls now have a shared delegated fallback instead of depending only on inline onclick handlers.',
      'Fixed: Folder, prompt, alert, changelog, and dynamic modal close buttons now resolve their overlay reliably and dismiss it on mobile.',
      'Fixed: Static close/cancel buttons now carry explicit close targets so the app can dismiss the right modal even if older cached HTML is still around.'
    ],
  },
  {
    version: '1.5.62',
    date: 'April 30, 2026',
    title: 'Fix dead buttons across folders, AI, and Code Lab',
    summary: 'Rewired the most brittle mobile click paths so folder actions, AI assistant buttons, Reviewers handoff, and OUTPUT-AI controls stop failing silently after login.',
    changes: [
      'Improved: Folder and sub-folder cards now use delegated mobile-safe handlers for open, rename, permissions, delete, upload, and close actions instead of relying on fragile inline modal clicks.',
      'Improved: AI Assistants now use delegated button handlers for model selection, back, send, clear, and share actions so the model cards respond reliably on mobile.',
      'Fixed: File Summarizer now shows a working “View Reviewers” action after sharing, and OUTPUT-AI refresh/delete controls now degrade cleanly when the shared board is unavailable.',
      'Fixed: Code Lab daily tasks now count from the user’s first day using Code Lab instead of showing an inflated calendar day number like Day 119, and the daily task rotation now changes per day instead of feeling stuck on the same challenge.'
    ],
  },
  {
    version: '1.5.61',
    date: 'April 29, 2026',
    title: 'Fix post-login navigation and diagnostics',
    summary: 'Post-login pages now fail gracefully instead of going silent when a shared fetch or realtime hook breaks, and diagnostics/users show clear states instead of looking dead.',
    changes: [
      'Fixed: User Directory now loads through an authenticated fallback path and shows loading, empty, and error states instead of silently rendering nothing.',
      'Fixed: Diagnostics now handles admin-only access with a clear message instead of showing a raw 403 failure.',
      'Fixed: Realtime bootstrap and page navigation now guard failing page actions so one runtime error does not make later buttons and pages appear unresponsive.',
    ],
  },
  {
    version: '1.5.60',
    date: 'April 29, 2026',
    title: 'Fix legacy password setup flow',
    summary: 'Legacy accounts without a saved password hash now get a real one-time password setup path instead of the dead-end “contact an admin” error.',
    changes: [
      'New: The server now returns a short-lived legacy password setup token so older accounts can create a password and finish signing in safely.',
      'Improved: Sign In now opens a clear one-time password setup prompt for legacy users instead of depending on a fragile logged-out Supabase write.',
      'Bug Fix: Existing accounts with a missing password hash no longer stop at “Password setup required. Please contact an admin or try registering.”',
    ],
  },
  {
    version: '1.5.59',
    date: 'April 29, 2026',
    title: 'Fix auth portal boot and dead buttons',
    summary: 'The auth portal now waits for the splash boot to finish, binds its buttons explicitly after DOM load, and gives visible status feedback for sign-in, registration, and legacy password setup.',
    changes: [
      'New: Auth portal buttons now bind explicit click and Enter-key handlers after DOM load so Sign In and Create Account still work even if inline handlers are stale or blocked.',
      'Improved: The auth portal now stays hidden until the splash boot sequence is complete, preventing the portal from appearing over the loading screen.',
      'Improved: The auth status box now shows info, success, and error states so users can see when sign-in is in progress, when legacy password setup is required, and when a failure occurs.',
      'Fixed: A newly activated service worker now forces one safe refresh when the app version changes, preventing stale cached login code from lingering after deploy.'
    ]
  },
  {
    version: '1.5.58',
    date: 'April 29, 2026',
    title: 'Fix login session handoff',
    summary: 'The sign-in flow now fails visibly when Supabase is unavailable, blocks duplicate auth clicks, and waits for the session bootstrap to finish before revealing the portal.',
    changes: [
      'Improved: The login and registration flow now uses a single initialization state so the portal shell stays hidden until auth setup is fully complete.',
      'Improved: Supabase channel setup, presence tracking, and session restore now guard against null clients and log useful auth bootstrap failures instead of failing silently.',
      'Fixed: Sign In now shows visible auth errors when profile lookup, session restore, or the server login handoff fails, instead of appearing to do nothing.',
      'Fixed: The dashboard no longer appears behind the auth/loading state while initialization is still in progress.'
    ]
  },
  {
    version: '1.5.57',
    date: 'April 29, 2026',
    title: 'Fix sign-in: remove non-existent id column and server-first login',
    summary: 'Sign-in was silently failing because every Supabase profile fetch included a non-existent "id" column (profiles use username as primary key). Login is now server-first so admin accounts always work via the server fast-path even when a Supabase password is not yet set.',
    changes: [
      'Fixed: Removed "id" from PROFILE_SELECT_FIELDS and PROFILE_PUBLIC_FIELDS — profiles table uses username as primary key, not id, causing all profile fetches to fail.',
      'Fixed: Removed "id" from SUPABASE_AUTH_SELECT in server.js for the same reason.',
      'Fixed: Login is now server-first — credentials are verified by the server (including admin fast-path) before any Supabase profile fetch, so admin can sign in with their env-var password even when Supabase password_hash is NULL.',
      'Fixed: If server returns 428 (password setup required), the legacy password setup prompt now appears instead of a silent failure.',
      'Fixed: Profile fetch after login has a 4-second timeout and falls back to a minimal profile object, so login completes even when Supabase is slow.'
    ]
  },
  {
    version: '1.5.56',
    date: 'April 29, 2026',
    title: 'Fix app load delay and sign-in broken by bad retry logic',
    summary: 'Previous fix accidentally blocked page load for up to 20+ seconds by retrying /api/config inside DOMContentLoaded. Reverted to a single fast attempt with a 5s timeout; retry now only happens on demand when Sign In is clicked.',
    changes: [
      'Fixed: initSupabase no longer retries inside DOMContentLoaded — a retry loop there blocked the entire page from loading.',
      'Fixed: /api/config fetch now has a 5-second AbortController timeout so a hung server never freezes the page.',
      'Fixed: waitForSupabaseClient re-fetches /api/config once on login if credentials are still empty, covering the case where the server was cold-starting during initial page load.',
      'Fixed: initAppOpenRealtime and fetchSharedAnnouncements now guard against null Supabase client instead of crashing when called before init completes.'
    ]
  },
  {
    version: '1.5.52',
    date: 'April 29, 2026',
    title: 'Security Hardening + Password Authentication',
    summary: 'Password authentication now works end to end, protected server routes require verified bearer tokens, and several chat, cache, and modal edge cases were hardened without changing the app flow.',
    changes: [
      'New: Login and registration now use the password field properly, store SHA-256 password hashes, and guide legacy accounts through a one-time password setup.',
      'Improved: Uploads, AI tools, push notifications, diagnostics, and authenticated socket actions now require a signed server token instead of trusting anonymous or user-supplied identities.',
      'Fixed: Chat sender rendering is now escaped before innerHTML output, profile updates use strict allowlists, and message history loads only the latest batch instead of the full backlog.',
      'Fixed: Confirm modals now support a working No callback, prompt inputs submit on Enter, Code Lab postMessage no longer uses a wildcard origin, and the offline shell fallback now tracks the current cached index version.'
    ]
  },
  {
    version: '1.5.51',
    date: 'April 29, 2026',
    title: 'Battle Royale Crate Map Markers',
    summary: 'Battle Royale crates now appear on the minimap as orange dots so players can quickly spot supply targets while moving around the zone.',
    changes: [
      'New: Unclaimed crates now show as orange minimap dots so players can navigate toward supply drops more easily.',
      'Improved: Special crates use a brighter orange marker so they stand out from regular crate supplies.',
      'Fixed: Crate markers disappear once the crate has been fully claimed, keeping the minimap accurate.'
    ]
  },
  {
    version: '1.5.50',
    date: 'April 29, 2026',
    title: 'Battle Royale Crate Selection + Storm Damage Balancing',
    summary: 'Battle Royale crates now open through a touch-safe selection panel, special crates expose their exclusive gear correctly, and storm damage now hits bots and players with the intended per-phase scaling.',
    changes: [
      'New: Nearby crates now show a tap-friendly selection panel so players can open a crate and choose its contents without relying on hover-only interaction.',
      'Improved: Special crates now surface their crate-exclusive rewards, including the Gatling Gun and Rocket Launcher, as direct selectable options.',
      'Fixed: Storm damage now ticks once per second using the requested phase scaling of 1, 3, 5, and 7 HP, and bots now take the same shrinking-circle damage as players.',
      'Fixed: Zone-escape bot movement now uses a stronger unstuck fallback so bots are less likely to pin themselves against walls outside the circle.'
    ]
  },
  {
    version: '1.5.49',
    date: 'April 28, 2026',
    title: 'YouTube Embed Fix + Personalize Button Minimized',
    summary: 'Switched YouTube player to youtube-nocookie.com to eliminate Error 153 playback failures. Personalize button replaced with a compact circular icon.',
    changes: [
      'Fixed: YouTube now uses youtube-nocookie.com embed — removes origin/enablejsapi restrictions that caused Error 153.',
      'Improved: Personalize button minimized to a small circular 🎨 icon — no longer obstructs page content.',
    ]
  },
  {
    version: '1.5.48',
    date: 'April 28, 2026',
    title: 'YouTube Fix + Reviewers Overlap & Delete Fix',
    summary: 'Fixed YouTube videos playing inside the app (Error 153), fixed overlapping badges on reviewer cards, fixed delete button reliability, and fixed Save to Notes button responsiveness.',
    changes: [
      'Fixed: YouTube embed origin parameter added — resolves Error 153 playback error.',
      'Fixed: Reviewer card badges (vote count + contributor) now use flex header row — no more text overlap.',
      'Fixed: Delete button now uses safe string ID comparison — prevents silent failures on all ID types.',
      'Fixed: Save to Notes button now correctly receives event — double-save prevention now works.',
      'Improved: Reviewer action buttons enlarged to 36px min-height with touch-action: manipulation for better iOS tap.',
    ]
  },
  {
    version: '1.5.47',
    date: 'April 28, 2026',
    title: 'Revert Home Dashboard + Bottom Nav — Announcement board only, sidebar as primary nav',
    summary: 'Removed page-home card grid, bottom navigation bar, and all related JS/CSS. App opens directly to the Announcement board. Sidebar menu is the sole navigation. Conflicts resolved.',
    changes: [
      'Removed: page-home card-grid dashboard and bottom navigation bar.',
      'Removed: initHomeDashboard, setBottomNav, and pageConfig.home from script.js.',
      'Restored: Announcement page as the active landing page (currentPage = announcement).',
      'Restored: Sidebar as primary navigation — hamburger menu, nav items, all working.',
      'Kept: Lobby Navigation Restore and all other stable changes from v1.5.46.',
    ]
  },
  {
    version: '1.5.46',
    date: 'April 28, 2026',
    title: 'Lobby Navigation Restore + Cache Refresh',
    summary: 'Restored the compact lobby controls, kept the hamburger menu accessible over the lobby view, and refreshed the asset cache versions so the latest UI ships cleanly.',
    changes: [
      'Lobby: Replaced the larger dashboard cards with compact header actions for app opens, contributions, and updates.',
      'Navigation: Kept the hamburger menu visible over the lobby so connected pages continue to open without trapping the user.',
      'Cache: Bumped index, script, style, and service worker cache versions together so fresh assets replace stale PWA bundles immediately.'
    ]
  },
  {
    version: '1.5.45',
    date: 'April 28, 2026',
    title: 'Reverted Home Dashboard — Announcement page restored to clean board view',
    summary: 'Removed the Home Dashboard. The Announcement page is now just the announcement board.',
    changes: [
      'Removed: Home Dashboard (welcome banner, engagement metrics, quick actions, recent activity, trending notes).',
      'Removed: All dashboard JS functions and associated CSS (~220 lines).',
    ]
  },
  {
    version: '1.5.44',
    date: 'April 28, 2026',
    title: 'Mobile UI Fixes + Light Mode + Reviewer Content Improvements',
    summary: 'Fixed mobile header overlap with status bar, responsive font sizes, broken light mode glows, reviewer card layout, and added auto-bolding of key terms in reviewer content.',
    changes: [
      'Fix: Added env(safe-area-inset-top) to menu button, page indicator, and page padding — headers no longer overlap phone status bar.',
      'Fix: Responsive font sizes with clamp() for headings on 360–430px screens — text scales properly on small devices.',
      'Fix: Light mode — removed blinding text-shadow on page titles and buttons. All text readable on light backgrounds.',
      'Fix: Light mode — comprehensive contrast overrides for notepad, reviewer cards, home dashboard, sidebar, and feature pages.',
      'Fix: Reviewer cards now show 150-char preview with proper top padding to avoid badge overlap.',
      'Feature: Reviewer content view auto-bolds key terms (ALL CAPS acronyms, **markdown**, Definition:/Formula: labels).',
      'Fix: Dark mode page-title glow reduced at ≤430px for less visual noise on small screens.',
    ]
  },
  {
    version: '1.5.43',
    date: 'April 28, 2026',
    title: 'Phase 8 — Engagement, Undo Actions, Performance & Hardening',
    summary: 'Added undo functionality for destructive actions, gamification mechanics (study streaks, contributor badges), and pagination. Fixed double-save race condition in Reviewer modal.',
    changes: [
      'Feature: 5-second undo toast for deleted notes/reviewers — optimistic UI with "Undo" button to restore within window.',
      'Feature: Study Streak tracker — shows "🔥 N-day streak!" on Dashboard if user visits app on consecutive days.',
      'Feature: Quiz Score Trend — shows "↑ Improving!" or "→ Consistent" if 3+ quiz attempts logged.',
      'Feature: Contributor Badge — ⭐ shows on reviewer cards for authors with 5+ shared notes.',
      'Feature: Reviewer Pagination — loads first 20 reviewers, "Load More" button to fetch next batch (reduces initial load).',
      'Feature: Engagement Metrics — Dashboard displays active streaks and quiz trends in glowing metric pills.',
      'Bug Fix: "Save to My Notes" button now disables during save — prevents double-save race condition.',
      'Bug Fix: Tooltip/hover state improvements on vote buttons and contributor badges.',
      'Developer Tool: Added scripts/version-check.js — validates version consistency between sw.js and index.html.',
      'Documentation: Added comment block to sw.js listing which version strings need bumping per feature file.',
    ]
  },
  {
    version: '1.5.42',
    date: 'April 28, 2026',
    title: 'Phase 4 — Reviewers Quality Control (Upvoting + Trending)',
    summary: 'Reviewers transformed from chronological dump into community-driven discovery tool. Upvote button on each card, three sorting modes (Trending, Newest, By Author), and persistent sort preference.',
    changes: [
      'Feature: Upvote button (👍) on each reviewer card — one click to upvote/unvote.',
      'Feature: Vote count badge shows total upvotes on each card (top-right corner).',
      'Feature: Sort dropdown with three options — "🔥 Trending" (default, by votes), "📅 Newest", "👤 By Author".',
      'Feature: Sort preference persists in localStorage — your choice is remembered.',
      'Feature: Voted cards show highlighted vote button state for visual feedback.',
      'Feature: Users can only upvote when logged in and online — offline upvoting is blocked.',
      'Backend: Added migration 012_reviewer_votes_table.sql with unique constraint (reviewer_id, user_id).',
      'UX: Trending sort shows most-upvoted content first — community-driven discovery.',
      'UX: Vote button prevents double-voting; unvoting removes your upvote.',
    ]
  },
  {
    version: '1.5.41',
    date: 'April 28, 2026',
    title: 'Phase 3 — Notepad Cloud Sync',
    summary: 'Notepad now syncs to Supabase with offline fallback. Real-time sync status indicator, first-login import prompt for local notes, and shared note warnings.',
    changes: [
      'Feature: Notepad now syncs to cloud (Supabase user_notes table) — notes persist across devices.',
      'Feature: Sync status indicator in notepad header shows "☁️ Synced", "⏱️ Syncing…", or "⚠️ Offline (cached)".',
      'Feature: First-login import prompt asks to sync existing localStorage notes to cloud on first cloud login.',
      'Feature: Shared notes show "⚠️ Shared to Reviewers" warning — local edits won\'t update the public version.',
      'Feature: Offline fallback banner shows "Log in to sync across devices" when offline or not logged in.',
      'Feature: Automatic sync on online/offline transitions — reconnection triggers background sync.',
      'Backend: Added migration 011_user_notes_table.sql with RLS policies (user-scoped access).',
      'UX: Notes load from cloud first, fall back to localStorage if offline or not logged in.',
      'UX: Delete and share operations sync to cloud in background.',
    ]
  },
  {
    version: '1.5.40',
    date: 'April 28, 2026',
    title: 'Phase 7 — Mobile Responsive Fixes + Offline Graceful Degradation',
    summary: 'Full mobile optimization with 44×44px touch targets, responsive quiz modals, iOS keyboard awareness. Network resilience with offline action queueing and cache fallback messages.',
    changes: [
      'Mobile: All buttons/inputs minimum 44×44px touch targets (quiz choices, chips, notepad, reviewers, nav items)',
      'Mobile: Quiz modal max-height 90dvh and scrollable on 320px screens; identification input 44px minimum',
      'Mobile: iOS keyboard awareness using visualViewport API — Quiz submit button stays accessible when keyboard visible',
      'Mobile: Sidebar dropdown rows full-width tap target (48px minimum height on mobile)',
      'Mobile: Fixed overflow-x issues on narrow screens; card containers, modals properly scroll',
      'Offline: Check navigator.onLine before Supabase writes; queue actions in localStorage "offline-queue"',
      'Offline: Show "You\'re offline. Will sync when reconnected." toast on failed writes',
      'Offline: On reconnect, process queued actions and show "Synced X action(s)!" confirmation',
      'Offline: Read operations show "📡 Showing cached content — you\'re offline" banner',
    ]
  },
  {
    version: '1.5.39',
    date: 'April 28, 2026',
    title: 'Phase 2 — Home Dashboard + YouTube Error Handling',
    summary: 'Announcement page transformed into Home Dashboard with welcome banner, quick actions, recent activity tracking, and trending shared notes. YouTube player now gracefully handles blocked videos.',
    changes: [
      'Feature: Home Dashboard section on Announcement/Home page with welcome banner showing username and time-of-day greeting.',
      'Feature: Quick action cards for "Summarize a File", "Open Notepad", "Browse Reviewers", "Generate Quiz" — one-tap access to core tools.',
      'Feature: Recent Activity section showing last 3 saved notes and last completed quiz with score.',
      'Feature: Trending Shared Notes section loading top 3 most recent shared reviewers from Supabase.',
      'Feature: YouTube embedded player now detects Error 153 (video unavailable) and shows "Open on YouTube →" fallback link.',
      'UX: Announcement page nav label changed from "Announcement" to "🏠 Home" to reflect its new role as default landing page.',
      'UX: Quiz completion stores score + date to localStorage for Recent Activity tracking on Home Dashboard.',
      'UX: YouTube error handling prevents confusing blank player — users see clear error with direct YouTube link.',
    ]
  },
  {
    version: '1.5.38',
    date: 'April 28, 2026',
    title: 'Phase 6 — Semester & Subject Page Improvements',
    summary: 'Subject cards now have a direct "Summarize" shortcut, empty Year 2–4 semesters show a helpful placeholder instead of blank space, and a quick-action bar sits above subjects for fast navigation. Fixed error handling in folder/file explorer.',
    changes: [
      'Feature: Each subject card now has two action buttons — "📂 Folders" (opens folder explorer) and "📄 Summarize" (goes to File Summarizer).',
      'Feature: Quick-action bar added at the top of every subject grid with a direct "Summarize a File →" shortcut.',
      'UX: Year 2, 3, and 4 empty semester pages now show a proper empty state with icon, explanation, and a File Summarizer shortcut button instead of blank gray space.',
      'UX: The "CLICK A SUBJECT TO VIEW FOLDERS" section label is automatically hidden when a semester has no subjects.',
      'Bug Fix: Folder and file explorer now display Supabase errors to the user instead of silently logging to console — missing/gone files now show a clear error message with "Please refresh and try again".',
      'Bug Fix: Sub-folder loading errors are now visible to the user with descriptive error messages.',
    ]
  },
  {
    version: '1.5.37',
    date: 'April 28, 2026',
    title: 'Phase 5 — Quiz Learning Improvements',
    summary: 'Quiz transformed into a real learning tool: post-quiz answer review screen, quiz history tracking, better timer urgency, and quiz settings auto-reset on new file.',
    changes: [
      'Feature: "Review Answers" button on score screen — shows every Q&A with your answer, correct answer, and AI explanation.',
      'Feature: Quiz history saved to localStorage after every quiz (file, type, count, score, date) — used by future dashboard.',
      'Feature: Quiz source filename shown in modal header so you always know which file the quiz is from.',
      'UX: Timer pulses at ≤5 seconds remaining and shakes at ≤2 seconds for urgent visual feedback.',
      'Bug Fix: Quiz type/count chips now reset when a new file is selected — prevents stale settings from a previous file carrying over.',
    ]
  },
  {
    version: '1.5.36',
    date: 'April 28, 2026',
    title: 'Phase 1 — Navigation Reorganization & Reviewers View Fix',
    summary: 'Sidebar menu reorganized into 8 clear labeled sections for easier navigation. Fixed Reviewers "View" button that did nothing on click.',
    changes: [
      'Nav: Sidebar reorganized into labeled sections — Main, Learning, My Classes, Community, Tools, Games, System.',
      'Nav: Section divider lines added between groups for visual clarity.',
      'Nav: Nav item padding reduced for less vertical crowding — more items visible without scrolling.',
      'Nav: Learning section groups File Summarizer, Reviewers, AI Assistants, Coding Lessons, Code Lab, Output-AI together.',
      'Nav: Community section groups Chat, Users, and Social Media Pages together.',
      'Nav: Tools section groups Personal Tools, Calendar, Music, Events, and Random Pictures together.',
      'Bug Fix: Reviewers "View" button now correctly opens the reviewer modal — fixed strict type equality mismatch (string vs number id).',
      'Bug Fix: Reviewers "Save to My Notes" button now correctly finds the reviewer — same type mismatch fix applied.',
      'Bug Fix: Reviewers openViewer() now shows a toast instead of browser alert() when a reviewer is not found.',
    ]
  },
  {
    version: '1.5.35',
    date: 'April 28, 2026',
    title: '10-Phase UX & Bug Fix Sweep',
    summary: 'Comprehensive UX, bug, and quality-of-life improvements across File Summarizer, Quiz, Notepad, and Reviewers based on full app audit.',
    changes: [
      'Bug Fix: Quiz modal and score screen now close automatically when navigating away from File Summarizer.',
      'Bug Fix: Quiz type/count chip selections are now persisted to localStorage and restored on page reload.',
      'Bug Fix: Delete confirmations in Notepad and Reviewers now use the in-app custom modal instead of jarring browser confirm().',
      'Bug Fix: Reviewer delete() uses customConfirm for ownership check errors too — no more browser alert().',
      'UX: Reviewer search input is now debounced (300ms) to prevent jank on slow devices.',
      'UX: File upload/extraction/summary steps now show staged progress messages (Uploading → Extracting → AI generating).',
      'UX: After sharing a note from Notepad, a clickable toast appears: "View Reviewers →" instead of a generic alert.',
      'Feature: Reviewer modal now has a "Save to My Notes" button — saves shared note directly to your local Notepad.',
      'Feature: Notepad now has a live search bar — filter notes by title or content instantly.',
      'Feature: File Summarizer output card now has a "Share to Reviewers" button — share directly without going through Notepad.',
    ]
  },
  {
    version: '1.5.34',
    date: 'April 27, 2026',
    title: 'Interactive Quiz, Redesigned File Summarizer, Reviewer Page Fix',
    summary: 'Full overhaul of File Summarizer and Reviewer page. Quiz now runs as an interactive timed session. Reviewer sharing and deletion fixed end-to-end.',
    changes: [
      'Quiz: Interactive timed quiz mode — one question at a time, 10-second countdown timer, no answers shown upfront.',
      'Quiz: Multiple choice questions show 4 buttons; identification shows a text input.',
      'Quiz: After each answer: correct/wrong feedback revealed with explanation.',
      'Quiz: Final score screen with emoji and restart button.',
      'Quiz: Server generates structured JSON quiz — answers never exposed in plain-text output.',
      'File Summarizer: Mobile-first card layout redesign — clean sections, proper spacing, consistent button grid.',
      'File Summarizer: Quiz type/count selection uses chip buttons with neon glow for selected state.',
      'File Summarizer: Shows "Selected: Multiple Choice · 20 items" before starting quiz.',
      'Reviewer Page: Fixed blank screen — rendering always shows base UI immediately.',
      'Reviewer Page: Added search bar for filtering by title or contributor.',
      'Reviewer Page: Delete button shows only for note owner; admin (Marquillero) can delete any reviewer.',
      'Notepad Sharing: Fixed end-to-end — now correctly inserts into Supabase reviewers table with shared_at timestamp.',
      'Notepad Sharing: Shows specific error message if reviewers table is missing (migration not run).',
      'DB: Added migration 010_reviewers_table.sql with proper RLS policies for reviewer sharing.',
    ]
  },
  {
    version: '1.5.33',
    date: 'April 27, 2026',
    title: 'Notepad Sharing, Reviewer Feed, File Summarizer UI, & Quiz System Upgrade',
    summary: 'Added Notepad sharing to public Reviewer page, enhanced File Summarizer UI with light theme and animations, upgraded quiz system with type/count selection.',
    changes: [
      'Notepad: Added "Share to Reviewers" button to save notes to public Reviewer page via Supabase.',
      'Reviewer Page: Shows delete button for notes owned by current user — only owners can delete their shares.',
      'Reviewer Page: Fixed visibility with proper pageConfig; always renders UI (never blank).',
      'File Summarizer: Enhanced UI with light gradient background, subtle glow effects, and better spacing.',
      'File Summarizer: Added icons to each button (📋 📚 ⭐ 📖 ❓).',
      'File Summarizer: Upgraded Quiz system from single button to dropdown menu with type selection (Identification, Multiple Choice, Both).',
      'File Summarizer: Added item count selection for quizzes (10, 20, 30, 50 items).',
      'File Summarizer: Improved summary output container with scrolling and better padding.',
      'File Summarizer: Added loading animations and hover effects for better UX.',
      'Data Consistency: Notepad and Reviewer page now share the same Supabase backend for persistent, synced data across users.',
    ]
  },
  {
    version: '1.5.32',
    date: 'April 27, 2026',
    title: 'Notepad Save Fix & Reviewer Page Rendering Fix',
    summary: 'Fixed File Summarizer silently saving to wrong storage. Fixed Reviewer page black screen caused by missing background config.',
    changes: [
      'File Summarizer: Fixed fake "saved to Notepad" message — notes now actually save to localStorage (same storage Notepad page reads).',
      'File Summarizer: Added save verification — success message only shows after confirming the note exists in localStorage.',
      'File Summarizer: Added detailed logging for save attempts, userId, and success/failure.',
      'Reviewer Page: Fixed black screen bug — missing pageConfig.reviewers entry caused the background to never activate.',
      'Reviewer Page: Base UI now renders immediately before data loads, preventing blank screen during slow Supabase fetches.',
      'Reviewer Page: Added proper error handling — shows "Failed to load shared content" if fetch fails instead of blank screen.',
      'File Summarizer Page: Added pageConfig entry so it also gets the correct galaxy background.',
    ]
  },
  {
    version: '1.5.31',
    date: 'April 27, 2026',
    title: 'Intelligent AI Fallback System',
    summary: 'Upgraded File Summarizer with three-tier AI fallback: detects Gemini quota errors and intelligently switches to Groq Llama 3 8B, with local summarizer as final backup.',
    changes: [
      'File Summarizer: Implemented quota-aware AI provider switching — detects when Gemini hits quota and immediately uses Groq without retrying other Gemini models.',
      'AI Service: Added Groq Llama 3 8B (llama3-8b-8192) as primary fallback provider with full error handling.',
      'AI Service: Implemented local summarizer as final-tier fallback — extracts key sentences when all cloud AI providers fail.',
      'Security: GROQ_API_KEY remains backend-only; never exposed to frontend.',
      'Reliability: Three-tier cascade ensures summaries always generate, even during service outages or quota exhaustion.',
    ]
  },
  {
    version: '1.5.28',
    date: 'April 27, 2026',
    title: 'File Summarizer Deep Debug & Full Fix',
    summary: 'Fixed root cause of "Server error processing file" — AI summarize call was unguarded. Fully separated extraction and summarization error paths with granular logging.',
    changes: [
      'File Summarizer: Removed dangerous shared try/catch — extraction and AI summarization now have separate error handlers.',
      'File Summarizer: AI errors now return friendly message instead of generic server error.',
      'File Summarizer: Removed redundant express.json() from route middleware (already global).',
      'File Summarizer: Added comprehensive server-side logging: file name, size, MIME, buffer length, ext, parser used, char count.',
      'File Summarizer: Full error stack trace logged on parse failure for easier debugging.',
      'File Summarizer: Buffer existence check added before parsing — detects if multer failed to receive the file.',
    ]
  },
  {
    version: '1.5.27',
    date: 'April 27, 2026',
    title: 'File Summarizer Backend Fix & Logging',
    summary: 'Fixed missing parsing libraries, improved error messages, added .doc file support, and backend logging for uploads.',
    changes: [
      'File Summarizer: Fixed "Server missing parsing libraries" error — pdf-parse, mammoth, adm-zip now properly installed.',
      'File Summarizer: Added .doc (Office 97-2003) file support via mammoth parser.',
      'File Summarizer: Backend now logs file uploads with size, type, parser used, and success/failure results.',
      'File Summarizer: User-friendly error messages — removed technical "run npm install" errors.',
      'Backend: Improved error handling and parsing fallback for corrupted or empty files.',
      'File Summarizer: Clear message when .ppt (legacy PowerPoint) files are uploaded (only .pptx supported).'
    ]
  },
  {
    version: '1.5.26',
    date: 'April 27, 2026',
    title: 'File Summarizer Upload Fix & Cache Refresh',
    summary: 'Fixed the File Summarizer upload so files are shown immediately on selection. Removed Quick Play lobby section. Updated PWA cache.',
    changes: [
      'File Summarizer: Fixed upload — file name, size, and type now show instantly when selected (no blank screen).',
      'File Summarizer: Decoupled file selection from backend call — text extraction now happens only when a summarize button is clicked.',
      'File Summarizer: Added .doc and .ppt file support on top of .docx, .pptx, .pdf.',
      'Lobby: Removed redundant Quick Play Games section (dedicated Games page already exists).',
      'Cache/PWA: Updated service worker cache version to invalidate stale files for all users.',
    ]
  },
  {
    version: '1.5.25',
    date: 'April 27, 2026',
    title: 'Integrated Reviewers System & Notepad Sync',
    summary: 'A major upgrade to the File Summarizer and Notepad. You can now save summaries to a private cloud Notepad, share them to a public Reviewer feed, and view them in a beautiful bond-paper style.',
    changes: [
      'File Summarizer: Fixed file upload bug and added support for .doc and .ppt files.',
      'Notepad: Now syncs with Supabase. Private AI summaries are saved automatically to your account.',
      'Public Reviewers: New page to discover notes shared by other students.',
      'Viewer: Added a dedicated, aesthetic "bond-paper" viewer for reading summaries comfortably on any device.',
      'Security: Implemented Row Level Security (RLS) to ensure private notes remain private.',
      'Lobby: Removed redundant Quick Play Games section (dedicated Games page already exists).'
    ]
  },
  {
    version: '1.5.24',
    date: 'April 27, 2026',
    title: 'File Summarizer Feature Released',
    summary: 'Finished and stabilized the new File Summarizer page, securely connecting uploaded files to Gemini AI for powerful study note generation.',
    changes: [
      'File Summarizer: Users can now upload PDF, DOCX, and PPTX files directly into the app.',
      'File Summarizer: Secure backend extracts text and uses Gemini to generate summaries without leaking API keys.',
      'File Summarizer: Added buttons for Short Summary, Detailed Study Notes, Key Points, Terms, and Quiz generation.',
      'UI/UX: Fixed layout bugs to place the Summarizer neatly into the main content view, avoiding sidebar breakage.'
    ]
  },
  {
    version: '1.5.23',
    date: 'April 27, 2026',
    title: 'AST Math Engine & App Opens Tracking Fixed',
    summary: 'Calculator completely rebuilt with an Abstract Syntax Tree (AST) engine for native DOM nested fraction rendering. Fixed App Opens tracking duplication and stability.',
    changes: [
      'Calculator: Nested fraction system implemented natively. Fractions render vertically using dynamic DOM trees without plain text fallback.',
      'Calculator: Replaced string parsing with true AST tree-based cursor logic, allowing seamless navigation inside/outside nested fractions.',
      'Calculator: Editing safety applied — backspace now correctly navigates and deletes tree nodes without structure collapse.',
      'App Opens: Tracking fixed — strictly counts once per session, handles async fetch delays gracefully without showing "No opens" prematurely.',
      'App Opens: Duplicate UI removed — unified lobby layout strictly uses dashboard for global total, preserving clean design.',
      'Analytics: Fixed database write logic — automatically falls back from Supabase RPC to direct upsert to local storage gracefully.'
    ]
  },
  {
    version: '1.5.22',
    date: 'April 27, 2026',
    title: 'Nested Fractions & App Opens Analytics Fix',
    summary: 'Calculator now renders proper stacked vertical fractions (nested a/b). App Opens tally fixed with loading state, lobby preview panel, and debug logging.',
    changes: [
      'Calculator: Full nested fraction rendering engine — a/b buttons now produce proper \\frac{}{} LaTeX nodes, including fraction-over-fraction.',
      'Calculator: Tree-based expression parser (_parseNodes) handles unlimited nesting depth without string hacks.',
      'Calculator: Smart DEL key removes fraction separator cleanly; frac() key wraps trailing numbers as numerators.',
      'App Opens: Added loading state before data appears in lobby panel.',
      'App Opens: Added dedicated lobby preview panel showing top 5 users directly on the Lobby page.',
      'App Opens: Added console logs for recording, skipping, and fallback states for easy debugging.',
      'App Opens: Null/empty fallback displays informative message instead of blank panel.',
      'Lobby: New App Opens board section visible directly on lobby page without opening a modal.'
    ]
  },
  {
    version: '1.5.21',
    date: 'April 27, 2026',
    title: 'Major AI, UI & Analytics Update',
    summary: 'Smarter Battle Royale bots, polished character models, accurate App Opens tracking, and a brand new Lobby Quick Play menu.',
    changes: [
      'Battle Royale: Bots now intelligently navigate into the safe zone, avoiding obstacles and boundaries rather than getting stuck.',
      'Battle Royale: Upgraded player and bot models with dynamic body animations, deep shadows, and better clothing rendering.',
      'System: Completely overhauled App Opens tracking using secure session storage, preventing duplicate counts on page refreshes or hot reloads.',
      'Lobby: Added new Quick Play Game Cards with premium styling and hover animations for instant access to your favorite games.',
      'System: General bug fixes and stability improvements across multiple modules.'
    ]
  },
  {
    version: '1.5.20',
    date: 'April 27, 2026',
    title: 'Battle Royale Bugfix & UI Cleanup',
    summary: 'Removed debug logs, fixed rare freeze bug, and cleaned up UI and bot logic for a smoother Royale experience.',
    changes: [
      'Royale: Removed all debug/test console logs and info output from production.',
      'Royale: Fixed rare freeze bug caused by undefined bloodSkinColor during damage hitmarker destructuring.',
      'Royale: Cleaned up UI logic and ensured weapon/kill feed panels only show in correct phases.',
      'Royale: Fixed any mojibake/corrupted text artifacts in UI and comments.',
      'Royale: Updated version and cache for all clients.'
    ]
  },
  {
    version: '1.5.19',
    date: 'April 27, 2026',
    title: 'Battle Royale Code Cleanup & UI Restoration',
    summary: 'Resolved underlying file encoding issues that caused corrupted text characters in comments and UI elements across the Battle Royale module.',
    changes: [
      'Battle Royale: Cleaned corrupted encoding artifacts (mojibake) from source code comments and section headers.',
      'Battle Royale: Restored native UI emoji strings for kill feed, weapon icons, locker buttons, and game notifications that were previously rendering as unreadable characters.',
      'Battle Royale: Verified and fixed syntax structures within the system update logs and styling sheets.',
    ]
  },
  {
    version: '1.5.17',
    date: 'April 27, 2026',
    title: 'Battle Royale Bug Fixes — Movement & UI',
    summary: 'Fixed weapon panel blocking joystick movement, rogue UI text during loading, and falling crate rendering in wrong position.',
    changes: [
      'Battle Royale: Fixed weapon inventory panel intercepting joystick touch events — panel now has pointer-events:none on container.',
      'Battle Royale: Weapon panel now only renders during the "playing" phase — no more "No weapons" text during loading or skin select.',
      'Battle Royale: Moved weapon panel to top-center to avoid all bottom joystick and fire button conflicts.',
      'Battle Royale: Fixed falling special crates rendering at wrong screen position (was applying camera offset twice).',
      'Battle Royale: Fixed canvas textAlign not being reset after special crate marker, which caused misaligned text elsewhere.',
      'Battle Royale: Crate countdown badge now hides correctly during non-playing phases.',
    ]
  },
  {
    version: '1.5.16',
    date: 'April 27, 2026',
    title: 'Battle Royale CSS — Weapon Panel & Crate Badge',
    summary: 'Added styled CSS for weapon inventory panel, special crate countdown badge, and blood skin modal.',
    changes: [
      'Battle Royale: Added CSS for #rl-weapon-panel with glassmorphic slot buttons and fade-in animation.',
      'Battle Royale: Added #rl-crate-badge — pulsing gold countdown badge (flashes orange under 15s).',
      'Battle Royale: Added blood skin modal drop-bounce entrance animation.',
      'Battle Royale: Added Blood button (top-right HUD) to open blood skin picker in-game.',
      'Battle Royale: Weapon panel and badge properly hidden on end screen and portrait-blocked states.',
    ]
  },
  {
    version: '1.5.15',
    date: 'April 27, 2026',
    title: 'Battle Royale Map Expansion, Loot Balancing & Footsteps',
    summary: 'New map areas (bridge, watchtower, warehouse, small houses), more medkits, and surface-aware footstep audio.',
    changes: [
      'Battle Royale: Added walkable wooden bridge over the river (tiles 34-46, ty=71) with plank visuals and rail posts.',
      'Battle Royale: Added Watchtower (NE corner) with support legs, ladder, and WATCHTOWER HUD label.',
      'Battle Royale: Added Warehouse (west side) — large mid-tier loot building with shelf/crate cover objects.',
      'Battle Royale: Added two new small houses for additional low-tier loot spots.',
      'Battle Royale: Terrain cover doubled — boulders/rocks increased from 18 to 43 for more strategic positions.',
      'Battle Royale: Medkit spawn rate tripled in SUPPLY_POOL (3x weight). Supply rate raised: indoors 28%→42%, outdoors 25%→38%.',
      'Battle Royale: Footstep audio wired to player movement — fires every 0.38s (stand), 0.45s (crouch), 0.55s (prone).',
      'Battle Royale: Footstep surface detection — grass (soft), road/floor (concrete click), water/sand (splash).',
    ]
  },
  {
    version: '1.5.14',
    date: 'April 27, 2026',
    title: 'Battle Royale — Audio, Special Crates & Weapon Inventory',
    summary: 'Full audio system, 90-second special crate airdrops with exclusive weapons, and a visual weapon inventory panel.',
    changes: [
      'Battle Royale: Added royaleAudio — Web Audio API procedural sounds with spatial (distance-based) volume.',
      'Battle Royale: Unique gunshot sounds per weapon type (AR, shotgun, sniper, gatling, rocket, etc.).',
      'Battle Royale: Reload, heal, pickup, and special crate alert sounds added.',
      'Battle Royale: Added Gatling Gun (dmg:22, rof:80, 100 rounds) — crate-exclusive weapon.',
      'Battle Royale: Added Rocket Launcher (dmg:280, rof:4000) — crate-exclusive weapon.',
      'Battle Royale: Special Crate spawns every 90 seconds — falls from sky with altitude display, smoke trail, and gold beam on landing.',
      'Battle Royale: Special crates contain exclusive weapons, heavy armor, sniper, or medkits.',
      'Battle Royale: Weapon inventory panel shows all carried weapons with active slot highlighting and RARE badges.',
      'Battle Royale: Blood Effect Skins — 4 variants (Red, Dark Red, Neon, Black) via openBloodSkinMenu().',
      'Battle Royale: Blood splatter particle count increased from 12 to 18 for more impact.',
    ]
  },
  {
    version: '1.5.13',
    date: 'April 27, 2026',
    title: 'Candy Match — Special Candy Fixes & Neon Visuals',
    summary: 'Special candies now match correctly with same-type gems, and all special candy visuals have been overhauled with neon glow rings and particle bursts.',
    changes: [
      'Candy Match: Fixed special candy matching — normalType() helper ensures specials match both normal and other specials of the same color.',
      'Candy Match: Color Clear candy now correctly clears all gems of the matched type.',
      'Candy Match: Added spawnCandyParticles() — particle burst fires at every special candy activation.',
      'Candy Match: Special candy visuals overhauled — pulsing neon border rings, large centered badge emojis, boosted drop-shadow glow.',
      'Candy Match: Board Wipe candy gains a rotating sparkle ring animation.',
      'Candy Match: Beam intensity increased for Row/Column Clear animations.',
      'Candy Match: Special candy spawn rate raised from 7% to 9%.',
      'Candy Match: Fixed lollipop stick rendering — no longer shows on specials that display as type 1.',
    ]
  },
  {
    version: '1.5.11',
    date: 'April 26, 2026',
    title: 'Special Candies, Audio Manager & Royale AI Overhaul',
    summary: 'Candy Match gains four special candy types with procedural audio and animations. Battle Royale bots now have a three-tier difficulty system with improved visual clarity.',
    changes: [
      'Candy Match: Added Row Clear candy — clears entire row with horizontal beam animation and whoosh audio.',
      'Candy Match: Added Column Clear candy — clears entire column with vertical beam animation and strike audio.',
      'Candy Match: Added Color Clear candy — clears all matching candy types with electric chain glow effect.',
      'Candy Match: Added Board Wipe candy — clears the entire board with ripple blast animation and explosion audio.',
      'Candy Match: Special candies spawn at ~7% probability per new gem, with weighted rarity (row/col most common, board rarest).',
      'Candy Match: Special candies display a glowing pulsing badge icon and colored border ring on the cell.',
      'Candy Match: Centralized Web Audio API manager — unique procedurally generated sounds for swap, pop (x4 combo tiers), drop, row clear, column clear, color clear, board wipe, level complete, and level fail.',
      'Candy Match: Audio manager uses polyphony limits, per-key cooldowns, and priority queuing to prevent audio clutter.',
      'Candy Match: Audio context auto-unlocked on first user gesture for iOS Safari compatibility.',
      'Battle Royale: Bots now roll into one of three tiers: Rookie (55%), Veteran (33%), Elite (12%).',
      'Battle Royale: Each tier has unique HP, detect range, accuracy, reaction delay, and fire rate multiplier.',
      'Battle Royale: Elite bots have 115 HP, tighter accuracy (0.14 spread), fast 550ms reaction, and 380px detect range.',
      'Battle Royale: Rookie bots are more forgiving — 85 HP, wider 0.34 accuracy spread, 1100ms reaction delay.',
      'Battle Royale: Bot weapon pool expanded to include battle rifle and sniper for weapon variety.',
      'Battle Royale: Bot name labels now appear above HP bars, color-coded by tier (orange=rookie, yellow=veteran, lime=elite).',
      'Battle Royale: Elite bots have a subtle canvas shadow glow for immediate visual threat identification.',
      'Battle Royale: HP bars now use color (green/yellow/red) based on remaining health percentage.',
      'Battle Royale: Building outer walls enhanced with double-stroke 3D depth, corner accents, and gradient door portals.',
      'Service Worker: Cache bumped to v1.5.11 to propagate all updates to PWA/iOS clients.',
    ]
  },
  {
    version: '1.5.12',
    date: 'April 26, 2026',
    title: 'Users Page: Admin Delete Fix & Profile Scroll Fix',
    summary: 'Admin can now properly delete users from the profile panel. Opening a profile no longer requires scrolling up to find it.',
    changes: [
      'Users page: Fixed "Delete User" button in profile view — it now correctly triggers the admin delete flow (was calling an undefined function).',
      'Users page: After a successful delete, the deleted user is immediately removed from the local list and the grid re-renders without a page reload.',
      'Users page: After a successful delete, the profile panel closes automatically.',
      'Users page: Opening a user profile now auto-scrolls the page to the top so the fixed profile panel is always visible, regardless of scroll position.',
      'Users page: Admin delete confirmation dialog now uses a red confirm button ("Yes, Delete") to make the destructive action clearer.',
    ]
  },
  {
    version: '1.5.10',
    date: 'April 26, 2026',
    title: 'Candy Match Core Refactor',
    summary: 'Candy Match now runs with five polished candy types, improved 3D board visuals, and intact matching, cascading, and scoring logic.',
    changes: [
      'Reduced Candy Match from six to five candy types while preserving board generation, swap, match, refill, and scoring behavior.',
      'Reworked candy visuals into five distinct designs with layered gradients, highlights, depth shading, and refined shapes.',
      'Locked game levels to a steady 5 candy types for cleaner progression and easier future feature expansion.',
      'Kept the shop and audio systems untouched, focusing only on core gameplay and visuals.',
    ]
  },
  {
    version: '1.5.9',
    date: 'April 26, 2026',
    title: 'iOS Safari Sidebar Menu Fix',
    summary: 'Fixed sidebar menu buttons not responding to taps on iPhone/iOS Safari. All nav items now work reliably with touch, mouse, and keyboard.',
    changes: [
      'Sidebar: Replaced inline onclick attributes with event delegation for iOS Safari compatibility.',
      'Sidebar: Added role="button" and tabindex="0" to all nav items for proper interactive semantics.',
      'Sidebar: Added touch-action: manipulation to eliminate 300ms iOS tap delay on all menu items.',
      'Sidebar: Fixed ::after pseudo-element z-index that could intercept taps on some iOS versions.',
      'Sidebar: Added -webkit-backdrop-filter, -webkit-overflow-scrolling, and 100dvh for Safari support.',
      'Sidebar: Added keyboard navigation (Enter/Space) for accessibility.',
      'Sidebar: Added focus-visible outline styles for keyboard users.',
      'Overlay: Moved close handler from inline onclick to addEventListener for iOS reliability.'
    ]
  },
  {
    version: '1.5.8',
    date: 'April 26, 2026',
    title: 'KaTeX Math Display for Calculator',
    summary: 'The scientific calculator now renders expressions as formatted math using KaTeX. Fractions display vertically, exponents render as superscripts, and square roots show the radical symbol — all in real time as you type.',
    changes: [
      'Calculator: Integrated KaTeX library for real-time LaTeX math rendering in the expression display.',
      'Calculator: Fractions entered as (a)÷(b) now render vertically as proper fractions (\\frac{a}{b}).',
      'Calculator: Exponents render as true superscripts (x^2 → x²) including nested powers.',
      'Calculator: sqrt(), cbrt(), nthrt() render with proper radical symbols (√, ∛, ⁿ√).',
      'Calculator: fact(n) renders as (n)! notation.',
      'Calculator: Trig functions (sin, cos, tan, arcsin, arccos, arctan) and log/ln use LaTeX formatting.',
      'Calculator: Constants π and Ans render in proper math notation.',
      'Calculator: Scientific notation (e.g. 1.23e+8) renders as 1.23×10⁸.',
      'Calculator: Graceful fallback to plain text if KaTeX cannot parse a partially-typed expression.',
      'Calculator: KaTeX output inherits the neon-green glow theme of the display.',
      'Calculator: Calculation logic is unchanged — only the display layer was updated.'
    ]
  },
  {
    version: '1.5.7',
    date: 'April 26, 2026',
    title: 'Announcement Cleanup + Admin Delete',
    summary: 'Alarms no longer post to the shared Announcement feed (they are personal). Admins can now delete any announcement with a Delete button on each card.',
    changes: [
      'Alarm Clock: Removed addToAnnouncements() call — alarm triggers are private and should not appear in the shared feed.',
      'Announcements: Admin-only Delete button now appears on each announcement card.',
      'Announcements: deleteSharedAnnouncement() removes the entry from shared_announcements with a confirm prompt.'
    ]
  },
  {
    version: '1.5.6',
    date: 'April 26, 2026',
    title: 'Persistent Alarm Overlay + Push Notification Improvements',
    summary: 'Alarms now show a fullscreen overlay with a looping sound for 30 seconds, Dismiss and Snooze (5 min) buttons. Push notifications stay on screen until dismissed, vibrate strongly, and deliver the alarm sound when tapped.',
    changes: [
      'Alarm Clock: Replaced one-shot alert with a fullscreen pulsing overlay when any alarm fires.',
      'Alarm Clock: Alarm sound loops every 2 seconds for up to 30 seconds with countdown timer.',
      'Alarm Clock: Dismiss button stops the alarm immediately. Snooze button re-triggers in 5 minutes.',
      'Alarm Clock: Overlay auto-dismisses after 30 seconds if ignored.',
      'Alarm Clock: Tapping the overlay resumes the audio context (fixes silent-on-open issue after notification click).',
      'Push Notifications: requireInteraction=true keeps alarm notification on screen until the user acts.',
      'Push Notifications: Added Dismiss and Snooze actions directly on the notification banner.',
      'Push Notifications: Strong vibration pattern added to alarm push notifications.',
      'Push Notifications: Tapping the notification opens the app and immediately shows the alarm overlay with correct sound.',
      'Service worker: Snooze/dismiss actions relayed to open app clients via postMessage.',
      'Note: If the phone is on silent/DND mode, the system notification sound will not play — this is an OS-level restriction.'
    ]
  },
  {
    version: '1.5.5',
    date: 'April 26, 2026',
    title: 'Background Alarm Push Subscription',
    summary: 'Alarm Clock now automatically registers your device for background Web Push notifications. When you grant notification permission, your push subscription is saved to the server so alarms can fire even when the app is closed.',
    changes: [
      'Alarm Clock: subscribePush() auto-runs on init if notification permission is already granted.',
      'Alarm Clock: subscribePush() also runs after the user taps Allow Notifications and grants permission.',
      'Alarm Clock: Push subscription is saved to alarm_push_subscriptions in Supabase (upserted by endpoint to prevent duplicates).',
      'Alarm Clock: Logs subscription status to console for debugging.',
      'Service worker cache bumped to v1.5.4-20260426-push-sub.'
    ]
  },
  {
    version: '1.5.4',
    date: 'April 25, 2026',
    title: 'Background Push Notifications for Alarms',
    summary: 'Alarms can now fire Web Push notifications even when the app is closed. A new Supabase Edge Function (check-alarms) handles server-side push delivery using RFC 8291/8292 encryption built entirely on the Web Crypto API.',
    changes: [
      'New Edge Function check-alarms: sends Web Push notifications for alarms that are due, callable from an external scheduler.',
      'Push payloads include alarm title, body, alarmId, and soundId so the service worker can play the right sound.',
      'Subscriptions that return HTTP 410/404 (expired or removed) are automatically cleaned up via delete_alarm_subscription.',
      'Each processed alarm is marked triggered via alarm_mark_triggered after pushes are sent.',
      'Auth protected with ALARM_CHECK_SECRET bearer token — only authorised schedulers can trigger the function.',
      'No external Web Push library used — encryption (aes128gcm) and VAPID JWT (ES256) implemented natively with Web Crypto API to avoid Deno compatibility issues.',
      'Detailed console logs added throughout the function for easy debugging in Supabase Edge Function logs.',
      'Returns JSON summary { processed, sent, failed } on every run.'
    ]
  },
  {
    version: '1.5.3',
    date: 'April 25, 2026',
    title: 'Alarm Sounds, Calculator Upgrade & Personalization Revamp',
    summary: 'Major upgrade to Personal Tools: 20 selectable alarm sounds generated via Web Audio API, vibration support, system notifications, a full Casio-style scientific calculator, and a new page-by-page personalization UI replacing the endless scroll.',
    changes: [
      'Alarm Clock: Added 20 unique sounds generated with Web Audio API (Classic Beep, Rising Tone, Siren, Chime, School Bell, Fanfare, Cuckoo, Melody, and more).',
      'Alarm Clock: Added sound preview button per alarm and per sound selector.',
      'Alarm Clock: Added Vibration API support — alarm triggers phone vibration pattern if supported.',
      'Alarm Clock: Added Notification API integration — system notification shown when alarm fires; uses Service Worker showNotification for better PWA reliability.',
      'Alarm Clock: Added notification permission banner with status (granted/denied/blocked) and Request button.',
      'Alarm Clock: Alarm sound persists with each alarm and shows the selected sound name on the alarm list.',
      'Personalization: Replaced endless single-page scroll with a page-selection grid — choose a page first, then see only its backgrounds.',
      'Personalization: Added back button to return from page editor to page selector.',
      'Personalization: Green dot indicator on page cards that already have a custom background assigned.',
      'Personalization: Upgraded all 10 coded backgrounds with richer neon gradients, aurora, glass/futuristic, and calm study themes.',
      'Scientific Calculator: Full Casio-inspired layout with 9-row keypad (5 columns each).',
      'Scientific Calculator: Multi-line display — expression line (green) and live result line (cyan) update simultaneously.',
      'Scientific Calculator: Added sin⁻¹, cos⁻¹, tan⁻¹ (inverse trig), cbrt (cube root), nthrt (nth root), log₂.',
      'Scientific Calculator: Added factorial n!, EXP (scientific notation input), % (percent), a/b (parenthesis helper for fractions).',
      'Scientific Calculator: Added Ans (previous answer), M+ / MR / MC memory registers.',
      'Scientific Calculator: Added DEG/RAD mode toggle with live indicator on display.',
      'Scientific Calculator: Live result preview updates as you type; chained operations continue from Ans.',
      'Notes: Notepad confirmed persisting correctly with localStorage — no data loss on refresh/close.'
    ]
  },
  {
    version: '1.5.2',
    date: 'April 24, 2026',
    title: 'Profile Pictures',
    summary: 'Users can now upload a profile picture that appears across the app — on their profile card, profile view, chat sidebar, and next to files they uploaded.',
    changes: [
      'Added profile picture upload in Edit Profile with live preview and remove-photo option.',
      'Profile view modal now shows a large avatar at the top.',
      'Users page cards and chat sidebar now display the user\'s photo instead of initials only.',
      'Initials badge is shown as a fallback when no photo has been set.',
      'File rows now show a tiny avatar chip next to the uploader name.'
    ]
  },
  {
    version: '1.5.1',
    date: 'April 23, 2026',
    title: 'Persistent Presence and Last Seen',
    summary: 'Online status now combines live Supabase Presence with saved last-seen timestamps, so offline users can show Messenger-style activity text.',
    changes: [
      'Added live presence labels such as Online now, Active 5 minutes ago, and Active yesterday.',
      'Added heartbeat updates while the PWA is open and visibility-aware last-seen updates when the app is backgrounded or closed.',
      'Added realtime profile refresh so Users and chat status labels stay synced across devices.',
      'Updated the Supabase schema script with the last_seen_at column needed for persistent activity history.'
    ]
  },
  {
    version: '1.5.0',
    date: 'April 23, 2026',
    title: 'Coded Backgrounds and Live Presence',
    summary: 'Replaced unreliable online background references with local CSS-designed backgrounds, cleaned Lobby duplicate controls, and made online status use live presence instead of stale saved flags.',
    changes: [
      'Added 50 handcrafted CSS still backgrounds and 25 animated CSS backgrounds, including several Information Technology themed designs.',
      'Removed unreliable online image background presets so the picker works without remote image loading.',
      'Removed duplicate Lobby tally buttons and kept the cleaner dashboard cards.',
      'Updated Users and chat online badges to use Supabase Presence so users only show online while actively connected.'
    ]
  },
  {
    version: '1.4.9',
    date: 'April 23, 2026',
    title: 'UI Polish and Background Picker',
    summary: 'Added a cleaner Lobby dashboard, searchable Users and Announcement views, and an in-app background picker with online references plus animated live presets.',
    changes: [
      'Added 150 online background reference choices grouped by theme, including anime-inspired, Pokemon-inspired, Naruto-inspired, movie-style, nature, city, space, gaming, and classroom sets.',
      'Added 25 animated live background presets that can be selected without uploading a file.',
      'Improved Lobby summary cards for app opens, contributions, and update access.',
      'Added search and filter controls for Users and ANNOUNCEMENT so large class data stays easier to scan.'
    ]
  },
  {
    version: '1.4.8',
    date: 'April 23, 2026',
    title: 'Maintenance Branch Diagnostics and Users Grid',
    summary: 'Added a safe diagnostics page, denser Users cards, a project check script, and lighter PWA icon assets on a separate maintenance branch.',
    changes: [
      'Added an in-app Diagnostics page for app version, cache version, Java runner, R2 configuration, push status, static assets, and local data counts.',
      'Made the Users page show three to four compact profile cards per row on wider screens, with two per row on small phones.',
      'Added an npm check script for syntax checks across the main server, app script, Code Lab, Coding Lessons, and game modules.',
      'Prepared this work on a separate branch so main remains available as the stable fallback.'
    ]
  },
  {
    version: '1.4.7',
    date: 'April 23, 2026',
    title: 'Battle Royale Heal and Parachute Controls',
    summary: 'Battle Royale medkits now heal correctly, a Heal count button was added beside weapon switching, held fire follows facing better, and parachute drops can be steered or shortened.',
    changes: [
      'Added a left-side Heal button with live medkit count beside the Switch Weapon control.',
      'Fixed medkit use so one kit is consumed, HP increases, and health never exceeds the max HP.',
      'Improved held Fire aiming so sustained shots follow the player facing direction instead of sticking to an old angle.',
      'Added an early parachute drop control and joystick steering during the parachute phase without changing the map or existing action cluster.'
    ]
  },
  {
    version: '1.4.6',
    date: 'April 23, 2026',
    title: 'Coding Lessons Workspace and Example Cleanup',
    summary: 'CODING LESSONS now renders one final workspace per lesson and uses less repetitive worked examples across modules.',
    changes: [
      'Removed duplicate editable workspaces from lesson examples.',
      'Moved Run, Copy, Reset controls into a single final workspace per lesson.',
      'Reduced repeated concept/example/result cards by simplifying breakdown rendering.',
      'Expanded non-web examples into distinct scenarios for security, networking, APIs, cloud, testing, Git, and similar modules.'
    ]
  },
  {
    version: '1.4.5',
    date: 'April 23, 2026',
    title: 'Battle Royale Ammo and Weapon Switch HUD',
    summary: 'Battle Royale now shows ammo above HP/Armor and adds a left-side Switch Weapon control without moving the existing landscape HUD.',
    changes: [
      'Added a readable ammo display directly above the existing HP and armor bars.',
      'Added a left-side Switch Weapon button that cycles between carried weapons.',
      'Kept the existing Fire, Reload, Crouch, Jump, Grenade, minimap, Games, and end-screen placements unchanged.'
    ]
  },
  {
    version: '1.4.4',
    date: 'April 23, 2026',
    title: 'Battle Royale Auto Landscape Shell',
    summary: 'Battle Royale now opens in an in-app horizontal layout even when the phone browser does not report rotation correctly, and leaving the match restores the normal app view.',
    changes: [
      'Removed the blocking rotate prompt from Battle Royale gameplay.',
      'Added an automatic rotated landscape shell for portrait phones so the game still plays horizontally.',
      'Mapped touch and click coordinates correctly inside the rotated shell for skin selection, aiming, and throw targeting.',
      'Cleaned up the landscape class on exit so Quit returns to the regular Games page layout.'
    ]
  },
  {
    version: '1.4.3',
    date: 'April 23, 2026',
    title: 'Battle Royale Landscape Controls Reliability',
    summary: 'Battle Royale action buttons are now anchored as a true bottom-right landscape thumb cluster, and end-screen actions have stronger touch handling.',
    changes: [
      'Rebuilt the Royale action controls into a bottom-right landscape grid with Fire as the largest lower-right button.',
      'Hardened Play Again and Quit with pointer, touch, and click handlers so Android taps are not swallowed by the canvas.',
      'Dimmed gameplay controls while the match-end actions are visible to avoid blocked or conflicting input.',
      'Bumped Royale and service-worker asset versions so devices fetch the corrected HUD layout.'
    ]
  },
  {
    version: '1.4.2',
    date: 'April 23, 2026',
    title: 'Battle Royale True Landscape Gate',
    summary: 'Battle Royale no longer runs as portrait disguised as landscape; portrait now shows a rotate prompt and gameplay uses native landscape coordinates only.',
    changes: [
      'Removed portrait canvas width/height swapping from Battle Royale gameplay.',
      'Removed rotated skin-select rendering in portrait.',
      'Removed portrait touch-coordinate remapping for Royale controls and throw aiming.',
      'Blocked combat controls under the rotate prompt until the device is actually landscape.',
      'Bumped Royale asset cache versions so deployed devices load the corrected landscape behavior.'
    ]
  },
  {
    version: '1.4.1',
    date: 'April 23, 2026',
    title: 'Code Lab Daily Tasks and Game HUD Fixes',
    summary: 'Daily Code Lab challenges now get unique per-day task IDs, app-open tallies sync through Supabase when available, and game controls were cleaned up.',
    changes: [
      'Made Code Lab daily challenge IDs unique per date and environment so old day tasks do not reappear as the same challenge later.',
      'Fixed Code Lab solved-today checks so Web and Java daily challenges can each award independently.',
      'Added Supabase-backed app-open tally functions and realtime refresh support with a localStorage fallback.',
      'Moved Battle Royale action controls into a strict bottom-right cluster with the fire button at thumb level.',
      'Raised Pac-Man portrait D-pad controls for easier Android tapping.'
    ]
  },
  {
    version: '1.4.0',
    date: 'April 23, 2026',
    title: 'Coding Lessons Textbook Expansion',
    summary: 'CODING LESSONS now uses domain-specific chapters and less repetitive teaching sections across every major module.',
    changes: [
      'Replaced artificial Meaning, Vocabulary, Syntax, Example Reading, and Guided Mini Task chapter patterns.',
      'Added specialized chapter plans for Programming Languages, Front End, Back End, Databases, Deployment, Git, Cybersecurity, Networking, Linux, APIs, Mobile, UI/UX, Software Engineering, Cloud, Testing, and DSA.',
      'Changed repeated lesson labels from Output/result to clearer check-based wording.',
      'Improved generated lesson summaries, terms, explanations, key points, exercises, and recaps so they match each module type.',
      'Kept pagination and live examples intact while improving the lesson library structure.'
    ]
  },
  {
    version: '1.3.9',
    date: 'April 23, 2026',
    title: 'Coding Lessons Duplicate Cleanup',
    summary: 'CODING LESSONS received a full-library duplicate audit and cleanup so nearby chapters and individual lessons no longer repeat the same example output.',
    changes: [
      'Checked every Coding Lessons subfolder, including Cybersecurity, GitHub, Linux, APIs, cloud, SQL, Java, Python, and web lessons.',
      'Removed duplicate example outputs inside non-web lessons.',
      'Separated Git/GitHub examples into distinct status, add, commit, push, and pull command results.',
      'Separated Linux examples into distinct pwd, ls, mkdir, chmod, and cd result patterns.',
      'Verified every lesson still has at least three examples with no duplicate code, title, or output inside the same lesson.'
    ]
  },
  {
    version: '1.3.8',
    date: 'April 23, 2026',
    title: 'Coding Lessons Library Polish',
    summary: 'CODING LESSONS now has a stronger anti-repetition pass, more varied console examples, and cleaner lesson outputs across web, SQL, terminal, Java, and Python topics.',
    changes: [
      'Added a library polish pass that prevents adjacent web lessons from using the same visual demo set.',
      'Expanded Java and Python lessons with varied console patterns for text, numbers, booleans, loops, and calculations.',
      'Expanded SQL lesson examples with row, filtered, count, alias, and ordered result table patterns.',
      'Improved terminal-style lesson examples for Git, Linux, cloud, API, and other non-visual topics.',
      'Added deeper search keywords from examples, outputs, demo models, and lesson text.'
    ]
  },
  {
    version: '1.3.7',
    date: 'April 23, 2026',
    title: 'Battle Royale Tactical HUD Fix',
    summary: 'Battle Royale now uses the restored tactical landscape camera, a clean bottom-right action cluster, jumpable cover obstacles, and stronger crouch cover behavior.',
    changes: [
      'Restored the main tactical gameplay camera and removed the first-person POV render path.',
      'Moved FIRE, RELOAD, CROUCH, JUMP, and throwable controls into a thumb-friendly bottom-right cluster.',
      'Removed center/right weapon-slot display and old visible aim joystick elements from gameplay.',
      'Added jumpable barriers and solid obstacles with collision rules for player and bot movement.',
      'Made crouch reduce the player hitbox, improve recoil control, and hide better behind tactical cover.'
    ]
  },
  {
    version: '1.3.6',
    date: 'April 23, 2026',
    title: 'Coding Lessons Workspace Output Fix',
    summary: 'CODING LESSONS now uses language-specific editable workspaces so Java and Python show console output, SQL shows result tables, and web lessons keep real browser previews.',
    changes: [
      'Added reusable visual, console, table, and error output panels for lesson examples.',
      'Changed Java and Python examples to beginner console labs instead of webpage previews.',
      'Changed SQL examples to mock result tables that update from the current query.',
      'Made Run, Reset, and Copy operate on the current editable workspace code.',
      'Added beginner-safe Java, Python, SQL, and terminal simulation for lesson practice output.'
    ]
  },
  {
    version: '1.3.5',
    date: 'April 23, 2026',
    title: 'Coding Lessons Live Preview Fix',
    summary: 'CODING LESSONS examples now use varied real interface demos and the editable preview re-renders from the current code instead of stale template markup.',
    changes: [
      'Replaced repeated Box 1/Box 2/Box 3 previews with varied navbar, form, alert, card, gallery, table, hero, profile, menu, dashboard, banner, product, and article demos.',
      'Made live previews rebuild from the current textarea content on every edit, so CSS, HTML, and JavaScript changes appear immediately.',
      'Added Reset Code, Run Again, and Copy Example controls for each editable lesson example.',
      'Kept original examples as lesson references while separating the editable workspace preview state.',
      'Added chapter-level demo rotation so adjacent lessons do not reuse the same preview model.'
    ]
  },
  {
    version: '1.3.4',
    date: 'April 23, 2026',
    title: 'Interactive Coding Lessons',
    summary: 'CODING LESSONS now includes editable examples, live sandbox previews, before/after visual comparisons, auto-check mini tasks, and deeper explanations.',
    changes: [
      'Added live preview boxes for lesson examples with sandboxed iframe rendering.',
      'Made examples editable so students can change code and see the preview update immediately.',
      'Added CSS before/after comparisons for visual topics.',
      'Added guided mini tasks with auto-check feedback.',
      'Expanded lessons with clearer explanations, why-this-works toggles, unique examples, and output explanations.'
    ]
  },
  {
    version: '1.3.3',
    date: 'April 23, 2026',
    title: 'Coding Lessons Library Expansion',
    summary: 'CODING LESSONS now enforces deeper textbook coverage with 10+ chapters and 50+ lessons for major modules, richer lesson sections, and deep keyword search.',
    changes: [
      'Expanded every Coding Lessons subfolder into at least 10 chapters with at least 5 lessons per chapter.',
      'Added rich lesson fields for overview, terms, detailed explanation, breakdowns, syntax, examples, outputs, mistakes, recaps, and sources.',
      'Added specific coverage for Java operators, CSS properties, HTML attributes, SQL keys, Git, cybersecurity, networking, APIs, Linux, and cloud topics.',
      'Expanded search indexing to include explanation text, examples, outputs, operators, CSS properties, HTML attributes, and technical keywords.',
      'Kept lesson pagination at 5 visible lessons per page for mobile performance.'
    ]
  },
  {
    version: '1.3.2',
    date: 'April 23, 2026',
    title: 'Battle Royale Controls Cleanup',
    summary: 'Battle Royale now has easier beginner bots, one clean end-screen button set, lower-right combat controls, and hold-drag-release throwable aiming.',
    changes: [
      'Reduced bot aim accuracy, reaction speed, chase pressure, and firing frequency for an easier match.',
      'Removed the unused POV button and old view-switching code.',
      'Removed duplicate canvas-drawn Play Again and Quit buttons so only the working landscape end controls remain.',
      'Removed the extra right-side weapon image from the first-person overlay.',
      'Moved combat buttons into a lower-right landscape cluster and improved throwable target aiming.'
    ]
  },
  {
    version: '1.3.1',
    date: 'April 23, 2026',
    title: 'Coding Lessons Textbook Upgrade',
    summary: 'CODING LESSONS now uses book-style chapters, paginated lesson batches, progress tracking, bookmarks, Continue Learning, quizzes, and copyable code blocks.',
    changes: [
      'Changed lesson data to category → subfolder → chapters → lessons.',
      'Added chapter lesson pagination with Previous 5 and Next 5 controls.',
      'Added local progress tracking, chapter/subfolder completion percentages, and Mark as Completed.',
      'Added Continue Learning and Bookmarked Lessons using localStorage.',
      'Added per-chapter multiple-choice quizzes and copy buttons for lesson code examples.'
    ]
  },
  {
    version: '1.3.0',
    date: 'April 23, 2026',
    title: 'Coding Lessons',
    summary: 'Added a new in-app CODING LESSONS feature with local beginner lessons, glass cards, breadcrumbs, and search.',
    changes: [
      'Added CODING LESSONS below CODE LAB in the sidebar.',
      'Created local structured lesson data for programming, web, databases, deployment, Git, cybersecurity, networking, Linux, APIs, mobile, UI/UX, cloud, testing, and DSA.',
      'Preloaded detailed beginner lessons for Java, HTML, CSS, JavaScript, Python, Git Basics, Cybersecurity Basics, and SQL Basics.',
      'Added in-app lesson rendering with summaries, key points, code examples, recaps, and source attribution.',
      'Added glassmorphism folder cards with remote background images and a local fallback image.'
    ]
  },
  {
    version: '1.2.9',
    date: 'April 23, 2026',
    title: 'Pac-Man Controls and Royale Bullet Safety',
    summary: 'Pac-Man restart/death handling was tightened, the D-pad is now a true 3x3 cross, and Battle Royale bullets now reject shooter self-hits.',
    changes: [
      'Rebuilt Pac-Man state handling around idle, playing, and gameOver so death stops all updates until Start resets the game.',
      'Changed Pac-Man controls to a centered 3x3 D-pad grid with instant pointer input and no diagonal/double direction state.',
      'Added Battle Royale bullet shooter metadata, muzzle spawn offsets, and bullet target validation.',
      'Blocked bot bullet self-damage and bot friendly bullet damage when friendly fire is off.',
      'Expanded Royale damage logs to include shooter, target, weapon, source, and damage amount.'
    ]
  },
  {
    version: '1.2.8',
    date: 'April 23, 2026',
    title: 'Pac-Man Portrait and Royale End Screen Fix',
    summary: 'Pac-Man now uses a portrait-only mobile layout, and Battle Royale end-screen actions are real tap-safe buttons.',
    changes: [
      'Converted Pac-Man to portrait-only play with a larger mobile board.',
      'Added large bottom arrow controls inspired by the Pokemon D-pad.',
      'Moved Pac-Man score and lives into a fixed top bar.',
      'Replaced Battle Royale canvas end actions with DOM buttons above the canvas.',
      'Play Again now reliably returns to the Royale skin selection screen, while Quit returns to the Games page.'
    ]
  },
  {
    version: '1.2.7',
    date: 'April 22, 2026',
    title: 'Games Module Expansion',
    summary: 'Battle Royale bot damage, throw aiming, HUD controls, and the new Pac-Man arcade game were updated.',
    changes: [
      'Fixed bot self-hit damage by preventing bot bullets from damaging their shooter.',
      'Added validated bot damage logging for bullets, explosions, fire, and storm zone damage.',
      'Improved bot reaction distance, fire timing, aim accuracy, cover movement, and indoor pressure.',
      'Added hold-and-drag throwable aiming with visual target feedback.',
      'Added a landscape Pac-Man game with pellets, ghosts, score, lives, win and lose states.'
    ]
  },
  {
    version: '1.2.6',
    date: 'April 22, 2026',
    title: 'Battle Royale First-Person POV',
    summary: 'Battle Royale now includes a first-person POV mode, mobile shooter camera movement, and safer bot damage handling.',
    changes: [
      'Added a POV toggle that switches between first-person combat and the tactical map view.',
      'Added a first-person renderer using the existing Royale map, buildings, loot, bots, and weapon data.',
      'Changed first-person movement to use camera-relative forward and strafe controls.',
      'Centralized bot damage so nearby players only trigger awareness/chase behavior, not health loss.',
      'Added optional Royale damage debug logging through window.CLASS_APP_DEBUG_ROYALE_DAMAGE.'
    ]
  },
  {
    version: '1.2.5',
    date: '2026-04-22',
    title: 'Battle Royale CQB Mobile Shooter Upgrade',
    summary: 'Battle Royale now has enterable room layouts, indoor loot, cover props, smoother mobile controls, ADS, heal controls, and smarter indoor bot behavior.',
    changes: [
      'Converted building visuals into enterable interiors with room dividers, doors, stairs, rooftops, and cover props.',
      'Moved loot spawning toward logical indoor cover/table/shelf spots while preserving outdoor loot.',
      'Added ADS, crouch, prone, jump, and heal mobile controls with faster press feedback.',
      'Improved movement smoothing, recoil feedback, throwable behavior, pickup readability, and damage direction feedback.',
      'Improved bot indoor chasing, flanking, loot seeking, and cover use.',
    ],
  },
  {
    version: '1.2.4',
    date: '2026-04-21',
    title: 'Modal, Profile, and Social Embed Fixes',
    summary: 'Software update panels are easier to close, user profiles open at the visible top, and social embeds now show a clear fallback when Facebook stalls.',
    changes: [
      'Added a prominent bottom Close button and stronger sticky close styling for the Software Updates panel.',
      'Reset and position the Users profile panel so opening a profile from the bottom of the list shows the profile immediately.',
      'Added Facebook embed loading/fallback messaging with a direct browser link when third-party embeds do not render.',
    ],
  },
  {
    version: '1.2.3',
    date: '2026-04-21',
    title: 'Code Lab Real Java Output',
    summary: 'Java runs now show the actual program output in the Code Lab console instead of internal wrapper/status messages.',
    changes: [
      'Removed auto-wrap and compile-success helper text from the visible Java console.',
      'Kept Java fallback wrapping silent so simple println snippets show only what the program printed.',
      'Updated empty successful Java runs to show [No output] and preserved real compile/runtime errors.',
    ],
  },
  {
    version: '1.2.2',
    date: '2026-04-21',
    title: 'Code Lab Java and Game Fixes',
    summary: 'Java snippets now auto-wrap for execution, server headless warnings are hidden, Pokemon starter cards show real sprites, and games have return buttons back to the arcade.',
    changes: [
      'Added backend Java auto-wrapping for simple statements, methods, and partial classes without changing editor text.',
      'Cleaned Java output by hiding normal JAVA_TOOL_OPTIONS headless warnings and returning clearer compile/runtime messages.',
      'Handled Swing source as compile-only in headless mode with a clear success message.',
      'Fixed Pokemon starter selection cards to render real Pokemon images with fallbacks.',
      'Added return controls from Pokemon and Battle Royale back to the Games page.',
    ],
  },
  {
    version: '1.2.1',
    date: '2026-04-21',
    title: 'Code Lab Portrait Editor',
    summary: 'CODE LAB now uses a portrait-first mobile editor layout with WebCode-style file tabs and switchable editor, preview, console, and asset panels.',
    changes: [
      'Removed CODE LAB orientation lock, fullscreen rotation behavior, and rotate-device prompt.',
      'Added mobile editor file tabs for index.html, style.css, script.js, and Main.java.',
      'Added Editor, Preview, Console, and Assets panel switching to keep the coding screen clean in portrait mode.',
      'Kept Java backend execution and sandboxed HTML/CSS/JavaScript preview behavior intact.',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-04-21',
    title: 'Code Lab Java and Structure Fixes',
    summary: 'Java execution now has a real OpenJDK Docker runtime path, CODE LAB cards use real visuals, and update visibility is more reliable.',
    changes: [
      'Added Docker/OpenJDK configuration so CODE LAB Java can compile and run with javac/java on Render when deployed as Docker.',
      'Added a Java toolchain status probe and clean unavailable message instead of raw spawn javac ENOENT.',
      'Added the first CODE LAB workspace behavior and a clear workspace button.',
      'Added real background graphics for HTML/CSS/JavaScript and Java cards.',
      'Moved Pokemon and Battle Royale assets into feature folders and added feature directories for major app areas.',
      'Improved the ! update indicator with latest/current version state and seen tracking.',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-04-21',
    title: 'Playback and Update Visibility',
    summary: 'Music queue playback, loop behavior, footer year, update banner, and lobby presence improvements.',
    changes: [
      'Fixed Music folder playback so songs continue through the queue.',
      'Updated Loop All so it restarts the queue only after the last track.',
      'Added dynamic footer year text.',
      'Added update banner, changelog access, and lobby update viewer.',
      'Improved lobby presence visibility with live online status.',
    ],
  },
  {
    version: '1.0.9',
    date: '2026-04-21',
    title: 'Copy Move and Activity',
    summary: 'Copy & Move To, folder filtering, app open tally, and announcement auto-load.',
    changes: [
      'Added Copy & Move To with source-aware folder filtering.',
      'Added shared app-open tally in the lobby.',
      'Auto-loads announcements on app startup.',
    ],
  },
  {
    version: '1.0.8',
    date: '2026-04-21',
    title: 'Social Pages and Permissions',
    summary: 'Social Media Pages cards, embedded social view, and folder permission quick controls.',
    changes: [
      'Matched Social Media cards to the Games page design.',
      'Added in-app embedded social media view.',
      'Simplified folder permission controls.',
    ],
  },
];
