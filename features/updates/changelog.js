const APP_VERSION = '1.9.6';
const APP_CHANGELOG = [
  {
    version: '1.9.6',
    date: 'May 7, 2026',
    title: 'Button Logic Stability Fix',
    summary: 'Stabilized dynamic page navigation/initialization so button clicks don\'t silently fail after navigation. Removed stale demo user data that was still appearing in the Users/Admin lists.',
    changes: [
      'Fixed dead buttons across Shared Reviewers, My Classes files, Users/Admin, User Directory, Social Media Pages, Picture pages, Personal Tools, Calendar, Games, and Lobby delete.',
      'Restored real app-open/login and contribution tally recording.',
      'Removed stale/fake Amina Cruz demo user data.',
      'Improved dynamic page event binding and mobile click reliability.',
      'Added safer guards for missing IDs, permissions, and Supabase errors.',
    ],
  },
  {
    version: '1.9.5',
    date: 'May 7, 2026',
    title: 'Fix: RLS Errors on Share/Send + Facebook Embed + Pointer-Events Cleanup',
    summary: 'Fixed all remaining direct Supabase writes that bypassed server-side RLS enforcement — share to Announcements, share AI Output, delete AI Output, delete Announcement, send chat message, and save/delete calendar notes now all route through authenticated server endpoints using the service key. Also fixed Facebook page embeds being blocked by CSP, and corrected a broken pointer-events ternary in loading-components.js.',
    changes: [
      'Fix: shareAnnouncementPayload() now POSTs to /api/shared-announcements instead of direct sb.from("shared_announcements").insert() — was failing with RLS violation.',
      'Fix: deleteSharedAnnouncement() now DELETEs via /api/shared-announcements/:id instead of direct sb.from("shared_announcements").delete() — was failing with RLS violation.',
      'Fix: shareAIMessage() now POSTs to /api/shared-ai-outputs instead of direct sb.from("shared_ai_outputs").insert() — was failing with RLS violation.',
      'Fix: deleteSharedAIOutput() now DELETEs via /api/shared-ai-outputs/:id instead of direct sb.from("shared_ai_outputs").delete() — was failing with RLS violation.',
      'Fix: sendMessage() now POSTs to /api/sb/messages instead of direct sb.from("messages").insert() — was failing with RLS violation.',
      'Fix: fetchCalendarNotes() now fetches from /api/calendar-notes instead of direct sb.from("calendar_notes").select() — now uses service key consistently.',
      'Fix: Calendar note save/delete now POSTs to /api/calendar-notes (note:"" = delete) instead of direct sb.from("calendar_notes").upsert()/.delete() — was failing with RLS violation.',
      'Fix: Added https://www.facebook.com and https://web.facebook.com to server CSP frameSrc — Facebook page embeds were being blocked.',
      'Fix: Corrected broken pointer-events ternary in loading-components.js renderAppState() — both branches incorrectly returned empty string instead of "auto"/"none".',
    ],
  },
  {
    version: '1.9.4',
    date: 'May 7, 2026',
    title: 'Fix: Buttons Not Working on All Pages (3-Phase Fix)',
    summary: 'Fixed the root cause of buttons being unresponsive across almost all pages. The broken pointer-events logic in renderAppState() and the incomplete page transition code in goToPage() were both patched. Also removed all hardcoded demo profile name references from the coding-educational module.',
    changes: [
      'Fix (Phase 1): Corrected broken ternary in renderAppState() — both branches were returning empty string, so non-active pages never received pointer-events:none. Changed to explicitly set auto for active pages and none for inactive pages.',
      'Fix (Phase 2): Restored explicit inline pointer-events assignments in goToPage() — old pages now get pointer-events:none immediately on deactivation, new pages get pointer-events:auto immediately on activation, ensuring CSS transitions and inline styles work together.',
      'Cleanup (Phase 3): Replaced all hardcoded "Ana Cruz" / "Ana" demo profile name references in coding-educational module with "Sam Rivera" / "Sam" to remove any confusion with real users.',
    ],
  },
  {
    version: '1.9.3',
    date: 'May 6, 2026',
    title: 'Fix: Buttons Dead After Login',
    summary: 'Fixed a startup ReferenceError that could abort DOMContentLoaded initialization, leaving the hamburger menu and other buttons unresponsive after signing in.',
    changes: [
      'Fix: Ensure `isInitializing` and `isAuthenticated` exist as global bindings early during startup so `renderAppState()` cannot throw a ReferenceError.',
      'Fix: Updated script/cache versions to prevent stale mixed-assets from the service worker.',
    ],
  },
  {
    version: '1.9.2',
    date: 'May 6, 2026',
    title: 'Startup Isolation: Extract Auth & Shell Logic Into Modules',
    summary: 'Separated startup-critical logic from feature code to prevent future edits from breaking login, loading, splash, or navigation. Created two new modular files for better code organization and maintainability.',
    changes: [
      'Feature: Created features/logging-in/loading-components.js — owns login, auth bootstrap, session restore, splash/loading-screen, and app initialization logic.',
      'Feature: Created features/logging-in/shell-controls.js — owns global app-shell controls (menu toggle, sidebar, page switching, session establishment).',
      'Refactor: Moved 351 lines of startup/shell code from script.js into the two modules. script.js is now lighter and decoupled from core bootstrap logic.',
      'Architecture: Established clear separation of concerns — startup code, global shell controls, and page-specific feature buttons are now isolated.',
      'Docs: Updated CLAUDE.md with new 🔥 STARTUP ISOLATION RULE section to enforce this split going forward.',
    ],
  },
  // (Older entries unchanged)
];

// Expose version/changelog for the Updates feature module.
window.CLASS_APP_VERSION = APP_VERSION;
window.CLASS_APP_CHANGELOG = APP_CHANGELOG;
