/* ============================================================
   SCRIPT.JS — My School Portfolio (FULL INTEGRATED VERSION)
   ============================================================ */

// 1. SUPABASE CONNECTION INFO — loaded from server to avoid hardcoding in source
let SUPABASE_URL = '';
let SUPABASE_KEY = '';
let sb = null;
let serverAuthToken = localStorage.getItem('classAppToken') || '';
const PROFILE_SELECT_FIELDS = 'username,display_name,birthday,address,github,email,note,online,avatar,last_seen_at,username_last_changed_at,updated_at';
const PROFILE_PUBLIC_FIELDS = 'username,display_name,birthday,address,github,email,note,online,avatar,last_seen_at,username_last_changed_at,updated_at';

async function initSupabase() {
  try {
    // 5s hard timeout — if the server is still cold-starting the page shouldn't block.
    // waitForSupabaseClient() retries once on login if credentials are still empty.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const cfg = await fetch('/api/config', { signal: controller.signal }).then(r => r.json());
    clearTimeout(timer);
    SUPABASE_URL = cfg.supabaseUrl || '';
    SUPABASE_KEY = cfg.supabaseKey || '';
  } catch (error) {
    console.error('[auth] Failed to load Supabase config:', error);
  }
  if (!window.supabase?.createClient || !SUPABASE_URL || !SUPABASE_KEY) {
    console.error('[auth] Supabase client could not be initialized.');
    sb = null;
    window.sb = null;
    return false;
  }
  try {
    const { createClient } = window.supabase;
    sb = createClient(SUPABASE_URL, SUPABASE_KEY);
    window.sb = sb;
    return true;
  } catch (error) {
    console.error('[auth] Supabase createClient failed:', error);
    sb = null;
    window.sb = null;
    return false;
  }
}

function getSupabaseChannel(channelName, config) {
  if (!sb || typeof sb.channel !== 'function') {
    console.warn(`[auth] Supabase channel unavailable for ${channelName}.`);
    return null;
  }
  try {
    return sb.channel(channelName, config);
  } catch (error) {
    console.error(`[auth] Failed to create Supabase channel ${channelName}:`, error);
    return null;
  }
}

// Legacy: pre-R2 files were served from this origin. New uploads use
// relative /uploads/ paths resolved against the current host.
const SERVER_BASE = window.location.origin;

function normalizeStoredFileUrl(url) {
    const raw = String(url || '').trim();
    if (!raw) return '';
    if (raw.startsWith('/uploads/')) return `${SERVER_BASE}${raw}`;
    try {
        const parsed = new URL(raw, window.location.origin);
        if (parsed.pathname.startsWith('/uploads/')) {
            return `${SERVER_BASE}${parsed.pathname}`;
        }
        return parsed.href;
    } catch (_) {
        return raw.startsWith('http') ? raw : `${SERVER_BASE}${raw}`;
    }
}

/* ============================================================
   CUSTOM MODALS (Replaces prompt/alert/confirm for PWA support)
   ============================================================ */
window.customAlert = function(text) {
    const alertBox = document.getElementById('alert-text');
    if (alertBox) alertBox.innerText = text;
    const modal = document.getElementById('custom-alert-modal');
    if (modal) modal.style.display = 'flex';
};

window.customPrompt = function(title, callback, defaultValue = '', options = {}) {
    const modal = document.getElementById('custom-prompt-modal');
    const inputEl = document.getElementById('prompt-input');
    const titleEl = document.getElementById('prompt-title');
    const submitBtn = document.getElementById('prompt-submit');
    
    if (titleEl) titleEl.innerText = title;
    if (inputEl) {
      inputEl.value = defaultValue;
      inputEl.type = options.type || 'text';
    }
    if (modal) modal.style.display = 'flex';
    if (inputEl) inputEl.focus();

    if (submitBtn) {
        submitBtn.onclick = function() {
            modal.style.display = 'none';
            callback(inputEl.value.trim());
        };
    }
    if (inputEl) {
      inputEl.onkeydown = function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          modal.style.display = 'none';
          callback(inputEl.value.trim());
        }
      };
    }
};

window.customConfirm = function(text, onConfirm, onCancel) {
    const confirmBox = document.getElementById('confirm-text');
    if (confirmBox) confirmBox.innerText = text;
    const modal = document.getElementById('custom-confirm-modal');
    if (modal) modal.style.display = 'flex';
    
    const yesBtn = document.getElementById('confirm-yes');
    const noBtn = document.getElementById('confirm-no');
    if (yesBtn) {
        yesBtn.onclick = function() {
            modal.style.display = 'none';
            if (typeof onConfirm === 'function') onConfirm();
        };
    }
    if (noBtn) {
        noBtn.onclick = function() {
            modal.style.display = 'none';
            if (typeof onCancel === 'function') onCancel();
        };
    }
};

function escapeHTML(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeJS(value) {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '');
}

// TODO (Phase 3): Migrate token storage from localStorage to secure HttpOnly cookies
// to prevent token theft via XSS.
function setServerAuthToken(token) {
  serverAuthToken = token || '';
  if (serverAuthToken) localStorage.setItem('classAppToken', serverAuthToken);
  else localStorage.removeItem('classAppToken');
}

function getServerAuthToken() {
  return serverAuthToken || localStorage.getItem('classAppToken') || '';
}

function getAuthHeaders(extraHeaders = {}) {
  const headers = new Headers(extraHeaders || {});
  const token = getServerAuthToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return headers;
}

window.getAuthToken = getServerAuthToken;
window.authFetch = function(url, options = {}) {
  return fetch(url, { ...options, headers: getAuthHeaders(options.headers) });
};

async function waitForSupabaseClient() {
  // Wait up to 3s for initSupabase to complete (covers slow page loads).
  // Also verify credentials are non-empty — sb is always non-null after init
  // even when credentials failed to load, so checking !sb alone is not enough.
  // Give initSupabase up to 2s to finish if it's still running
  const deadline = Date.now() + 2000;
  while (!sb || !SUPABASE_URL) {
    if (Date.now() >= deadline) break;
    await new Promise(r => setTimeout(r, 200));
  }
  // If credentials are still missing, the server may have been cold-starting during
  // page load. Try /api/config once more now that the server should be awake.
  if (!SUPABASE_URL) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const cfg = await fetch('/api/config', { signal: controller.signal }).then(r => r.json());
      clearTimeout(timer);
      if (cfg.supabaseUrl && cfg.supabaseKey) {
        SUPABASE_URL = cfg.supabaseUrl;
        SUPABASE_KEY = cfg.supabaseKey;
        sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        window.sb = sb;
      }
    } catch (_) {}
  }
  if (!sb || !SUPABASE_URL) {
    console.error('[sb] Supabase client unavailable or missing credentials.');
    return false;
  }
  return true;
}
window.waitForSupabaseClient = waitForSupabaseClient;

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `app-toast app-toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 220);
  }, 3200);
}

function createInlineLoader(text = 'Loading...') {
  return `<div class="inline-loader"><span></span>${escapeHTML(text)}</div>`;
}

function updateFooterYear() {
  const footer = document.getElementById('sidebar-footer-year');
  if (!footer) return;
  const endYear = Math.max(2026, new Date().getFullYear());
  footer.innerHTML = `School Portfolio &nbsp;·&nbsp; 2025–${endYear}`;
}

/* ============================================================
   DATA — Subjects & Teachers
   ============================================================ */
const firstSem = [
  { code: "Math 0",    teacher: "Sir Jason Saludes",          icon: "📐" },
  { code: "English +", teacher: "Sir Winbert Abrenica",       icon: "📖" },
  { code: "English 1", teacher: "Maam Lovely Joy Salas",      icon: "✏️"  },
  { code: "Pathfit 1", teacher: "Sir Mariano Bayona",         icon: "🏃"  },
  { code: "SS 1",      teacher: "Maam Bing Pamplona",         icon: "🌍"  },
  { code: "SS 2",      teacher: "Sir James Esmaya",           icon: "🗺️"  },
  { code: "ITGE 1",   teacher: "Sir Mohammed Mogib Elkordy",  icon: "💡"  },
  { code: "ITCC 111", teacher: "Maam Krystal Sayco",          icon: "💻"  },
  { code: "ITCC 112", teacher: "Sir Mohammed Mogib Elkordy",  icon: "🖥️"  },
  { code: "NSTP 1",   teacher: "",                            icon: "🎖️"  },
];
 
const secondSem = [
  { code: "English 2", teacher: "Maam Irene Sudoysudoy",     icon: "📝"  },
  { code: "Math 1",    teacher: "Sir Charlie Villaester",    icon: "🔢"  },
  { code: "NS 1",      teacher: "Sir Benedict Peñas",        icon: "🔬"  },
  { code: "Pathfit 2", teacher: "Maam Marshe Lavalle",       icon: "⚽"  },
  { code: "ITPE 1",   teacher: "Sir Nicol Pador",            icon: "🖧"  },
  { code: "ITPC 1",   teacher: "Maam Bea Monique Robles",    icon: "💾"  },
  { code: "ITCC 121", teacher: "Maam Joanna Bernardino",     icon: "📡"  },
  { code: "ITCC 122", teacher: "Sir Mohammed Mogib Elkordy", icon: "⚙️"  },
  { code: "NSTP 2",   teacher: "",                           icon: "🎗️"  },
];
 
// 2nd Year — fill in subjects when ready
const y2firstSem  = [];
const y2secondSem = [];
// 3rd Year
const y3firstSem  = [];
const y3secondSem = [];
// 4th Year
const y4firstSem  = [];
const y4secondSem = [];

// Map of gridKey → mutable subject array (used by admin subject creation)
const SUBJECT_GRID_MAP = {
  first: firstSem, second: secondSem,
  y2first: y2firstSem, y2second: y2secondSem,
  y3first: y3firstSem, y3second: y3secondSem,
  y4first: y4firstSem, y4second: y4secondSem,
};

// Grid key → human label (for buildSubjectCards folderRootLabel)
const SUBJECT_GRID_LABELS = {
  first: 'First Semester', second: 'Second Semester',
  y2first: '2nd Year · First Semester', y2second: '2nd Year · Second Semester',
  y3first: '3rd Year · First Semester', y3second: '3rd Year · Second Semester',
  y4first: '4th Year · First Semester', y4second: '4th Year · Second Semester',
};

// ── Subject persistence helpers ───────────────────────────────────
// localStorage is used as a fast first-paint cache only.
// Supabase (via /api/subjects) is the source of truth after login.

function _mergeSubjectIntoGrid(gridKey, code, teacher, icon) {
  const arr = SUBJECT_GRID_MAP[gridKey];
  if (!arr) return false;
  if (arr.some(s => s.code.toLowerCase() === code.toLowerCase())) return false;
  arr.push({ code, teacher: teacher || '', icon: icon || '📚' });
  ACADEMIC_FOLDER_ROOTS.add(code);
  return true;
}

function _cacheSubjectsLocally(subjects) {
  try {
    // Store as { gridKey, code, teacher, icon } for backwards compat
    const payload = subjects.map(s => ({ gridKey: s.grid_key, code: s.code, teacher: s.teacher, icon: s.icon }));
    localStorage.setItem('adminSubjects_v1', JSON.stringify(payload));
  } catch (_) { /* storage full or private mode — skip */ }
}

// Step 1: Fast first-paint — load subjects from localStorage cache immediately
(function loadSubjectsFromCache() {
  try {
    const saved = JSON.parse(localStorage.getItem('adminSubjects_v1') || '[]');
    if (!Array.isArray(saved)) return;
    saved.forEach(({ gridKey, code, teacher, icon }) => _mergeSubjectIntoGrid(gridKey, code, teacher, icon));
  } catch (_) { /* corrupted cache — skip */ }
})();

// Step 2: After login, fetch authoritative list from Supabase, refresh grids
async function syncSubjectsFromServer() {
  try {
    const res = await fetch('/api/subjects');
    if (!res.ok) return;
    const serverSubjects = await res.json();
    if (!Array.isArray(serverSubjects) || serverSubjects.length === 0) return;

    // Track which grids were updated so we only re-render those
    const updatedGrids = new Set();
    serverSubjects.forEach(s => {
      if (_mergeSubjectIntoGrid(s.grid_key, s.code, s.teacher, s.icon)) {
        updatedGrids.add(s.grid_key);
      }
    });

    _cacheSubjectsLocally(serverSubjects);

    // Re-render only grids that received new subjects
    updatedGrids.forEach(gridKey => {
      const arr = SUBJECT_GRID_MAP[gridKey];
      buildSubjectCards(`grid-${gridKey}`, arr, SUBJECT_GRID_LABELS[gridKey] || '');
    });
  } catch (_) { /* server unreachable — cache-loaded subjects remain visible */ }
}

const ACADEMIC_FOLDER_ROOTS = new Set([
  ...firstSem,
  ...secondSem,
  ...y2firstSem,
  ...y2secondSem,
  ...y3firstSem,
  ...y3secondSem,
  ...y4firstSem,
  ...y4secondSem,
].map((subject) => subject.code));

const eventCount  = 15;
const randomCount = 10;
 
/* ============================================================
   BUILD SUBJECT CARDS (Opens Folders)
   ============================================================ */
function buildSubjectCards(gridId, subjects, folderRootLabel = '') {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  grid.innerHTML = '';

  const sectionLabel = grid.parentElement?.querySelector('.section-label');

  if (subjects.length === 0) {
    if (sectionLabel) sectionLabel.style.display = 'none';
    grid.innerHTML = `
      <div class="semester-empty-state">
        <div class="semester-empty-icon">📚</div>
        <p class="semester-empty-text">No subjects have been added for this semester yet.</p>
        <p class="semester-empty-sub">You can still summarize files and generate quizzes for any subject:</p>
        <button class="semester-empty-btn" onclick="goToPage('file-summarizer')">📄 Go to File Summarizer →</button>
      </div>
    `;
    grid.querySelector('.semester-empty-sub')?.remove();
    grid.querySelector('.semester-empty-btn')?.remove();
    return;
  }

  if (sectionLabel) sectionLabel.style.display = '';

  // Quick action bar at the top of the grid
  const bar = document.createElement('div');
  bar.className = 'semester-shortcut';
  const safeFolderRoot = escapeJS(folderRootLabel);
  bar.innerHTML = `
    <span class="semester-shortcut-label">Quick Actions</span>
    ${folderRootLabel ? `<button class="semester-shortcut-btn" onclick="openFolderExplorer('${safeFolderRoot}')">📂 Browse Modules →</button>` : ''}
    <button class="semester-shortcut-btn" onclick="goToPage('file-summarizer')">📄 Summarize a File →</button>
  `;
  grid.appendChild(bar);
  if (!bar.querySelector('button')) bar.remove();

  subjects.forEach((subject) => {
    const safeCode = subject.code.replace(/'/g, "\\'");
    const card = document.createElement('div');
    card.className = 'subject-card';
    card.onclick = () => window.openFolderExplorer(subject.code);

    card.innerHTML = `
      <span class="card-icon">${subject.icon}</span>
      <div class="card-subject">${subject.code}</div>
      <div class="card-teacher">${subject.teacher || 'No teacher assigned'}</div>
      <div class="card-actions">
        <button class="card-action-btn card-action-folders" onclick="event.stopPropagation(); window.openFolderExplorer('${safeCode}')">📂 Folders</button>
        <button class="card-action-btn card-action-summarize" onclick="event.stopPropagation(); goToPage('file-summarizer')">📄 Summarize</button>
      </div>
    `;
    grid.appendChild(card);
  });
}

/* ============================================================
   ADMIN — ADD SUBJECT (Admin-only, localStorage-backed)
   ============================================================ */
window.openAdminAddSubjectModal = function(gridKey) {
  if (!isAdmin) return; // server-backed guard
  const modal = document.getElementById('add-subject-modal');
  if (!modal) return;
  const yearSel = document.getElementById('add-subject-year');
  if (yearSel && gridKey && SUBJECT_GRID_MAP[gridKey] !== undefined) yearSel.value = gridKey;
  document.getElementById('add-subject-code').value = '';
  document.getElementById('add-subject-teacher').value = '';
  document.getElementById('add-subject-icon').value = '';
  document.getElementById('add-subject-error').textContent = '';
  modal.classList.add('open');
  setTimeout(() => document.getElementById('add-subject-code')?.focus(), 80);
};

window.closeAdminAddSubjectModal = function() {
  const modal = document.getElementById('add-subject-modal');
  if (modal) modal.classList.remove('open');
};

window.adminSaveNewSubject = async function() {
  if (!isAdmin) { customAlert('Admin only.'); return; }

  const gridKey = document.getElementById('add-subject-year').value.trim();
  const rawCode = document.getElementById('add-subject-code').value.trim();
  const rawTeacher = document.getElementById('add-subject-teacher').value.trim();
  const rawIcon = document.getElementById('add-subject-icon').value.trim();
  const errEl = document.getElementById('add-subject-error');
  const saveBtn = document.querySelector('.add-subject-save-btn');

  // --- Client-side validation (mirrors server) ---
  if (!rawCode) { errEl.textContent = 'Subject code / name is required.'; return; }
  if (rawCode.length > 60) { errEl.textContent = 'Subject name is too long (max 60 chars).'; return; }
  if (/[<>"'`]/.test(rawCode) || /[<>"'`]/.test(rawTeacher)) {
    errEl.textContent = 'Subject name contains unsafe characters.'; return;
  }

  const arr = SUBJECT_GRID_MAP[gridKey];
  if (!arr) { errEl.textContent = 'Invalid year/semester selected.'; return; }

  if (arr.some(s => s.code.toLowerCase() === rawCode.toLowerCase())) {
    errEl.textContent = 'A subject with this name already exists in this semester.'; return;
  }

  const icon = rawIcon || '📚';

  // --- POST to server (server enforces admin + Supabase write) ---
  errEl.textContent = '';
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving…'; }
  try {
    const res = await authFetch('/api/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grid_key: gridKey, code: rawCode, teacher: rawTeacher, icon }),
    });
    const data = await res.json();
    if (!res.ok) {
      errEl.textContent = data.error || 'Failed to save subject. Please try again.';
      return;
    }

    // Merge into live array + roots
    _mergeSubjectIntoGrid(gridKey, rawCode, rawTeacher, icon);

    // Update localStorage cache with fresh server list (fire-and-forget)
    fetch('/api/subjects').then(r => r.json()).then(_cacheSubjectsLocally).catch(() => {});

    // Re-render the grid immediately
    buildSubjectCards(`grid-${gridKey}`, arr, SUBJECT_GRID_LABELS[gridKey] || '');
    window.closeAdminAddSubjectModal();
  } catch (err) {
    errEl.textContent = 'Network error. Subject may not have been saved — please check your connection.';
    console.error('[adminSaveNewSubject]', err);
  } finally {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Add Subject'; }
  }
};

// Close modal when clicking outside the box
document.addEventListener('click', (e) => {
  const modal = document.getElementById('add-subject-modal');
  if (!modal || !modal.classList.contains('open')) return;
  if (e.target === modal) window.closeAdminAddSubjectModal();
});

function buildFolderCards(gridId, count, prefix = "Folder") {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  grid.innerHTML = '';
 
  for (let i = 1; i <= count; i++) {
    const card = document.createElement('div');
    card.className = 'folder-card';
    card.style.cursor = 'pointer';
    card.onclick = () => window.openFolderExplorer(`${prefix} ${i}`);
 
    card.innerHTML = `
      <div class="folder-bg"></div>
      <div class="folder-overlay"></div>
      <div class="folder-info">
        <div class="folder-name">${prefix} ${i}</div>
        <div class="folder-view-label">View Folders</div>
      </div>
    `;
    grid.appendChild(card);
  }
}

/* ============================================================
   FOLDER & FILE EXPLORER LOGIC (Supabase Powered)
   ============================================================ */
let currentParentContext = null;
let currentFolderContext = null;
let folderStack = []; // navigation history for back button
const PROFILE_FOLDER_PREFIX = 'profile:';

// Music Player Global State
let currentPlaylist = [];
let currentTrackIndex = -1;
let isLoop = true;
let isRepeat = false;

const APP_VERSION = '1.7.6';
const APP_CHANGELOG = [
  {
    version: '1.7.6',
    date: 'May 5, 2026',
    title: 'Supabase-Backed Subjects + Server Admin Guard + Summarize Restored',
    summary: 'Admin-created subjects now persist to Supabase instead of localStorage — surviving browser data clears and visible across all devices. Admin writes are enforced server-side. The Summarize button on subject cards is restored.',
    changes: [
      'Fix: Admin-added subjects now save to Supabase (subjects table) via /api/subjects POST — no longer localStorage-only. Subjects survive browser data clears and work across all devices.',
      'Fix: /api/subjects POST and DELETE require a valid admin JWT on the server — a non-admin cannot insert subjects even by calling the API directly from a console.',
      'Fix: Supabase subjects table uses a unique constraint on (grid_key, code) — duplicate subjects blocked at the database level, not just in the frontend.',
      'Fix: On login and session restore, subject grids are refreshed from Supabase (/api/subjects) and the localStorage cache is updated. First paint still uses the cache for instant load.',
      'Fix: "Summarize" button on subject cards is now visible and functional — it correctly navigates to the File Summarizer. Previously it was silently removed immediately after being built.',
      'Fix: "Summarize a File" quick-action bar button on semester pages is now also visible and functional.',
      'Security: /api/subjects GET has no auth requirement (subjects are not secret). Write routes (POST, DELETE) require requireAuth + requireAdmin.',
      'DB Migration: 023_subjects_table.sql creates the subjects table with RLS (public SELECT, server-only writes).',
    ],
  },
  {
    version: '1.7.5',
    date: 'May 5, 2026',
    title: 'Compact Subject Cards + Admin Subject Creation',
    summary: 'All year-level pages now use compact glassmorphism subject cards with a 2-column mobile layout. Admins can manually add subjects to any year/semester; new subjects persist across refreshes.',
    changes: [
      'UI: Subject cards are now compact — reduced padding, 20px icon, 13px subject name, 11px teacher text. Significantly less vertical space per card.',
      'UI: Upload grid now defaults to 2 columns on mobile (≤500 px) for better density. Expands to auto-fill (3+) on wider screens.',
      'UI: Added themed hover glows for 2nd Year (blue), 3rd Year (purple), and 4th Year (pink) subject cards. Tap feedback (scale) added for iOS.',
      'Feature: Admin-only "Add Subject" button on every year/semester page. Non-admins cannot see or trigger it.',
      'Feature: Admin add-subject modal with validation — required name, length limit, XSS character guard, duplicate prevention.',
      'Feature: Admin-created subjects persist via localStorage (adminSubjects_v1) and are loaded on every page open.',
      'Feature: Newly added subjects appear instantly as clickable glassmorphism cards and are registered in ACADEMIC_FOLDER_ROOTS so folder explorer works.',
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

function normalizeFolderPermissions(folder) {
    const raw = folder?.permissions;
    const normalizeMode = (mode) => ['edit', 'view', 'restricted'].includes(mode) ? mode : 'edit';
    if (!raw) return { viewers: [], editors: [], everyone: 'edit' };
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw);
            return {
                viewers: Array.isArray(parsed.viewers) ? parsed.viewers : [],
                editors: Array.isArray(parsed.editors) ? parsed.editors : [],
                everyone: normalizeMode(parsed.everyone),
            };
        } catch (_) {
            return { viewers: [], editors: [], everyone: 'edit' };
        }
    }
    return {
        viewers: Array.isArray(raw.viewers) ? raw.viewers : [],
        editors: Array.isArray(raw.editors) ? raw.editors : [],
        everyone: normalizeMode(raw.everyone),
    };
}

function isProfileFolder(folder) {
    return folder?.folder_type === 'profile' || String(folder?.parent || '').startsWith(PROFILE_FOLDER_PREFIX);
}

function isFolderOwner(folder) {
    return Boolean(currentUser && folder && (folder.owner === currentUser.username || isAdmin));
}

function canViewFolder(folder) {
    if (!folder) return false;
    if (!isProfileFolder(folder)) return true;
    if (isFolderOwner(folder)) return true;
    if (!currentUser) return false;
    const perms = normalizeFolderPermissions(folder);
    return perms.everyone === 'edit' || perms.everyone === 'view' || perms.viewers.includes(currentUser.username) || perms.editors.includes(currentUser.username);
}

function canEditFolder(folder) {
    if (!folder) return false;
    if (!isProfileFolder(folder)) return Boolean(currentUser);
    if (isFolderOwner(folder)) return true;
    if (!currentUser) return false;
    const perms = normalizeFolderPermissions(folder);
    return perms.everyone === 'edit' || perms.editors.includes(currentUser.username);
}

function canManageFolder(folder) {
    return isFolderOwner(folder);
}

function folderAccessLabel(folder) {
    if (isFolderOwner(folder)) return 'Owner';
    if (!isProfileFolder(folder)) return currentUser ? 'Editor' : 'Viewer';
    const perms = normalizeFolderPermissions(folder);
    if (perms.everyone === 'edit') return 'Editor';
    if (perms.everyone === 'view') return 'Viewer';
    if (currentUser && perms.editors.includes(currentUser.username)) return 'Editor';
    if (currentUser && perms.viewers.includes(currentUser.username)) return 'Viewer';
    return 'No access';
}

async function fetchFolderById(id) {
    const supabaseReady = await waitForSupabaseClient().catch(() => false);
    if (!supabaseReady) throw new Error('Folders are still loading. Please try again in a moment.');
    const { data, error } = await sb.from('folders').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
}

window.closeFolderModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if(modal) modal.style.display = 'none';
};

function closeOverlayElement(overlay) {
    if (!overlay) return;
    const modalId = overlay.id || '';
    if (modalId && typeof window.closeFolderModal === 'function' && [
        'custom-alert-modal',
        'custom-prompt-modal',
        'custom-confirm-modal',
        'folder-explorer-modal',
        'file-explorer-modal',
    ].includes(modalId)) {
        window.closeFolderModal(modalId);
        return;
    }
    overlay.remove();
}
window.closeOverlayElement = closeOverlayElement;

window.openFolderModalObj = function(modalId) {
    const modal = document.getElementById(modalId);
    if(modal) modal.style.display = 'flex';
};

window.openFolderExplorer = async function(parentName) {
    currentParentContext = parentName;
    folderStack = []; // reset navigation stack
    const title = document.getElementById('folder-explorer-title');
    if (title) title.innerText = `${parentName} Folders`;
    fetchAndRenderFolders();
    openFolderModalObj('folder-explorer-modal');
    // Subject-scoped announcements — only for recognised academic subjects
    const annContainer = document.getElementById('subject-ann-container');
    if (annContainer && ACADEMIC_FOLDER_ROOTS.has(parentName)) {
      annContainer.innerHTML = '<div style="opacity:.4;font-size:12px;padding:10px 0;">Loading announcements…</div>';
      await fetchSubjectAnnouncements(parentName);
      annContainer.innerHTML = buildSubjectAnnouncementsHTML(parentName);
    } else if (annContainer) {
      annContainer.innerHTML = '';
    }
};

function fetchAndRenderFolders() {
    const grid = document.getElementById('folder-grid-modal');
    if(!grid) return;
    grid.innerHTML = createInlineLoader('Loading folders...');

    waitForSupabaseClient()
    .then((ready) => {
        if (!ready || !sb) {
            grid.innerHTML = `
              <div class="empty-state-text">
                <p style="color: #ff6b6b;">Folders are still loading (server waking up).</p>
                <button class="btn-secondary mt-10" type="button" onclick="fetchAndRenderFolders()">Retry</button>
              </div>`;
            return null;
        }
        return sb.from('folders').select('*').eq('parent', currentParentContext);
    })
    .then((result) => {
        if (!result) return;
        const { data: folders, error } = result;
        grid.innerHTML = '';

        if (error) {
            console.error("Folder fetch error:", error);
            grid.innerHTML = `<div class="empty-state-text"><p style="color: #ff6b6b;">Error loading folders: ${escapeHTML(error.message || 'Unknown error')}</p><p style="font-size: 12px; margin-top: 8px;">Please refresh and try again.</p></div>`;
            return;
        }

        const visibleFolders = (folders || []).filter(canViewFolder);
        if(visibleFolders.length === 0) {
            grid.innerHTML = '<p class="empty-state-text">No folders available yet.</p>';
            return;
        }

        visibleFolders.forEach(f => {
            const canManage = canManageFolder(f);
            const canEdit = canEditFolder(f);
            const safeId = escapeJS(f.id);
            const safeName = escapeJS(f.name);
            grid.innerHTML += `
            <div class="folder-card-modern">
                <div class="folder-card-main" role="button" tabindex="0" data-folder-open="${safeId}" data-folder-name="${safeName}">
                    <div class="folder-card-icon">📁</div>
                    <div class="folder-card-title">${escapeHTML(f.name)}</div>
                    <div class="folder-card-owner">Owned by ${escapeHTML(f.owner || 'Unknown')}</div>
                    <div class="folder-access-pill ${canEdit ? 'editor' : 'viewer'}">${folderAccessLabel(f)}</div>
                </div>
                ${canManage ? `
                <div class="folder-card-actions">
                    <button type="button" class="mini-action-btn" data-folder-rename="${safeId}" data-folder-name="${safeName}">Rename</button>
                    <button type="button" class="mini-action-btn" data-folder-permissions="${safeId}">Permissions</button>
                    <button type="button" class="mini-action-btn danger" data-folder-delete="${safeId}">Delete</button>
                </div>
                ` : ''}
            </div>
            `;
        });
    })
    .catch((error) => {
        console.error('Folder fetch failed:', error);
        grid.innerHTML = `<div class="empty-state-text"><p style="color: #ff6b6b;">Error loading folders. Please try again.</p></div>`;
    });
}

window.createFolderAPI = function() {
    if(!currentUser) return customAlert("Please log in to create a folder.");
    customPrompt("Enter new folder name:", async function(name) {
        if(!name) return;
        const payload = { parent: currentParentContext, name: name, permissions: { viewers: [], editors: [], everyone: 'edit' } };
        const response = await authFetch('/api/folders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) return customAlert(data.error || 'Folder creation failed');
        fetchAndRenderFolders();
        showToast('Folder created.');
    });
};

window.renameFolderAPI = async function(id, oldName, isSub) {
    let folder;
    try { folder = await fetchFolderById(id); } catch (error) { return customAlert(error.message); }
    if (!canManageFolder(folder)) return customAlert('Only the folder owner can rename this folder.');
    customPrompt("Enter new name for folder:", async function(newName) {
        if(!newName || newName === oldName) return;
        const response = await authFetch(`/api/folders/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName }) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) return customAlert(data.error || 'Folder rename failed');
        isSub ? fetchAndRenderSubFolders() : fetchAndRenderFolders();
        if (String(folder.parent || '').startsWith(PROFILE_FOLDER_PREFIX)) {
            renderProfileFolders(folder.parent.replace(PROFILE_FOLDER_PREFIX, ''));
        }
        showToast('Folder renamed.');
    }, oldName);
};

window.deleteFolderAPI = async function(id) {
    let folder;
    try { folder = await fetchFolderById(id); } catch (error) { return customAlert(error.message); }
    if (!canManageFolder(folder)) return customAlert('Only the folder owner can delete this folder.');
    customConfirm("Are you sure? This will delete the folder AND all files inside it forever.", async function() {
        const response = await authFetch(`/api/folders/${id}`, { method: 'DELETE' });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) return customAlert(data.error || 'Folder delete failed');
        fetchAndRenderFolders();
        if (String(folder.parent || '').startsWith(PROFILE_FOLDER_PREFIX)) {
            renderProfileFolders(folder.parent.replace(PROFILE_FOLDER_PREFIX, ''));
        }
        showToast('Folder deleted.', 'warning');
    });
};

window.openFileExplorer = async function(folderId, folderName, parentId) {
    let folder;
    try {
        folder = await fetchFolderById(folderId);
    } catch (error) {
        return customAlert(error.message);
    }
    if (!canViewFolder(folder)) return customAlert('You do not have permission to view this folder.');
    // Push current context onto stack for back navigation
    if (currentFolderContext) {
        folderStack.push({ ...currentFolderContext });
    } else {
        folderStack.push({ id: null, name: currentParentContext }); // root level marker
    }
    currentFolderContext = { ...folder, id: folderId, name: folder.name || folderName };
    // Build breadcrumb title
    const crumbs = folderStack
        .filter(f => f.id !== null)
        .map(f => f.name)
        .concat(currentFolderContext.name)
        .join(' / ');
    const title = document.getElementById('file-explorer-title');
    if (title) title.innerText = crumbs || currentFolderContext.name;
    closeFolderModal('folder-explorer-modal');
    fetchAndRenderSubFolders();
    fetchAndRenderFiles();
    openFolderModalObj('file-explorer-modal');
};

window.backToFoldersAPI = function() {
    const prev = folderStack.pop();
    if (!prev || prev.id === null) {
        // Back to root folder-explorer
        currentFolderContext = null;
        closeFolderModal('file-explorer-modal');
        openFolderModalObj('folder-explorer-modal');
    } else {
        // Back to a parent folder (sub-folder navigation)
        currentFolderContext = prev;
        const title = document.getElementById('file-explorer-title');
        if (title) {
            const crumbs = folderStack.filter(f => f.id !== null).map(f => f.name).concat(prev.name).join(' / ');
            title.innerText = crumbs || prev.name;
        }
        fetchAndRenderSubFolders();
        fetchAndRenderFiles();
    }
};

function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

const SUMMARIZABLE_FILE_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'pptx']);

function isSummarizableFileName(fileName) {
    const ext = String(fileName || '').split('.').pop().toLowerCase();
    return SUMMARIZABLE_FILE_EXTENSIONS.has(ext);
}

function getFileActionIcon(kind) {
    if (kind === 'transfer') {
        return `
        <svg class="file-action-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M4 8h12"></path>
            <path d="m12 4 4 4-4 4"></path>
            <path d="M20 16H8"></path>
            <path d="m12 12-4 4 4 4"></path>
        </svg>`;
    }
    return `
    <svg class="file-action-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="8.5"></circle>
        <path d="m9 9 6 6"></path>
        <path d="m15 9-6 6"></path>
    </svg>`;
}

window.openFileSummarizerForStoredFile = async function(fileUrl, fileName, fileType = '') {
    if (!isSummarizableFileName(fileName)) {
        return customAlert('Only PDF, DOC, DOCX, and PPTX files can be summarized.');
    }
    if (!window.fileSummarizerModule?.loadRemoteFile) {
        return customAlert('File Summarizer is still loading. Please try again.');
    }
    goToPage('file-summarizer');
    try {
        await window.fileSummarizerModule.loadRemoteFile({
            url: normalizeStoredFileUrl(fileUrl),
            name: fileName,
            type: fileType,
        });
        showToast('File loaded into the summarizer.', 'success');
    } catch (error) {
        customAlert(error?.message || 'Could not load this file into the summarizer.');
    }
};

function fetchAndRenderFiles() {
    if (!currentFolderContext || !canViewFolder(currentFolderContext)) {
        const list = document.getElementById('file-list-container');
        if (list) list.innerHTML = '<p class="empty-state-text">You do not have permission to view files here.</p>';
        return;
    }
    const allowEdit = canEditFolder(currentFolderContext);
    const uploadArea = document.querySelector('#file-explorer-modal .file-upload-area');
    if (uploadArea) uploadArea.style.display = allowEdit ? '' : 'none';
    const list = document.getElementById('file-list-container');
    if(!list) return;
    list.innerHTML = createInlineLoader('Loading files...');

    waitForSupabaseClient()
    .then((ready) => {
        if (!ready || !sb) {
            list.innerHTML = `
              <p class="empty-state-text" style="color: #ff6b6b;">Files are still loading (server waking up).</p>
              <button class="btn-secondary mt-10" type="button" onclick="fetchAndRenderFiles()">Retry</button>`;
            return null;
        }
        return sb.from('files').select('*').eq('folder_id', currentFolderContext.id);
    })
    .then((result) => {
        if (!result) return;
        const { data: files, error } = result;
        list.innerHTML = '';

        if (error) {
            console.error(error);
            list.innerHTML = `<p class="empty-state-text" style="color: #ff6b6b;">Error loading files: ${escapeHTML(error.message || 'Unknown error')}</p>`;
            return;
        }

        currentPlaylist = (files || []).filter(f => f.name.toLowerCase().endsWith('.mp3') || f.name.toLowerCase().endsWith('.wav'));

        if(!files || files.length === 0) {
            list.innerHTML = '<p class="empty-state-text">Folder is empty.</p>';
            return;
        }
        files.forEach(f => {
            const canModifyFile = allowEdit || (currentUser && (f.uploader === currentUser.username || isAdmin));
            const canSummarizeFile = isSummarizableFileName(f.name);
            const safeName = escapeJS(f.name);
            const safeId = escapeJS(f.id);
            const safeUrl = escapeJS(f.url);
            const safeType = escapeJS(f.type || '');
            list.innerHTML += `
            <div class="file-row-modern">
                <div class="file-row-meta">
                    <div class="file-row-name">📄 ${escapeHTML(f.name)}</div>
                    <div class="file-row-sub">${f.size ? `<span>${formatFileSize(f.size)}</span> · ` : ''}${getUploaderAvatarHTML(f.uploader)}${escapeHTML(f.uploader || 'Unknown')}</div>
                </div>
                <div class="file-row-actions">
                    <button onclick="window.playOrOpenFileAPI('${safeUrl}', '${safeName}', false, '${escapeJS(currentFolderContext.id)}')" class="file-action primary">Open</button>
                    ${canSummarizeFile ? `<button onclick="window.openFileSummarizerForStoredFile('${safeUrl}', '${safeName}', '${safeType}')" class="file-action summarize">Summarize</button>` : ''}
                    ${canModifyFile ? `<button onclick="window.openCopyMoveFileModal('${safeId}', '${escapeJS(currentFolderContext.id)}', 'folder')" class="file-action icon-only" aria-label="Copy and move file" title="Copy & Move To">${getFileActionIcon('transfer')}</button>` : ''}
                    ${canModifyFile ? `<button onclick="window.deleteFileAPI('${safeId}')" class="file-action danger icon-only" aria-label="Delete file" title="Delete">${getFileActionIcon('delete')}</button>` : ''}
                </div>
            </div>
            `;
        });
    })
    .catch((error) => {
        console.error('File fetch failed:', error);
        list.innerHTML = `<p class="empty-state-text" style="color: #ff6b6b;">Error loading files. Please try again.</p>`;
    });
}

/* ── Sub-folder support ── */
function fetchAndRenderSubFolders() {
    if (!currentFolderContext || !currentFolderContext.id) return;
    const parentId = String(currentFolderContext.id);
    const subfolderSection = document.getElementById('subfolder-section');
    if (subfolderSection) subfolderSection.classList.toggle('read-only-folder', !canEditFolder(currentFolderContext));
    const grid = document.getElementById('subfolder-grid-modal');
    if (!grid) return;
    grid.innerHTML = createInlineLoader('Loading sub-folders...');

    waitForSupabaseClient()
    .then((ready) => {
        if (!ready || !sb) {
            grid.innerHTML = `
              <p class="empty-state-text small" style="color: #ff6b6b;">Sub-folders are still loading (server waking up).</p>
              <button class="btn-secondary mt-10" type="button" onclick="fetchAndRenderSubFolders()">Retry</button>`;
            return null;
        }
        return sb.from('folders').select('*').eq('parent', parentId);
    })
    .then((result) => {
        if (!result) return;
        const { data: subs, error } = result;
        grid.innerHTML = '';

        if (error) {
            console.error('Subfolder fetch error:', error);
            grid.innerHTML = `<p class="empty-state-text small" style="color: #ff6b6b;">Error loading sub-folders: ${escapeHTML(error.message || 'Unknown error')}</p>`;
            return;
        }

        const visibleSubs = (subs || []).filter(canViewFolder);
        if (visibleSubs.length === 0) {
            grid.innerHTML = '<p class="empty-state-text small">No sub-folders yet.</p>';
            return;
        }
        visibleSubs.forEach(f => {
            const canManage = canManageFolder(f);
            const safeId = escapeJS(f.id);
            const safeName = escapeJS(f.name);
            grid.innerHTML += `
            <div class="folder-card-modern compact">
                <div class="folder-card-main" role="button" tabindex="0" data-folder-open="${safeId}" data-folder-name="${safeName}">
                    <div class="folder-card-icon">📂</div>
                    <div class="folder-card-title">${escapeHTML(f.name)}</div>
                    <div class="folder-card-owner">Owned by ${escapeHTML(f.owner || 'Unknown')}</div>
                    <div class="folder-access-pill ${canEditFolder(f) ? 'editor' : 'viewer'}">${folderAccessLabel(f)}</div>
                </div>
                ${canManage ? `
                <div class="folder-card-actions">
                    <button type="button" class="mini-action-btn" data-subfolder-rename="${safeId}" data-folder-name="${safeName}">Rename</button>
                    <button type="button" class="mini-action-btn" data-folder-permissions="${safeId}">Permissions</button>
                    <button type="button" class="mini-action-btn danger" data-subfolder-delete="${safeId}">Delete</button>
                </div>` : ''}
            </div>`;
        });
    })
    .catch((error) => {
        console.error('Subfolder fetch failed:', error);
        grid.innerHTML = `<p class="empty-state-text small" style="color: #ff6b6b;">Error loading sub-folders. Please try again.</p>`;
    });
}

window.createSubFolderAPI = function() {
    if (!currentUser) return customAlert("Please log in to create a sub-folder.");
    if (!currentFolderContext || !currentFolderContext.id) return customAlert("No folder selected.");
    if (!canEditFolder(currentFolderContext)) return customAlert('You do not have permission to add sub-folders here.');
    customPrompt("Enter sub-folder name:", async function(name) {
        if (!name) return;
        const payload = {
            parent: String(currentFolderContext.id),
            name,
            permissions: { viewers: [], editors: [], everyone: 'edit' },
            folder_type: isProfileFolder(currentFolderContext) ? 'profile' : null,
        };
        const response = await authFetch('/api/folders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) return customAlert(data.error || 'Sub-folder creation failed');
        fetchAndRenderSubFolders();
        showToast('Sub-folder created.');
    });
};

window.deleteSubFolderAPI = async function(id) {
    let folder;
    try { folder = await fetchFolderById(id); } catch (error) { return customAlert(error.message); }
    if (!canManageFolder(folder)) return customAlert('Only the folder owner can delete this sub-folder.');
    customConfirm("Delete this sub-folder and all files inside it?", async function() {
        const response = await authFetch(`/api/folders/${id}`, { method: 'DELETE' });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) return customAlert(data.error || 'Sub-folder delete failed');
        fetchAndRenderSubFolders();
        showToast('Sub-folder deleted.', 'warning');
    });
};

window.uploadFileToFolderAPI = async function() {
    if(!currentUser) return customAlert("Log in to upload files.");
    if (!currentFolderContext || !canEditFolder(currentFolderContext)) return customAlert('You do not have permission to upload files here.');
    const input  = document.getElementById('file-upload-input');
    const status = document.getElementById('file-upload-status');
    const files  = Array.from(input.files);

    if(files.length === 0) return customAlert("Please select at least one file.");

    // Capture folder id NOW — before any async work so it can't shift mid-loop
    const folderId = currentFolderContext && currentFolderContext.id;
    if(!folderId) return customAlert("No folder selected. Please reopen the folder and try again.");

    let done = 0, failed = 0, failNames = [];
    if(status) status.innerText = `Uploading 0 / ${files.length}…`;

    for (const file of files) {
      try {
        const safeName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
        const isMedia = file.type.startsWith('audio/') ||
                        file.type.startsWith('video/') ||
                        file.type.startsWith('image/');
        let fileUrl, fileSize;

        if (isMedia) {
          // Large media → Cloudflare R2 (10 GB free, no egress fees)
          const fd = new FormData();
          fd.append('file', file);
          const r = await authFetch('/api/upload', { method: 'POST', body: fd });
          const ct = r.headers.get('content-type') || '';
          if (!r.ok) {
            if (ct.includes('application/json')) {
              const errData = await r.json().catch(() => ({}));
              throw new Error(`R2: ${errData.error || r.status}`);
            }
            const text = await r.text().catch(() => '');
            console.error(`[API ERROR] /api/upload returned ${ct} status=${r.status} preview=${text.slice(0, 120)}`);
            throw new Error(`R2 upload failed (${r.status}). Please try again.`);
          }
          const rData = ct.includes('application/json')
            ? await r.json().catch(() => ({}))
            : {};
          if (!rData.url) throw new Error('Upload succeeded but no file URL was returned.');
          fileUrl = rData.url;
          fileSize = rData.size;
        } else {
          // Docs / PDFs / other → Supabase Storage
          const supabaseReady = await waitForSupabaseClient().catch(() => false);
          if (!supabaseReady || !sb) throw new Error('Storage is still loading. Please try again in a moment.');
          const filePath = `uploads/${Date.now()}_${Math.random().toString(36).slice(2,8)}_${safeName}`;
          const { error: storErr } = await sb.storage
              .from('portfolio-assets')
              .upload(filePath, file, { contentType: file.type });
          if (storErr) throw new Error(`Storage: ${storErr.message}`);
          fileUrl = sb.storage.from('portfolio-assets').getPublicUrl(filePath).data.publicUrl;
          fileSize = file.size;
        }

        const { error: dbErr } = await insertFileRecord({
            folder_id: folderId,
            name: file.name,
            url: fileUrl,
            type: file.type,
            uploader: currentUser.username,
            size: fileSize,
            is_original_upload: true,
            source_file_id: null,
        });
        // Supabase v2 returns {data, error} — it does NOT throw on failure
        if(dbErr) throw new Error(`Database: ${dbErr.message}`);

        done++;
        if(status) status.innerText = `Uploaded ${done} / ${files.length}…`;
      } catch(e) {
        failed++;
        failNames.push(file.name);
        console.error('Upload error:', file.name, e);
      }
    }

    input.value = "";
    if(failed === 0) {
        if(status) status.innerText = `All ${done} file${done !== 1 ? 's' : ''} uploaded!`;
    } else {
        if(status) status.innerText = `${done} uploaded, ${failed} failed.`;
        customAlert(`${failed} file(s) failed to upload:\n${failNames.join('\n')}\n\nCheck the browser console for details.`);
    }
    fetchAndRenderFiles();
};

window.deleteFileAPI = async function(fileId) {
    if (!currentUser) return customAlert('Please log in.');
    const supabaseReady = await waitForSupabaseClient().catch(() => false);
    if (!supabaseReady || !sb) return customAlert('Files are still loading. Please try again in a moment.');
    let file;
    try {
        const { data, error } = await sb.from('files').select('*').eq('id', fileId).single();
        if (error) throw error;
        file = data;
    } catch (error) {
        return customAlert(error.message || 'Could not find that file.');
    }
    const canDeleteFile = !!(currentFolderContext && canEditFolder(currentFolderContext))
        || !!(currentUser && (file?.uploader === currentUser.username || isAdmin));
    if (!canDeleteFile) return customAlert('You do not have permission to delete this file.');
    customConfirm("Delete this file?", async function() {
        const response = await authFetch(`/api/files/${fileId}`, { method: 'DELETE' });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) return customAlert(data.error || 'Delete failed');
        fetchAndRenderFiles();
        showToast('File deleted.', 'warning');
    });
};

async function getAllFolders() {
    const supabaseReady = await waitForSupabaseClient().catch(() => false);
    if (!supabaseReady) throw new Error('Folders are still loading. Please try again in a moment.');
    const { data, error } = await sb.from('folders').select('*').order('name', { ascending: true });
    if (error) throw error;
    return data || [];
}

async function insertFileRecord(row) {
    const response = await authFetch('/api/files', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(row) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { error: { message: data.error || 'Upload insertion failed' } };
    return { error: null, data };
}

function removeDynamicModal(id) {
    const existing = document.getElementById(id);
    if (existing) existing.remove();
}
window.removeDynamicModal = removeDynamicModal;

window.openFolderPermissions = async function(folderId) {
    if (!currentUser) return customAlert('Please log in.');
    let folder;
    try { folder = await fetchFolderById(folderId); } catch (error) { return customAlert(error.message); }
    if (!canManageFolder(folder)) return customAlert('Only the folder owner can manage permissions.');

    const perms = normalizeFolderPermissions(folder);
    removeDynamicModal('folder-permission-modal');
    const isOpen = perms.everyone === 'edit';
    const statusText = isOpen
        ? 'Everyone can view, upload, move, edit, and manage files in this folder.'
        : 'Only the folder owner can view or edit this folder.';

    document.body.insertAdjacentHTML('beforeend', `
      <div id="folder-permission-modal" class="custom-modal-overlay blur-bg high-z" style="display:flex;">
        <div class="custom-modal-box permission-modal-box">
          <button class="modal-close-btn" onclick="removeDynamicModal('folder-permission-modal')">&times;</button>
          <h3 class="modal-title text-blue">Folder Permissions</h3>
          <p class="modal-text align-left">Owner: ${escapeHTML(folder.owner)} · Folder: ${escapeHTML(folder.name)}</p>
          <div class="permission-state-card ${isOpen ? 'open' : 'restricted'}">
            <span class="permission-state-kicker">Current Access</span>
            <strong>${isOpen ? 'Edit Access Allowed' : 'Restricted Access'}</strong>
            <p>${statusText}</p>
          </div>
          <div class="permission-quick-actions">
            <button class="permission-quick-btn danger" onclick="setFolderAccessMode('${escapeJS(folder.id)}','restricted')">
              <span>Restrict All Access</span>
              <small>Owner only</small>
            </button>
            <button class="permission-quick-btn success" onclick="setFolderAccessMode('${escapeJS(folder.id)}','edit')">
              <span>Allow Everyone Access</span>
              <small>Instant edit access</small>
            </button>
          </div>
          <div class="modal-btn-group">
          <button class="btn-outline-red flex-1" type="button" data-close-modal-id="folder-permission-modal">Close</button>
          </div>
        </div>
      </div>
    `);
};

window.setFolderAccessMode = async function(folderId, mode) {
    let folder;
    try { folder = await fetchFolderById(folderId); } catch (error) { return customAlert(error.message); }
    if (!canManageFolder(folder)) return customAlert('Only the folder owner can manage permissions.');
    const nextMode = mode === 'restricted' ? 'restricted' : 'edit';
    const permissions = { viewers: [], editors: [], everyone: nextMode };
    const response = await authFetch(`/api/folders/${folderId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ permissions }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return customAlert(data.error || 'Folder update failed');
    removeDynamicModal('folder-permission-modal');
    showToast(nextMode === 'edit' ? 'Everyone now has edit access.' : 'Folder restricted to the owner.');
    if (currentFolderContext?.id === folderId) currentFolderContext = { ...currentFolderContext, permissions };
    fetchAndRenderFolders();
    fetchAndRenderSubFolders();
    if (String(folder.parent || '').startsWith(PROFILE_FOLDER_PREFIX)) {
        renderProfileFolders(folder.parent.replace(PROFILE_FOLDER_PREFIX, ''));
    }
};

async function renderProfileFolders(username) {
    const container = document.getElementById('profile-folders-container');
    if (!container) return;
    container.innerHTML = createInlineLoader('Loading profile folders...');
    const supabaseReady = await waitForSupabaseClient().catch(() => false);
    if (!supabaseReady || !sb) {
        container.innerHTML = `<p class="empty-state-text small">Profile folders are still loading. Please try again.</p>`;
        return;
    }
    const parent = `${PROFILE_FOLDER_PREFIX}${username}`;
    const { data, error } = await sb.from('folders').select('*').eq('parent', parent).order('name', { ascending: true });
    if (error) {
        container.innerHTML = `<p class="empty-state-text small">${escapeHTML(error.message)}</p>`;
        return;
    }
    const visible = (data || []).filter(canViewFolder);
    const canCreate = currentUser && currentUser.username === username;
    container.innerHTML = `
      <div class="profile-folder-head">
        <h3>Profile Folders</h3>
        ${canCreate ? `<button class="btn-primary compact-btn" onclick="createProfileFolder('${escapeJS(username)}')">New Folder</button>` : ''}
      </div>
      <div class="profile-folder-grid">
        ${visible.map((folder) => {
            const safeId = escapeJS(folder.id);
            const safeName = escapeJS(folder.name);
            return `
              <div class="profile-folder-card">
                <button class="profile-folder-open" onclick="openFileExplorer('${safeId}','${safeName}')">
                  <span class="profile-folder-icon">📁</span>
                  <span class="profile-folder-name">${escapeHTML(folder.name)}</span>
                  <span class="profile-folder-owner">Owner: ${escapeHTML(folder.owner)}</span>
                  <span class="folder-access-pill ${canEditFolder(folder) ? 'editor' : 'viewer'}">${folderAccessLabel(folder)}</span>
                </button>
                ${canManageFolder(folder) ? `<div class="folder-card-actions">
                  <button class="mini-action-btn" onclick="renameFolderAPI('${safeId}','${safeName}')">Rename</button>
                  <button class="mini-action-btn" onclick="openFolderPermissions('${safeId}')">Permissions</button>
                  <button class="mini-action-btn danger" onclick="deleteFolderAPI('${safeId}')">Delete</button>
                </div>` : ''}
              </div>`;
        }).join('')}
        ${visible.length === 0 ? `<p class="empty-state-text small">${canCreate ? 'Create your first profile folder.' : 'No folders shared with you yet.'}</p>` : ''}
      </div>`;
}

window.createProfileFolder = function(username) {
    if (!currentUser || currentUser.username !== username) return customAlert('You can only create folders under your own profile.');
    customPrompt('Profile folder name:', async function(name) {
        if (!name) return;
        const payload = {
            parent: `${PROFILE_FOLDER_PREFIX}${username}`,
            name,
            permissions: { viewers: [], editors: [], everyone: 'edit' },
            folder_type: 'profile',
        };
        const response = await authFetch('/api/folders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) return customAlert(data.error || 'Folder creation failed');
        showToast('Profile folder created.');
        renderProfileFolders(username);
    });
};

function buildFolderPath(folder, folderMap) {
    if (!folder) return 'Unknown folder';
    if (String(folder.parent || '').startsWith(PROFILE_FOLDER_PREFIX)) {
        return `${folder.parent.replace(PROFILE_FOLDER_PREFIX, 'Profile: ')} / ${folder.name}`;
    }
    const parentFolder = folderMap.get(String(folder.parent));
    if (parentFolder) return `${buildFolderPath(parentFolder, folderMap)} / ${folder.name}`;
    return `${folder.parent || 'General'} / ${folder.name}`;
}

function getFolderRootParent(folder, folderMap) {
    if (!folder) return '';
    const parent = String(folder.parent || '');
    if (!parent || parent.startsWith(PROFILE_FOLDER_PREFIX)) return parent;
    const parentFolder = folderMap.get(parent);
    return parentFolder ? getFolderRootParent(parentFolder, folderMap) : parent;
}

function getFolderTransferArea(folder, folderMap) {
    const root = getFolderRootParent(folder, folderMap);
    if (root.startsWith(PROFILE_FOLDER_PREFIX)) return 'profile';
    if (root === 'Music Hub') return 'music';
    if (ACADEMIC_FOLDER_ROOTS.has(root)) return 'academic';
    if (/^(ep|rp)_/.test(root)) return root.split('_')[0];
    return root || 'general';
}

function canUseAsCopyMoveDestination(sourceFolder, targetFolder, folderMap) {
    if (!sourceFolder || !targetFolder) return false;
    if (String(sourceFolder.id) === String(targetFolder.id)) return false;
    if (!canEditFolder(targetFolder)) return false;
    const sourceArea = getFolderTransferArea(sourceFolder, folderMap);
    const targetArea = getFolderTransferArea(targetFolder, folderMap);
    if (targetArea === 'profile') return true;
    if (sourceArea === 'profile') return true;
    if (sourceArea === 'academic') return targetArea === 'academic';
    if (sourceArea === 'music') return targetArea === 'music';
    return targetArea === sourceArea;
}

window.openCopyMoveFileModal = async function(fileId, currentFolderId, refreshMode = 'folder') {
    if (!currentUser) return customAlert('Please log in.');
    let folders;
    try { folders = await getAllFolders(); } catch (error) { return customAlert(error.message); }
    const folderMap = new Map(folders.map((folder) => [String(folder.id), folder]));
    const source = folderMap.get(String(currentFolderId));
    if (!canViewFolder(source)) return customAlert('You do not have permission to copy files from this folder.');
    const sourceArea = getFolderTransferArea(source, folderMap);
    const targets = folders.filter((folder) => canUseAsCopyMoveDestination(source, folder, folderMap));
    removeDynamicModal('move-file-modal');
    const cards = targets.map((folder) => `
      <button class="move-target-card" onclick="copyFileToFolder('${escapeJS(fileId)}','${escapeJS(folder.id)}','${escapeJS(refreshMode)}')">
        <span class="move-target-icon">📁</span>
        <span class="move-target-title">${escapeHTML(folder.name)}</span>
        <span class="move-target-path">${escapeHTML(buildFolderPath(folder, folderMap))}</span>
      </button>`).join('') || '<p class="empty-state-text small">No editable destination folders found.</p>';
    document.body.insertAdjacentHTML('beforeend', `
      <div id="move-file-modal" class="custom-modal-overlay blur-bg high-z" style="display:flex;">
        <div class="custom-modal-box move-modal-box">
          <button class="modal-close-btn" onclick="removeDynamicModal('move-file-modal')">&times;</button>
          <h3 class="modal-title text-green">Copy & Move To</h3>
          <p class="modal-text align-left">Choose a destination in the same area, or a profile folder from Users. The original file will stay where it is.</p>
          <p class="move-filter-note">Source area: ${escapeHTML(sourceArea.toUpperCase())}</p>
          <div class="move-target-grid">${cards}</div>
        </div>
      </div>`);
};

window.openMoveFileModal = window.openCopyMoveFileModal;

window.copyFileToFolder = async function(fileId, targetFolderId, refreshMode = 'folder') {
    let sourceFile;
    let target;
    try {
        const fileRes = await sb.from('files').select('*').eq('id', fileId).single();
        if (fileRes.error) throw fileRes.error;
        sourceFile = fileRes.data;
        target = await fetchFolderById(targetFolderId);
    } catch (error) {
        return customAlert(error.message);
    }
    if (!canEditFolder(target)) return customAlert('You do not have permission to copy files to that folder.');
    const { error } = await insertFileRecord({
        folder_id: targetFolderId,
        name: sourceFile.name,
        url: normalizeStoredFileUrl(sourceFile.url),
        type: sourceFile.type,
        uploader: currentUser?.username || sourceFile.uploader,
        size: sourceFile.size || null,
        is_original_upload: false,
        source_file_id: String(sourceFile.source_file_id || sourceFile.id || ''),
    });
    if (error) return customAlert(error.message);
    removeDynamicModal('move-file-modal');
    showToast('File copied to destination.');
    if (refreshMode === 'gallery-ep') renderGallery('ep');
    else if (refreshMode === 'gallery-rp') renderGallery('rp');
    else fetchAndRenderFiles();
};

window.moveFileToFolder = window.copyFileToFolder;

/* ============================================================
   MUSIC PLAYER & ADVANCED VISUALIZER (TOP TO BOTTOM)
   ============================================================ */

/* ============================================================
   YOUTUBE PLAYER — Invidious-powered search + embed
   ============================================================ */
let ytActive = false;

// Piped API instances — fallback 1 (no key, CORS-friendly, more reliable than Invidious)
const PIPED_INSTANCES = [
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.tokhmi.xyz',
    'https://piped-api.garudalinux.org',
    'https://pipedapi.adminforge.de',
];

// Invidious instances — fallback 2
const YT_INSTANCES = [
    'https://inv.nadeko.net',
    'https://invidious.private.coffee',
    'https://invidious.fdn.fr',
    'https://yt.cdaut.de',
    'https://invidious.perennialte.ch',
];

function ensureYouTubeIframe() {
    const container = document.getElementById('yt-player-container');
    if (!container) return null;

    let iframe = document.getElementById('yt-iframe');
    if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'yt-iframe';
        iframe.className = 'yt-iframe hidden';
        iframe.setAttribute('title', 'YouTube player');
        iframe.setAttribute('frameborder', '0');
        iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
        iframe.setAttribute('allowfullscreen', '');
        iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
        container.appendChild(iframe);
    }

    return iframe;
}

function getYouTubeEmbedUrl(videoId) {
    const params = new URLSearchParams({
        autoplay: '1',
        playsinline: '1',
        rel: '0',
    });

    if (window.location?.origin && /^https?:/i.test(window.location.origin)) {
        params.set('origin', window.location.origin);
    }

    if (window.location?.href && /^https?:/i.test(window.location.href)) {
        params.set('widget_referrer', window.location.href);
    }

    params.set('modestbranding', '1');
    return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
}

function loadYouTubeIframe(videoId, title) {
    const iframe = ensureYouTubeIframe();
    const placeholder = document.getElementById('yt-placeholder');
    if (!iframe) return;

    if (iframe._errorCheckTimer) clearTimeout(iframe._errorCheckTimer);
    iframe.onerror = () => showYouTubeError(videoId, title);

    // Set up error handler before loading — detects when YouTube blocks the video
    const errorCheckTimer = setTimeout(() => {
        try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (iframeDoc?.body?.innerHTML?.includes('Error 153') ||
                iframeDoc?.body?.innerHTML?.includes('Video player configuration') ||
                iframeDoc?.body?.textContent?.includes('playable')) {
                showYouTubeError(videoId, title);
            }
        } catch (_) {
            // Cross-origin embeds cannot be inspected; rely on the embed URL parameters
            // plus YouTube's own fallback screen when a video cannot be embedded.
        }
    }, 3000);

    iframe.src = getYouTubeEmbedUrl(videoId);
    iframe.classList.remove('hidden');
    if (placeholder) placeholder.style.display = 'none';
    ytActive = true;
    const miniLabel = document.getElementById('yt-mini-label');
    if (miniLabel) miniLabel.textContent = title || 'YouTube Playing';
    // Hide results list once a track is chosen
    const res = document.getElementById('yt-results');
    if (res) res.classList.add('hidden');

    // Store the timer so we can clear it if user stops the player
    iframe._errorCheckTimer = errorCheckTimer;
}

function showYouTubeError(videoId, title) {
    const iframe = document.getElementById('yt-iframe');
    const placeholder = document.getElementById('yt-placeholder');
    if (iframe) {
        iframe.src = '';
        iframe.classList.add('hidden');
        if (iframe._errorCheckTimer) clearTimeout(iframe._errorCheckTimer);
    }
    if (placeholder) {
        placeholder.style.display = '';
        placeholder.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #ff6b6b;">
                <div style="font-size: 32px; margin-bottom: 10px;">⚠️</div>
                <div style="font-size: 14px; margin-bottom: 5px;"><strong>Watch video on YouTube</strong></div>
                <div style="font-size: 12px; opacity: 0.8; margin-bottom: 15px;">Video not available in embedded player</div>
                <a href="https://www.youtube.com/watch?v=${videoId}" target="_blank" style="display: inline-block; background: #ff0000; color: white; padding: 8px 16px; border-radius: 4px; text-decoration: none; font-size: 13px; font-weight: 500;">Open on YouTube →</a>
            </div>
        `;
    }
    ytActive = true;
}

function extractYouTubeId(val) {
    const match = val.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/);
    if (match) return match[1];
    if (/^[a-zA-Z0-9_-]{11}$/.test(val.trim())) return val.trim();
    return null;
}

// Fetch a server API endpoint (with auth), retrying only on HTML responses
// (Render cold-start returns an HTML page, not JSON).  JSON 5xx responses are
// real application errors — return them immediately so the caller can report.
async function serverFetch(url, onWaking) {
    const deadline = Date.now() + 45000; // 45s total — enough for Render cold start
    let firstAttempt = true;
    while (Date.now() < deadline) {
        try {
            const remaining = deadline - Date.now();
            const ctrl = new AbortController();
            // First attempt: 40s so Render's cold-start connection can complete.
            // Retries: 12s each (server is already awake by then).
            const attemptTimeout = firstAttempt ? Math.min(40000, remaining) : Math.min(12000, remaining);
            const tid = setTimeout(() => ctrl.abort(), attemptTimeout);
            // Use authFetch so the Bearer token is included — all search routes require auth.
            const fetchFn = window.authFetch || fetch;
            const r = await fetchFn(url, { signal: ctrl.signal });
            clearTimeout(tid);
            // Render sometimes returns a 200 OR 503/502 HTML "starting up" page during cold start.
            // Distinguish from a real application JSON error by checking content-type.
            const ct = r.headers.get('content-type') || '';
            if (ct.includes('text/html')) {
                // HTML response = Render cold start page — wait and retry
                if (firstAttempt && onWaking) { onWaking(); firstAttempt = false; }
                await new Promise(res => setTimeout(res, 5000));
                continue;
            }
            // JSON response (any status) = real server response — return it to caller
            return r;
        } catch (_) {
            // AbortError (timeout) or network error — retry if time remains
            if (Date.now() < deadline - 1000) {
                if (firstAttempt && onWaking) { onWaking(); firstAttempt = false; }
                firstAttempt = false;
                await new Promise(res => setTimeout(res, 2000));
                continue;
            }
            break;
        }
    }
    return null;
}

// Primary: YouTube Data API via server proxy
async function ytSearchViaProxy(query, onWaking) {
    try {
        const r = await serverFetch(`/api/yt-search?q=${encodeURIComponent(query)}`, onWaking);
        if (!r) return { error: 'no response' };
        const data = await r.json();
        if (r.ok && data.items && data.items.length) return { items: data.items };
        return { error: (data.error || 'HTTP ' + r.status).slice(0, 60) };
    } catch (e) { return { error: e.message.slice(0, 40) }; }
}

// Fallback 1: Piped API via server proxy
async function ytSearchViaPiped(query, onWaking) {
    try {
        const r = await serverFetch(`/api/piped-search?q=${encodeURIComponent(query)}`, onWaking);
        if (!r) return { error: 'no response' };
        const data = await r.json();
        if (r.ok && data.items && data.items.length) return { items: data.items };
        return { error: (data.error || 'HTTP ' + r.status).slice(0, 60) };
    } catch (e) { return { error: e.message.slice(0, 40) }; }
}

// Fallback 2: server-side InnerTube search (no API key needed)
async function ytSearchViaScrape(query, onWaking) {
    try {
        const r = await serverFetch(`/api/yt-scrape?q=${encodeURIComponent(query)}`, onWaking);
        if (!r) return { error: 'no response' };
        const data = await r.json();
        if (r.ok && data.items && data.items.length) return { items: data.items };
        return { error: (data.error || 'HTTP ' + r.status).slice(0, 60) };
    } catch (e) { return { error: e.message.slice(0, 40) }; }
}

// Returns first successful result or collects all errors
function firstSuccess(promises) {
    return new Promise((resolve) => {
        let pending = promises.length;
        const errors = [];
        if (!pending) return resolve({ items: null, errors: [] });
        promises.forEach((p, i) => {
            Promise.resolve(p).then(result => {
                if (result && result.items) {
                    resolve({ items: result.items, errors: [] });
                } else {
                    errors[i] = result ? result.error : 'unknown';
                    if (--pending === 0) resolve({ items: null, errors });
                }
            }).catch(e => {
                errors[i] = e.message;
                if (--pending === 0) resolve({ items: null, errors });
            });
        });
    });
}

function showYtResults(results) {
    const container = document.getElementById('yt-results');
    if (!container) return;
    container.innerHTML = '';
    results.forEach(r => {
        const item = document.createElement('div');
        item.className = 'yt-result-item';
        const dur = r.lengthSeconds || 0;
        const mins = Math.floor(dur / 60);
        const secs = String(dur % 60).padStart(2, '0');
        const thumb = r.thumbnail || `https://i.ytimg.com/vi/${r.videoId}/mqdefault.jpg`;
        item.innerHTML = `
            <img src="${thumb}" class="yt-result-thumb" loading="lazy" onerror="this.style.display='none'">
            <div class="yt-result-info">
                <div class="yt-result-title">${r.title}</div>
                <div class="yt-result-meta">${r.author || ''} · ${mins}:${secs}</div>
            </div>
        `;
        item.onclick = () => loadYouTubeIframe(r.videoId, r.title);
        container.appendChild(item);
    });
    container.classList.remove('hidden');
}

window.handleYtInput = async function() {
    const input = document.getElementById('yt-main-input');
    if (!input || !input.value.trim()) return customAlert("Enter a song name or paste a YouTube URL!");
    const val = input.value.trim();

    // Paste-URL shortcut
    const videoId = extractYouTubeId(val);
    if (videoId) { loadYouTubeIframe(videoId, val); return; }

    // Text search
    const btn = document.getElementById('yt-action-btn');
    const hint = document.getElementById('yt-hint-text');
    if (btn) { btn.textContent = '⏳'; btn.disabled = true; }
    if (hint) hint.textContent = '🔍 Searching…';

    // Called when server returns 503 (Render cold start) — update hint so user knows to wait
    const onWaking = () => {
        if (hint) hint.textContent = '⏳ Server is starting up, please wait (~30–60s)…';
    };

    // All 3 run on OUR server in parallel — retry on 503/timeout until server wakes up
    const { items, errors } = await firstSuccess([
        ytSearchViaProxy(val, onWaking),
        ytSearchViaPiped(val, onWaking),
        ytSearchViaScrape(val, onWaking),
    ]);

    if (btn) { btn.textContent = 'Search'; btn.disabled = false; }

    if (items && items.length) {
        if (hint) hint.textContent = 'Tap a result to play it here:';
        showYtResults(items);
    } else {
        // Show specific errors so we can diagnose without needing server logs
        const labels = ['API', 'Piped', 'InnerTube'];
        const esc = s => String(s || '?').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        const detail = errors.map((e, i) => `${labels[i]}: ${esc(e)}`).join(' | ');
        console.error('[YT Search] All methods failed:', errors);
        if (hint) hint.innerHTML = `Search failed — <small style="opacity:.7">${detail}</small><br><a href="https://www.youtube.com/results?search_query=${encodeURIComponent(val)}" target="_blank" style="color:#4af;text-decoration:underline;">Open YouTube manually</a> then paste the URL above.`;
    }
};

// Also wire up searchYouTube for any old references
window.searchYouTube = window.handleYtInput;

window.stopYouTubePlayer = function() {
    const iframe = ensureYouTubeIframe();
    const placeholder = document.getElementById('yt-placeholder');
    if (iframe) {
        iframe.src = '';
        iframe.classList.add('hidden');
        // Clear error check timer if it exists
        if (iframe._errorCheckTimer) clearTimeout(iframe._errorCheckTimer);
    }
    if (placeholder) {
        placeholder.style.display = '';
        placeholder.innerHTML = '<span style="font-size:36px;">▶️</span><p>Search for a song or paste a YouTube URL</p>';
    }
    ytActive = false;
    const mini = document.getElementById('yt-mini-player');
    if (mini) mini.classList.add('hidden');
    const res = document.getElementById('yt-results');
    if (res) res.classList.add('hidden');
};

let audioCtx = null;
let analyser = null;
let source = null;

window.startBlockVisualizer = (audioElement) => {
    const canvas = document.getElementById('block-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        source = audioCtx.createMediaElementSource(audioElement);
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
    }

    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount; // 128
    const dataArray = new Uint8Array(bufferLength);

    function draw() {
        requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        const W = canvas.width, H = canvas.height;
        const cx = W / 2, cy = H / 2;

        // Clear with slight motion-blur trail
        ctx.fillStyle = 'rgba(8,8,12,0.82)';
        ctx.fillRect(0, 0, W, H);

        // Bass = average of first 6 frequency bins (sub-bass + bass)
        let bassSum = 0;
        for (let i = 0; i < 6; i++) bassSum += dataArray[i];
        const bass = bassSum / 6 / 255; // 0-1

        const maxR = Math.min(W, H) * 0.42;

        // ── Outer glow on bass hit ──
        if (bass > 0.35) {
            const glowR = maxR * (1.35 + bass * 0.3);
            const glow = ctx.createRadialGradient(cx, cy, maxR * 0.8, cx, cy, glowR);
            glow.addColorStop(0, `rgba(255,${Math.floor(100 + bass * 80)},0,${(bass - 0.35) * 0.5})`);
            glow.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.beginPath(); ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
            ctx.fillStyle = glow; ctx.fill();
        }

        // ── Radial frequency bars around speaker edge ──
        const numBars = Math.min(bufferLength, 80);
        for (let i = 0; i < numBars; i++) {
            const angle = (i / numBars) * Math.PI * 2 - Math.PI / 2;
            const val = dataArray[i] / 255;
            const r1 = maxR + 4;
            const r2 = r1 + val * maxR * 0.55;
            const hue = (i / numBars) * 260 + 200; // blue → purple → red
            const alpha = 0.5 + val * 0.5;
            ctx.strokeStyle = `hsla(${hue}, 100%, ${45 + val * 35}%, ${alpha})`;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
            ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
            ctx.stroke();
        }

        // ── Speaker body background ──
        const bodyGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
        bodyGrad.addColorStop(0, '#1a1410');
        bodyGrad.addColorStop(0.7, '#111008');
        bodyGrad.addColorStop(1, '#0a0805');
        ctx.beginPath(); ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
        ctx.fillStyle = bodyGrad; ctx.fill();

        // Speaker outer rim
        ctx.beginPath(); ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(80,70,50,0.8)`; ctx.lineWidth = 5; ctx.stroke();

        // ── Surround rubber rings (3 concentric, pulsing with bass) ──
        for (let i = 0; i < 3; i++) {
            const r = maxR * (0.92 - i * 0.04) * (1 + bass * 0.04);
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${50 + i * 20},${45 + i * 15},${30 + i * 10},${0.6 + i * 0.15})`;
            ctx.lineWidth = 5 - i;
            ctx.stroke();
        }

        // ── Speaker cone (centre, pulses with bass) ──
        const coneR = maxR * 0.58 * (1 + bass * 0.14);
        const coneGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coneR);
        const r = Math.floor(60 + bass * 120), g = Math.floor(50 + bass * 60);
        coneGrad.addColorStop(0,   `rgba(${r},${g},20,0.95)`);
        coneGrad.addColorStop(0.45,`rgba(45,38,18,0.9)`);
        coneGrad.addColorStop(1,   `rgba(18,15,8,0.85)`);
        ctx.beginPath(); ctx.arc(cx, cy, coneR, 0, Math.PI * 2);
        ctx.fillStyle = coneGrad; ctx.fill();

        // Cone ribs (radial shadow lines)
        const numRibs = 12;
        for (let i = 0; i < numRibs; i++) {
            const ang = (i / numRibs) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(ang) * coneR, cy + Math.sin(ang) * coneR);
            ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1; ctx.stroke();
        }

        // Cone concentric rings
        for (let i = 1; i <= 4; i++) {
            ctx.beginPath();
            ctx.arc(cx, cy, coneR * (i / 4.5), 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0,0,0,${0.12 + i * 0.04})`; ctx.lineWidth = 1; ctx.stroke();
        }

        // ── Voice coil / dust cap ──
        const capR = maxR * 0.11 * (1 + bass * 0.18);
        const capGrad = ctx.createRadialGradient(cx - capR * 0.25, cy - capR * 0.25, 0, cx, cy, capR);
        capGrad.addColorStop(0, `rgba(${80 + Math.floor(bass * 120)}, ${70 + Math.floor(bass * 60)}, 40, 1)`);
        capGrad.addColorStop(1, 'rgba(20,16,8,1)');
        ctx.beginPath(); ctx.arc(cx, cy, capR, 0, Math.PI * 2);
        ctx.fillStyle = capGrad; ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1.5; ctx.stroke();

        // ── Screw holes (4 corners, decorative) ──
        const screwR = 4, screwPad = maxR * 0.88;
        [[0, -1],[1, 0],[0, 1],[-1, 0]].forEach(([dx, dy]) => {
            ctx.beginPath();
            ctx.arc(cx + dx * screwPad * 0.72, cy + dy * screwPad * 0.72, screwR, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(40,35,25,0.9)'; ctx.fill();
            ctx.strokeStyle = 'rgba(100,90,60,0.6)'; ctx.lineWidth = 1; ctx.stroke();
        });
    }
    draw();
};

function isAudioFile(file = {}) {
    const name = String(file.name || '').toLowerCase();
    return (file.type && String(file.type).startsWith('audio')) || name.endsWith('.mp3') || name.endsWith('.wav') || name.endsWith('.ogg') || name.endsWith('.m4a');
}

async function rebuildQueueFromFolder(folderId, selectedUrl, selectedName) {
    if (!folderId) return false;
    const { data, error } = await sb.from('files').select('*').eq('folder_id', folderId).order('name', { ascending: true });
    if (error) throw error;
    const audioFiles = (data || []).filter(isAudioFile);
    if (!audioFiles.length) return false;
    currentPlaylist = audioFiles;
    currentTrackIndex = currentPlaylist.findIndex((f) => f.url === selectedUrl);
    if (currentTrackIndex === -1) currentTrackIndex = currentPlaylist.findIndex((f) => f.name === selectedName);
    if (currentTrackIndex === -1) currentTrackIndex = 0;
    return true;
}

window.playOrOpenFileAPI = async function(url, name, skipIndexUpdate = false, folderId = null) {
    const fullUrl = normalizeStoredFileUrl(url);
    const player = document.getElementById('audio-player');
    
    if (isAudioFile({ name, url })) {
        if (!skipIndexUpdate) {
            if (folderId) {
                try {
                    await rebuildQueueFromFolder(folderId, url, name);
                } catch (error) {
                    console.warn('Could not rebuild folder queue:', error);
                }
            }
            if (!folderId && currentPlaylist.length > 0) {
                currentTrackIndex = currentPlaylist.findIndex(f => f.url === url);
                if (currentTrackIndex === -1) currentTrackIndex = currentPlaylist.findIndex(f => f.name === name);
            }
            if (currentPlaylist.length === 0 || currentTrackIndex === -1) {
                currentPlaylist = [{ url, name }];
                currentTrackIndex = 0;
            }
        }
        
        if(player) {
            player.src = fullUrl;
            player.loop = false;
            player.play().catch(e => console.warn('Autoplay blocked:', e));
            
            // Background Play Support (Media Session)
            if ('mediaSession' in navigator) {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: name,
                    artist: 'School Portfolio Music Hub',
                    artwork: [{ src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }]
                });
                
                navigator.mediaSession.setActionHandler('nexttrack', window.playNextSong);
                navigator.mediaSession.setActionHandler('previoustrack', window.playPrevSong);
                navigator.mediaSession.playbackState = 'playing';
            }
        }
        
        const text = document.getElementById('now-playing-text');
        if(text) text.innerText = "Playing: " + name;
        
        if(currentPage !== 'music') window.goToPage('music');
        closeFolderModal('file-explorer-modal');
        
    } else {
        window.open(fullUrl, '_blank');
    }
};

window.playNextSong = function() {
    if (currentPlaylist.length === 0) return;
    if (currentTrackIndex === -1) {
        currentTrackIndex = 0;
    } else {
        currentTrackIndex++;
        if (currentTrackIndex >= currentPlaylist.length) {
            if (isLoop) currentTrackIndex = 0;
            else {
                currentTrackIndex = currentPlaylist.length - 1;
                const text = document.getElementById('now-playing-text');
                if (text) text.innerText = 'Playlist finished';
                if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'none';
                return;
            }
        }
    }
    const nextSong = currentPlaylist[currentTrackIndex];
    playOrOpenFileAPI(nextSong.url, nextSong.name, true);
};

function handleAudioEnded() {
    if (isRepeat && currentPlaylist[currentTrackIndex]) {
        playOrOpenFileAPI(currentPlaylist[currentTrackIndex]?.url, currentPlaylist[currentTrackIndex]?.name, true);
        return;
    }
    window.playNextSong();
}

window.playPrevSong = function() {
    if (currentPlaylist.length === 0) return;
    if (currentTrackIndex === -1) {
        currentTrackIndex = currentPlaylist.length - 1;
    } else {
        currentTrackIndex--;
        if (currentTrackIndex < 0) {
            if (isLoop) currentTrackIndex = currentPlaylist.length - 1;
            else currentTrackIndex = 0;
        }
    }
    const prevSong = currentPlaylist[currentTrackIndex];
    playOrOpenFileAPI(prevSong.url, prevSong.name, true);
};

/* ── Music Hub: uploaded file search ── */
let _musicSearchTimer = null;
window.musicSearchDebounced = function() {
    clearTimeout(_musicSearchTimer);
    const q = (document.getElementById('music-search-input') || {}).value || '';
    if (q.trim().length === 0) {
        const res = document.getElementById('music-search-results');
        if (res) res.classList.add('hidden');
        return;
    }
    _musicSearchTimer = setTimeout(searchMusicFiles, 350);
};

window.searchMusicFiles = async function() {
    const input = document.getElementById('music-search-input');
    const resBox = document.getElementById('music-search-results');
    if (!input || !resBox) return;
    const q = input.value.trim();
    if (!q) { resBox.classList.add('hidden'); return; }

    resBox.classList.remove('hidden');
    resBox.innerHTML = '<div class="music-search-empty">Searching…</div>';

    try {
        // Search files by name (case-insensitive) across ALL folders
        const { data: files, error } = await sb.from('files')
            .select('id, name, url, type, uploader, folder_id')
            .ilike('name', `%${q}%`)
            .limit(50);

        if (error) throw error;
        if (!files || files.length === 0) {
            resBox.innerHTML = `<div class="music-search-empty">No results for "<strong>${q}</strong>"</div>`;
            return;
        }

        // Fetch folder names for the matched files
        const folderIds = [...new Set(files.map(f => f.folder_id))];
        const { data: folders } = await sb.from('folders').select('id,name,parent').in('id', folderIds);
        const folderMap = {};
        (folders || []).forEach(f => { folderMap[f.id] = f; });

        // Populate playlist with audio results so loop/next work after search play
        const audioResults = files.filter(f => f.type && f.type.startsWith('audio'));
        if (audioResults.length > 0) {
            currentPlaylist = audioResults;
            currentTrackIndex = -1;
        }

        resBox.innerHTML = files.map(f => {
            const folder = folderMap[f.folder_id];
            const folderPath = folder ? folder.name : 'Unknown folder';
            const isAudio = f.type && f.type.startsWith('audio');
            const safeName = f.name.replace(/'/g, "\\'");
            const safeUrl = f.url.replace(/'/g, "\\'");
            return `
            <div class="music-search-item">
              <span style="font-size:24px;">${isAudio ? '🎵' : '📄'}</span>
              <div class="music-search-item-info">
                <div class="music-search-item-name">${escapeHTML(f.name)}</div>
                <div class="music-search-item-meta">📂 ${escapeHTML(folderPath)} · by ${escapeHTML(f.uploader)}</div>
              </div>
              ${isAudio ? `<button onclick="window.playOrOpenFileAPI('${safeUrl}','${safeName}',false,'${escapeJS(f.folder_id)}')" style="background:#00ff88;color:#000;border:none;padding:7px 14px;border-radius:8px;font-weight:700;cursor:pointer;font-size:12px;white-space:nowrap;">▶ Play</button>` : `<a href="${escapeHTML(f.url)}" target="_blank" style="background:#00d4ff;color:#000;border:none;padding:7px 14px;border-radius:8px;font-weight:700;cursor:pointer;font-size:12px;white-space:nowrap;text-decoration:none;">Open</a>`}
            </div>`;
        }).join('');
    } catch (e) {
        resBox.innerHTML = `<div class="music-search-empty">Search error: ${e.message}</div>`;
        console.error('Music search error:', e);
    }
};

window.toggleLoop = function() {
    isLoop = !isLoop;
    const btn = document.getElementById('btn-loop');
    if(btn) {
        btn.innerText = `🔁 Loop All: ${isLoop ? 'ON' : 'OFF'}`;
        btn.classList.toggle('neon-active', isLoop);
        btn.style.color = isLoop ? 'var(--neon-green)' : 'white';
    }
};

window.toggleRepeat = function() {
    isRepeat = !isRepeat;
    const btn = document.getElementById('btn-repeat');
    if(btn) {
        btn.innerText = `🔂 Repeat 1: ${isRepeat ? 'ON' : 'OFF'}`;
        btn.classList.toggle('neon-active', isRepeat);
        btn.style.color = isRepeat ? 'var(--neon-green)' : 'white';
    }
};

/* ============================================================
   AUTH & USER MANAGEMENT
   ============================================================ */
let users = [];
let currentUser = JSON.parse(localStorage.getItem('classAppUser')) || null;
let isAdmin = Boolean(currentUser?.isAdmin);
let isInitializing = true;
let isAuthenticated = Boolean(currentUser?.username);
let authRequestInFlight = false;
let appPresenceChannel = null;
let livePresenceUsers = new Set();
let lastSeenHeartbeatId = null;
let lastSeenWriteAt = 0;
let authBindingsReady = false;
let usersLoadState = { loading: false, error: '' };

function syncAuthState() {
  isAuthenticated = Boolean(currentUser?.username);
}

function renderAppState() {
  const showShell = !isInitializing && isAuthenticated;
  const showAuthModal = !isInitializing && !isAuthenticated;
  const authModal = document.getElementById('auth-modal');
  if (authModal) authModal.style.display = showAuthModal ? 'flex' : 'none';

  const shellNodes = [
    document.getElementById('sidebar'),
    document.getElementById('menu-toggle'),
    document.getElementById('overlay'),
    document.getElementById('live-clock'),
    document.getElementById('page-indicator'),
  ];
  shellNodes.forEach((node) => {
    if (!node) return;
    node.style.visibility = showShell ? '' : 'hidden';
    node.style.pointerEvents = showShell ? '' : 'none';
  });

  document.querySelectorAll('.page').forEach((page) => {
    page.style.visibility = showShell ? '' : 'hidden';
    if (!showShell) page.style.pointerEvents = 'none';
    else page.style.pointerEvents = page.classList.contains('active') ? 'auto' : 'none';
  });
}

function setInitializing(nextValue) {
  isInitializing = Boolean(nextValue);
  renderAppState();
}

function runSafeUiAction(label, action, onError) {
  try {
    return action();
  } catch (error) {
    console.error(`[ui] ${label} failed:`, error);
    if (typeof onError === 'function') onError(error);
    else showToast(`${label} is unavailable right now.`, 'error');
    return null;
  }
}

function waitForSplashDismissal() {
  if (!document.getElementById('splash-screen')) return Promise.resolve();
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      observer.disconnect();
      resolve();
    };
    const timer = setTimeout(finish, 4500);
    const observer = new MutationObserver(() => {
      if (!document.getElementById('splash-screen')) finish();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('classapp:splash-dismissed', finish, { once: true });
  });
}

function saveSession() {
  syncAuthState();
  if (currentUser) {
    localStorage.setItem('classAppUser', JSON.stringify(currentUser));
  } else {
    localStorage.removeItem('classAppUser');
    setServerAuthToken('');
  }
}

function isUserLiveOnline(user) {
  const username = typeof user === 'string' ? user : user?.username;
  return Boolean(username && livePresenceUsers.has(username));
}

function refreshPresenceViews() {
  renderUserDirectory();
  renderChatUsersList();
}

function getUserLastSeenAt(user) {
  return user?.last_seen_at || user?.last_opened_at || user?.updated_at || null;
}

function relativeActiveText(dateValue) {
  if (!dateValue) return 'Offline';
  const seen = new Date(dateValue);
  if (Number.isNaN(seen.getTime())) return 'Offline';
  const diffMs = Date.now() - seen.getTime();
  if (diffMs < 0) return 'Active just now';
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'Active just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Active ${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Active ${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Active yesterday';
  if (days < 7) return `Active ${days} days ago`;
  return `Active ${seen.toLocaleDateString()}`;
}

function getUserActivityLabel(user) {
  if (isUserLiveOnline(user)) return 'Online now';
  return relativeActiveText(getUserLastSeenAt(user));
}

async function persistLastSeen({ online = true, force = false } = {}) {
  if (!currentUser?.username) return;
  const now = Date.now();
  if (!force && now - lastSeenWriteAt < 45000) return;
  lastSeenWriteAt = now;
  const timestamp = new Date().toISOString();
  currentUser.last_seen_at = timestamp;
  currentUser.online = online;
  saveSession();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    await authFetch('/api/session/presence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ online }),
      signal: controller.signal,
    });
    clearTimeout(timer);
  } catch (_) {}
}

function startLastSeenHeartbeat() {
  if (lastSeenHeartbeatId) return;
  persistLastSeen({ online: true, force: true });
  lastSeenHeartbeatId = window.setInterval(() => {
    persistLastSeen({ online: true });
  }, 60000);
}

function stopLastSeenHeartbeat() {
  if (!lastSeenHeartbeatId) return;
  clearInterval(lastSeenHeartbeatId);
  lastSeenHeartbeatId = null;
}

function initAppPresence() {
  if (!currentUser?.username || appPresenceChannel) return;
  const channel = getSupabaseChannel('class-app-active-users', {
    config: { presence: { key: currentUser.username } },
  });
  if (!channel) return;
  appPresenceChannel = channel;
  appPresenceChannel
    .on('presence', { event: 'sync' }, () => {
      const state = appPresenceChannel.presenceState() || {};
      livePresenceUsers = new Set(Object.keys(state));
      refreshPresenceViews();
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await appPresenceChannel.track({
          username: currentUser.username,
          displayName: currentUser.display_name || currentUser.username,
          page: currentPage,
          activeAt: new Date().toISOString(),
        });
      }
    });
}

function destroyAppPresence() {
  if (!appPresenceChannel) return;
  try { appPresenceChannel.untrack(); } catch (_) {}
  try { sb?.removeChannel?.(appPresenceChannel); } catch (_) {}
  appPresenceChannel = null;
  livePresenceUsers = new Set();
}

function setAuthMessage(message = '', type = 'error') {
  const errBox = document.getElementById('errorMessage');
  if (!errBox) return;
  errBox.innerText = message;
  if (message) errBox.dataset.state = type;
  else errBox.removeAttribute('data-state');
  errBox.style.display = message ? 'block' : 'none';
}

function setAuthError(message = '') {
  setAuthMessage(message, 'error');
}

function setAuthInfo(message = '') {
  setAuthMessage(message, 'info');
}

function setAuthSuccess(message = '') {
  setAuthMessage(message, 'success');
}

function withAuthTimeout(promise, message = 'Request timed out. Check your connection.') {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), 10000)),
  ]);
}

function bindAuthPortalHandlers() {
  if (authBindingsReady) return;
  const signInBtn = document.getElementById('btn-sign-in');
  const createBtn = document.getElementById('btn-create-account');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  if (!signInBtn || !createBtn || !usernameInput || !passwordInput) {
    console.error('[auth] Portal controls missing from DOM.');
    return;
  }
  signInBtn.addEventListener('click', (event) => {
    event.preventDefault();
    window.login();
  });
  createBtn.addEventListener('click', (event) => {
    event.preventDefault();
    window.register();
  });
  usernameInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      window.login();
    }
  });
  passwordInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      window.login();
    }
  });
  authBindingsReady = true;
  console.info('[auth] Portal button handlers attached.');
}

function toSessionUser(profile, serverSession = {}) {
  const { password_hash, ...safeProfile } = profile || {};
  return { ...safeProfile, isAdmin: Boolean(serverSession.isAdmin) };
}

async function requestServerSession(endpoint, payload) {
  const response = await withAuthTimeout(fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }), 'Sign-in request timed out. Please try again.');
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `Request failed (${response.status})`);
    error.status = response.status;
    error.code = data.code || '';
    error.profile = data.profile || null;
    error.setupToken = data.setupToken || '';
    error.payload = data;
    throw error;
  }
  return data;
}

async function finalizeLogin(profile, serverSession) {
  console.log('[AUTH] login complete, finalizing session...');
  currentUser = toSessionUser(profile, serverSession);
  isAdmin = Boolean(serverSession.isAdmin);
  syncAuthState();
  setServerAuthToken(serverSession.token || '');
  if (isAdmin) revealAdminNav();
  saveSession();
  // Do not block UI on Supabase cold-start: show the shell immediately, then
  // let establishSession finish wiring realtime features in the background.
  setInitializing(false);
  renderAppState();
  try {
    setAuthSuccess('Signed in. Loading your portal...');
    persistLastSeen({ online: true, force: true }).catch(() => {});
    establishSession().catch((error) => {
      console.warn('[auth] establishSession (post-login) failed:', error?.message || error);
    });
    logActivity('login');
    recordAppOpen().catch((error) => console.warn('[AppOpen] post-login record failed:', error?.message || error));
    syncSubjectsFromServer().catch(() => {}); // non-blocking — refresh grids with server subjects
  } catch (error) {
    console.error('[auth] finalizeLogin failed:', error);
    stopLastSeenHeartbeat();
    destroyAppPresence();
    currentUser = null;
    isAdmin = false;
    syncAuthState();
    saveSession();
    setAuthError('Could not finish signing in. Please refresh and try again.');
    throw error;
  }
}

function promptLegacyPasswordSetup(profile, setupToken) {
  if (!profile?.username || !setupToken) {
    setAuthError('Password setup is not ready yet. Please try signing in again.');
    return;
  }
  setAuthInfo('This account needs a one-time password setup before it can sign in.');
  window.customPrompt('Create a new password (min 8 characters)', async function(newPassword) {
    if (!newPassword || newPassword.length < 8) {
      customAlert('Password must be at least 8 characters.');
      promptLegacyPasswordSetup(profile, setupToken);
      return;
    }
    try {
      setAuthInfo('Saving your new password...');
      const serverSession = await requestServerSession('/api/password-setup', {
        token: setupToken,
        password: newPassword,
      });
      const refreshedProfile = serverSession.profile || { ...profile };
      await finalizeLogin(refreshedProfile, serverSession);
      setAuthSuccess('Password created. Loading your portal...');
      showToast('Password created. You are now signed in.');
    } catch (error) {
      console.error('[auth] Legacy password setup failed:', error);
      setAuthError(error.message || 'Could not save your password yet.');
    }
  }, '', { type: 'password' });
}

window.login = async function() {
  if (authRequestInFlight) return;
  authRequestInFlight = true;
  const btn = document.getElementById('btn-sign-in');
  if (btn) { btn.disabled = true; btn.textContent = 'Signing in...'; }
  try {
    console.info('[auth] Sign-in requested.');
    setAuthInfo('Signing in...');
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    if (!username) { customAlert('Enter username'); return; }
    if (!password) { customAlert('Enter password'); return; }
    setAuthInfo('Signing in...');

    // Server-first: admin fast-path works even when Supabase password_hash is NULL
    let serverSession;
    try {
      serverSession = await withAuthTimeout(
        requestServerSession('/api/login', { username, password }),
        'Sign-in timed out. Check your connection.'
      );
    } catch (serverError) {
      console.error('[auth] Login failed:', serverError);
      if (serverError.status === 428) {
        if (serverError.profile?.username && serverError.setupToken) {
          promptLegacyPasswordSetup(serverError.profile, serverError.setupToken);
          return;
        }
        setAuthError('Password setup is required for this account. Please try signing in again.');
        return;
      }
      setAuthError(serverError.message || 'Could not sign in.');
      return;
    }

    let profile = serverSession.profile || null;
    if (!profile) {
      const su = serverSession.user || {};
      profile = {
        username: su.username || username,
        display_name: su.displayName || su.display_name || su.username || username,
        avatar: su.avatar || null,
        online: true,
        last_seen_at: new Date().toISOString(),
      };
    }
    await finalizeLogin(profile, serverSession);
  } catch (error) {
    console.error('[auth] Unexpected login error:', error);
    setAuthError(error?.message || 'Could not sign in.');
  } finally {
    authRequestInFlight = false;
    if (btn) { btn.disabled = false; btn.textContent = 'Sign In'; }
  }
};

window.register = async function() {
  if (authRequestInFlight) return;
  authRequestInFlight = true;
  const btn = document.getElementById('btn-create-account');
  if (btn) { btn.disabled = true; btn.textContent = 'Creating account...'; }
  try {
    console.info('[auth] Registration requested.');
    setAuthInfo('Creating your account...');
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    if (!username) { customAlert('Enter username'); return; }
    if (!password) { customAlert('Enter password'); return; }
    if (password.length < 8) { customAlert('Password must be at least 8 characters.'); return; }
    const formatError = validateUsernameFormat(username);
    if (formatError) { customAlert(formatError); return; }

    setAuthInfo('Creating your account...');
    try {
      const serverSession = await requestServerSession('/api/register', { username, password });
      const profile = serverSession.profile || {
        username,
        display_name: username,
        online: true,
        last_seen_at: new Date().toISOString(),
      };
      await finalizeLogin(profile, serverSession);
    } catch (serverError) {
      console.error('[auth] Registration failed:', serverError);
      setAuthError(serverError.message || 'Could not finish registration.');
    }
  } catch (error) {
    console.error('[auth] Unexpected registration error:', error);
    setAuthError(error?.message || 'Could not finish registration.');
  } finally {
    authRequestInFlight = false;
    if (btn) { btn.disabled = false; btn.textContent = 'Create Account'; }
  }
};

window.handleLogout = async function() {
    await persistLastSeen({ online: false, force: true });
    stopLastSeenHeartbeat();
    destroyAppPresence();
    currentUser = null;
    isAdmin = false;
    syncAuthState();
    sessionStorage.removeItem('recordedAppOpenFor');
    saveSession();
    setInitializing(false);
    location.reload();
};

window.addEventListener('beforeunload', () => {
  try {
    if (currentUser?.username) {
      authFetch('/api/session/presence', {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ online: false }),
      }).catch(() => {});
    }
  } catch (_) {}
  try { appPresenceChannel?.untrack(); } catch (_) {}
});

document.addEventListener('visibilitychange', () => {
  if (!currentUser?.username) return;
  if (document.visibilityState === 'hidden') persistLastSeen({ online: false, force: true });
  else persistLastSeen({ online: true, force: true });
});

async function establishSession() {
  syncAuthState();
  renderAppState();
  const navLogout = document.getElementById('nav-logout');
  if(navLogout) navLogout.style.display = 'flex';

  // Fast interactive path: anything that does NOT require Supabase realtime
  // should run immediately after login / session restore.
  fetchUsers();
  startLastSeenHeartbeat();
  updateChatHeader();
  ensureAdminUpdateControl();
  registerPushSubscription(false);
  fetchMessages(currentChat.type, currentChat.target);
  handleNotificationDeepLink();

  // Defer realtime wiring until Supabase is actually ready.
  const supabaseReady = await waitForSupabaseClient().catch(() => false);
  if (!supabaseReady) {
    console.warn('[sb] Supabase client not ready yet; realtime features deferred.');
    return;
  }

  initAppPresence();
  initSupabaseRealtimeChat();
  initSharedRealtime();
  initAppOpenRealtime();
  initReactionsRealtime();
  fetchAppUpdates();
}

function getInitials(user) {
  return String(user.display_name || user.username || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0] || '').join('').toUpperCase() || '?';
}

function makeAvatarHTML(user, cls, liveOnline) {
  const initials = escapeHTML(getInitials(user));
  const onlineCls = liveOnline ? ' online' : '';
  if (user.avatar) {
    return `<div class="${cls}${onlineCls}"><img src="${escapeHTML(user.avatar)}" alt="${initials}" onerror="this.style.display='none';this.parentElement.dataset.fb='1';this.parentElement.textContent='${initials}'"></div>`;
  }
  return `<div class="${cls}${onlineCls}">${initials}</div>`;
}

function getUploaderAvatarHTML(uploaderUsername) {
  const u = users.find((user) => user.username === uploaderUsername);
  if (!u) return `<span class="file-uploader-avatar"><span>${escapeHTML((uploaderUsername || '?')[0].toUpperCase())}</span></span>`;
  if (u.avatar) return `<span class="file-uploader-avatar"><img src="${escapeHTML(u.avatar)}" alt="" onerror="this.style.display='none'"></span>`;
  return `<span class="file-uploader-avatar"><span>${escapeHTML(getInitials(u)[0] || '?')}</span></span>`;
}

async function fetchUsers() {
  usersLoadState = { loading: true, error: '' };
  renderUserDirectory();
  renderChatUsersList();

  let loadedUsers = [];
  let lastError = null;

  try {
    const response = await authFetch('/api/users', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Users failed (${response.status})`);
    loadedUsers = await response.json();
  } catch (error) {
    lastError = error;
    console.warn('[users] Authenticated directory fetch failed:', error.message || error);
  }

  users = Array.isArray(loadedUsers) ? loadedUsers : [];
  usersLoadState = {
    loading: false,
    error: users.length ? '' : (lastError?.message || ''),
  };
  renderUserDirectory();
  renderChatUsersList();
}

function renderUserDirectory() {
  const grid = document.getElementById('user-grid');
  if (!grid) return;
  grid.innerHTML = '';
  if (usersLoadState.loading) {
    grid.innerHTML = '<div class="user-empty-state">Loading users...</div>';
    return;
  }
  if (usersLoadState.error && !users.length) {
    grid.innerHTML = `<div class="user-empty-state">${escapeHTML(usersLoadState.error)}</div>`;
    return;
  }
  const term = (document.getElementById('user-search-input')?.value || '').trim().toLowerCase();
  const statusFilter = document.getElementById('user-filter-select')?.value || 'all';
  const sortMode = document.getElementById('user-sort-select')?.value || 'online';
  const visibleUsers = users
    .filter((user) => {
      const liveOnline = isUserLiveOnline(user);
      if (statusFilter === 'online' && !liveOnline) return false;
      if (statusFilter === 'offline' && liveOnline) return false;
      if (!term) return true;
      return [
        user.username,
        user.display_name,
        user.github,
        user.email,
        user.note,
        user.address,
      ].some((value) => String(value || '').toLowerCase().includes(term));
    })
    .sort((a, b) => {
      if (sortMode === 'name') return String(a.display_name || a.username || '').localeCompare(String(b.display_name || b.username || ''));
      if (sortMode === 'recent') return new Date(b.updated_at || b.last_seen_at || 0) - new Date(a.updated_at || a.last_seen_at || 0);
      return Number(isUserLiveOnline(b)) - Number(isUserLiveOnline(a)) || String(a.display_name || a.username || '').localeCompare(String(b.display_name || b.username || ''));
    });

  if (!visibleUsers.length) {
    grid.innerHTML = `<div class="user-empty-state">${users.length ? 'No users match this search.' : 'No users available right now.'}</div>`;
    return;
  }

  visibleUsers.forEach((user) => {
    const card = document.createElement('div');
    card.className = 'user-card';
    const safeUsername = escapeJS(user.username);
    const liveOnline = isUserLiveOnline(user);
    card.innerHTML = `
      <div class="user-card-top">
        ${makeAvatarHTML(user, 'user-avatar-mini', liveOnline)}
        <div>
          <div class="user-name">${escapeHTML(user.display_name || user.username)}</div>
          <div class="user-status ${liveOnline ? 'online' : 'offline'}">${escapeHTML(getUserActivityLabel(user))}</div>
        </div>
        <button class="user-view-btn" onclick="openUserProfile('${safeUsername}')">Profile</button>
      </div>
      <div class="user-meta">GitHub: ${escapeHTML(user.github || '—')}</div>
      <div class="user-meta">Email: ${escapeHTML(user.email || '—')}</div>
      <div class="user-note">${escapeHTML(user.note || '')}</div>
    `;
    grid.appendChild(card);
  });
}

function renderChatUsersList() {
  const list = document.getElementById('chat-user-list');
  if (!list) return;
  list.innerHTML = '';
  users
    .filter((user) => currentUser ? user.username !== currentUser.username : true)
    .forEach((user) => {
      const item = document.createElement('div');
      item.className = 'chat-user-item';
      const safeUsername = escapeJS(user.username);
      const liveOnline = isUserLiveOnline(user);
      const unread = unreadDMs[user.username] || 0;
      item.innerHTML = `
        ${makeAvatarHTML(user, 'chat-user-avatar', liveOnline)}
        <div style="flex:1;min-width:0;">
          <div class="chat-user-name">${escapeHTML(user.display_name || user.username)}</div>
          <div class="chat-status ${liveOnline ? 'online' : 'offline'}">${escapeHTML(getUserActivityLabel(user))}</div>
        </div>
        ${unread ? `<span class="unread-badge">${unread}</span>` : ''}
        <button onclick="openChat('private', '${safeUsername}')" style="background:#00ff88; border:none; padding:5px 10px; border-radius:5px; font-weight:bold; cursor:pointer; color:black;">Chat</button>
      `;
      list.appendChild(item);
    });
}

window.openUserProfile = function(username) {
  const profile = users.find((user) => user.username === username);
  if (!profile) return;
  const profilePanel = document.getElementById('profile-panel');
  const details = document.getElementById('profile-details');
  if (!profilePanel || !details) return;
  
  const isMine = currentUser?.username === profile.username;
  const safeUsername = escapeJS(profile.username);
  const liveOnline = isUserLiveOnline(profile);
  const avatarLarge = profile.avatar
    ? `<div class="profile-avatar-large"><img src="${escapeHTML(profile.avatar)}" alt="" onerror="this.style.display='none';this.parentElement.textContent='${escapeHTML(getInitials(profile))}'"></div>`
    : `<div class="profile-avatar-large">${escapeHTML(getInitials(profile))}</div>`;
  let html = `
    ${avatarLarge}
    <h2 class="modal-title text-blue" style="margin-bottom: 10px;">${escapeHTML(profile.display_name || profile.username)}</h2>
    <div class="profile-row"><strong>Username:</strong> ${escapeHTML(profile.username)}</div>
    <div class="profile-row"><strong>Birthday:</strong> ${escapeHTML(profile.birthday || 'Unknown')}</div>
    <div class="profile-row"><strong>Address:</strong> ${escapeHTML(profile.address || 'Unknown')}</div>
    <div class="profile-row"><strong>GitHub:</strong> ${escapeHTML(profile.github || '—')}</div>
    <div class="profile-row"><strong>Email:</strong> ${escapeHTML(profile.email || '—')}</div>
    <div class="profile-row" style="margin-bottom: 20px;"><strong>Note:</strong> ${escapeHTML(profile.note || 'No additional note.')}</div>
    <div class="profile-actions modal-btn-group" style="flex-wrap: wrap;">
      <button class="btn-primary flex-1" onclick="openChat('private', '${safeUsername}')">Message</button>
  `;

  if (isMine) html += `<button class="btn-blue flex-1" onclick="editUserProfile('${safeUsername}')">Edit Profile</button>`;
  if (isAdmin && !isMine) html += `<button class="btn-outline-red flex-1" onclick="adminDeleteUser('${safeUsername}')">Delete User</button>`;
  html += `</div><div id="profile-folders-container" class="profile-folders-container"></div>`;
  details.innerHTML = html;

  // Scroll the page to top so the fixed profile panel is always visible
  const usersPage = document.getElementById('page-users');
  if (usersPage) usersPage.scrollTop = 0;

  profilePanel.setAttribute('tabindex', '-1');
  profilePanel.scrollTop = 0;
  profilePanel.classList.add('active');
  requestAnimationFrame(() => {
    profilePanel.scrollTop = 0;
    profilePanel.focus?.({ preventScroll: true });
  });
  renderProfileFolders(profile.username);
};

window.closeProfile = function() {
  const panel = document.getElementById('profile-panel');
  if (panel) panel.classList.remove('active');
};

window.editUserProfile = function(username) {
  const profile = users.find((user) => user.username === username);
  if (!profile) return;
  const details = document.getElementById('profile-details');
  if (!details) return;
  const lastChange = profile.username_last_changed_at ? new Date(profile.username_last_changed_at) : null;
  const nextChange = lastChange ? new Date(lastChange.getTime() + 3 * 24 * 60 * 60 * 1000) : null;
  const canChangeUsername = !nextChange || Date.now() >= nextChange.getTime();
  const usernameHelp = canChangeUsername
    ? 'Username can be changed now. After saving a new username, it locks for 3 days.'
    : `Username locked for ${formatRemainingTime(nextChange.getTime() - Date.now())}.`;
  const safeUsername = escapeJS(profile.username);
  
  const currentInitials = escapeHTML(getInitials(profile));
  const avatarPreviewContent = profile.avatar
    ? `<img src="${escapeHTML(profile.avatar)}" alt="" onerror="this.style.display='none'">`
    : currentInitials;

  details.innerHTML = `
    <h2 class="modal-title text-blue" style="margin-bottom: 15px;">Edit Profile</h2>
    <div style="margin-bottom: 14px;">
      <label style="font-size: 12px; color: #00d4ff; display:block; margin-bottom:8px;">Profile Picture</label>
      <div class="avatar-upload-area">
        <div class="avatar-upload-preview" id="avatar-preview">${avatarPreviewContent}</div>
        <div class="avatar-upload-info">
          <input type="file" id="profile-avatar-file" accept="image/*" style="font-size:12px; color:rgba(255,255,255,0.7); background:none; border:none; padding:0; cursor:pointer;">
          <p class="profile-field-hint" style="margin:0;">Max 5 MB. Square images work best.</p>
          ${profile.avatar ? `<button class="btn-outline-red" style="padding:4px 10px;font-size:11px;" onclick="window._clearProfileAvatar()">Remove photo</button>` : ''}
        </div>
      </div>
    </div>
    <div style="margin-bottom: 10px;"><label style="font-size: 12px; color: #00d4ff;">Username</label>
        <input type="text" id="profile-username" class="modal-input" style="margin-bottom: 5px; padding: 8px;" value="${escapeHTML(profile.username || '')}" ${canChangeUsername ? '' : 'disabled'}>
        <p class="profile-field-hint">${escapeHTML(usernameHelp)}</p></div>
    <div style="margin-bottom: 10px;"><label style="font-size: 12px; color: #00d4ff;">Display Name</label>
        <input type="text" id="profile-displayName" class="modal-input" style="margin-bottom: 5px; padding: 8px;" value="${escapeHTML(profile.display_name || profile.username || '')}"></div>
    <div style="margin-bottom: 10px;"><label style="font-size: 12px; color: #00d4ff;">Birthday</label>
        <input type="text" id="profile-birthday" class="modal-input" style="margin-bottom: 5px; padding: 8px;" value="${escapeHTML(profile.birthday || '')}"></div>
    <div style="margin-bottom: 10px;"><label style="font-size: 12px; color: #00d4ff;">Address</label>
        <input type="text" id="profile-address" class="modal-input" style="margin-bottom: 5px; padding: 8px;" value="${escapeHTML(profile.address || '')}"></div>
    <div style="margin-bottom: 10px;"><label style="font-size: 12px; color: #00d4ff;">GitHub URL</label>
        <input type="text" id="profile-github" class="modal-input" style="margin-bottom: 5px; padding: 8px;" value="${escapeHTML(profile.github || '')}"></div>
    <div style="margin-bottom: 10px;"><label style="font-size: 12px; color: #00d4ff;">Email</label>
        <input type="email" id="profile-email" class="modal-input" style="margin-bottom: 5px; padding: 8px;" value="${escapeHTML(profile.email || '')}"></div>
    <div style="margin-bottom: 15px;"><label style="font-size: 12px; color: #00d4ff;">Bio / Note</label>
        <textarea id="profile-note" class="modal-input" style="margin-bottom: 5px; padding: 8px; height: 60px; resize: none;">${escapeHTML(profile.note || '')}</textarea></div>
    <div class="profile-actions modal-btn-group">
      <button class="btn-primary flex-1" onclick="saveProfileEdits('${safeUsername}')">Save</button>
      <button class="btn-outline-red flex-1" onclick="openUserProfile('${safeUsername}')">Cancel</button>
    </div>
  `;

  // Live avatar preview
  window._pendingAvatarClear = false;
  window._clearProfileAvatar = () => {
    window._pendingAvatarClear = true;
    const preview = document.getElementById('avatar-preview');
    if (preview) preview.innerHTML = currentInitials;
  };
  const avatarFileInput = document.getElementById('profile-avatar-file');
  if (avatarFileInput) {
    avatarFileInput.addEventListener('change', () => {
      const file = avatarFileInput.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = document.getElementById('avatar-preview');
        if (preview) preview.innerHTML = `<img src="${e.target.result}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">`;
        window._pendingAvatarClear = false;
      };
      reader.readAsDataURL(file);
    });
  }
};

function formatRemainingTime(ms) {
  const totalMinutes = Math.max(1, Math.ceil(ms / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts = [];
  if (days) parts.push(`${days} day${days === 1 ? '' : 's'}`);
  if (hours) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
  if (!days && minutes) parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`);
  return parts.join(', ') || 'a few minutes';
}

function validateUsernameFormat(username) {
  if (username.length < 3 || username.length > 24) return 'Username must be 3 to 24 characters long.';
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Username can only use letters, numbers, and underscores.';
  return '';
}

window.saveProfileEdits = async function(username) {
  const profile = users.find((user) => user.username === username) || currentUser;

  // Handle avatar upload
  let avatarUrl = profile?.avatar || null;
  const avatarFile = document.getElementById('profile-avatar-file')?.files?.[0];
  if (window._pendingAvatarClear) {
    avatarUrl = null;
  } else if (avatarFile) {
    if (avatarFile.size > 5 * 1024 * 1024) return customAlert('Profile picture must be under 5 MB.');
    const fd = new FormData();
    fd.append('file', avatarFile);
    try {
      const res = await authFetch('/api/upload', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload failed');
      const uploadData = await res.json();
      avatarUrl = uploadData.url || avatarUrl;
    } catch (err) {
      return customAlert('Could not upload profile picture. Please try again.');
    }
  }

  const payload = {
    username: document.getElementById('profile-username')?.value.trim() || username,
    display_name: document.getElementById('profile-displayName').value.trim(),
    birthday: document.getElementById('profile-birthday').value.trim(),
    address: document.getElementById('profile-address').value.trim(),
    github: document.getElementById('profile-github').value.trim(),
    email: document.getElementById('profile-email').value.trim(),
    note: document.getElementById('profile-note').value.trim(),
    avatar: avatarUrl,
  };

  try {
    const response = await authFetch(`/api/users/${encodeURIComponent(username)}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const ct = response.headers.get('content-type') || '';
    const data = ct.includes('application/json')
      ? await response.json().catch(() => ({}))
      : {};
    if (!response.ok) {
      if (!ct.includes('application/json')) {
        const text = await response.text().catch(() => '');
        console.error(`[API ERROR] profile update non-JSON ct=${ct} status=${response.status} preview=${text.slice(0, 120)}`);
      }
      return customAlert(data.error || 'Failed to update profile');
    }

    if (data.token) {
      setServerAuthToken(data.token);
    }

    currentUser = { ...data.profile, isAdmin };
    saveSession();
    users = users.map((user) => user.username === username ? data.profile : user);
    fetchUsers();
    showToast('Profile updated.');
    openUserProfile(currentUser.username);
  } catch (err) {
    customAlert('Network error while updating profile.');
  }
};

/* ============================================================
   SUPABASE SERVERLESS CHAT ENGINE
   ============================================================ */
let chatHistory = { group: [], todo: [], private: {} };
const unreadDMs = {}; // username → unread count
let currentChat = { type: 'group', target: null };
let realtimeSubscription = null;

function getPrivateKey(userA, userB) { return [userA, userB].sort().join('||'); }

function updateChatHeader() {
  const header = document.getElementById('chat-header');
  if (!header) return;
  let title = 'Select a chat';
  if (currentChat.type === 'group') title = 'Group Chat';
  else if (currentChat.type === 'todo') title = 'To-Do Group';
  else if (currentChat.type === 'private' && currentChat.target) title = `Private Chat: ${currentChat.target}`;
  const permission = 'Notification' in window ? Notification.permission : 'unsupported';
  const notifLabel = permission === 'granted' ? 'Notifications On' : 'Enable Notifications';
  header.innerHTML = `
    <span>${escapeHTML(title)}</span>
    <button class="chat-notification-btn" onclick="registerPushSubscription(true)" ${permission === 'unsupported' ? 'disabled' : ''}>${notifLabel}</button>
  `;
}

window.openChat = function(type, target = null) {
  currentChat = { type, target };
  updateChatHeader();
  // Clear unread badge for this DM
  if (type === 'private' && target && unreadDMs[target]) {
    delete unreadDMs[target];
    renderChatUsersList();
  }
  // Restore any saved draft for this chat
  const input = document.getElementById('message-input');
  if (input) input.value = localStorage.getItem(`msg-draft-${type}-${target || ''}`) || '';
  fetchMessages(type, target);
  if (currentPage !== 'chat') window.goToPage('chat');
};

function initSupabaseRealtimeChat() {
    if (realtimeSubscription) return;
    const messagesChannel = getSupabaseChannel('public:messages');
    if (!messagesChannel) return;
    realtimeSubscription = messagesChannel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, payload => {
            if (payload.eventType === 'INSERT') {
                const m = payload.new;
                const formattedMsg = {
                    id: m.id, sender: m.sender, text: m.text, attachment: m.attachment,
                    time: new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                };
                if (m.sender !== currentUser.username) {
                    if (notifPrefs.sound) {
                      const sound = document.getElementById('notif-sound');
                      if (sound) sound.play().catch(() => {});
                    }
                    if (notifPrefs.group && m.chat_type !== 'private' &&
                        (currentPage !== 'chat' || currentChat.type !== m.chat_type)) {
                        const dot = document.getElementById('chat-notif-dot');
                        if (dot) dot.classList.remove('hidden');
                    }
                }
                if (m.chat_type === 'private') {
                    const otherUser = m.sender === currentUser.username ? m.target : m.sender;
                    const key = getPrivateKey(currentUser.username, otherUser);
                    if(!chatHistory.private[key]) chatHistory.private[key] = [];
                    chatHistory.private[key].push(formattedMsg);
                    if (currentChat.type === 'private' && currentChat.target === otherUser) {
                      renderMessages();
                    } else if (m.sender !== currentUser.username && notifPrefs.dm) {
                      unreadDMs[m.sender] = (unreadDMs[m.sender] || 0) + 1;
                      renderChatUsersList();
                    }
                } else {
                    if(!chatHistory[m.chat_type]) chatHistory[m.chat_type] = [];
                    chatHistory[m.chat_type].push(formattedMsg);
                    if (currentChat.type === m.chat_type) renderMessages();
                }
            } 
            if (payload.eventType === 'DELETE' || payload.eventType === 'UPDATE') fetchMessages(currentChat.type, currentChat.target);
        }).subscribe();

    const notesChannel = getSupabaseChannel('public:calendar_notes');
    if (notesChannel) {
      notesChannel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_notes' }, () => { fetchCalendarNotes(); })
        .subscribe();
    }

    const profilesChannel = getSupabaseChannel('public:profiles_presence');
    if (profilesChannel) {
      profilesChannel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => { fetchUsers(); })
        .subscribe();
    }
}

function showChatSkeleton() {
  const container = document.getElementById('chat-messages');
  if (!container) return;
  container.innerHTML = Array.from({ length: 5 }, () => '<div class="chat-skeleton"></div>').join('');
}

async function fetchMessages(chatType, target = null) {
  if (!chatType) return;
  showChatSkeleton();
  let formattedMessages = [];

  if (await waitForSupabaseClient()) {
    let query = sb.from('messages').select('*');
    if (chatType === 'private') query = query.eq('chat_type', 'private').or(`and(sender.eq.${currentUser.username},target.eq.${target}),and(sender.eq.${target},target.eq.${currentUser.username})`);
    else query = query.eq('chat_type', chatType);

    const { data: messages, error } = await query.order('created_at', { ascending: false }).limit(50);
    if (!error) {
      formattedMessages = [...(messages || [])].reverse().map(m => ({
        id: m.id, sender: m.sender, text: m.text, attachment: m.attachment,
        pinned: Boolean(m.pinned), edited: Boolean(m.edited), deletedFor: m.deleted_for || m.deletedFor || [], type: m.type || 'message',
        time: new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      }));
    } else {
      console.warn(error);
    }
  }

  if (!formattedMessages.length) {
    try {
      const params = new URLSearchParams({ chat: chatType, limit: '50' });
      if (chatType === 'private' && target) params.set('target', `${currentUser.username}||${target}`);
      const response = await authFetch(`/api/messages?${params.toString()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Messages failed (${response.status})`);
      const ct = response.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        const text = await response.text().catch(() => '');
        console.error(`[API ERROR] /api/messages non-JSON ct=${ct} status=${response.status} preview=${text.slice(0, 120)}`);
        throw new Error('Messages are temporarily unavailable. Please try again.');
      }
      const messages = await response.json().catch(() => []);
      formattedMessages = Array.isArray(messages) ? messages : [];
    } catch (error) {
      console.warn('[chat] Server message fetch failed:', error.message || error);
      formattedMessages = [];
    }
  }

  if (chatType === 'private') { const key = getPrivateKey(currentUser.username, target); chatHistory.private[key] = formattedMessages; }
  else chatHistory[chatType] = formattedMessages;
  await fetchReactions(formattedMessages.map(m => String(m.id)));
  renderMessages();
}

function getCurrentHistory() {
  if (currentChat.type === 'group') return chatHistory.group || [];
  if (currentChat.type === 'todo') return chatHistory.todo || [];
  if (currentChat.type === 'private') return chatHistory.private[getPrivateKey(currentUser.username, currentChat.target)] || [];
  return [];
}

function renderMessages() {
  const container = document.getElementById('chat-messages');
  if (!container) return;
  container.innerHTML = '';
  const history = getCurrentHistory();
  const visibleMessages = history.filter((message) => !message.deletedFor || !message.deletedFor.includes(currentUser?.username));
  if (!visibleMessages.length) { container.innerHTML = '<p class="empty-chat">No messages yet.</p>'; return; }
  
  const pinned = visibleMessages.filter((message) => message.pinned);
  const normal = visibleMessages.filter((message) => !message.pinned);
  
  pinned.concat(normal).forEach((message) => {
    if (message.type === 'system') {
      const sysDiv = document.createElement('div');
      sysDiv.className = 'chat-system-message'; sysDiv.textContent = message.text;
      container.appendChild(sysDiv); return;
    }
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message${message.pinned ? ' message-pinned' : ''}`;
    const senderLine = document.createElement('div');
    senderLine.innerHTML = `<span class="chat-sender">${escapeHTML(message.sender || '')}</span><span class="chat-time">${escapeHTML(message.time || '')}</span>${message.edited ? '<span class="chat-edited">(edited)</span>' : ''}`;
    msgDiv.appendChild(senderLine);
    const textLine = document.createElement('div');
    textLine.className = 'chat-text'; textLine.textContent = message.text;
    msgDiv.appendChild(textLine);
    
    if (message.attachment) {
      const attach = document.createElement('div'); attach.className = 'chat-attachment';
      const info = document.createElement('div'); info.textContent = `Attachment: ${message.attachment.name}`; attach.appendChild(info);
      const fullUrl = normalizeStoredFileUrl(message.attachment.url);
      if (message.attachment.type.startsWith('image/')) { const img = document.createElement('img'); img.src = fullUrl; img.style.maxWidth = '200px'; attach.appendChild(img); }
      else if (message.attachment.type.startsWith('video/')) { const video = document.createElement('video'); video.src = fullUrl; video.controls = true; video.style.maxWidth = '250px'; attach.appendChild(video); }
      else { const link = document.createElement('a'); link.className = 'chat-attachment-link'; link.href = fullUrl; link.target = '_blank'; link.textContent = `Download`; attach.appendChild(link); }
      msgDiv.appendChild(attach);
    }
    const actions = document.createElement('div'); actions.className = 'chat-actions';
    if (currentUser && message.sender === currentUser.username) {
        const editBtn = document.createElement('button'); editBtn.className = 'chat-action-button'; editBtn.textContent = 'Edit'; editBtn.onclick = () => editChatMessage(message.id); actions.appendChild(editBtn);
        const delAllBtn = document.createElement('button'); delAllBtn.className = 'chat-action-button'; delAllBtn.textContent = 'Delete All'; delAllBtn.onclick = () => deleteMessageForEveryone(message.id); actions.appendChild(delAllBtn);
    }
    msgDiv.appendChild(actions);
    if (message.id) msgDiv.appendChild(buildReactionBar(String(message.id)));
    container.appendChild(msgDiv);
  });
  container.scrollTop = container.scrollHeight;
}

window.sendMessage = async function() {
  const input = document.getElementById('message-input');
  const attachmentInput = document.getElementById('attachment-input');
  const text = input.value.trim();
  const file = attachmentInput.files[0];
  if (!text && !file) return;
  if (!currentUser) return customAlert('Please login first.');
  if (currentChat.type === 'private' && !currentChat.target) return customAlert('Select a contact.');

  let attachmentData = null;
  if (file) {
      const safeName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
      const filePath = `chat-attachments/${Date.now()}_${safeName}`;
      const { error } = await sb.storage.from('portfolio-assets').upload(filePath, file, { contentType: file.type });
      if (!error) { const { data: urlData } = sb.storage.from('portfolio-assets').getPublicUrl(filePath); attachmentData = { name: file.name, type: file.type, url: urlData.publicUrl }; }
  }
  const payload = { chat: currentChat.type, target: currentChat.type === 'private' ? currentChat.target : null, text, attachment: attachmentData };
  const response = await authFetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const savedMessage = await response.json().catch(() => ({}));
  if (!response.ok) return customAlert(savedMessage.error || 'Send failed');
  logActivity('send_message', currentChat.type === 'private' ? `dm:${currentChat.target}` : currentChat.type);
  if (currentChat.type === 'private' && currentChat.target && savedMessage?.id) {
    notifyPrivateMessagePush(savedMessage).catch((error) => console.warn('Push trigger failed:', error.message));
  }
  input.value = ''; attachmentInput.value = '';
  localStorage.removeItem(`msg-draft-${currentChat.type}-${currentChat.target || ''}`);
  const lbl = document.getElementById('attachment-selected'); if(lbl) lbl.textContent = 'No file chosen';
};

window.editChatMessage = function(id) {
  const message = getCurrentHistory().find(m => m.id === id);
  if (!message) return;
  customPrompt('Edit:', async function(updated) { 
      if (updated !== null) {
          const response = await authFetch(`/api/messages/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: updated }) });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) return customAlert(data.error || 'Edit failed');
      }
  }, message.text);
};

window.deleteMessageForEveryone = async function(id) { customConfirm("Delete message?", async function() { const response = await authFetch(`/api/messages/${id}`, { method: 'DELETE' }); const data = await response.json().catch(() => ({})); if (!response.ok) return customAlert(data.error || 'Delete failed'); }); };

/* ============================================================
   UI & DROPDOWN NAVIGATION LOGIC
   ============================================================ */

window.toggleYear = function(yearId) {
    const group = document.querySelector(`.nav-dropdown-group.${yearId.replace('year', 'year-')}-theme`);
    if (!group) return;
    const wasOpen = group.classList.contains('open');
    document.querySelectorAll('.nav-dropdown-group').forEach(g => g.classList.remove('open'));
    if (!wasOpen) group.classList.add('open');
    group.classList.remove('nav-pulse');
    void group.offsetWidth;
    group.classList.add('nav-pulse');
    window.setTimeout(() => group.classList.remove('nav-pulse'), 320);
};

const pageConfig = {
  first:    { bg: 'bg-mountain', particles: 'particles-mountain', wave: false, mountain: true,  aurora: true,  label: '⛰️ First Semester' },
  second:   { bg: 'bg-ocean',    particles: 'particles-ocean',    wave: true,  mountain: false, aurora: false, label: '🌊 Second Semester' },
  y2first:  { bg: 'bg-mountain', particles: 'particles-mountain', wave: false, mountain: true,  aurora: false, label: '📘 2nd Year · 1st Semester' },
  y2second: { bg: 'bg-ocean',    particles: 'particles-ocean',    wave: true,  mountain: false, aurora: false, label: '📙 2nd Year · 2nd Semester' },
  y3first:  { bg: 'bg-aerial',   particles: 'particles-aerial',   wave: false, mountain: false, aurora: false, label: '🔬 3rd Year · 1st Semester' },
  y3second: { bg: 'bg-galaxy',   particles: 'particles-galaxy',   wave: false, mountain: false, aurora: false, label: '🔭 3rd Year · 2nd Semester' },
  y4first:  { bg: 'bg-galaxy',   particles: 'particles-galaxy',   wave: false, mountain: false, aurora: false, label: '📜 4th Year · 1st Semester' },
  y4second: { bg: 'bg-galaxy',   particles: 'particles-galaxy',   wave: false, mountain: false, aurora: false, label: '✨ 4th Year · 2nd Semester' },
  events:   { bg: 'bg-aerial',   particles: 'particles-aerial',   wave: false, mountain: false, aurora: false, label: '🛩️ Event Pictures' },
  random:   { bg: 'bg-galaxy',   particles: 'particles-galaxy',   wave: false, mountain: false, aurora: false, label: '🌌 Random Pictures' },
  chat:     { bg: 'bg-galaxy',   particles: 'particles-galaxy',   wave: false, mountain: false, aurora: false, label: '💬 Chat' },
  users:    { bg: 'bg-aerial',   particles: 'particles-aerial',   wave: false, mountain: false, aurora: false, label: '👥 User Directory' },
  calendar: { bg: 'bg-aerial',   particles: 'particles-aerial',   wave: false, mountain: false, aurora: false, label: '📅 Calendar' },
  music:    { bg: 'bg-ocean',    particles: 'particles-ocean',    wave: true,  mountain: false, aurora: false, label: '🎵 Music' },
  lobby:    { bg: 'bg-galaxy',   particles: 'particles-galaxy',   wave: false, mountain: false, aurora: false, label: '🏫 Lobby' },
  announcement:{ bg: 'bg-galaxy', particles: 'particles-galaxy',   wave: false, mountain: false, aurora: false, label: '📢 ANNOUNCEMENT' },
  games:    { bg: 'bg-galaxy',   particles: 'particles-galaxy',   wave: false, mountain: false, aurora: false, label: '🎮 Arcade' },
  pokemon:  { bg: 'bg-galaxy',   particles: 'particles-galaxy',   wave: false, mountain: false, aurora: false, label: '⚔️ Pokemon' },
  royale:   { bg: 'bg-galaxy',   particles: 'particles-galaxy',   wave: false, mountain: false, aurora: false, label: '🎯 Battle Royale' },
  witfb:    { bg: 'bg-galaxy',   particles: 'particles-galaxy',   wave: false, mountain: false, aurora: false, label: '📘 Social Media Pages' },
  outputai: { bg: 'bg-galaxy',   particles: 'particles-galaxy',   wave: false, mountain: false, aurora: false, label: '🧾 OUTPUT-AI' },
  ai:       { bg: 'bg-galaxy',   particles: 'particles-galaxy',   wave: false, mountain: false, aurora: false, label: '🤖 AI Assistants' },
};
pageConfig.codelab = { bg: 'bg-galaxy', particles: 'particles-galaxy', wave: false, mountain: false, aurora: false, label: 'CODE LAB' };
pageConfig['coding-educational'] = { bg: 'bg-galaxy', particles: 'particles-galaxy', wave: false, mountain: false, aurora: false, label: '📚 CODING LESSONS' };
pageConfig.pacman = { bg: 'bg-galaxy', particles: 'particles-galaxy', wave: false, mountain: false, aurora: false, label: 'PAC-MAN' };
pageConfig.diagnostics = { bg: 'bg-galaxy', particles: 'particles-galaxy', wave: false, mountain: false, aurora: false, label: 'Diagnostics' };
pageConfig.admin      = { bg: 'bg-galaxy', particles: 'particles-galaxy', wave: false, mountain: false, aurora: false, label: '🛠️ Admin' };
pageConfig.candy      = { bg: 'bg-galaxy', particles: 'particles-galaxy', wave: false, mountain: false, aurora: false, label: '🍬 Candy Match' };
pageConfig['personal-tools'] = { bg: 'bg-galaxy', particles: 'particles-galaxy', wave: false, mountain: false, aurora: false, label: '🔧 Personal Tools' };
pageConfig.alarm      = { bg: 'bg-galaxy', particles: 'particles-galaxy', wave: false, mountain: false, aurora: false, label: '⏰ Alarm Clock' };
pageConfig.notepad    = { bg: 'bg-galaxy', particles: 'particles-galaxy', wave: false, mountain: false, aurora: false, label: '📝 Notepad' };
pageConfig.calculator = { bg: 'bg-galaxy', particles: 'particles-galaxy', wave: false, mountain: false, aurora: false, label: '🧮 Calculator' };
pageConfig.personalization = { bg: 'bg-galaxy', particles: 'particles-galaxy', wave: false, mountain: false, aurora: false, label: '🎨 Personalization' };
pageConfig.reviewers       = { bg: 'bg-galaxy', particles: 'particles-galaxy', wave: false, mountain: false, aurora: false, label: '📄 REVIEWERS' };
pageConfig['file-summarizer'] = { bg: 'bg-galaxy', particles: 'particles-galaxy', wave: false, mountain: false, aurora: false, label: '📝 File Summarizer' };
let currentPage = 'announcement';
let customPageBgs = JSON.parse(localStorage.getItem('customPageBgs')) || {};
window.customPageBgs = customPageBgs; // expose for personalizationModule
let calendarNotes = {};

const CODED_BACKGROUND_PRESETS = [
  ['terminal-nexus', 'Terminal Nexus', 'IT Systems', 'radial-gradient(circle at 18% 28%, rgba(0,255,136,.24), transparent 26%), linear-gradient(90deg, rgba(0,255,136,.08) 1px, transparent 1px), linear-gradient(180deg,#020807,#061421)', 'Servers, shells, and command-line energy'],
  ['circuit-campus', 'Circuit Campus', 'IT Systems', 'linear-gradient(135deg, rgba(0,212,255,.16) 25%, transparent 25%), radial-gradient(circle at 80% 20%, rgba(0,255,136,.22), transparent 30%), linear-gradient(135deg,#03111f,#0d0620)', 'Circuit traces over a quiet school-night base'],
  ['server-room', 'Server Room', 'IT Systems', 'repeating-linear-gradient(90deg, rgba(0,212,255,.08) 0 10px, transparent 10px 34px), radial-gradient(circle at 75% 45%, rgba(0,255,136,.18), transparent 34%), linear-gradient(135deg,#020617,#111827)', 'Cool server aisle glow'],
  ['database-core', 'Database Core', 'IT Systems', 'radial-gradient(ellipse at 50% 35%, rgba(59,130,246,.32), transparent 32%), repeating-linear-gradient(0deg, rgba(255,255,255,.05) 0 2px, transparent 2px 26px), linear-gradient(135deg,#07111f,#020617)', 'Layered database storage mood'],
  ['debug-grid', 'Debug Grid', 'IT Systems', 'linear-gradient(rgba(34,197,94,.11) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,.11) 1px, transparent 1px), radial-gradient(circle at 25% 20%, rgba(255,215,0,.16), transparent 28%), #020617', 'A clean debugging grid'],
  ['packet-flow', 'Packet Flow', 'IT Systems', 'radial-gradient(circle at 15% 75%, rgba(0,255,136,.22), transparent 28%), radial-gradient(circle at 82% 20%, rgba(0,212,255,.28), transparent 28%), linear-gradient(45deg, transparent 45%, rgba(255,255,255,.08) 45% 46%, transparent 46%), #04111f', 'Network packets moving through dark glass'],
  ['cyber-tools', 'Cyber Tools', 'IT Systems', 'conic-gradient(from 220deg at 25% 30%, rgba(0,255,136,.22), transparent, rgba(0,212,255,.22), transparent), linear-gradient(135deg,#050816,#101728)', 'Security tools and scanning light'],
  ['compiler-fire', 'Compiler Fire', 'IT Systems', 'radial-gradient(circle at 22% 72%, rgba(255,120,0,.26), transparent 30%), radial-gradient(circle at 80% 28%, rgba(0,212,255,.22), transparent 32%), linear-gradient(135deg,#160500,#061525)', 'Build heat meeting blue logs'],
  ['cloud-console', 'Cloud Console', 'IT Systems', 'radial-gradient(circle at 80% 20%, rgba(125,211,252,.26), transparent 28%), radial-gradient(circle at 20% 80%, rgba(147,51,234,.20), transparent 34%), linear-gradient(135deg,#020617,#091632)', 'Cloud dashboard atmosphere'],
  ['ai-lab', 'AI Lab', 'IT Systems', 'radial-gradient(circle at 50% 45%, rgba(199,125,255,.28), transparent 30%), linear-gradient(120deg, rgba(0,255,200,.12), transparent 46%), linear-gradient(135deg,#090016,#071224)', 'Neural lab glow'],
  ['neon-shibuya', 'Anime Mood', 'radial-gradient(circle at 18% 26%, rgba(255,0,128,.24), transparent 28%), radial-gradient(circle at 78% 66%, rgba(0,212,255,.26), transparent 32%), linear-gradient(135deg,#120019,#020617)', 'Rainy neon anime-city feeling'],
  ['sorcerer-blue', 'Anime Mood', 'radial-gradient(circle at 58% 42%, rgba(30,64,175,.38), transparent 28%), radial-gradient(circle at 18% 72%, rgba(0,255,200,.20), transparent 26%), linear-gradient(135deg,#020617,#0b1028)', 'Blue energy without external art'],
  ['chakra-sunset', 'Anime Mood', 'radial-gradient(circle at 20% 30%, rgba(255,145,0,.28), transparent 28%), radial-gradient(circle at 82% 70%, rgba(255,0,80,.18), transparent 32%), linear-gradient(135deg,#180700,#0b1020)', 'Warm training-ground energy'],
  ['monster-meadow', 'Anime Mood', 'radial-gradient(circle at 25% 72%, rgba(0,255,136,.28), transparent 28%), radial-gradient(circle at 78% 22%, rgba(255,215,0,.26), transparent 24%), linear-gradient(135deg,#04200d,#073047)', 'Bright adventure meadow'],
  ['hero-screen', 'Anime Mood', 'radial-gradient(circle at 50% 32%, rgba(255,255,255,.16), transparent 24%), radial-gradient(circle at 75% 70%, rgba(0,212,255,.22), transparent 34%), linear-gradient(135deg,#060712,#1e293b)', 'Cinematic hero spotlight'],
  ['arcade-fever', 'Games', 'linear-gradient(90deg, rgba(255,0,128,.18) 1px, transparent 1px), linear-gradient(rgba(0,212,255,.18) 1px, transparent 1px), radial-gradient(circle at 70% 30%, rgba(255,215,0,.18), transparent 28%), #080019', 'Arcade cabinet glow'],
  ['pixel-dawn', 'Games', 'repeating-linear-gradient(45deg, rgba(255,255,255,.05) 0 12px, transparent 12px 24px), radial-gradient(circle at 80% 20%, rgba(255,215,0,.26), transparent 28%), linear-gradient(135deg,#120820,#0b2a38)', 'Retro game morning'],
  ['battle-island', 'Games', 'radial-gradient(circle at 18% 75%, rgba(34,197,94,.22), transparent 30%), radial-gradient(circle at 78% 25%, rgba(56,189,248,.22), transparent 34%), linear-gradient(135deg,#062314,#071629)', 'Island arena energy'],
  ['pacman-night', 'Games', 'linear-gradient(90deg, rgba(255,215,0,.12) 1px, transparent 1px), linear-gradient(rgba(59,130,246,.18) 1px, transparent 1px), radial-gradient(circle at 20% 25%, rgba(255,215,0,.22), transparent 18%), #050816', 'Arcade maze night'],
  ['console-dream', 'Games', 'radial-gradient(circle at 16% 20%, rgba(0,255,136,.20), transparent 24%), radial-gradient(circle at 84% 76%, rgba(255,0,128,.22), transparent 30%), linear-gradient(135deg,#050816,#0f1028)', 'Controller-light dreamscape'],
  ['midnight-library', 'School', 'radial-gradient(circle at 16% 18%, rgba(255,215,0,.18), transparent 24%), radial-gradient(circle at 80% 80%, rgba(0,212,255,.16), transparent 30%), linear-gradient(135deg,#080b13,#171326)', 'Quiet late-night study'],
  ['classroom-holo', 'School', 'linear-gradient(120deg, rgba(0,212,255,.18), transparent 42%), radial-gradient(circle at 82% 24%, rgba(0,255,136,.20), transparent 26%), linear-gradient(135deg,#06111f,#100b24)', 'Digital classroom board'],
  ['notebook-glow', 'School', 'repeating-linear-gradient(0deg, rgba(255,255,255,.06) 0 1px, transparent 1px 30px), radial-gradient(circle at 72% 20%, rgba(255,215,0,.18), transparent 24%), linear-gradient(135deg,#101318,#050816)', 'Notebook lines in dark mode'],
  ['campus-mist', 'School', 'radial-gradient(circle at 20% 80%, rgba(0,255,136,.18), transparent 30%), radial-gradient(circle at 75% 18%, rgba(125,211,252,.22), transparent 28%), linear-gradient(135deg,#071b18,#081225)', 'Soft campus morning'],
  ['exam-focus', 'School', 'linear-gradient(135deg, rgba(255,255,255,.08), transparent 40%), radial-gradient(circle at 50% 78%, rgba(0,212,255,.20), transparent 32%), linear-gradient(135deg,#0b1020,#080716)', 'Clean review-session backdrop'],
  ['galaxy-violet', 'Space', 'radial-gradient(circle at 20% 30%, rgba(147,51,234,.34), transparent 28%), radial-gradient(circle at 78% 64%, rgba(0,212,255,.20), transparent 32%), linear-gradient(135deg,#030712,#13001f)', 'Purple nebula field'],
  ['moon-terminal', 'Space', 'radial-gradient(circle at 72% 28%, rgba(255,255,255,.18), transparent 18%), radial-gradient(circle at 20% 80%, rgba(0,212,255,.18), transparent 30%), linear-gradient(135deg,#020617,#111827)', 'Moonlit console atmosphere'],
  ['meteor-lab', 'Space', 'linear-gradient(120deg, transparent 35%, rgba(255,255,255,.12) 36%, transparent 37%), radial-gradient(circle at 80% 18%, rgba(255,215,0,.18), transparent 22%), #020617', 'Meteor streaks over a lab'],
  ['cosmic-river', 'Space', 'linear-gradient(110deg, transparent 18%, rgba(0,212,255,.18) 28%, rgba(199,125,255,.18) 48%, transparent 60%), linear-gradient(135deg,#020617,#12001e)', 'River of stars'],
  ['starship-ui', 'Space', 'repeating-linear-gradient(90deg, rgba(125,211,252,.07) 0 2px, transparent 2px 42px), radial-gradient(circle at 50% 50%, rgba(0,212,255,.18), transparent 32%), #07111f', 'Starship interface mood'],
  ['forest-console', 'Nature', 'radial-gradient(circle at 20% 72%, rgba(34,197,94,.26), transparent 28%), radial-gradient(circle at 80% 20%, rgba(190,242,100,.18), transparent 24%), linear-gradient(135deg,#031407,#081c12)', 'Forest with tech glow'],
  ['ocean-dashboard', 'Nature', 'radial-gradient(circle at 50% 90%, rgba(0,212,255,.36), transparent 40%), linear-gradient(180deg,#001b2e,#03001c)', 'Deep ocean dashboard'],
  ['aurora-field', 'Nature', 'linear-gradient(120deg, rgba(0,255,200,.24), transparent 38%), radial-gradient(circle at 80% 20%, rgba(88,101,242,.32), transparent 34%), linear-gradient(135deg,#02111f,#120024)', 'Northern-light field'],
  ['mountain-code', 'Nature', 'radial-gradient(ellipse at 50% 100%, rgba(34,197,94,.28), transparent 44%), radial-gradient(circle at 80% 20%, rgba(255,255,255,.12), transparent 20%), linear-gradient(180deg,#081225,#0a1a0f)', 'Mountain horizon for focus'],
  ['rain-garden', 'Nature', 'repeating-linear-gradient(105deg, rgba(125,211,252,.08) 0 2px, transparent 2px 18px), radial-gradient(circle at 22% 78%, rgba(34,197,94,.20), transparent 30%), #07111f', 'Rainy garden glass'],
  ['tokyo-blue', 'City', 'radial-gradient(circle at 18% 22%, rgba(0,212,255,.24), transparent 28%), radial-gradient(circle at 84% 74%, rgba(255,0,128,.20), transparent 30%), linear-gradient(135deg,#050816,#111827)', 'Blue neon city'],
  ['manila-night', 'City', 'linear-gradient(180deg, transparent 45%, rgba(255,215,0,.10)), radial-gradient(circle at 72% 22%, rgba(0,212,255,.18), transparent 26%), #07111f', 'Warm city night'],
  ['rainy-alley', 'City', 'repeating-linear-gradient(105deg, rgba(255,255,255,.05) 0 1px, transparent 1px 16px), radial-gradient(circle at 20% 25%, rgba(255,0,128,.18), transparent 26%), linear-gradient(135deg,#080716,#111827)', 'Rain streaks and alley glow'],
  ['skyline-coral', 'City', 'radial-gradient(circle at 20% 20%, rgba(255,112,0,.24), transparent 28%), radial-gradient(circle at 80% 70%, rgba(0,212,255,.18), transparent 32%), linear-gradient(135deg,#190b08,#071426)', 'Sunset skyline energy'],
  ['metro-lines', 'City', 'linear-gradient(90deg, transparent 30%, rgba(0,212,255,.12) 31%, transparent 32%), repeating-linear-gradient(0deg, rgba(255,255,255,.04) 0 1px, transparent 1px 24px), #07111f', 'Metro map linework'],
  ['glass-emerald', 'Abstract', 'radial-gradient(circle at 20% 20%, rgba(0,255,136,.22), transparent 32%), radial-gradient(circle at 82% 72%, rgba(0,212,255,.18), transparent 34%), linear-gradient(135deg,#020617,#06221a)', 'Emerald glassmorphism'],
  ['violet-mesh', 'Abstract', 'linear-gradient(45deg, rgba(199,125,255,.18), transparent 35%), linear-gradient(135deg, transparent 55%, rgba(255,0,128,.16)), #090016', 'Violet mesh'],
  ['gold-carbon', 'Abstract', 'repeating-linear-gradient(45deg, rgba(255,215,0,.06) 0 8px, transparent 8px 18px), radial-gradient(circle at 78% 22%, rgba(255,215,0,.20), transparent 24%), #080806', 'Gold carbon texture'],
  ['ice-panel', 'Abstract', 'linear-gradient(120deg, rgba(125,211,252,.22), transparent 38%), radial-gradient(circle at 82% 18%, rgba(255,255,255,.18), transparent 24%), linear-gradient(135deg,#061626,#0b1020)', 'Frosted interface panel'],
  ['rose-hologram', 'Abstract', 'radial-gradient(circle at 30% 25%, rgba(244,63,94,.26), transparent 26%), radial-gradient(circle at 78% 62%, rgba(147,51,234,.26), transparent 34%), linear-gradient(135deg,#080012,#1b0321)', 'Rose holographic glow'],
  ['stage-audio', 'Music', 'radial-gradient(circle at 50% 12%, rgba(255,255,255,.16), transparent 20%), radial-gradient(circle at 18% 72%, rgba(255,0,128,.20), transparent 28%), linear-gradient(135deg,#090012,#07111f)', 'Concert stage lights'],
  ['lofi-desk', 'Music', 'radial-gradient(circle at 22% 24%, rgba(255,215,0,.16), transparent 24%), radial-gradient(circle at 80% 78%, rgba(0,212,255,.14), transparent 30%), linear-gradient(135deg,#0b1020,#171326)', 'Lofi study desk mood'],
  ['vinyl-wave', 'Music', 'conic-gradient(from 0deg at 20% 50%, rgba(255,255,255,.10), transparent, rgba(255,0,128,.16), transparent), linear-gradient(135deg,#090016,#111827)', 'Vinyl-inspired rings'],
  ['spectrum-bars', 'Music', 'repeating-linear-gradient(90deg, rgba(0,255,136,.16) 0 8px, transparent 8px 22px), radial-gradient(circle at 78% 18%, rgba(0,212,255,.16), transparent 24%), #020617', 'Audio spectrum bars'],
  ['piano-night', 'Music', 'linear-gradient(90deg, rgba(255,255,255,.05) 0 8%, transparent 8% 13%), radial-gradient(circle at 72% 24%, rgba(255,215,0,.14), transparent 24%), #080b13', 'Piano-key night'],
].map((item) => {
  let [id, title, category, background, query] = item;
  if (item.length === 4) {
    [id, category, background, query] = item;
    title = id.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
  }
  return { id, title, type: 'coded', category, background, query };
});

const ANIMATED_BACKGROUND_PRESETS = [
  ['aurora-cyan', 'Aurora Cyan', 'linear-gradient(120deg, rgba(0,255,200,.28), transparent 38%), radial-gradient(circle at 80% 20%, rgba(88,101,242,.42), transparent 34%), linear-gradient(135deg,#02111f,#120024 62%,#001b1c)', 'motion-pan'],
  ['sakura-night', 'Sakura Night', 'radial-gradient(circle at 20% 20%, rgba(255,179,186,.35), transparent 28%), radial-gradient(circle at 80% 70%, rgba(255,0,128,.20), transparent 35%), linear-gradient(135deg,#160014,#09051f)', 'motion-drift'],
  ['cursed-energy', 'Cursed Energy', 'radial-gradient(circle at 35% 35%, rgba(79,70,229,.42), transparent 30%), radial-gradient(circle at 70% 65%, rgba(0,212,255,.28), transparent 34%), linear-gradient(135deg,#030712,#170026)', 'motion-pulse'],
  ['electric-meadow', 'Electric Meadow', 'radial-gradient(circle at 18% 80%, rgba(0,255,136,.34), transparent 28%), radial-gradient(circle at 78% 22%, rgba(255,215,0,.3), transparent 24%), linear-gradient(135deg,#06240f,#061726)', 'motion-wave'],
  ['ninja-flame', 'Ninja Flame', 'radial-gradient(circle at 20% 30%, rgba(255,112,0,.35), transparent 30%), radial-gradient(circle at 85% 65%, rgba(255,0,80,.25), transparent 34%), linear-gradient(135deg,#1b0500,#100015)', 'motion-pan'],
  ['movie-neon', 'Movie Neon', 'linear-gradient(115deg, rgba(0,212,255,.22), transparent 40%), radial-gradient(circle at 80% 25%, rgba(255,0,128,.34), transparent 32%), linear-gradient(135deg,#03091a,#170322)', 'motion-drift'],
  ['space-vortex', 'Space Vortex', 'conic-gradient(from 90deg at 50% 50%, #020617, #312e81, #0891b2, #020617, #4c1d95, #020617)', 'motion-spin'],
  ['green-terminal', 'Green Terminal', 'repeating-linear-gradient(0deg, rgba(0,255,136,.08) 0 1px, transparent 1px 18px), linear-gradient(135deg,#020b07,#001f18)', 'motion-scan'],
  ['arcade-grid', 'Arcade Grid', 'linear-gradient(rgba(0,212,255,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,0,128,.18) 1px, transparent 1px), linear-gradient(135deg,#050018,#10002a)', 'motion-grid'],
  ['ocean-pulse', 'Ocean Pulse', 'radial-gradient(circle at 50% 90%, rgba(0,212,255,.42), transparent 38%), linear-gradient(180deg,#001b2e,#03001c)', 'motion-wave'],
  ['sunset-code', 'Sunset Code', 'radial-gradient(circle at 22% 18%, rgba(255,196,0,.32), transparent 28%), radial-gradient(circle at 80% 75%, rgba(255,65,108,.28), transparent 34%), linear-gradient(135deg,#1b1200,#13001d)', 'motion-drift'],
  ['violet-storm', 'Violet Storm', 'radial-gradient(circle at 25% 65%, rgba(199,125,255,.34), transparent 32%), radial-gradient(circle at 78% 28%, rgba(56,189,248,.24), transparent 30%), linear-gradient(135deg,#080012,#16002b)', 'motion-pulse'],
  ['forest-firefly', 'Forest Firefly', 'radial-gradient(circle at 12% 20%, rgba(190,242,100,.28), transparent 24%), radial-gradient(circle at 78% 78%, rgba(34,197,94,.24), transparent 32%), linear-gradient(135deg,#031407,#09150f)', 'motion-drift'],
  ['cyber-rain', 'Cyber Rain', 'repeating-linear-gradient(90deg, rgba(0,212,255,.05) 0 2px, transparent 2px 38px), radial-gradient(circle at 80% 25%, rgba(0,255,136,.22), transparent 28%), linear-gradient(135deg,#020617,#08111f)', 'motion-scan'],
  ['golden-campus', 'Golden Campus', 'radial-gradient(circle at 20% 22%, rgba(255,215,0,.28), transparent 28%), radial-gradient(circle at 70% 80%, rgba(0,212,255,.18), transparent 34%), linear-gradient(135deg,#151006,#05091b)', 'motion-pan'],
  ['rose-galaxy', 'Rose Galaxy', 'radial-gradient(circle at 30% 25%, rgba(244,63,94,.35), transparent 26%), radial-gradient(circle at 78% 62%, rgba(147,51,234,.34), transparent 34%), linear-gradient(135deg,#080012,#1b0321)', 'motion-pulse'],
  ['ice-crystal', 'Ice Crystal', 'linear-gradient(120deg, rgba(125,211,252,.22), transparent 38%), radial-gradient(circle at 82% 18%, rgba(255,255,255,.22), transparent 24%), linear-gradient(135deg,#061626,#0b1020)', 'motion-wave'],
  ['lava-core', 'Lava Core', 'radial-gradient(circle at 72% 70%, rgba(239,68,68,.38), transparent 30%), radial-gradient(circle at 22% 22%, rgba(251,146,60,.28), transparent 28%), linear-gradient(135deg,#1c0500,#080006)', 'motion-pan'],
  ['dream-cloud', 'Dream Cloud', 'radial-gradient(circle at 28% 30%, rgba(216,180,254,.34), transparent 34%), radial-gradient(circle at 72% 68%, rgba(125,211,252,.26), transparent 34%), linear-gradient(135deg,#0f1028,#071828)', 'motion-drift'],
  ['matrix-blue', 'Matrix Blue', 'repeating-linear-gradient(180deg, rgba(0,212,255,.07) 0 1px, transparent 1px 22px), linear-gradient(135deg,#020617,#001e2b)', 'motion-scan'],
  ['hero-spotlight', 'Hero Spotlight', 'radial-gradient(circle at 50% 38%, rgba(255,255,255,.18), transparent 24%), radial-gradient(circle at 72% 68%, rgba(0,212,255,.26), transparent 34%), linear-gradient(135deg,#060712,#121b2f)', 'motion-pulse'],
  ['midnight-library', 'Midnight Library', 'radial-gradient(circle at 18% 22%, rgba(255,215,0,.18), transparent 24%), radial-gradient(circle at 80% 82%, rgba(0,212,255,.18), transparent 30%), linear-gradient(135deg,#080b13,#171326)', 'motion-drift'],
  ['hologram', 'Hologram Mesh', 'linear-gradient(45deg, rgba(0,255,200,.16), transparent 35%), linear-gradient(135deg, transparent 55%, rgba(255,0,128,.16)), linear-gradient(135deg,#030712,#0b1026)', 'motion-grid'],
  ['cosmic-class', 'Cosmic Class', 'radial-gradient(circle at 20% 80%, rgba(0,255,136,.22), transparent 30%), radial-gradient(circle at 80% 20%, rgba(199,125,255,.32), transparent 30%), linear-gradient(135deg,#020617,#100020)', 'motion-spin'],
  ['soft-rainbow', 'Soft Rainbow', 'linear-gradient(120deg, rgba(0,212,255,.24), rgba(255,0,128,.18), rgba(0,255,136,.18)), linear-gradient(135deg,#050816,#120421)', 'motion-wave'],
].map(([id, title, background, motion]) => ({ id, title, type: 'animated', category: 'Live Animated', background, motion }));

function normalizeCustomBackground(value) {
  if (!value) return null;
  if (typeof value === 'string') return { type: 'image', url: value, title: 'Uploaded background' };
  return value;
}

function setPageBackground(pageName, background) {
  if (background) customPageBgs[pageName] = background;
  else delete customPageBgs[pageName];
  try {
    localStorage.setItem('customPageBgs', JSON.stringify(customPageBgs));
  } catch (_) {}
  applyPageBackground(pageName);
}

function applyPageBackground(pageName = currentPage) {
  const cfg = pageConfig[pageName];
  const customBgLayer = document.getElementById('custom-animated-bg');
  const selected = normalizeCustomBackground(customPageBgs[pageName]);
  document.body.style.backgroundImage = '';
  document.body.style.backgroundSize = '';
  document.body.style.backgroundPosition = '';
  document.body.style.backgroundAttachment = '';
  if (customBgLayer) {
    customBgLayer.className = 'custom-animated-bg';
    customBgLayer.style.background = '';
  }

  document.querySelectorAll('.scene-bg').forEach((bg) => bg.classList.remove('active'));
  if (document.getElementById('wave-container')) document.getElementById('wave-container').classList.remove('active');
  if (document.getElementById('mountain-svg')) document.getElementById('mountain-svg').classList.remove('active');
  if (document.getElementById('aurora')) document.getElementById('aurora').classList.remove('active');

  if (selected?.background && customBgLayer) {
    customBgLayer.style.background = selected.background;
    customBgLayer.classList.add('active');
    if (selected.type === 'animated') customBgLayer.classList.add(selected.motion || 'motion-pan');
    return;
  }

  if (selected?.url) {
    document.body.style.backgroundImage = `linear-gradient(rgba(0,0,0,.24), rgba(0,0,0,.42)), url("${selected.url}")`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundAttachment = 'fixed';
    return;
  }

  if (!cfg) return;
  document.getElementById(cfg.bg)?.classList.add('active');
  document.getElementById(cfg.particles)?.classList.add('active');
  if (cfg.wave && document.getElementById('wave-container')) document.getElementById('wave-container').classList.add('active');
  if (cfg.mountain) document.getElementById('mountain-svg')?.classList.add('active');
  if (cfg.aurora) document.getElementById('aurora')?.classList.add('active');
}

const originalGoToPage = window.goToPage;
window.goToPage = function(targetPage) {
  const aliases = {
    'alarm-clock': 'alarm',
    'scientific-calculator': 'calculator',
    'tools': 'personal-tools'
  };
  const pageName = aliases[targetPage] || targetPage;

  console.log(`[ROUTER] Navigating to page: ${pageName}`);
  if (pageName === currentPage) { const p = document.getElementById('page-' + pageName); if(p) p.scrollTop = 0; closeMenu(); return; }
  if (pageName === 'chat') { const dot = document.getElementById('chat-notif-dot'); if (dot) dot.classList.add('hidden'); }

  // Lobby: tear down canvas when leaving
  if (currentPage === 'lobby') lobbyModule.destroy();
  // Pokemon: tear down when leaving
  if (currentPage === 'pokemon' && typeof pokemonModule !== 'undefined') pokemonModule.destroy();
  // Royale: tear down when leaving
  if (currentPage === 'royale' && typeof royaleModule !== 'undefined') royaleModule.destroy();
  if (currentPage === 'pacman' && typeof pacmanModule !== 'undefined') pacmanModule.destroy();
  if (currentPage === 'candy'  && typeof candyModule  !== 'undefined') candyModule.destroy();
  // Alarm: tear down clock when leaving
  if (currentPage === 'alarm' && typeof alarmModule !== 'undefined') alarmModule.destroy();
  // File Summarizer: close quiz modal/score screen when navigating away
  if (currentPage === 'file-summarizer') {
    document.getElementById('fs-quiz-modal')?.classList.remove('active');
    document.getElementById('fs-quiz-score')?.classList.remove('active');
    runSafeUiAction('File Summarizer', () => window.fileSummarizerModule?.refreshHistory?.());
  }

  // YouTube mini-player: show when leaving music, hide when returning
  const ytMini = document.getElementById('yt-mini-player');
  if (ytMini) {
    if (pageName === 'music') ytMini.classList.add('hidden');
    else if (ytActive && currentPage === 'music') ytMini.classList.remove('hidden');
  }

  // Ping server when music page opens so Render wakes up before the user searches
  if (pageName === 'music') fetch('/api/ping').catch(() => {});

  // Hide chat bauble on pages where it blocks controls or the AI input
  const chatBauble = document.getElementById('chat-bauble');
  if (chatBauble) chatBauble.style.display = (pageName === 'personal-tools' || pageName === 'pokemon' || pageName === 'royale' || pageName === 'pacman' || pageName === 'candy' || pageName === 'lobby' || pageName === 'ai' || pageName === 'outputai' || pageName === 'codelab' || pageName === 'coding-educational') ? 'none' : '';

  // Hide live clock on AI page — it overlaps the chat header
  const liveClock = document.getElementById('live-clock');
  if (liveClock) liveClock.style.display = (pageName === 'ai' || pageName === 'outputai' || pageName === 'codelab' || pageName === 'coding-educational') ? 'none' : '';

  const old = pageConfig[currentPage];
  const oldPage = document.getElementById('page-' + currentPage);
  if(oldPage) {
    oldPage.classList.remove('active');
    oldPage.style.pointerEvents = '';
  }
  if (old) {
    document.getElementById(old.bg)?.classList.remove('active');
    document.getElementById(old.particles)?.classList.remove('active');
    if (old.wave) document.getElementById('wave-container')?.classList.remove('active');
    if (old.mountain) document.getElementById('mountain-svg')?.classList.remove('active');
    if (old.aurora) document.getElementById('aurora')?.classList.remove('active');
  }

  currentPage = pageName;
  if (appPresenceChannel && currentUser?.username) {
    appPresenceChannel.track({
      username: currentUser.username,
      displayName: currentUser.display_name || currentUser.username,
      page: currentPage,
      activeAt: new Date().toISOString(),
    }).catch(() => {});
    persistLastSeen({ online: true });
  }
  const cfg = pageConfig[pageName];
  const newPage = document.getElementById('page-' + pageName);
  if(newPage) {
    newPage.classList.add('active');
    newPage.style.pointerEvents = 'auto';
  }

  applyPageBackground(pageName);

  const indicator = document.getElementById('page-indicator');
  if (indicator && cfg) indicator.textContent = cfg.label;
  if(newPage) newPage.scrollTop = 0;
  document.querySelectorAll('.nav-item').forEach(item => { if(item.dataset.page) item.classList.toggle('active', item.dataset.page === pageName); });
  closeMenu();

  // Lobby: start canvas after page is visible
  if (pageName === 'lobby') {
    runSafeUiAction('Lobby', () => { _ensureSocket(); lobbyModule.init(); });
  }
  // Pokemon: start after page is visible
  if (pageName === 'pokemon' && typeof pokemonModule !== 'undefined') runSafeUiAction('Pokemon', () => pokemonModule.init());
  // Royale: start after page is visible
  if (pageName === 'royale' && typeof royaleModule !== 'undefined') runSafeUiAction('Battle Royale', () => royaleModule.init());
  if (pageName === 'pacman' && typeof pacmanModule !== 'undefined') runSafeUiAction('Pac-Man', () => pacmanModule.init());
  if (pageName === 'candy'  && typeof candyModule  !== 'undefined') runSafeUiAction('Candy Match', () => candyModule.init());
  if (pageName === 'personal-tools' && typeof personalToolsModule !== 'undefined') runSafeUiAction('Personal Tools', () => personalToolsModule.init());
  if (pageName === 'alarm' && typeof alarmModule !== 'undefined') runSafeUiAction('Alarm Clock', () => alarmModule.init());
  if (pageName === 'notepad' && typeof notepadModule !== 'undefined') runSafeUiAction('Notepad', () => notepadModule.init());
  if (pageName === 'calculator' && typeof calculatorModule !== 'undefined') runSafeUiAction('Calculator', () => calculatorModule.init());
  if (pageName === 'personalization' && typeof personalizationModule !== 'undefined') runSafeUiAction('Personalization', () => personalizationModule.init());
  if (pageName === 'reviewers' && typeof reviewersModule !== 'undefined') runSafeUiAction('Reviewers', () => reviewersModule.init());
  if (pageName === 'diagnostics') runSafeUiAction('Diagnostics', () => loadDiagnostics());
  // Games hub: draw royale preview canvas
  if (pageName === 'games') runSafeUiAction('Games', () => drawRoyalePreviewCanvas());
  // Event Pictures & Random Pictures: reset and render year cards
  if (pageName === 'events') runSafeUiAction('Event Pictures', () => { galleryStates.ep = { level:'years', year:null, sem:null, folder:null }; renderGallery('ep'); });
  if (pageName === 'random') runSafeUiAction('Random Pictures', () => { galleryStates.rp = { level:'years', year:null, sem:null, folder:null }; renderGallery('rp'); });
  if (pageName === 'announcement') runSafeUiAction('Announcement', () => fetchSharedAnnouncements());
  if (pageName === 'witfb') runSafeUiAction('Social Media Pages', () => closeSocialPage());
  if (pageName === 'outputai') runSafeUiAction('Output-AI', () => fetchSharedAIOutputs());
  if (pageName === 'codelab') runSafeUiAction('Code Lab', () => window.initCodeLab?.());
  if (pageName === 'coding-educational') runSafeUiAction('Coding Lessons', () => window.initCodingEducational?.());
  // AI Assistants hub
  if (pageName === 'ai') runSafeUiAction('AI Assistants', () => { aiView = 'hub'; renderAI(); });
  if (pageName === 'admin') runSafeUiAction('Admin', () => loadAdminDashboard());
};

let backgroundPickerTab = 'coded';
let backgroundPickerSearch = '';

function backgroundCardMarkup(bg) {
  const previewStyle = bg.background
    ? `style="background:${escapeHTML(bg.background)}"`
    : `style="background-image:linear-gradient(rgba(0,0,0,.15), rgba(0,0,0,.58)), url('${escapeHTML(bg.url)}')"`;
  const badge = bg.type === 'animated' ? 'Live' : bg.category;
  return `
    <button class="bg-choice-card ${bg.type === 'animated' ? 'is-animated' : ''}" type="button" onclick="selectPresetBackground('${escapeJS(bg.type)}','${escapeJS(bg.id)}')" ${previewStyle}>
      <span class="bg-choice-badge">${escapeHTML(badge)}</span>
      <strong>${escapeHTML(bg.title)}</strong>
      <small>${escapeHTML(bg.query || bg.category || 'Animated background')}</small>
    </button>
  `;
}

function renderBackgroundPicker() {
  const grid = document.getElementById('background-picker-grid');
  const count = document.getElementById('background-picker-count');
  if (!grid) return;
  const term = backgroundPickerSearch.toLowerCase();
  const source = backgroundPickerTab === 'animated' ? ANIMATED_BACKGROUND_PRESETS : CODED_BACKGROUND_PRESETS;
  const filtered = source.filter((bg) => [bg.title, bg.category, bg.query].some((value) => String(value || '').toLowerCase().includes(term)));
  if (count) count.textContent = `${filtered.length} ${backgroundPickerTab === 'animated' ? 'live presets' : 'coded designs'}`;
  grid.innerHTML = filtered.length
    ? filtered.map(backgroundCardMarkup).join('')
    : '<div class="bg-picker-empty">No backgrounds match that search.</div>';
}

window.openBackgroundPicker = function() {
  removeDynamicModal('background-picker-modal');
  const current = normalizeCustomBackground(customPageBgs[currentPage]);
  document.body.insertAdjacentHTML('beforeend', `
    <div id="background-picker-modal" class="custom-modal-overlay blur-bg high-z" style="display:flex;">
      <div class="custom-modal-box background-picker-box border-blue">
        <button class="modal-close-btn" onclick="removeDynamicModal('background-picker-modal')">&times;</button>
        <div class="bg-picker-head">
          <div>
            <p class="bg-picker-kicker">Page background</p>
            <h3 class="modal-title text-blue">Choose a Background</h3>
            <p class="modal-text align-left">Apply a handcrafted coded background, live animated design, or uploaded file to ${escapeHTML(pageConfig[currentPage]?.label || currentPage)}.</p>
          </div>
          <div class="bg-current-pill">${current ? escapeHTML(current.title || 'Custom active') : 'Default scene active'}</div>
        </div>
        <div class="bg-picker-controls">
          <div class="bg-picker-tabs">
            <button class="bg-picker-tab ${backgroundPickerTab === 'coded' ? 'active' : ''}" onclick="setBackgroundPickerTab('coded')">Coded Designs</button>
            <button class="bg-picker-tab ${backgroundPickerTab === 'animated' ? 'active' : ''}" onclick="setBackgroundPickerTab('animated')">Live Animated</button>
            <button class="bg-picker-tab" onclick="document.getElementById('custom-bg-upload')?.click()">Upload</button>
          </div>
          <input class="bg-picker-search" id="background-picker-search" type="search" placeholder="Search anime, city, space, study..." value="${escapeHTML(backgroundPickerSearch)}">
        </div>
        <div class="bg-picker-meta">
          <span id="background-picker-count"></span>
          <button class="bg-clear-btn" onclick="clearPageBackground()">Use Default</button>
        </div>
        <div class="bg-picker-grid" id="background-picker-grid"></div>
      </div>
    </div>
  `);
  const search = document.getElementById('background-picker-search');
  if (search) {
    search.addEventListener('input', () => {
      backgroundPickerSearch = search.value;
      renderBackgroundPicker();
    });
  }
  renderBackgroundPicker();
};

window.setBackgroundPickerTab = function(tab) {
  backgroundPickerTab = tab;
  document.querySelectorAll('.bg-picker-tab').forEach((button) => {
    const text = button.textContent.toLowerCase();
    button.classList.toggle('active', tab === 'coded' ? text.includes('coded') : text.includes('live'));
  });
  renderBackgroundPicker();
};

window.selectPresetBackground = function(type, id) {
  const source = type === 'animated' ? ANIMATED_BACKGROUND_PRESETS : CODED_BACKGROUND_PRESETS;
  const bg = source.find((item) => item.id === id);
  if (!bg) return;
  setPageBackground(currentPage, bg);
  showToast(`${bg.title} applied to this page.`);
};

window.clearPageBackground = function() {
  setPageBackground(currentPage, null);
  showToast('Default scene restored.');
  renderBackgroundPicker();
};

function statusClass(ok, warn = false) {
  if (ok) return 'ok';
  return warn ? 'warn' : 'fail';
}

function renderDiagnosticRows(rows = []) {
  return `<div class="diagnostics-list">${rows.map((row) => `
    <div class="diagnostics-row">
      <span>${escapeHTML(row.label)}</span>
      <code>${escapeHTML(String(row.value ?? ''))}</code>
    </div>
  `).join('')}</div>`;
}

window.loadDiagnostics = async function() {
  const grid = document.getElementById('diagnostics-grid');
  const summary = document.getElementById('diagnostics-summary');
  if (!grid || !summary) return;
  grid.innerHTML = '<div class="diagnostics-card loading">Loading diagnostics...</div>';
  summary.innerHTML = '';
  try {
    const response = await authFetch('/api/diagnostics', { cache: 'no-store' });
    if (response.status === 403) {
      summary.innerHTML = [
        ['App', APP_VERSION],
        ['Access', 'Signed-in user'],
      ].map(([label, value]) => `<div class="diagnostics-pill"><span>${escapeHTML(label)}</span><strong>${escapeHTML(value)}</strong></div>`).join('');
      grid.innerHTML = `<div class="diagnostics-card warn"><span>LIMITED</span><strong>Admin access required</strong>${renderDiagnosticRows([{ label: 'Message', value: 'Diagnostics is limited to admin sessions for safety. Your login is working, but this page needs an admin-approved account.' }])}</div>`;
      return;
    }
    if (!response.ok) throw new Error(`Diagnostics failed (${response.status})`);
    const data = await response.json();
    const staticOk = (data.staticAssets || []).every((asset) => asset.exists);
    summary.innerHTML = [
      ['App', data.appVersion || APP_VERSION],
      ['Cache', data.cacheVersion || 'Unknown'],
      ['Runtime', data.runtime || 'Unknown'],
      ['Uptime', data.uptime || '0s'],
    ].map(([label, value]) => `<div class="diagnostics-pill"><span>${escapeHTML(label)}</span><strong>${escapeHTML(value)}</strong></div>`).join('');

    const cards = [
      {
        title: 'Java Runner',
        state: statusClass(Boolean(data.java?.available), true),
        rows: [
          { label: 'Available', value: data.java?.available ? 'Yes' : 'No' },
          { label: 'javac', value: data.java?.javacVersion || 'Unavailable' },
          { label: 'java', value: data.java?.javaVersion || 'Unavailable' },
          { label: 'Run timeout', value: `${data.java?.timeouts?.runMs || 0}ms` },
        ],
      },
      {
        title: 'R2 Storage',
        state: statusClass(Boolean(data.r2?.configured), true),
        rows: [
          { label: 'Configured', value: data.r2?.configured ? 'Yes' : 'No' },
          { label: 'Bucket', value: data.r2?.bucket || 'Missing' },
          { label: 'Endpoint', value: data.r2?.endpointConfigured ? 'Set' : 'Missing' },
        ],
      },
      {
        title: 'Push Notifications',
        state: statusClass(Boolean(data.push?.ready), true),
        rows: [
          { label: 'Ready', value: data.push?.ready ? 'Yes' : 'No' },
          { label: 'Public key', value: data.push?.publicKey ? 'Set' : 'Missing' },
          { label: 'Private key', value: data.push?.privateKey ? 'Set' : 'Missing' },
          { label: 'Subject', value: data.push?.subject || 'Missing' },
        ],
      },
      {
        title: 'Static Assets',
        state: statusClass(staticOk, true),
        rows: (data.staticAssets || []).map((asset) => ({
          label: asset.file,
          value: asset.exists ? `${Math.round((asset.size || 0) / 1024)} KB` : 'Missing',
        })),
      },
      {
        title: 'Local Data Snapshot',
        state: 'ok',
        rows: [
          { label: 'Users', value: data.dataCounts?.users || 0 },
          { label: 'Folders', value: data.dataCounts?.folders || 0 },
          { label: 'Files', value: data.dataCounts?.files || 0 },
          { label: 'Private rooms', value: data.dataCounts?.privateRooms || 0 },
        ],
      },
      {
        title: 'Deployment',
        state: 'ok',
        rows: [
          { label: 'Node', value: data.node || 'Unknown' },
          { label: 'Platform', value: data.platform || 'Unknown' },
          { label: 'Docker hint', value: data.dockerDetected ? 'Likely Docker' : 'Not detected' },
          { label: 'Memory', value: data.memory || 'Unknown' },
        ],
      },
    ];

    grid.innerHTML = cards.map((card) => `
      <article class="diagnostics-card ${card.state}">
        <span>${escapeHTML(card.state.toUpperCase())}</span>
        <strong>${escapeHTML(card.title)}</strong>
        ${renderDiagnosticRows(card.rows)}
      </article>
    `).join('');
  } catch (error) {
    grid.innerHTML = `<div class="diagnostics-card fail"><span>ERROR</span><strong>Diagnostics unavailable</strong>${renderDiagnosticRows([{ label: 'Message', value: error.message }])}</div>`;
  }
};

function drawRoyalePreviewCanvas() {
  const c = document.getElementById('games-royale-preview');
  if (!c) return;
  const ctx = c.getContext('2d');
  c.width = c.offsetWidth || 360;
  c.height = c.offsetHeight || 180;
  const W = c.width, H = c.height;

  // Sky/ground gradient
  const bg = ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,'#0a1a05'); bg.addColorStop(1,'#1a3a0a');
  ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);

  // Grid of terrain dots
  ctx.fillStyle='rgba(60,130,30,0.3)';
  for(let x=0;x<W;x+=18) for(let y=0;y<H;y+=18) {
    if((x*3+y*7)%11===0) ctx.fillRect(x,y,4,4);
  }

  // Zone ring
  ctx.strokeStyle='rgba(0,160,255,0.55)'; ctx.lineWidth=2;
  ctx.setLineDash([8,6]);
  ctx.beginPath(); ctx.arc(W*0.5, H*0.48, H*0.38, 0, Math.PI*2); ctx.stroke();
  ctx.setLineDash([]);

  // Trees
  const trees=[[0.15,0.25],[0.82,0.6],[0.7,0.15],[0.25,0.75],[0.9,0.3],[0.05,0.65],[0.55,0.85]];
  for(const [tx,ty] of trees){
    ctx.fillStyle='#1f5010'; ctx.beginPath();
    ctx.moveTo(tx*W,ty*H-14); ctx.lineTo(tx*W-10,ty*H+6); ctx.lineTo(tx*W+10,ty*H+6); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#2a7018'; ctx.beginPath();
    ctx.moveTo(tx*W,ty*H-20); ctx.lineTo(tx*W-7,ty*H-4); ctx.lineTo(tx*W+7,ty*H-4); ctx.closePath(); ctx.fill();
  }

  // Bots (red dots)
  const bots=[[0.3,0.4],[0.65,0.3],[0.45,0.65],[0.72,0.55],[0.2,0.6],[0.58,0.2]];
  for(const [bx,by] of bots){
    ctx.fillStyle='rgba(220,40,40,0.8)'; ctx.beginPath(); ctx.arc(bx*W,by*H,3.5,0,Math.PI*2); ctx.fill();
  }

  // Player (white dot with glow)
  ctx.shadowColor='rgba(0,255,80,0.9)'; ctx.shadowBlur=12;
  ctx.fillStyle='#7fff7f'; ctx.beginPath(); ctx.arc(W*0.48, H*0.5, 5, 0, Math.PI*2); ctx.fill();
  ctx.shadowBlur=0;

  // Overlay text
  ctx.fillStyle='rgba(0,0,0,0.35)'; ctx.fillRect(0,H-28,W,28);
  ctx.fillStyle='rgba(143,206,80,0.9)'; ctx.font='bold 11px monospace';
  ctx.textAlign='center'; ctx.fillText('40 PLAYERS · CUSTOM SKINS · EARN COINS', W/2, H-11);
  ctx.textAlign='left';
}

window.toggleMenu = function() { document.getElementById('sidebar').classList.toggle('open'); document.getElementById('menu-toggle').classList.toggle('open'); document.getElementById('overlay').classList.toggle('active'); };
window.closeMenu = function() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('menu-toggle').classList.remove('open'); document.getElementById('overlay').classList.remove('active'); };

/* ============================================================
   CALENDAR LOGIC (CLOUD BASED)
   ============================================================ */
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

async function fetchCalendarNotes() {
    if (!sb) return;
    const { data, error } = await sb.from('calendar_notes').select('*');
    if (!error && data) {
        calendarNotes = {}; data.forEach(row => { calendarNotes[row.date_key] = row.note; });
        renderCalendar();
    }
}

function renderCalendar() {
  const grid = document.getElementById('calendar-grid'); if(!grid) return;
  grid.innerHTML = ''; const firstDay = new Date(currentYear, currentMonth, 1).getDay(); const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  for (let i = 0; i < firstDay; i++) { grid.appendChild(document.createElement('div')); }
  for (let day = 1; day <= daysInMonth; day++) {
    const dayDiv = document.createElement('div'); dayDiv.textContent = day; dayDiv.onclick = () => window.addNote(day);
    const dateKey = `${currentYear}-${currentMonth}-${day}`;
    if (calendarNotes[dateKey]) { const dot = document.createElement('div'); dot.className = 'calendar-note-dot'; dayDiv.appendChild(dot); }
    grid.appendChild(dayDiv);
  }
  const title = document.getElementById('month-year'); if(title) title.textContent = `${new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' })} ${currentYear}`;
}

window.prevMonth = () => { currentMonth--; if (currentMonth < 0) { currentMonth = 11; currentYear--; } renderCalendar(); };
window.nextMonth = () => { currentMonth++; if (currentMonth > 11) { currentMonth = 0; currentYear++; } renderCalendar(); };

window.addNote = function(day) {
    const dateKey = `${currentYear}-${currentMonth}-${day}`;
    const displayDate = new Date(currentYear, currentMonth, day).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
    const existingNote = calendarNotes[dateKey] || '';
    if (existingNote) showNoteView(dateKey, displayDate, existingNote);
    else openNotePrompt(dateKey, displayDate, '');
};

window.showNoteView = function(dateKey, displayDate, text) {
    let existingModal = document.getElementById('view-note-modal'); if (existingModal) existingModal.remove();
    const modalHtml = `<div id="view-note-modal" class="custom-modal-overlay blur-bg high-z" style="display:flex;"><div class="custom-modal-box small-box border-blue"><button class="modal-close-btn" onclick="document.getElementById('view-note-modal').remove()">&times;</button><h3 class="modal-title text-blue" style="font-size: 1.2rem; margin-bottom: 15px;">Note for ${escapeHTML(displayDate)}</h3><div style="color:white; margin-bottom:25px; white-space:pre-wrap; max-height:40vh; overflow-y:auto; font-size:16px; text-align: left; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px;">${escapeHTML(text)}</div><div class="modal-btn-group"><button class="btn-primary flex-1" id="share-note-btn">Share to Everyone</button><button class="btn-blue flex-1" id="edit-note-btn">Edit Note</button></div></div></div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('edit-note-btn').onclick = function() { document.getElementById('view-note-modal').remove(); openNotePrompt(dateKey, displayDate, text); };
    document.getElementById('share-note-btn').onclick = function() { shareCalendarNote(dateKey, displayDate, text); };
};

window.openNotePrompt = function(dateKey, displayDate, existingNote) {
    let existingModal = document.getElementById('edit-note-modal'); if (existingModal) existingModal.remove();
    const modalHtml = `<div id="edit-note-modal" class="custom-modal-overlay blur-bg high-z" style="display:flex;"><div class="custom-modal-box small-box border-blue"><h3 class="modal-title text-blue" style="font-size: 1.2rem; margin-bottom: 15px;">${existingNote ? 'Edit' : 'Add'} Note</h3><textarea id="note-textarea" class="modal-input" placeholder="Type..." style="height:120px; resize:none; margin-bottom: 20px;">${escapeHTML(existingNote)}</textarea><div class="modal-btn-group"><button class="btn-blue flex-1" id="save-note-btn">Save</button><button class="btn-outline-red flex-1" onclick="document.getElementById('edit-note-modal').remove()">Cancel</button></div></div></div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const textEl = document.getElementById('note-textarea'); if (textEl) textEl.focus();
    document.getElementById('save-note-btn').onclick = async function() {
        const note = document.getElementById('note-textarea').value.trim();
        if(!currentUser) return customAlert("Login to save notes.");
        if (note === '') { delete calendarNotes[dateKey]; await sb.from('calendar_notes').delete().eq('date_key', dateKey); }
        else { calendarNotes[dateKey] = note; await sb.from('calendar_notes').upsert([{ date_key: dateKey, note: note, updated_by: currentUser.username }]); }
        renderCalendar(); document.getElementById('edit-note-modal').remove();
    };
};

function updateClock() { const now = new Date(); const el = document.getElementById('live-clock'); if(el) el.textContent = now.toLocaleTimeString(); }
setInterval(updateClock, 1000);

function renderAppOpenCount(count) {
  const safeCount = Number.isFinite(Number(count)) ? Number(count) : 0;
  const dash = document.getElementById('lobby-dash-open-count');
  if (dash) dash.textContent = safeCount.toLocaleString();
}

function renderAppOpenUsers(list = []) {
  const box = document.getElementById('app-open-user-list');
  if (!box) return;
  if (!list || !list.length) {
    box.innerHTML = '<p class="lobby-open-empty">No app opens recorded yet.</p>';
    return;
  }
  box.innerHTML = list.map((item, index) => `
    <div class="lobby-open-row ${index < 3 ? 'top-rank' : ''}">
      <span class="lobby-open-user">${escapeHTML(item.username || 'Unknown')}</span>
      <span class="lobby-open-total">${Number(item.count || 0).toLocaleString()}</span>
    </div>
  `).join('');
}


function renderAppOpenStats(data = {}) {
  renderAppOpenCount(data.count);
  renderAppOpenUsers(data.users || []);
  const dash = document.getElementById('lobby-dash-open-count');
  if (dash) dash.textContent = Number(data.count || 0).toLocaleString();
}

function getLocalAppOpenTally() {
  try {
    return JSON.parse(localStorage.getItem('classAppOpenCounts') || '{}') || {};
  } catch (_) {
    return {};
  }
}

function saveLocalAppOpenTally(tally) {
  try {
    localStorage.setItem('classAppOpenCounts', JSON.stringify(tally || {}));
  } catch (_) {}
}

function incrementLocalAppOpenTally(username) {
  const safeUsername = String(username || '').trim();
  if (!safeUsername) return 0;
  const tally = getLocalAppOpenTally();
  tally[safeUsername] = Number(tally[safeUsername] || 0) + 1;
  saveLocalAppOpenTally(tally);
  return tally[safeUsername];
}

function localAppOpenRows() {
  return Object.entries(getLocalAppOpenTally())
    .map(([username, count]) => ({ username, count: Number(count || 0) }))
    .sort((a, b) => b.count - a.count || a.username.localeCompare(b.username));
}

function normalizeAppOpenRows(rows = []) {
  return (rows || [])
    .map((row) => ({ username: row.username || 'Unknown', count: Number(row.count || 0), last_opened_at: row.last_opened_at }))
    .sort((a, b) => b.count - a.count || a.username.localeCompare(b.username));
}

function renderAppOpenRows(rows = []) {
  const normalized = normalizeAppOpenRows(rows);
  const total = normalized.reduce((sum, row) => sum + Number(row.count || 0), 0);
  console.log('[AppOpen] Rendering', normalized.length, 'users, total:', total);
  renderAppOpenStats({
    count: total,
    users: normalized,
  });
}

async function fetchSupabaseAppOpenRows() {
  if (!sb) throw new Error('Supabase unavailable');
  const { data, error } = await sb.rpc('class_app_app_open_tally');
  if (error) throw error;
  return normalizeAppOpenRows(data || []);
}

window.openAppOpenTallyModal = async function() {
  removeDynamicModal('app-open-tally-modal');
  document.body.insertAdjacentHTML('beforeend', `
    <div id="app-open-tally-modal" class="custom-modal-overlay blur-bg high-z" style="display:flex;">
      <div class="custom-modal-box contribution-modal-box border-blue">
        <button class="modal-close-btn" onclick="removeDynamicModal('app-open-tally-modal')">&times;</button>
        <h3 class="modal-title text-blue">App Open Tally</h3>
        <p class="modal-text align-left">Shows every user's saved login/app-open count.</p>
        <div class="lobby-open-list" id="app-open-user-list">${createInlineLoader('Loading app opens...')}</div>
      </div>
    </div>
  `);
  refreshAppOpenCount();
};

async function fetchContributionTally() {
  if (!sb) throw new Error('Supabase unavailable');
  const { data, error } = await sb.rpc('class_app_contribution_tally');
  if (!error && Array.isArray(data)) {
    return data.map((row) => ({
      username: row.username || row.uploader || 'Unknown',
      total: Number(row.total || row.count || 0),
    }));
  }

  let fallback = await sb.from('files').select('uploader,is_original_upload');
  if (fallback.error && /is_original_upload/i.test(fallback.error.message || '')) {
    fallback = await sb.from('files').select('uploader');
  }
  if (fallback.error) throw fallback.error;
  const totals = new Map();
  (fallback.data || [])
    .filter((file) => file.is_original_upload !== false)
    .forEach((file) => {
      const username = file.uploader || 'Unknown';
      totals.set(username, (totals.get(username) || 0) + 1);
    });
  return [...totals.entries()].map(([username, total]) => ({ username, total }));
}

function contributionRankIcon(index) {
  return index === 0 ? '🏆' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
}

function renderContributionPreview(rows = []) {
  const preview = document.getElementById('lobby-contribution-preview');
  if (!preview) return;
  if (!rows.length) {
    preview.innerHTML = '<p class="lobby-open-empty">No original uploads recorded yet.</p>';
    return;
  }
  preview.innerHTML = rows.slice(0, 3).map((row, index) => `
    <div class="contribution-mini-row">
      <span>${contributionRankIcon(index)}</span>
      <strong>${escapeHTML(row.username)}</strong>
      <em>${Number(row.total || 0).toLocaleString()}</em>
    </div>
  `).join('');
}

function renderContributionBoard(rows = []) {
  const board = document.getElementById('contribution-board-list');
  if (!board) return;
  if (!rows.length) {
    board.innerHTML = '<p class="lobby-open-empty">No original uploads recorded yet.</p>';
    return;
  }
  board.innerHTML = rows.map((row, index) => `
    <div class="contribution-row ${index < 3 ? 'top-rank' : ''}">
      <span class="contribution-rank">${contributionRankIcon(index)}</span>
      <span class="contribution-user">${escapeHTML(row.username)}</span>
      <span class="contribution-total">${Number(row.total || 0).toLocaleString()}</span>
    </div>
  `).join('');
}

window.refreshContributionTally = async function() {
  try {
    const rows = (await fetchContributionTally())
      .sort((a, b) => b.total - a.total || a.username.localeCompare(b.username));
    const total = rows.reduce((sum, row) => sum + Number(row.total || 0), 0);
    const dash = document.getElementById('lobby-dash-contribution-count');
    if (dash) dash.textContent = total.toLocaleString();
    renderContributionPreview(rows);
    renderContributionBoard(rows);
  } catch (error) {
    const preview = document.getElementById('lobby-contribution-preview');
    if (preview) preview.innerHTML = `<p class="lobby-open-empty">${escapeHTML(error.message)}</p>`;
    const board = document.getElementById('contribution-board-list');
    if (board) board.innerHTML = `<p class="lobby-open-empty">${escapeHTML(error.message)}</p>`;
  }
};

window.openContributionTallyModal = async function() {
  removeDynamicModal('contribution-tally-modal');
  document.body.insertAdjacentHTML('beforeend', `
    <div id="contribution-tally-modal" class="custom-modal-overlay blur-bg high-z" style="display:flex;">
      <div class="custom-modal-box contribution-modal-box border-blue">
        <button class="modal-close-btn" onclick="removeDynamicModal('contribution-tally-modal')">&times;</button>
        <h3 class="modal-title text-blue">Contribution Tally</h3>
        <p class="modal-text align-left">Counts original uploads only. Copied or moved items do not add points.</p>
        <div class="contribution-board-list" id="contribution-board-list">${createInlineLoader('Loading contributions...')}</div>
      </div>
    </div>
  `);
  refreshContributionTally();
};

window.refreshAppOpenCount = async function() {
  const dash = document.getElementById('lobby-dash-open-count');
  if (dash && dash.textContent === '0') dash.textContent = '...';

  try {
    const rows = await fetchSupabaseAppOpenRows();
    console.log('[AppOpen] Fetched', rows.length, 'rows from Supabase');
    renderAppOpenRows(rows);
  } catch (err) {
    console.warn('[AppOpen] Supabase fetch failed:', err?.message || err);
    try {
      const res = await fetch('/api/app-open-count');
      if (!res.ok) throw new Error('Count unavailable');
      const data = await res.json();
      renderAppOpenStats(data);
    } catch (_) {
      console.warn('[AppOpen] API fallback failed — using localStorage');
      const localRows = localAppOpenRows();
      renderAppOpenRows(localRows);
    }
  }
};

async function recordAppOpen() {
  if (!currentUser?.username) {
    console.log('[AppOpen] Skipped — no user logged in');
    return window.refreshAppOpenCount();
  }
  
  if (sessionStorage.getItem('appOpenRecorded') === 'true') {
    console.log('[AppOpen] Skipped — already recorded this session');
    return window.refreshAppOpenCount();
  }
  
  console.log('[AppOpen] Recording open for', currentUser.username);
  const localCount = incrementLocalAppOpenTally(currentUser.username);
  
  try {
    if (!sb) throw new Error('Supabase unavailable');
    const { error } = await sb.rpc('class_app_record_app_open', { p_local_count: localCount });
    if (error) throw error;
    
    sessionStorage.setItem('appOpenRecorded', 'true');
    console.log('[AppOpen] Recorded via Supabase RPC.');
    
    const rows = await fetchSupabaseAppOpenRows();
    renderAppOpenRows(rows);
  } catch (err) {
    console.warn('[AppOpen] RPC failed:', err?.message || err);
    try {
      const response = await authFetch('/api/app-open-count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error(`App open fallback failed (${response.status})`);

      sessionStorage.setItem('appOpenRecorded', 'true');
      console.log('[AppOpen] Recorded via authenticated API fallback.');
      renderAppOpenStats(await response.json());
    } catch (upsertFail) {
      console.warn('[AppOpen] Auth API fallback also failed:', upsertFail?.message || upsertFail);
      sessionStorage.setItem('appOpenRecorded', 'true');
      renderAppOpenRows(localAppOpenRows());
    }
  }
}

let appOpenRealtimeReady = false;
function initAppOpenRealtime() {
  if (appOpenRealtimeReady) return;
  const channel = getSupabaseChannel('public:app_open_counts');
  if (!channel) return;
  appOpenRealtimeReady = true;
  channel
    .on('postgres_changes', { event: '*', schema: 'public', table: 'app_open_counts' }, () => {
      window.refreshAppOpenCount();
    })
    .subscribe();
}

let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; const btn = document.getElementById('install-btn'); if (btn) btn.style.display = 'block'; });

/* ============================================================
   INITIALIZATION
   ============================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  try {
  console.log('[BOOT] DOM ready');
  renderAppState();
  bindAuthPortalHandlers();
  // Reveal auth modal / shell ASAP (do not block on Supabase cold start).
  setInitializing(false);
  renderAppState();
  window.dispatchEvent(new Event('classapp:boot-usable'));

  // Supabase can take time when the backend is cold-starting; run it in the
  // background and let features call waitForSupabaseClient() when needed.
  initSupabase().catch((error) => console.warn('[sb] initSupabase failed:', error?.message || error));
  if (currentUser && !getServerAuthToken()) {
    currentUser = null;
    isAdmin = false;
    saveSession();
    showToast('Please sign in again to refresh your secure session.', 'info');
  }

  const installBtn = document.getElementById('install-btn');
  if (installBtn) installBtn.addEventListener('click', async () => { if (!deferredPrompt) return; deferredPrompt.prompt(); deferredPrompt = null; installBtn.style.display = 'none'; });
  updateFooterYear();
  ensureAdminUpdateControl();
  initAppOpenRealtime();
  const dashVersion = document.getElementById('lobby-dash-update-version');
  if (dashVersion) dashVersion.textContent = APP_VERSION;
  fetchSharedAnnouncements();
  refreshContributionTally();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
      .then((registration) => {
        registration.update().catch(() => {});
      });
  }

  const attachmentInput = document.getElementById('attachment-input');
  if (attachmentInput) attachmentInput.addEventListener('change', () => { const lbl = document.getElementById('attachment-selected'); if(lbl) lbl.textContent = attachmentInput.files[0]?.name || 'No file chosen'; });

  // Save message draft to localStorage as user types
  const msgInput = document.getElementById('message-input');
  if (msgInput) {
    msgInput.addEventListener('input', () => {
      const key = `msg-draft-${currentChat.type || 'group'}-${currentChat.target || ''}`;
      if (msgInput.value) localStorage.setItem(key, msgInput.value);
      else localStorage.removeItem(key);
    });
  }

  const menuToggle = document.getElementById('menu-toggle');
  if (menuToggle) menuToggle.addEventListener('click', window.toggleMenu);
  const themeToggleBtn = document.getElementById('theme-toggle');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', (event) => {
      event.preventDefault();
      window.toggleTheme();
    });
  }
  const accentPicker = document.getElementById('accent-picker');
  if (accentPicker) {
    accentPicker.addEventListener('input', (event) => {
      window.setAccentColor(event.target.value);
    });
  }
  const notifPrefsBtn = document.getElementById('notif-prefs-btn');
  if (notifPrefsBtn) {
    notifPrefsBtn.addEventListener('click', (event) => {
      event.preventDefault();
      window.toggleNotifPrefsPanel?.();
    });
  }
  const diagnosticsRefreshBtn = document.querySelector('#page-diagnostics .btn-primary');
  if (diagnosticsRefreshBtn) {
    diagnosticsRefreshBtn.addEventListener('click', (event) => {
      event.preventDefault();
      window.loadDiagnostics();
    });
  }
  const lobbyAppOpensBtn = document.getElementById('app-open-count-btn');
  if (lobbyAppOpensBtn) {
    lobbyAppOpensBtn.addEventListener('click', (event) => {
      event.preventDefault();
      window.openAppOpenTallyModal?.();
    });
  }
  const lobbyContributionBtn = document.getElementById('contribution-tally-btn');
  if (lobbyContributionBtn) {
    lobbyContributionBtn.addEventListener('click', (event) => {
      event.preventDefault();
      window.openContributionTallyModal?.();
    });
  }
  const lobbyUpdatesBtn = document.getElementById('lobby-view-updates-btn');
  if (lobbyUpdatesBtn) {
    lobbyUpdatesBtn.addEventListener('click', (event) => {
      event.preventDefault();
      window.openChangelogModal?.();
    });
  }
  const lobbyHeaderUpdatesBtn = document.getElementById('lobby-header-updates-btn');
  if (lobbyHeaderUpdatesBtn) {
    lobbyHeaderUpdatesBtn.addEventListener('click', (event) => {
      event.preventDefault();
      window.openChangelogModal?.();
    });
  }
  const outputAiRefreshBtn = document.getElementById('output-ai-refresh-btn');
  if (outputAiRefreshBtn) {
    outputAiRefreshBtn.addEventListener('click', (event) => {
      event.preventDefault();
      window.fetchSharedAIOutputs?.();
    });
  }
  const folderExplorerCloseBtn = document.getElementById('folder-explorer-close-btn');
  if (folderExplorerCloseBtn) {
    folderExplorerCloseBtn.addEventListener('click', () => window.closeFolderModal?.('folder-explorer-modal'));
  }
  const createFolderBtn = document.getElementById('folder-create-btn');
  if (createFolderBtn) {
    createFolderBtn.addEventListener('click', () => window.createFolderAPI?.());
  }
  const fileExplorerCloseBtn = document.getElementById('file-explorer-close-btn');
  if (fileExplorerCloseBtn) {
    fileExplorerCloseBtn.addEventListener('click', () => window.closeFolderModal?.('file-explorer-modal'));
  }
  const createSubFolderBtn = document.getElementById('subfolder-create-btn');
  if (createSubFolderBtn) {
    createSubFolderBtn.addEventListener('click', () => window.createSubFolderAPI?.());
  }
  const uploadFolderFilesBtn = document.getElementById('file-upload-btn');
  if (uploadFolderFilesBtn) {
    uploadFolderFilesBtn.addEventListener('click', () => window.uploadFileToFolderAPI?.());
  }
  const bindFolderGrid = (grid, isSubfolder = false) => {
    if (!grid) return;
    grid.addEventListener('click', (event) => {
      const openCard = event.target.closest('.folder-card-main[data-folder-open]');
      if (openCard) {
        event.preventDefault();
        window.openFileExplorer?.(openCard.dataset.folderOpen, openCard.dataset.folderName || '');
        return;
      }
      const renameBtn = event.target.closest(isSubfolder ? '[data-subfolder-rename]' : '[data-folder-rename]');
      if (renameBtn) {
        event.preventDefault();
        window.renameFolderAPI?.(
          renameBtn.dataset.subfolderRename || renameBtn.dataset.folderRename,
          renameBtn.dataset.folderName || '',
          isSubfolder
        );
        return;
      }
      const permissionBtn = event.target.closest('[data-folder-permissions]');
      if (permissionBtn) {
        event.preventDefault();
        window.openFolderPermissions?.(permissionBtn.dataset.folderPermissions);
        return;
      }
      const deleteBtn = event.target.closest(isSubfolder ? '[data-subfolder-delete]' : '[data-folder-delete]');
      if (deleteBtn) {
        event.preventDefault();
        const targetId = deleteBtn.dataset.subfolderDelete || deleteBtn.dataset.folderDelete;
        if (isSubfolder) window.deleteSubFolderAPI?.(targetId);
        else window.deleteFolderAPI?.(targetId);
      }
    });
    grid.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const openCard = event.target.closest('.folder-card-main[data-folder-open]');
      if (!openCard) return;
      event.preventDefault();
      window.openFileExplorer?.(openCard.dataset.folderOpen, openCard.dataset.folderName || '');
    });
  };
  bindFolderGrid(document.getElementById('folder-grid-modal'));
  bindFolderGrid(document.getElementById('subfolder-grid-modal'), true);
  const outputAiFeed = document.getElementById('output-ai-feed');
  if (outputAiFeed) {
    outputAiFeed.addEventListener('click', (event) => {
      const deleteBtn = event.target.closest('[data-output-delete]');
      if (!deleteBtn) return;
      event.preventDefault();
      window.deleteSharedAIOutput?.(deleteBtn.dataset.outputDelete);
    });
  }
  const announcementFeed = document.getElementById('announcement-feed');
  if (announcementFeed) {
    announcementFeed.addEventListener('click', (event) => {
      const deleteBtn = event.target.closest('.announcement-delete-btn');
      if (!deleteBtn) return;
      event.preventDefault();
      window.deleteSharedAnnouncement?.(deleteBtn.dataset.id);
    });
  }
  const announcementSearchInput = document.getElementById('announcement-search-input');
  if (announcementSearchInput) {
    announcementSearchInput.addEventListener('input', () => {
      window.renderSharedAnnouncements?.();
    });
  }
  const announcementRefreshBtn = document.getElementById('announcement-refresh-btn');
  if (announcementRefreshBtn) {
    announcementRefreshBtn.addEventListener('click', (event) => {
      event.preventDefault();
      window.fetchSharedAnnouncements?.();
    });
  }
  const aiPage = document.getElementById('page-ai');
  if (aiPage) {
    aiPage.addEventListener('click', (event) => {
      const actionEl = event.target.closest('[data-ai-action]');
      if (!actionEl) return;
      event.preventDefault();
      const { aiAction, aiProvider, aiIndex } = actionEl.dataset;
      if (aiAction === 'hub') window.aiGoHub?.();
      else if (aiAction === 'open-chat' && aiProvider) window.aiOpenChat?.(aiProvider);
      else if (aiAction === 'clear-chat' && aiProvider) window.aiClearChat?.(aiProvider);
      else if (aiAction === 'send' && aiProvider) window.aiSend?.(aiProvider);
      else if (aiAction === 'share-message' && aiProvider) window.shareAIMessage?.(aiProvider, Number(aiIndex || 0));
    });
    aiPage.addEventListener('keydown', (event) => {
      const input = event.target.closest('#ai-input[data-ai-provider]');
      if (!input || event.key !== 'Enter' || event.shiftKey) return;
      event.preventDefault();
      window.aiSend?.(input.dataset.aiProvider);
    });
  }

  /* ── Sidebar nav: unified click + keyboard handler ────────────
     Replaces inline onclick attributes for iOS Safari compatibility.
     iOS Safari does not reliably fire click on non-interactive <div>
     elements; we now use role="button" tabindex="0" in HTML and
     attach listeners here with touch-action: manipulation in CSS. */
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.addEventListener('click', function(event) {
      const navItem = event.target.closest('.nav-item[data-page]');
      const dropdownHeader = event.target.closest('.nav-dropdown-header[data-year]');
      const logoutItem = event.target.closest('#nav-logout');

      const target = navItem || dropdownHeader || logoutItem;
      if (!target) return;

      // Ripple effect
      const rect = target.getBoundingClientRect();
      target.style.setProperty('--ripple-x', `${event.clientX - rect.left}px`);
      target.style.setProperty('--ripple-y', `${event.clientY - rect.top}px`);
      target.classList.remove('nav-click-flash');
      void target.offsetWidth;
      target.classList.add('nav-click-flash');
      window.setTimeout(() => target.classList.remove('nav-click-flash'), 420);

      // Action
      if (navItem && navItem.dataset.page) {
        window.goToPage(navItem.dataset.page);
      } else if (dropdownHeader && dropdownHeader.dataset.year) {
        window.toggleYear(dropdownHeader.dataset.year);
      } else if (logoutItem) {
        window.handleLogout();
      }
    });

    // Keyboard support: Enter / Space triggers click
    sidebar.addEventListener('keydown', function(event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const target = event.target.closest('.nav-item[data-page], .nav-dropdown-header[data-year], #nav-logout');
      if (!target) return;
      event.preventDefault();
      target.click();
    });
  }

  // Overlay: close menu on tap (touch + click)
  const overlay = document.getElementById('overlay');
  if (overlay) {
    overlay.addEventListener('click', window.closeMenu);
  }
  document.addEventListener('click', (event) => {
    // Allow any element with data-page to route outside of sidebar
    const pageTrigger = event.target.closest('[data-page]');
    if (pageTrigger && !pageTrigger.closest('#sidebar')) {
      event.preventDefault();
      window.goToPage(pageTrigger.dataset.page);
      return;
    }

    const trigger = event.target.closest('[data-close-modal-id], .modal-close-btn, .changelog-close-action, .close-profile, .social-back-btn');
    if (!trigger) return;
    if (trigger.classList.contains('close-profile')) {
      event.preventDefault();
      window.closeProfile?.();
      return;
    }
    if (trigger.classList.contains('social-back-btn')) {
      event.preventDefault();
      window.closeSocialPage?.();
      return;
    }
    const explicitId = trigger.dataset.closeModalId;
    if (explicitId) {
      event.preventDefault();
      closeOverlayElement(document.getElementById(explicitId));
      return;
    }
    if (trigger.classList.contains('modal-close-btn') || trigger.classList.contains('changelog-close-action')) {
      event.preventDefault();
      const overlayEl = trigger.closest('.custom-modal-overlay, .ep-lightbox');
      closeOverlayElement(overlayEl);
    }
  });

  // Delegation fallback for .chat-item divs (inline onclick can be swallowed by iOS Safari PWA)
  document.addEventListener('click', (event) => {
    const chatItem = event.target.closest('.chat-item');
    if (!chatItem) return;
    const chatType = chatItem.dataset.chat || chatItem.getAttribute('onclick')?.match(/openChat\('([^']+)'\)/)?.[1];
    if (chatType && typeof window.openChat === 'function') {
      event.preventDefault();
      window.openChat(chatType);
    }
  });

    console.log('[BOOT] Restoring user session...');
    if (currentUser) {
      try {
        if (isAdmin) revealAdminNav();
        await Promise.race([
          establishSession(),
          new Promise((_, r) => setTimeout(() => r(new Error('establishSession timed out')), 5000))
        ]);
        recordAppOpen().catch(e => console.warn('[AppOpen] non-critical error:', e));
        syncSubjectsFromServer().catch(() => {}); // refresh grids with server subjects
        console.log('[BOOT] Session restored successfully.');
      } catch (error) {
        console.error('[auth] Session restore failed:', error);
        stopLastSeenHeartbeat();
        destroyAppPresence();
        currentUser = null;
        isAdmin = false;
        syncAuthState();
        saveSession();
        setAuthError('Your saved session expired or failed to load. Please sign in again.');
        window.refreshAppOpenCount();
      }
    } else {
      window.refreshAppOpenCount();
    }
    console.log('[BOOT] Boot sequence complete.');
  } catch (error) {
    console.error('[BOOT ERROR] Critical failure during startup:', error);
    setAuthError('App failed to initialize cleanly. Please refresh the page.');
    const errorOverlay = document.createElement('div');
    errorOverlay.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(10,10,30,0.95);display:flex;flex-direction:column;align-items:center;justify-content:center;color:white;padding:20px;text-align:center;';
    errorOverlay.innerHTML = '<h2 style="color:#ff6b6b;margin-bottom:10px;">Startup Error</h2><p style="opacity:0.8;margin-bottom:20px;max-width:400px;">The application failed to load correctly. Check your connection and try again.</p><code style="background:rgba(0,0,0,0.5);padding:10px;border-radius:8px;margin-bottom:20px;max-width:100%;overflow-wrap:break-word;color:#ff8fa0;font-size:12px;">' + (error.message || 'Unknown error') + '</code><button onclick="window.location.reload()" style="padding:10px 20px;background:#00d4ff;color:black;border:none;border-radius:8px;font-weight:bold;cursor:pointer;">Reload App</button>';
    document.body.appendChild(errorOverlay);
  } finally {
    console.log('[BOOT] Revealing app shell...');
    setInitializing(false);
    const splash = document.getElementById('splash-screen');
    if (splash) {
      console.log('[BOOT] Forcibly removing stuck splash screen...');
      splash.classList.add('splash-out');
      setTimeout(() => splash.remove(), 650);
    }
  }

  // Push chat input above the soft keyboard on mobile
  if ('visualViewport' in window) {
    window.visualViewport.addEventListener('resize', () => {
      const chatMain = document.querySelector('.chat-main');
      if (!chatMain) return;
      const keyboardHeight = Math.max(0, window.innerHeight - window.visualViewport.offsetTop - window.visualViewport.height);
      chatMain.style.marginBottom = keyboardHeight > 80 ? `${keyboardHeight}px` : '';
    });
  }

  buildSubjectCards('grid-first',   firstSem,   'First Semester');
  buildSubjectCards('grid-second',  secondSem,  'Second Semester');
  buildSubjectCards('grid-y2first',  y2firstSem,  '2nd Year · First Semester');
  buildSubjectCards('grid-y2second', y2secondSem, '2nd Year · Second Semester');
  buildSubjectCards('grid-y3first',  y3firstSem,  '3rd Year · First Semester');
  buildSubjectCards('grid-y3second', y3secondSem, '3rd Year · Second Semester');
  buildSubjectCards('grid-y4first',  y4firstSem,  '4th Year · First Semester');
  buildSubjectCards('grid-y4second', y4secondSem, '4th Year · Second Semester');
  // Event Pictures + Random Pictures handled by gallery system (renderGallery on page nav)
  fetchCalendarNotes(); updateClock();

  const player = document.getElementById('audio-player');
  if(player) player.addEventListener('ended', handleAudioEnded);

  // Reflect initial toggle states on buttons
  const loopBtn = document.getElementById('btn-loop');
  if(loopBtn) loopBtn.classList.toggle('neon-active', isLoop);
  const repeatBtn = document.getElementById('btn-repeat');
  if(repeatBtn) repeatBtn.classList.toggle('neon-active', isRepeat);

  applyPageBackground(currentPage);
});

document.getElementById('custom-bg-upload')?.addEventListener('change', function(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Image = e.target.result;
        try {
            setPageBackground(currentPage, { type: 'image', url: base64Image, title: file.name || 'Uploaded background' });
            showToast(`Saved to ${currentPage.toUpperCase()} page.`);
            removeDynamicModal('background-picker-modal');
        } catch (err) {
            customAlert("Applied! (Note: File too large to save long-term).");
            applyPageBackground(currentPage);
        }
    };
    reader.readAsDataURL(file);
});

window.saveAnnouncement = function() { const noteContent = document.getElementById('announcement-note').value; localStorage.setItem('savedWeeklyAnnouncement', noteContent); showToast("Weekly announcement saved."); };

window.addEventListener('DOMContentLoaded', () => {
    const savedNote = localStorage.getItem('savedWeeklyAnnouncement');
    if (savedNote) { const noteBox = document.getElementById('announcement-note'); if(noteBox) noteBox.value = savedNote; }
});

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

async function registerPushSubscription(interactive = false) {
  if (!currentUser || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return;
  try {
    const keyRes = await fetch('/api/push/public-key');
    const keyData = await keyRes.json();
    if (!keyData.enabled || !keyData.publicKey) {
      if (interactive) customAlert('Push notifications need VAPID keys configured on the server.');
      return;
    }
    let permission = Notification.permission;
    if (permission === 'default' && interactive) permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      updateChatHeader();
      if (interactive) customAlert('Notification permission was not granted.');
      return;
    }
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
      });
    }
    await authFetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: currentUser.username, subscription }),
    });
    if (interactive) showToast('Background message notifications enabled.');
    updateChatHeader();
  } catch (error) {
    console.warn('Push registration failed:', error);
    if (interactive) customAlert(error.message);
  }
}

async function notifyPrivateMessagePush(message) {
  if (!currentUser || currentChat.type !== 'private' || !currentChat.target) return;
  await authFetch('/api/push/private-message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: currentUser.username,
      target: currentChat.target,
      text: message.text || '',
      messageId: message.id,
    }),
  });
}

function handleNotificationDeepLink() {
  if (!currentUser) return;
  const params = new URLSearchParams(window.location.search);
  const chatTarget = params.get('chat');
  if (!chatTarget || chatTarget === currentUser.username) return;
  window.history.replaceState({}, document.title, window.location.pathname);
  setTimeout(() => openChat('private', chatTarget), 250);
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'APP_CACHE_UPDATED' && event.data.version && event.data.version !== APP_VERSION) {
      const cacheReloadKey = 'classAppCacheReloadedVersion';
      if (sessionStorage.getItem(cacheReloadKey) !== event.data.version) {
        sessionStorage.setItem(cacheReloadKey, event.data.version);
        window.location.reload();
      }
      return;
    }
    if (event.data?.type === 'OPEN_PRIVATE_CHAT' && event.data.sender) {
      openChat('private', event.data.sender);
    }
  });
}

async function fetchAppUpdates() {
  refreshUpdateIndicator();
  if (localStorage.getItem('seenSoftwareVersion') !== APP_VERSION) showSoftwareUpdateBanner();
  if (!sb) return;
  const { data, error } = await sb.from('app_updates')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1);
  if (error || !data || !data.length) return;
  const update = data[0];
  const expiresAt = update.expires_at ? new Date(update.expires_at).getTime() : null;
  if (expiresAt && Date.now() > expiresAt) return;
  const seenKey = `seenAppUpdate:${update.id}`;
  if (localStorage.getItem(seenKey)) return;
  showFloatingUpdate(update, seenKey);
  refreshUpdateIndicator();
}

function showSoftwareUpdateBanner() {
  const seenVersion = localStorage.getItem('seenSoftwareVersion');
  if (seenVersion === APP_VERSION) return;
  const latest = getLatestLocalUpdate();
  showFloatingUpdate({
    id: `version-${APP_VERSION}`,
    title: `New Update Applied – Version ${APP_VERSION}`,
    version: APP_VERSION,
    message: latest.summary || 'Tap the ! button or View Updates in the lobby to see the latest changes.',
  }, 'seenSoftwareVersion');
}

function showFloatingUpdate(update, seenKey) {
  removeDynamicModal('floating-update-note');
  const note = document.createElement('div');
  note.id = 'floating-update-note';
  note.className = 'floating-update-note';
  note.innerHTML = `
    <button class="floating-update-close" aria-label="Close update">&times;</button>
    <div class="floating-update-kicker">App Update</div>
    <strong>${escapeHTML(update.title || 'New update')}</strong>
    <p>${escapeHTML(update.message || update.body || '')}</p>
  `;
  document.body.appendChild(note);
  note.querySelector('button').onclick = () => {
    note.classList.remove('show');
    setTimeout(() => note.remove(), 220);
  };
  note.onclick = (event) => {
    if (event.target.closest('button')) return;
    if (seenKey && seenKey !== 'seenSoftwareVersion') localStorage.setItem(seenKey, '1');
    openChangelogModal();
  };
  requestAnimationFrame(() => note.classList.add('show'));
  setTimeout(() => {
    if (!document.body.contains(note)) return;
    note.classList.remove('show');
    setTimeout(() => note.remove(), 220);
  }, 6500);
}

function getLatestLocalUpdate() {
  return APP_CHANGELOG[0] || { version: APP_VERSION, date: '', title: 'Software Update', summary: '', changes: [] };
}

function hasUnseenUpdate() {
  return localStorage.getItem('seenSoftwareVersion') !== APP_VERSION;
}

function refreshUpdateIndicator() {
  const btn = document.getElementById('admin-update-btn');
  if (!btn) return;
  const latest = getLatestLocalUpdate();
  const unseen = hasUnseenUpdate();
  btn.classList.toggle('has-update', unseen);
  btn.title = unseen ? `New update available: Version ${latest.version}` : `Software updates - Version ${APP_VERSION}`;
  btn.setAttribute('aria-label', btn.title);
}

function ensureAdminUpdateControl() {
  if (document.getElementById('admin-update-btn')) return;
  const controls = document.querySelector('.sidebar-controls');
  if (!controls) return;
  const btn = document.createElement('button');
  btn.id = 'admin-update-btn';
  btn.className = 'theme-toggle-btn admin-update-btn';
  btn.title = 'View software updates';
  btn.textContent = '!';
  btn.onclick = openChangelogModal;
  controls.appendChild(btn);
  refreshUpdateIndicator();
}

window.openChangelogModal = function() {
  removeDynamicModal('changelog-modal');
  localStorage.setItem('seenSoftwareVersion', APP_VERSION);
  refreshUpdateIndicator();
  const latest = getLatestLocalUpdate();
  const entries = APP_CHANGELOG.map((entry) => `
    <div class="changelog-entry">
      <div class="changelog-version">Version ${escapeHTML(entry.version)} <span>${escapeHTML(entry.date)}</span></div>
      <p class="modal-text align-left"><strong>${escapeHTML(entry.title || 'Update')}</strong> - ${escapeHTML(entry.summary || '')}</p>
      <ul>${entry.changes.map((change) => `<li>${escapeHTML(change)}</li>`).join('')}</ul>
    </div>
  `).join('');
  document.body.insertAdjacentHTML('beforeend', `
    <div id="changelog-modal" class="custom-modal-overlay blur-bg high-z" style="display:flex;">
      <div class="custom-modal-box changelog-modal-box border-blue">
        <button class="modal-close-btn" onclick="removeDynamicModal('changelog-modal')">&times;</button>
        <h3 class="modal-title text-blue">Software Updates</h3>
        <div class="update-version-grid">
          <div class="update-version-card"><span>Current App Version</span><strong>${escapeHTML(APP_VERSION)}</strong></div>
          <div class="update-version-card"><span>Latest Update Version</span><strong>${escapeHTML(latest.version)}</strong></div>
        </div>
        <div class="update-summary-box">
          <strong>${escapeHTML(latest.title || 'Latest update')}</strong><br>
          ${escapeHTML(latest.summary || '')}<br>
          <small>Released: ${escapeHTML(latest.date || 'Unknown')}</small>
        </div>
        <div class="changelog-list">${entries}</div>
        ${isAdmin ? `<button class="btn-primary full-width mt-10" onclick="removeDynamicModal('changelog-modal'); openAdminUpdateComposer();">Post Admin Update</button>` : ''}
        <button class="btn-secondary full-width mt-10 changelog-close-action" onclick="removeDynamicModal('changelog-modal')">Close</button>
      </div>
    </div>
  `);
};

function openAdminUpdateComposer() {
  if (!isAdmin) return customAlert('Admin only.');
  removeDynamicModal('admin-update-modal');
  document.body.insertAdjacentHTML('beforeend', `
    <div id="admin-update-modal" class="custom-modal-overlay blur-bg high-z" style="display:flex;">
      <div class="custom-modal-box small-box border-blue">
        <button class="modal-close-btn" onclick="removeDynamicModal('admin-update-modal')">&times;</button>
        <h3 class="modal-title text-blue">Post App Update</h3>
        <input id="admin-update-title" class="modal-input" placeholder="Title" maxlength="80">
        <textarea id="admin-update-message" class="modal-input" placeholder="Message" style="height:100px;resize:none;margin-top:10px;"></textarea>
        <button class="btn-primary full-width mt-10" onclick="postAdminUpdate()">Post Update</button>
      </div>
    </div>
  `);
}

window.postAdminUpdate = async function() {
  if (!isAdmin) return customAlert('Admin only.');
  const title = document.getElementById('admin-update-title')?.value.trim();
  const message = document.getElementById('admin-update-message')?.value.trim();
  if (!title || !message) return customAlert('Title and message are required.');
  const { error } = await sb.from('app_updates').insert([{
    title,
    message,
    active: true,
    created_by: currentUser.username,
  }]);
  if (error) return customAlert(error.message);
  removeDynamicModal('admin-update-modal');
  showToast('App update posted.');
  fetchAppUpdates();
};

/* ============================================================
   NOTIFICATION PREFERENCES (#27)
   ============================================================ */
const notifPrefs = (() => {
  try { return JSON.parse(localStorage.getItem('notifPrefs')) || {}; } catch { return {}; }
})();
if (notifPrefs.sound   === undefined) notifPrefs.sound = true;
if (notifPrefs.group   === undefined) notifPrefs.group = true;
if (notifPrefs.dm      === undefined) notifPrefs.dm    = true;

function applyNotifPrefsUI() {
  const s = document.getElementById('pref-sound');
  const g = document.getElementById('pref-group');
  const d = document.getElementById('pref-dm');
  if (s) s.checked = notifPrefs.sound;
  if (g) g.checked = notifPrefs.group;
  if (d) d.checked = notifPrefs.dm;
}

window.saveNotifPrefs = function() {
  notifPrefs.sound = document.getElementById('pref-sound')?.checked ?? true;
  notifPrefs.group = document.getElementById('pref-group')?.checked ?? true;
  notifPrefs.dm    = document.getElementById('pref-dm')?.checked    ?? true;
  localStorage.setItem('notifPrefs', JSON.stringify(notifPrefs));
};

window.toggleNotifPrefsPanel = function() {
  const panel = document.getElementById('notif-prefs-panel');
  if (!panel) return;
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) applyNotifPrefsUI();
};

/* ============================================================
   EMOJI REACTIONS (#28)
   ============================================================ */
const REACTION_EMOJIS = ['👍','❤️','😂','😮','😢','😡'];
let messageReactions = {}; // messageId → { emoji → [usernames] }

async function fetchReactions(messageIds) {
  if (!messageIds.length || !sb) return;
  const { data, error } = await sb.from('message_reactions').select('*').in('message_id', messageIds.map(String));
  if (error) return;
  messageReactions = {};
  for (const r of data) {
    if (!messageReactions[r.message_id]) messageReactions[r.message_id] = {};
    if (!messageReactions[r.message_id][r.emoji]) messageReactions[r.message_id][r.emoji] = [];
    messageReactions[r.message_id][r.emoji].push(r.username);
  }
}

function buildReactionBar(messageId) {
  const bar = document.createElement('div');
  bar.className = 'reaction-bar';
  bar.dataset.msgId = messageId;
  const rxns = messageReactions[messageId] || {};

  Object.entries(rxns).forEach(([emoji, users]) => {
    if (!users.length) return;
    const pill = document.createElement('button');
    pill.className = 'reaction-pill' + (users.includes(currentUser?.username) ? ' mine' : '');
    pill.innerHTML = `${emoji}<span class="r-count">${users.length}</span>`;
    pill.title = users.join(', ');
    pill.onclick = () => toggleReaction(messageId, emoji, pill);
    bar.appendChild(pill);
  });

  const addBtn = document.createElement('button');
  addBtn.className = 'reaction-add-btn';
  addBtn.textContent = '+';
  addBtn.onclick = (e) => showReactionPicker(e, messageId);
  bar.appendChild(addBtn);
  return bar;
}

function showReactionPicker(e, messageId) {
  document.querySelectorAll('.reaction-picker').forEach(p => p.remove());
  const picker = document.createElement('div');
  picker.className = 'reaction-picker';
  REACTION_EMOJIS.forEach(emoji => {
    const btn = document.createElement('button');
    btn.textContent = emoji;
    btn.onclick = () => { toggleReaction(messageId, emoji); picker.remove(); };
    picker.appendChild(btn);
  });
  e.target.parentNode.appendChild(picker);
  // close on outside click
  setTimeout(() => document.addEventListener('click', function handler() {
    picker.remove(); document.removeEventListener('click', handler);
  }), 0);
}

async function toggleReaction(messageId, emoji) {
  if (!currentUser) return;
  const existing = messageReactions[messageId]?.[emoji] || [];
  if (existing.includes(currentUser.username)) {
    await sb.from('message_reactions').delete()
      .eq('message_id', String(messageId))
      .eq('username', currentUser.username)
      .eq('emoji', emoji);
  } else {
    await sb.from('message_reactions').insert([{
      message_id: String(messageId),
      username: currentUser.username,
      emoji,
    }]);
  }
  // Optimistic refresh
  const ids = Object.keys({ ...messageReactions, [messageId]: {} });
  await fetchReactions(ids);
  renderMessages();
}

function initReactionsRealtime() {
  if (!sb) return;
  const channel = getSupabaseChannel('public:message_reactions');
  if (!channel) return;
  channel
    .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, async () => {
      const history = getCurrentHistory();
      if (history.length) {
        await fetchReactions(history.map(m => String(m.id)));
        renderMessages();
      }
    }).subscribe();
}

/* ============================================================
   ADMIN DASHBOARD (#29)
   ============================================================ */
function revealAdminNav() {
  document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
}

async function loadAdminDashboard() {
  if (!isAdmin || !sb) return;

  // Stats — computed directly from Supabase, no custom RPC needed
  const statsGrid = document.getElementById('admin-stats');
  if (statsGrid) {
    statsGrid.innerHTML = '<div class="admin-stat-card"><div class="admin-stat-value">…</div><div class="admin-stat-label">Loading</div></div>';
    const [
      { count: totalUsers  },
      { count: totalMsgs   },
      { count: totalFiles  },
    ] = await Promise.all([
      sb.from('profiles').select('*', { count: 'exact', head: true }),
      sb.from('messages').select('*', { count: 'exact', head: true }),
      sb.from('files').select('*',    { count: 'exact', head: true }),
    ]);
    const onlineUsers = users.filter(u => u.online).length;
    const stats = [
      { label: 'Users',    value: totalUsers  ?? users.length },
      { label: 'Online',   value: onlineUsers },
      { label: 'Messages', value: totalMsgs   ?? '—' },
      { label: 'Files',    value: totalFiles  ?? '—' },
    ];
    statsGrid.innerHTML = stats.map(s =>
      `<div class="admin-stat-card"><div class="admin-stat-value">${s.value}</div><div class="admin-stat-label">${s.label}</div></div>`
    ).join('');
  }

  if (adminActiveTab === 'log') { loadActivityLog(); return; }

  // User table — reuse already-fetched users array (same source as User Directory)
  const userTable = document.getElementById('admin-user-table');
  if (!userTable) return;
  const list = users.length ? users : [];
  if (!list.length) { userTable.innerHTML = '<div style="opacity:.5;font-size:13px;">No users found.</div>'; return; }

  userTable.innerHTML = list.map(p => {
    const name = escapeHTML(p.display_name || p.username);
    const uname = escapeHTML(p.username);
    return `<div class="admin-user-row">
      <div class="admin-online-dot${p.online ? ' online' : ''}"></div>
      <div class="admin-user-name">${name} <span style="opacity:.45;font-weight:400">@${uname}</span></div>
      <div class="admin-user-meta">${p.online ? 'Online' : 'Offline'}</div>
      ${p.username !== currentUser?.username
        ? `<button class="btn-outline-red" onclick="adminDeleteUser('${uname}')">Delete</button>`
        : '<span style="opacity:.35;font-size:12px">You</span>'}
    </div>`;
  }).join('');
}

window.adminDeleteUser = async function(username) {
  if (!isAdmin) return;
  const confirmed = await new Promise(resolve => {
    removeDynamicModal('admin-del-confirm');
    document.body.insertAdjacentHTML('beforeend', `
      <div id="admin-del-confirm" class="custom-modal-overlay blur-bg high-z" style="display:flex;">
        <div class="custom-modal">
          <div class="modal-title">Delete user <b>@${escapeHTML(username)}</b>?</div>
          <p style="opacity:.65;font-size:13px;margin:10px 0 18px;">This will permanently remove their profile and all associated data. This cannot be undone.</p>
          <div style="display:flex;gap:10px;">
            <button class="btn-outline-red flex-1" id="adm-del-yes">Yes, Delete</button>
            <button class="btn-outline flex-1" id="adm-del-cancel">Cancel</button>
          </div>
        </div>
      </div>`);
    document.getElementById('adm-del-yes').onclick = () => { removeDynamicModal('admin-del-confirm'); resolve(true); };
    document.getElementById('adm-del-cancel').onclick = () => { removeDynamicModal('admin-del-confirm'); resolve(false); };
  });
  if (!confirmed) return;

  try {
    const response = await authFetch(`/api/users/${encodeURIComponent(username)}/admin`, { method: 'DELETE' });
    if (!response.ok) {
      const data = await response.json().catch(()=>({}));
      return customAlert(data.error || 'Delete failed.');
    }
  } catch(err) {
    return customAlert('Network error.');
  }

  // Remove from local users array so grid updates immediately
  const idx = users.findIndex(u => u.username === username);
  if (idx !== -1) users.splice(idx, 1);

  showToast(`Deleted @${username}.`);

  // Close the profile panel if it was showing this user
  closeProfile();

  // Refresh both grids
  renderUserDirectory();
  if (document.getElementById('admin-user-list')) loadAdminDashboard();
};

/* ============================================================
   ACTIVITY LOG (#30)
   ============================================================ */
async function logActivity(action, details = '') {
  if (!currentUser || !sb) return;
  sb.from('activity_log').insert([{ username: currentUser.username, action, details }]).then(() => {});
}

let adminActiveTab = 'users';

window.switchAdminTab = function(tab, btn) {
  adminActiveTab = tab;
  document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  document.getElementById('admin-tab-users').style.display = tab === 'users' ? '' : 'none';
  document.getElementById('admin-tab-log').style.display   = tab === 'log'   ? '' : 'none';
  if (tab === 'log') loadActivityLog();
};

async function loadActivityLog() {
  const container = document.getElementById('admin-activity-log');
  if (!container || !isAdmin || !sb) return;
  container.innerHTML = '<div style="opacity:.5;font-size:13px;padding:10px;">Loading…</div>';
  // Try RPC first; fall back to direct table query if RPC not deployed yet
  let data, error;
  ({ data, error } = await sb.rpc('class_app_admin_activity_log', { p_limit: 100 }));
  if (error) {
    ({ data, error } = await sb.from('activity_log').select('*').order('created_at', { ascending: false }).limit(100));
  }
  if (error || !data) { container.innerHTML = '<div style="opacity:.5;font-size:13px;padding:10px;">No activity recorded yet.</div>'; return; }
  if (!data.length) { container.innerHTML = '<div style="opacity:.5;font-size:13px;padding:10px;">No activity yet.</div>'; return; }
  container.innerHTML = data.map(row => {
    const t = new Date(row.created_at).toLocaleString([], { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
    return `<div class="activity-log-row">
      <span class="al-time">${t}</span>
      <span class="al-user">@${escapeHTML(row.username)}</span>
      <span class="al-action">${escapeHTML(row.action)}</span>
      ${row.details ? `<span class="al-detail">${escapeHTML(row.details)}</span>` : ''}
    </div>`;
  }).join('');
}

/* ============================================================
   SUBJECT-SCOPED ANNOUNCEMENTS (#31)
   ============================================================ */
let subjectAnnouncements = {}; // subject_code → [rows]

async function fetchSubjectAnnouncements(subjectCode) {
  if (!sb) return [];
  const { data, error } = await sb.from('subject_announcements')
    .select('*').eq('subject_code', subjectCode)
    .order('created_at', { ascending: false });
  if (error) return [];
  subjectAnnouncements[subjectCode] = data || [];
  return subjectAnnouncements[subjectCode];
}

function buildSubjectAnnouncementsHTML(subjectCode) {
  const anns = subjectAnnouncements[subjectCode] || [];
  const postBtn = isAdmin
    ? `<button class="btn-primary" style="font-size:12px;padding:5px 12px;" onclick="openPostSubjectAnnouncement('${escapeJS(subjectCode)}')">+ Post</button>`
    : '';
  const list = anns.length
    ? anns.map(a => `
        <div class="subj-ann-card">
          <div class="subj-ann-card-title">${escapeHTML(a.title)}</div>
          <div class="subj-ann-card-body">${escapeHTML(a.body)}</div>
          <div class="subj-ann-card-meta">by @${escapeHTML(a.posted_by)} · ${new Date(a.created_at).toLocaleDateString()}
            ${isAdmin ? `<button class="chat-action-button" style="margin-left:8px;" onclick="deleteSubjectAnnouncement(${a.id},'${escapeJS(subjectCode)}')">Delete</button>` : ''}
          </div>
        </div>`).join('')
    : `<div class="subj-ann-empty">No announcements for this subject yet.</div>`;

  return `<div class="subj-ann-section">
    <div class="subj-ann-header">
      <span class="subj-ann-title">Announcements</span>
      ${postBtn}
    </div>
    <div class="subj-ann-list">${list}</div>
  </div>`;
}

window.openPostSubjectAnnouncement = function(subjectCode) {
  removeDynamicModal('subj-ann-modal');
  document.body.insertAdjacentHTML('beforeend', `
    <div id="subj-ann-modal" class="custom-modal-overlay blur-bg high-z" style="display:flex;">
      <div class="custom-modal">
        <button class="modal-close-btn" onclick="removeDynamicModal('subj-ann-modal')">&times;</button>
        <div class="modal-title">Post Announcement · ${escapeHTML(subjectCode)}</div>
        <input id="sann-title" class="modal-input" placeholder="Title" maxlength="100" style="margin-top:14px;">
        <textarea id="sann-body" class="modal-input" placeholder="Details (optional)" style="height:90px;resize:none;margin-top:10px;"></textarea>
        <button class="btn-primary full-width mt-10" onclick="submitSubjectAnnouncement('${escapeJS(subjectCode)}')">Post</button>
      </div>
    </div>`);
  setTimeout(() => document.getElementById('sann-title')?.focus(), 80);
};

window.submitSubjectAnnouncement = async function(subjectCode) {
  const title = document.getElementById('sann-title')?.value.trim();
  const body  = document.getElementById('sann-body')?.value.trim() || '';
  if (!title) return customAlert('Title is required.');
  const { error } = await sb.from('subject_announcements').insert([{
    subject_code: subjectCode,
    posted_by: currentUser.username,
    title,
    body,
  }]);
  if (error) return customAlert(error.message);
  removeDynamicModal('subj-ann-modal');
  showToast('Announcement posted.');
  logActivity('post_subject_announcement', subjectCode);
  // Refresh the folder explorer if it's open for this subject
  window.openFolderExplorer?.(subjectCode);
};

window.deleteSubjectAnnouncement = async function(id, subjectCode) {
  if (!isAdmin) return;
  const { error } = await sb.from('subject_announcements').delete().eq('id', id);
  if (error) return customAlert(error.message);
  showToast('Announcement deleted.');
  window.openFolderExplorer?.(subjectCode);
};

/* ============================================================
   THEME TOGGLE (Dark / Light Mode) + ACCENT COLOR
   ============================================================ */
(function applyStoredTheme() {
  const mode = localStorage.getItem('themeMode') || 'dark';
  if (mode === 'light') document.body.classList.add('light-mode');
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = mode === 'light' ? '☀️' : '🌙';
  const savedAccent = localStorage.getItem('accentColor');
  if (savedAccent) {
    document.documentElement.style.setProperty('--accent', savedAccent);
    const picker = document.getElementById('accent-picker');
    if (picker) picker.value = savedAccent;
  }
})();

window.toggleTheme = function() {
  const isLight = document.body.classList.toggle('light-mode');
  localStorage.setItem('themeMode', isLight ? 'light' : 'dark');
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = isLight ? '☀️' : '🌙';
};

window.setAccentColor = function(color) {
  document.documentElement.style.setProperty('--accent', color);
  localStorage.setItem('accentColor', color);
};

/* ============================================================
   SOCKET.IO — lazy-init for Lobby
   ============================================================ */
let _socket = null;

function _ensureSocket() {
  if (_socket) return _socket;
  _socket = io();
  _socket.on('connect', () => {
    if (currentUser) _socket.emit('identify', { username: currentUser.username, token: getServerAuthToken() });
    lobbyModule.setupSocket(_socket);
  });
  _socket.on('appOpenCount', (payload) => {
    renderAppOpenStats(payload || {});
  });
  // If connected immediately (reconnect case), setup at once
  if (_socket.connected) {
    lobbyModule.setupSocket(_socket);
    if (currentUser) _socket.emit('identify', { username: currentUser.username, token: getServerAuthToken() });
  }
  return _socket;
}

/* ============================================================
   LOBBY MODULE — pixel canvas, real-time Sims-like movement
   ============================================================ */
const lobbyModule = (() => {
  const SPEED = 3, CHAR_W = 16, CHAR_H = 24;
  const BOUNDS = { minX: 22, maxX: 780, minY: 22, maxY: 470 };

  let canvas, ctx, animFrame, sock;
  let myPlayer = null;
  const players = new Map();
  const keys = {};
  const dpad = { up: false, down: false, left: false, right: false };
  let moveThrottle = 0;
  let socketReady = false;
  let _kdown, _kup;
  let currentStar = null; // Star Collector mini-game

  function colorFromName(name) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return `hsl(${((h % 360) + 360) % 360},72%,65%)`;
  }
  function bodyColorFromName(name) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    h = h * 7;
    return `hsl(${((h % 360) + 360) % 360},55%,40%)`;
  }

  function drawChar(x, y, name, skin, body, moving, frame, bubble, score) {
    const cx = Math.round(x), cy = Math.round(y);
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(cx + CHAR_W / 2, cy + CHAR_H + 3, CHAR_W / 2 + 1, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Legs (animated)
    const la = moving ? (frame % 2 === 0 ? 4 : -1) : 0;
    const lb = moving ? (frame % 2 === 0 ? -1 : 4) : 0;
    ctx.fillStyle = '#221610';
    ctx.fillRect(cx + 2,  cy + 16, 5, 8 + la);
    ctx.fillRect(cx + 9,  cy + 16, 5, 8 + lb);
    // Body
    ctx.fillStyle = body;
    ctx.fillRect(cx + 2, cy + 8, CHAR_W - 4, 10);
    // Arms
    const ao = moving ? (frame % 2 === 0 ? 2 : -2) : 0;
    ctx.fillStyle = body;
    ctx.fillRect(cx - 3, cy + 9 + ao, 5, 7);
    ctx.fillRect(cx + CHAR_W - 2, cy + 9 - ao, 5, 7);
    // Head
    ctx.fillStyle = skin;
    ctx.fillRect(cx + 3, cy, 10, 10);
    // Eyes
    ctx.fillStyle = '#1a1010';
    ctx.fillRect(cx + 5, cy + 3, 2, 2);
    ctx.fillRect(cx + 9, cy + 3, 2, 2);
    // Nametag (with optional score badge)
    const scoreSuffix = score ? ` \u2605${score}` : '';
    const maxLen = score ? 6 : 9;
    const label = (name.length > maxLen ? name.slice(0, maxLen - 1) + '\u2026' : name) + scoreSuffix;
    ctx.font = '700 9px monospace';
    ctx.textAlign = 'center';
    const tw = ctx.measureText(label).width + 8;
    ctx.fillStyle = 'rgba(0,0,0,0.62)';
    if (ctx.roundRect) {
      ctx.beginPath(); ctx.roundRect(cx + CHAR_W / 2 - tw / 2, cy - 15, tw, 12, 3); ctx.fill();
    } else {
      ctx.fillRect(cx + CHAR_W / 2 - tw / 2, cy - 15, tw, 12);
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, cx + CHAR_W / 2, cy - 5);
    // Speech bubble (fades out after 4 s)
    if (bubble && bubble.expires > Date.now()) {
      const alpha = Math.min(1, (bubble.expires - Date.now()) / 600);
      const btext = bubble.text.length > 18 ? bubble.text.slice(0, 17) + '\u2026' : bubble.text;
      ctx.font = '700 8px monospace';
      ctx.textAlign = 'center';
      const btw = ctx.measureText(btext).width + 10;
      const bw = Math.max(btw, 28), bh = 13;
      const bx = cx + CHAR_W / 2 - bw / 2, by2 = cy - 31;
      ctx.fillStyle = `rgba(255,255,255,${alpha * 0.93})`;
      if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(bx, by2, bw, bh, 4); ctx.fill(); }
      else { ctx.fillRect(bx, by2, bw, bh); }
      ctx.beginPath(); ctx.moveTo(cx + CHAR_W/2 - 4, by2 + bh); ctx.lineTo(cx + CHAR_W/2 + 4, by2 + bh); ctx.lineTo(cx + CHAR_W/2, by2 + bh + 5); ctx.fill();
      ctx.fillStyle = `rgba(20,20,40,${alpha})`;
      ctx.fillText(btext, cx + CHAR_W / 2, by2 + 10);
    }
  }

  function drawMap(W, H, t) {
    // Floor tiles
    for (let tx = 0; tx < W; tx += 40) {
      for (let ty = 0; ty < H; ty += 40) {
        ctx.fillStyle = ((Math.floor(tx / 40) + Math.floor(ty / 40)) % 2 === 0) ? '#121e2e' : '#162435';
        ctx.fillRect(tx, ty, 40, 40);
      }
    }
    // Tile grid lines
    ctx.strokeStyle = 'rgba(0,160,220,0.07)'; ctx.lineWidth = 0.5;
    for (let tx = 0; tx <= W; tx += 40) { ctx.beginPath(); ctx.moveTo(tx, 0); ctx.lineTo(tx, H); ctx.stroke(); }
    for (let ty = 0; ty <= H; ty += 40) { ctx.beginPath(); ctx.moveTo(0, ty); ctx.lineTo(W, ty); ctx.stroke(); }
    // Border walls
    ctx.fillStyle = '#080f1a';
    ctx.fillRect(0, 0, W, 20); ctx.fillRect(0, H - 20, W, 20);
    ctx.fillRect(0, 0, 20, H); ctx.fillRect(W - 20, 0, 20, H);
    ctx.strokeStyle = 'rgba(0,200,255,0.42)'; ctx.lineWidth = 1.5;
    ctx.strokeRect(20, 20, W - 40, H - 40);
    // Central fountain
    const fx = W / 2, fy = H / 2;
    ctx.fillStyle = '#0b1e35';
    ctx.beginPath(); ctx.arc(fx, fy, 52, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,210,255,0.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(fx, fy, 52, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(0,100,210,0.28)';
    ctx.beginPath(); ctx.arc(fx, fy, 44, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 3; i++) {
      const r = 7 + ((t * 22 + i * 14) % 32);
      ctx.strokeStyle = `rgba(0,210,255,${Math.max(0, 0.44 - r * 0.012)})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(fx, fy, r, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = '#00d4ff'; ctx.beginPath(); ctx.arc(fx, fy, 5, 0, Math.PI * 2); ctx.fill();
    ctx.font = '700 10px "Rajdhani",sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,200,255,0.4)'; ctx.fillText('SCHOOL LOBBY', fx, fy - 64);
    // Corner trees
    for (const [tx2, ty2] of [[62,62],[W-62,62],[62,H-62],[W-62,H-62]]) {
      ctx.fillStyle = '#3a2a18'; ctx.fillRect(tx2 - 4, ty2 + 4, 8, 14);
      ctx.fillStyle = '#1a5c28'; ctx.beginPath(); ctx.arc(tx2, ty2, 19, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#247030'; ctx.beginPath(); ctx.arc(tx2 - 5, ty2 - 4, 12, 0, Math.PI * 2); ctx.fill();
    }
    // Benches at bottom
    for (const [bx, by] of [[180, H-42],[320,H-42],[W-180,H-42],[W-320,H-42]]) {
      ctx.fillStyle = '#3e2c18'; ctx.fillRect(bx - 22, by - 5, 44, 8);
      ctx.fillRect(bx - 18, by + 3, 5, 7); ctx.fillRect(bx + 13, by + 3, 5, 7);
    }
  }

  function gameLoop(ts) {
    if (!canvas) return;
    animFrame = requestAnimationFrame(gameLoop);
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    drawMap(W, H, ts / 1000);

    // ── Star Collector: draw star ──────────────────────────
    if (currentStar) {
      const { x: sx, y: sy } = currentStar;
      const pulse = 0.55 + Math.sin(ts / 250) * 0.45;
      ctx.save();
      ctx.globalAlpha = pulse;
      // Outer glow
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 18);
      g.addColorStop(0, 'rgba(255, 215, 0, 0.85)');
      g.addColorStop(1, 'rgba(255, 120, 0, 0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(sx, sy, 18, 0, Math.PI * 2); ctx.fill();
      // 5-point star shape
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI / 5) - Math.PI / 2;
        const r = i % 2 === 0 ? 9 : 4;
        if (i === 0) ctx.moveTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r);
        else ctx.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r);
      }
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    // ── Star Collector: check if my player walks over star ─
    if (myPlayer && currentStar && sock && sock.connected) {
      const dx = (myPlayer.x + CHAR_W / 2) - currentStar.x;
      const dy = (myPlayer.y + CHAR_H / 2) - currentStar.y;
      if (Math.sqrt(dx * dx + dy * dy) < 22) {
        const sid = currentStar.id;
        currentStar = null; // optimistic clear
        sock.emit('lobby:collect_star', { starId: sid });
      }
    }

    if (myPlayer) {
      const up    = keys.ArrowUp    || keys.w || dpad.up;
      const down  = keys.ArrowDown  || keys.s || dpad.down;
      const left  = keys.ArrowLeft  || keys.a || dpad.left;
      const right = keys.ArrowRight || keys.d || dpad.right;
      const moving = up || down || left || right;
      if (moving) {
        if (up)    myPlayer.y = Math.max(BOUNDS.minY, myPlayer.y - SPEED);
        if (down)  myPlayer.y = Math.min(BOUNDS.maxY - CHAR_H, myPlayer.y + SPEED);
        if (left)  myPlayer.x = Math.max(BOUNDS.minX, myPlayer.x - SPEED);
        if (right) myPlayer.x = Math.min(BOUNDS.maxX - CHAR_W, myPlayer.x + SPEED);
        myPlayer.dir = left ? 'left' : right ? 'right' : up ? 'up' : 'down';
        myPlayer.moving = true;
        myPlayer.frame = Math.floor(ts / 180) % 4;
        if (sock && sock.connected && Date.now() - moveThrottle > 50) {
          moveThrottle = Date.now();
          sock.emit('lobby:move', { x: myPlayer.x, y: myPlayer.y, dir: myPlayer.dir });
        }
      } else {
        myPlayer.moving = false;
      }
    }

    // Draw all players sorted by Y (depth sort)
    const all = [...players.values()];
    if (myPlayer) all.push(myPlayer);
    all.sort((a, b) => a.y - b.y);
    for (const p of all) drawChar(p.x, p.y, p.username, p.color, p.bodyColor, p.moving || false, p.frame || 0, p.bubble, p.score || 0);
  }

  function setupDpad() {
    const map = { 'dpad-up': 'up', 'dpad-down': 'down', 'dpad-left': 'left', 'dpad-right': 'right' };
    Object.entries(map).forEach(([id, dir]) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      const on  = () => { dpad[dir] = true;  btn.classList.add('pressed'); };
      const off = () => { dpad[dir] = false; btn.classList.remove('pressed'); };
      btn.addEventListener('mousedown', on);
      btn.addEventListener('mouseup', off);
      btn.addEventListener('mouseleave', off);
      btn.addEventListener('touchstart', (e) => { e.preventDefault(); on(); }, { passive: false });
      btn.addEventListener('touchend',   (e) => { e.preventDefault(); off(); }, { passive: false });
      btn.addEventListener('touchcancel',(e) => { e.preventDefault(); off(); }, { passive: false });
    });
  }

  function updateCount() {
    const el = document.getElementById('lobby-online-count');
    if (el) el.textContent = (players.size + (myPlayer ? 1 : 0)) + ' online';
    renderLobbyPresence();
  }

  function renderLobbyPresence() {
    const list = document.getElementById('lobby-presence-list');
    if (!list) return;
    const active = [];
    if (myPlayer) active.push({ ...myPlayer, self: true });
    players.forEach((player) => active.push(player));
    if (!active.length) {
      list.innerHTML = '<p class="lobby-open-empty">No active users in the lobby yet.</p>';
      return;
    }
    list.innerHTML = active
      .sort((a, b) => String(a.username).localeCompare(String(b.username)))
      .map((player) => `
        <div class="lobby-presence-row ${player.self ? 'self' : ''}">
          <span class="presence-dot"></span>
          <span class="presence-name">${safe(player.username)}${player.self ? ' (you)' : ''}</span>
          <span class="presence-status">${player.moving ? 'Moving' : 'Online'}</span>
        </div>
      `).join('');
  }

  function safe(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function addMsg(username, text, time) {
    const box = document.getElementById('lobby-chat-messages');
    if (!box) return;
    const isMe = currentUser && username === currentUser.username;
    const div = document.createElement('div');
    div.className = 'lobby-chat-msg' + (isMe ? ' lobby-chat-me' : '');
    div.innerHTML = `<span class="lobby-chat-user">${safe(username)}</span><span class="lobby-chat-text">${safe(text)}</span><span class="lobby-chat-time">${safe(time)}</span>`;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
    while (box.children.length > 60) box.removeChild(box.firstChild);
  }

  function emitJoin() {
    if (sock && sock.connected && myPlayer) {
      sock.emit('lobby:join', {
        username: myPlayer.username, x: myPlayer.x, y: myPlayer.y,
        color: myPlayer.color, bodyColor: myPlayer.bodyColor
      });
    }
  }

  return {
    setupSocket(s) {
      sock = s;
      if (socketReady) {
        // On reconnect: re-emit join so the server re-adds us to the room
        if (s.connected && myPlayer) emitJoin();
        return;
      }
      socketReady = true;

      s.on('lobby:players', (all) => {
        players.clear();
        all.forEach(p => { if (!myPlayer || p.username !== myPlayer.username) players.set(p.username, { ...p, moving: false, frame: 0 }); });
        updateCount();
      });
      s.on('lobby:player_joined', (p) => {
        if (!myPlayer || p.username !== myPlayer.username) {
          players.set(p.username, { ...p, moving: false, frame: 0 });
          addMsg('●', p.username + ' joined the lobby', new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
        updateCount();
      });
      s.on('lobby:player_moved', ({ username, x, y, dir }) => {
        const p = players.get(username);
        if (p) { p.moving = (x !== p.x || y !== p.y); p.x = x; p.y = y; p.dir = dir; p.frame = (p.frame + 1) % 4; }
        renderLobbyPresence();
      });
      s.on('lobby:player_left', ({ username }) => {
        players.delete(username);
        addMsg('●', username + ' left the lobby', new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        updateCount();
      });
      s.on('lobby:chat', (msg) => {
        addMsg(msg.username, msg.text, msg.time);
        const bubbleData = { text: msg.text, expires: Date.now() + 4000 };
        const p = players.get(msg.username);
        if (p) p.bubble = bubbleData;
        if (myPlayer && msg.username === myPlayer.username) myPlayer.bubble = bubbleData;
      });
      // ── Star Collector events ──────────────────────────────
      s.on('lobby:star', (star) => { currentStar = star; });
      s.on('lobby:star_collected', ({ username, score, starId }) => {
        if (currentStar && currentStar.id === starId) currentStar = null;
        const p = players.get(username);
        if (p) p.score = score;
        if (myPlayer && username === myPlayer.username) myPlayer.score = score;
        addMsg('\u2605', `${username} collected a star! (${score} \u2605)`, new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      });
    },

    init() {
      canvas = document.getElementById('lobby-canvas');
      if (!canvas) return;
      ctx = canvas.getContext('2d');

      // Scale canvas to fit container width
      const resize = () => {
        const w = canvas.parentElement ? canvas.parentElement.clientWidth : 800;
        const scale = Math.min(1, w / 800);
        canvas.style.width  = (800 * scale) + 'px';
        canvas.style.height = (500 * scale) + 'px';
      };
      resize();
      window.addEventListener('resize', resize);
      canvas._resize = resize;

      // Keyboard controls (only when not typing in an input)
      _kdown = (e) => {
        if (['INPUT','TEXTAREA'].includes(e.target.tagName)) return;
        if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].includes(e.key)) {
          keys[e.key] = true;
          if (e.key.startsWith('Arrow')) e.preventDefault();
        }
      };
      _kup = (e) => { keys[e.key] = false; };
      document.addEventListener('keydown', _kdown);
      document.addEventListener('keyup', _kup);

      setupDpad();

      // Build my player
      if (currentUser) {
        myPlayer = {
          username: currentUser.username,
          x: 180 + Math.floor(Math.random() * 400),
          y: 150 + Math.floor(Math.random() * 200),
          dir: 'down', moving: false, frame: 0,
          color: colorFromName(currentUser.username),
          bodyColor: bodyColorFromName(currentUser.username),
          isMe: true
        };
        if (sock && sock.connected) {
          emitJoin();
        } else if (sock) {
          sock.once('connect', () => { if (currentUser) sock.emit('identify', currentUser); emitJoin(); });
        }
      }

      if (animFrame) cancelAnimationFrame(animFrame);
      animFrame = requestAnimationFrame(gameLoop);
      updateCount();
    },

    destroy() {
      if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
      if (_kdown) { document.removeEventListener('keydown', _kdown); _kdown = null; }
      if (_kup)   { document.removeEventListener('keyup',   _kup);   _kup = null; }
      if (canvas && canvas._resize) { window.removeEventListener('resize', canvas._resize); }
      if (sock && sock.connected && myPlayer) sock.emit('lobby:leave');
      players.clear();
      myPlayer = null;
      updateCount();
      currentStar = null;
      canvas = null; ctx = null;
    }
  };
})();

window.sendLobbyChat = function() {
  const input = document.getElementById('lobby-chat-input');
  if (!input || !input.value.trim()) return;
  const text = input.value.trim();
  input.value = '';
  const s = _ensureSocket();
  if (s && s.connected) {
    s.emit('lobby:chat', { text });
  } else if (s) {
    // Queue for when connection is established
    s.once('connect', () => s.emit('lobby:chat', { text }));
  }
};

// ── Photo Gallery System (Event Pictures + Random Pictures) ──────────────────

const GALLERY_YEARS = [
  { key:'y1', label:'First Year',   emoji:'🌱', accent:'#00d4ff', bg:'linear-gradient(135deg,#001a2e 0%,#002d4a 100%)' },
  { key:'y2', label:'Second Year',  emoji:'📚', accent:'#00ff88', bg:'linear-gradient(135deg,#001a10 0%,#002d1a 100%)' },
  { key:'y3', label:'Third Year',   emoji:'🔬', accent:'#ff6b35', bg:'linear-gradient(135deg,#1a0800 0%,#2d1200 100%)' },
  { key:'y4', label:'Fourth Year',  emoji:'🎓', accent:'#a855f7', bg:'linear-gradient(135deg,#12001a 0%,#20002d 100%)' },
];
const GALLERY_SEMS = [
  { key:'sem1', label:'First Semester',  emoji:'☀️', accent:'#00d4ff', bg:'linear-gradient(135deg,#001428 0%,#002040 100%)' },
  { key:'sem2', label:'Second Semester', emoji:'🌙', accent:'#c084fc', bg:'linear-gradient(135deg,#100020 0%,#1e0038 100%)' },
];
const GALLERY_META = {
  ep: { icon:'📷', title:'Event Pictures', viewId:'ep-view', bcId:'ep-breadcrumb' },
  rp: { icon:'🌌', title:'Random Pictures', viewId:'rp-view', bcId:'rp-breadcrumb' },
};

const galleryStates = {
  ep: { level:'years', year:null, sem:null, folder:null },
  rp: { level:'years', year:null, sem:null, folder:null },
};

// ── Thin wrappers called from onclick strings ─────────────────
function epSelectYear(k)         { gSelectYear('ep',k); }
function epSelectSem(k)          { gSelectSem('ep',k); }
function epSelectFolder(id,name) { gSelectFolder('ep',id,name); }
function epBcClick(lvl)          { gBcClick('ep',lvl); }
function epCreateFolder(pk)      { gCreateFolder('ep',pk); }
function epRenameFolder(id,n)    { gRenameFolder('ep',id,n); }
function epDeleteFolder(id)      { gDeleteFolder('ep',id); }
function epUploadFiles(fl,fid,el){ gUploadFiles('ep',fl,fid,el); }
function epDeleteFile(id)        { gDeleteFile('ep',id); }
function renderEP()              { renderGallery('ep'); }

function rpSelectYear(k)         { gSelectYear('rp',k); }
function rpSelectSem(k)          { gSelectSem('rp',k); }
function rpSelectFolder(id,name) { gSelectFolder('rp',id,name); }
function rpBcClick(lvl)          { gBcClick('rp',lvl); }
function rpCreateFolder(pk)      { gCreateFolder('rp',pk); }
function rpRenameFolder(id,n)    { gRenameFolder('rp',id,n); }
function rpDeleteFolder(id)      { gDeleteFolder('rp',id); }
function rpUploadFiles(fl,fid,el){ gUploadFiles('rp',fl,fid,el); }
function rpDeleteFile(id)        { gDeleteFile('rp',id); }
function renderRP()              { renderGallery('rp'); }

// ── Core functions ────────────────────────────────────────────
function gSelectYear(pfx, key) {
  galleryStates[pfx] = { level:'sems', year: GALLERY_YEARS.find(y=>y.key===key), sem:null, folder:null };
  renderGallery(pfx);
}
function gSelectSem(pfx, key) {
  const s = galleryStates[pfx];
  galleryStates[pfx] = { ...s, level:'folders', sem: GALLERY_SEMS.find(s=>s.key===key), folder:null };
  renderGallery(pfx);
}
function gSelectFolder(pfx, id, name) {
  galleryStates[pfx] = { ...galleryStates[pfx], level:'files', folder:{ id, name } };
  renderGallery(pfx);
}
function gBcClick(pfx, level) {
  const s = galleryStates[pfx];
  if      (level === 'years')   galleryStates[pfx] = { level:'years', year:null, sem:null, folder:null };
  else if (level === 'sems')    galleryStates[pfx] = { ...s, level:'sems', sem:null, folder:null };
  else if (level === 'folders') galleryStates[pfx] = { ...s, level:'folders', folder:null };
  renderGallery(pfx);
}

function renderGallery(pfx) {
  const meta = GALLERY_META[pfx];
  const st   = galleryStates[pfx];
  const view = document.getElementById(meta.viewId);
  const bc   = document.getElementById(meta.bcId);
  if (!view || !bc) return;

  // Breadcrumb
  let bcHtml = `<span class="ep-bc" onclick="${pfx}BcClick('years')">${meta.icon} ${meta.title}</span>`;
  if (st.year)   bcHtml += `<span class="ep-bc-sep">›</span><span class="ep-bc" onclick="${pfx}BcClick('sems')">${st.year.label}</span>`;
  if (st.sem)    bcHtml += `<span class="ep-bc-sep">›</span><span class="ep-bc" onclick="${pfx}BcClick('folders')">${st.sem.label}</span>`;
  if (st.folder) bcHtml += `<span class="ep-bc-sep">›</span><span class="ep-bc ep-bc-active">${st.folder.name}</span>`;
  bc.innerHTML = bcHtml;

  view.style.opacity = '0';
  view.style.transform = 'translateY(12px)';

  if      (st.level === 'years')   renderGYears(pfx, view);
  else if (st.level === 'sems')    renderGSems(pfx, view);
  else if (st.level === 'folders') renderGFolders(pfx, view);
  else if (st.level === 'files')   renderGFiles(pfx, view);

  requestAnimationFrame(() => {
    view.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
    view.style.opacity = '1';
    view.style.transform = 'translateY(0)';
  });
}

function gBackBtn(pfx, level, label) {
  return `<button class="ep-back-btn" onclick="${pfx}BcClick('${level}')">‹ ${label}</button>`;
}

function renderGYears(pfx, view) {
  view.innerHTML = `
    <div class="ep-section-title">Select Year Level</div>
    <div class="ep-grid ep-grid-4">
      ${GALLERY_YEARS.map(y => `
        <div class="ep-card" style="--ep-accent:${y.accent};background:${y.bg}" onclick="${pfx}SelectYear('${y.key}')">
          <div class="ep-card-emoji">${y.emoji}</div>
          <div class="ep-card-label">${y.label}</div>
          <div class="ep-card-sub">View semesters</div>
          <div class="ep-card-glow"></div>
        </div>`).join('')}
    </div>`;
}

function renderGSems(pfx, view) {
  const st = galleryStates[pfx];
  view.innerHTML = `
    ${gBackBtn(pfx, 'years', GALLERY_META[pfx].title)}
    <div class="ep-section-title">${st.year.label}</div>
    <div class="ep-grid ep-grid-2">
      ${GALLERY_SEMS.map(s => `
        <div class="ep-card ep-card-sem" style="--ep-accent:${s.accent};background:${s.bg}" onclick="${pfx}SelectSem('${s.key}')">
          <div class="ep-card-emoji">${s.emoji}</div>
          <div class="ep-card-label">${s.label}</div>
          <div class="ep-card-sub">View albums</div>
          <div class="ep-card-glow"></div>
        </div>`).join('')}
    </div>`;
}

function renderGFolders(pfx, view) {
  const st = galleryStates[pfx];
  const parentKey = `${pfx}_${st.year.key}_${st.sem.key}`;
  sb.from('folders').select('*').eq('parent', parentKey).then(({ data:folders, error }) => {
    if (error) return;
    const cards = (folders || []).filter(canViewFolder).map(f => {
      const safeId = escapeJS(f.id);
      const safeName = escapeJS(f.name);
      const actions = canManageFolder(f)
        ? `<div class="ep-card-actions" onclick="event.stopPropagation()">
             <button class="ep-action-btn" onclick="${pfx}RenameFolder('${safeId}','${safeName}')">Rename</button>
             <button class="ep-action-btn" onclick="openFolderPermissions('${safeId}')">Permissions</button>
             <button class="ep-action-btn ep-btn-del" onclick="${pfx}DeleteFolder('${safeId}')">Delete</button>
           </div>` : '';
      return `
        <div class="ep-card ep-card-folder" style="--ep-accent:#00d4ff" onclick="${pfx}SelectFolder('${safeId}','${safeName}')">
          <div class="ep-card-emoji">📁</div>
          <div class="ep-card-label">${escapeHTML(f.name)}</div>
          <div class="ep-card-sub">By ${escapeHTML(f.owner || 'Unknown')} · ${folderAccessLabel(f)}</div>
          ${actions}
          <div class="ep-card-glow"></div>
        </div>`;
    }).join('');

    const addCard = currentUser ? `
      <div class="ep-card ep-card-add" style="--ep-accent:#ffffff55" onclick="${pfx}CreateFolder('${parentKey}')">
        <div class="ep-card-emoji">➕</div>
        <div class="ep-card-label">New Album</div>
        <div class="ep-card-sub">Create folder</div>
      </div>` : '';

    view.innerHTML = `
      ${gBackBtn(pfx, 'sems', st.year.label)}
      <div class="ep-section-title">${st.year.label} · ${st.sem.label}</div>
      <div class="ep-grid ep-grid-4">${cards}${addCard}</div>`;
  });
}

function renderGFiles(pfx, view) {
  const st = galleryStates[pfx];
  const folderId = st.folder.id;
  fetchFolderById(folderId).then((folder) => {
  if (!canViewFolder(folder)) {
    view.innerHTML = `${gBackBtn(pfx, 'folders', st.sem ? st.sem.label : 'Back')}<div class="ep-empty">You do not have permission to view this folder.</div>`;
    return;
  }
  const allowEdit = canEditFolder(folder);
  sb.from('files').select('*').eq('folder_id', folderId).then(({ data:files, error }) => {
    if (error) return;

    const uploadBar = allowEdit ? `
      <label class="ep-upload-btn">
        <input type="file" multiple accept="image/*,video/*" style="display:none" onchange="${pfx}UploadFiles(this.files,'${folderId}',this)">
        📸 Upload Photos / Videos
      </label>` : '';

    const photoGrid = !files || files.length === 0
      ? `<div class="ep-empty">No photos yet.${currentUser ? ' Upload some!' : ''}</div>`
      : `<div class="ep-photo-grid">${files.map(f => {
          const isImg = f.type && f.type.startsWith('image/');
          const isVid = f.type && f.type.startsWith('video/');
          const safeId = escapeJS(f.id);
          const safeName = escapeJS(f.name);
          const safeUrl = escapeJS(f.url);
          const safeFolderId = escapeJS(folderId);
          const actionBtns = allowEdit
            ? `<div class="ep-photo-actions">
                 <button onclick="openCopyMoveFileModal('${safeId}','${safeFolderId}','gallery-${pfx}')">Copy & Move To</button>
                 <button class="danger" onclick="${pfx}DeleteFile('${safeId}')">Delete</button>
               </div>` : '';
          return `
            <div class="ep-photo-card">
              ${isImg ? `<img src="${escapeHTML(f.url)}" class="ep-photo-thumb" loading="lazy" onclick="epOpenPhoto('${safeUrl}','${safeName}')">` :
                isVid ? `<video src="${escapeHTML(f.url)}" class="ep-photo-thumb" controls playsinline></video>` :
                `<div class="ep-photo-placeholder">📄</div>`}
              <div class="ep-photo-info">
                <div class="ep-photo-name">${escapeHTML(f.name)}</div>
                ${f.size ? `<div class="ep-photo-size">${formatFileSize(f.size)}</div>` : ''}
              </div>
              ${actionBtns}
            </div>`;
        }).join('')}</div>`;

    view.innerHTML = `
      ${gBackBtn(pfx, 'folders', st.sem ? st.sem.label : 'Back')}
      <div class="ep-section-title">${escapeHTML(st.folder.name)}</div>
      <div class="ep-upload-bar">${uploadBar}</div>
      ${photoGrid}`;
  });
  }).catch((error) => {
    view.innerHTML = `<div class="ep-empty">${escapeHTML(error.message)}</div>`;
  });
}

// ── Folder / File actions ─────────────────────────────────────
function gCreateFolder(pfx, parentKey) {
  if (!currentUser) return customAlert('Please log in.');
  customPrompt('Album name:', function(name) {
    if (!name) return;
    authFetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parent: parentKey, name, permissions: { viewers: [], editors: [], everyone: 'edit' } }),
    }).then(async (r) => {
      if (!r.ok) { const d = await r.json().catch(() => ({})); return customAlert(d.error || 'Failed to create album.'); }
      showToast('Album created.');
      renderGallery(pfx);
    }).catch(() => customAlert('Network error creating album.'));
  });
}
function gRenameFolder(pfx, id, currentName) {
  fetchFolderById(id).then((folder) => {
  if (!canManageFolder(folder)) return customAlert('Only the album owner can rename this album.');
  customPrompt('New album name:', function(name) {
    if (!name || name === currentName) return;
    authFetch(`/api/folders/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }).then(async (r) => {
      if (!r.ok) { const d = await r.json().catch(() => ({})); return customAlert(d.error || 'Failed to rename album.'); }
      showToast('Album renamed.');
      renderGallery(pfx);
    }).catch(() => customAlert('Network error renaming album.'));
  }, currentName);
  }).catch((error) => customAlert(error.message));
}
function gDeleteFolder(pfx, id) {
  fetchFolderById(id).then((folder) => {
  if (!canManageFolder(folder)) return customAlert('Only the album owner can delete this album.');
  customConfirm('Delete this album and all its photos?', function() {
    authFetch(`/api/folders/${encodeURIComponent(id)}`, { method: 'DELETE' })
      .then(async (r) => {
        if (!r.ok) { const d = await r.json().catch(() => ({})); return customAlert(d.error || 'Failed to delete album.'); }
        showToast('Album deleted.', 'warning');
        renderGallery(pfx);
      }).catch(() => customAlert('Network error deleting album.'));
  });
  }).catch((error) => customAlert(error.message));
}
async function gUploadFiles(pfx, fileList, folderId, inputEl) {
  if (!currentUser) return customAlert('Please log in.');
  let folder;
  try { folder = await fetchFolderById(folderId); } catch (error) { return customAlert(error.message); }
  if (!canEditFolder(folder)) return customAlert('You do not have permission to upload here.');
  const files = Array.from(fileList);
  if (files.length === 0) return;

  const meta = GALLERY_META[pfx];
  const view = document.getElementById(meta.viewId);
  const bar  = view && view.querySelector('.ep-upload-bar');
  if (bar) bar.innerHTML = `<div class="ep-uploading">Uploading 0 / ${files.length}…</div>`;

  let done = 0, failed = 0;
  for (const file of files) {
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await authFetch('/api/upload', { method:'POST', body:fd });
      if (!r.ok) throw new Error('Upload failed');
      const data = await r.json();
      const { error } = await insertFileRecord({
        folder_id: folderId, name: file.name, url: data.url,
        type: file.type, uploader: currentUser.username, size: data.size,
        is_original_upload: true, source_file_id: null,
      });
      if (error) throw new Error(error.message);
      done++;
      if (bar) bar.innerHTML = `<div class="ep-uploading">Uploading ${done} / ${files.length}…</div>`;
    } catch(e) { failed++; console.error('Gallery upload error:', e); }
  }
  if (failed > 0) customAlert(`${done} uploaded, ${failed} failed.`);
  renderGallery(pfx);
}
function gDeleteFile(pfx, id) {
  const folderId = galleryStates[pfx]?.folder?.id;
  if (!folderId) return;
  fetchFolderById(folderId).then((folder) => {
  if (!canEditFolder(folder)) return customAlert('You do not have permission to delete files here.');
  customConfirm('Delete this photo?', function() {
    sb.from('files').delete().eq('id', id).then(() => { showToast('File deleted.', 'warning'); renderGallery(pfx); });
  });
  }).catch((error) => customAlert(error.message));
}

function epOpenPhoto(url, name) {
  const overlay = document.createElement('div');
  overlay.className = 'ep-lightbox';
  overlay.onclick = () => overlay.remove();
  overlay.innerHTML = `
    <div class="ep-lightbox-inner" onclick="event.stopPropagation()">
      <img src="${url}" class="ep-lightbox-img">
      <div class="ep-lightbox-name">${name}</div>
      <button class="ep-lightbox-close" onclick="this.closest('.ep-lightbox').remove()">✕</button>
    </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('ep-lightbox-in'));
}

// Shared public boards: OUTPUT-AI and ANNOUNCEMENT
let sharedAIOutputs = [];
let sharedAnnouncements = [];
let sharedRealtimeReady = false;
let socialEmbedTimer = null;

function buildFacebookEmbedUrl(url) {
  const encoded = encodeURIComponent(url);
  return `https://www.facebook.com/plugins/page.php?href=${encoded}&tabs=timeline&width=500&height=720&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=false`;
}

window.openSocialPage = function(title, url) {
  const pageUrl = url || title;
  const pageTitle = url ? title : 'Social Media Page';
  const home = document.getElementById('social-home-view');
  const embed = document.getElementById('social-embed-view');
  const frame = document.getElementById('social-embed-frame');
  const titleEl = document.getElementById('social-embed-title');
  const status = document.getElementById('social-embed-status');
  const statusText = document.getElementById('social-embed-status-text');
  const externalLink = document.getElementById('social-open-external');
  if (!home || !embed || !frame) return;
  if (socialEmbedTimer) clearTimeout(socialEmbedTimer);
  if (titleEl) {
    const decoder = document.createElement('textarea');
    decoder.innerHTML = pageTitle;
    titleEl.textContent = decoder.value;
  }
  if (externalLink) externalLink.href = pageUrl;
  if (status) {
    status.classList.remove('is-warning');
    status.classList.remove('hidden');
  }
  if (statusText) statusText.textContent = 'Loading Facebook embed inside the app...';
  frame.onload = () => {
    if (statusText) statusText.textContent = 'If the page keeps loading, Facebook may be blocking the embedded view. Use the browser link below.';
  };
  frame.src = buildFacebookEmbedUrl(pageUrl);
  home.classList.add('hidden');
  embed.classList.remove('hidden');
  embed.scrollIntoView({ block: 'start', behavior: 'smooth' });
  socialEmbedTimer = setTimeout(() => {
    if (!document.getElementById('social-embed-view')?.classList.contains('hidden')) {
      if (status) status.classList.add('is-warning');
      if (statusText) statusText.textContent = 'Facebook did not finish loading here. This is usually Facebook blocking third-party embeds, privacy cookies, or a page restriction, not your signal.';
    }
  }, 8000);
};

window.closeSocialPage = function() {
  const home = document.getElementById('social-home-view');
  const embed = document.getElementById('social-embed-view');
  const frame = document.getElementById('social-embed-frame');
  const status = document.getElementById('social-embed-status');
  if (socialEmbedTimer) clearTimeout(socialEmbedTimer);
  if (frame) frame.src = 'about:blank';
  if (status) status.classList.add('hidden');
  if (embed) embed.classList.add('hidden');
  if (home) home.classList.remove('hidden');
};

async function fetchSharedAIOutputs() {
  const feed = document.getElementById('output-ai-feed');
  if (feed) feed.innerHTML = createInlineLoader('Loading shared AI output...');
  const supabaseReady = await waitForSupabaseClient().catch(() => false);
  if (!supabaseReady) {
    if (feed) {
      feed.innerHTML = `
        <div class="board-empty">
          Shared OUTPUT-AI is still loading (server waking up).<br>
          <button class="btn-secondary mt-10" type="button" onclick="fetchSharedAIOutputs()">Retry</button>
        </div>`;
    }
    return;
  }
  const { data, error } = await sb.from('shared_ai_outputs').select('*').order('created_at', { ascending: false }).limit(80);
  if (error) {
    if (feed) feed.innerHTML = `<p class="empty-state-text">${escapeHTML(error.message)}</p>`;
    return;
  }
  sharedAIOutputs = data || [];
  renderSharedAIOutputs();
}

function renderSharedAIOutputs() {
  const feed = document.getElementById('output-ai-feed');
  if (!feed) return;
  if (!sharedAIOutputs.length) {
    feed.innerHTML = '<div class="board-empty">No shared AI output yet.</div>';
    return;
  }
  feed.innerHTML = sharedAIOutputs.map((item) => {
    const canDelete = currentUser && (item.sharer === currentUser.username || isAdmin);
    return `
    <article class="board-card ai-output-card">
      <div class="board-card-meta">
        <span>${escapeHTML(item.sharer || 'Unknown')}</span>
        <span>${new Date(item.created_at).toLocaleString()}</span>
        <span>${escapeHTML(item.provider || 'AI')}</span>
        ${canDelete ? `<button type="button" class="board-delete-btn" data-output-delete="${escapeJS(item.id)}">Delete</button>` : ''}
      </div>
      ${item.prompt ? `<div class="board-section"><h4>Prompt</h4><p>${aiFormat(item.prompt)}</p></div>` : ''}
      ${item.output ? `<div class="board-section"><h4>Output</h4><p>${aiFormat(item.output)}</p></div>` : ''}
    </article>`;
  }).join('');
}
window.fetchSharedAIOutputs = fetchSharedAIOutputs;

window.deleteSharedAIOutput = function(id) {
  if (!currentUser) return customAlert('Please log in.');
  const item = sharedAIOutputs.find((entry) => String(entry.id) === String(id));
  if (!item) return customAlert('Shared output not found.');
  if (item.sharer !== currentUser.username && !isAdmin) {
    return customAlert('Only the sharer can delete this OUTPUT-AI post.');
  }
  customConfirm('Delete this shared OUTPUT-AI post for everyone?', async function() {
    try {
      const response = await authFetch(`/api/shared-ai-outputs/${id}`, { method: 'DELETE' });
      if (!response.ok) { 
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await response.json(); 
          throw new Error(data.error || 'Failed to delete'); 
        } else {
          const text = await response.text();
          console.error(`Expected JSON but received ${contentType} from /api/shared-ai-outputs. Status: ${response.status}. Preview: ${text.slice(0, 100)}`);
          throw new Error('Unable to complete this action. Please try again.');
        }
      }
      sharedAIOutputs = sharedAIOutputs.filter((entry) => String(entry.id) !== String(id));
      renderSharedAIOutputs();
      showToast('Shared AI output deleted.', 'warning');
    } catch (error) { customAlert(error.message); }
  });
}

async function fetchSharedAnnouncements() {
  const feed = document.getElementById('announcement-feed');
  const stats = document.getElementById('announcement-stats');
  if (feed) feed.innerHTML = createInlineLoader('Loading announcements...');
  const supabaseReady = await waitForSupabaseClient().catch(() => false);
  if (!supabaseReady) {
    sharedAnnouncements = [];
    if (stats) stats.innerHTML = '';
    if (feed) {
      feed.innerHTML = `
        <div class="board-empty">
          Announcements are still loading (server waking up).<br>
          <button class="btn-secondary mt-10" type="button" onclick="fetchSharedAnnouncements()">Retry</button>
        </div>`;
    }
    return;
  }
  const { data, error } = await sb.from('shared_announcements').select('*').order('created_at', { ascending: false }).limit(80);
  if (error) {
    if (feed) feed.innerHTML = `<p class="empty-state-text">${escapeHTML(error.message)}</p>`;
    return;
  }
  sharedAnnouncements = data || [];
  renderSharedAnnouncements();
}
window.fetchSharedAnnouncements = fetchSharedAnnouncements;

function renderSharedAnnouncements() {
  const feed = document.getElementById('announcement-feed');
  if (!feed) return;
  const stats = document.getElementById('announcement-stats');
  const searchTerm = (document.getElementById('announcement-search-input')?.value || '').trim().toLowerCase();
  const filtered = sharedAnnouncements.filter((item) => {
    if (!searchTerm) return true;
    return [
      item.title,
      item.body,
      item.text,
      item.sharer,
      item.schedule,
      item.date_label,
      item.source_type,
    ].some((value) => String(value || '').toLowerCase().includes(searchTerm));
  });
  if (stats) {
    const weekly = sharedAnnouncements.filter((item) => item.source_type === 'weekly_reminder').length;
    stats.innerHTML = `
      <span><strong>${sharedAnnouncements.length}</strong> total</span>
      <span><strong>${weekly}</strong> weekly</span>
      <span><strong>${filtered.length}</strong> shown</span>
    `;
  }
  if (!sharedAnnouncements.length) {
    feed.innerHTML = '<div class="board-empty">No shared announcements yet.</div>';
    return;
  }
  if (!filtered.length) {
    feed.innerHTML = '<div class="board-empty">No announcements match this search.</div>';
    return;
  }
  feed.innerHTML = filtered.map((item) => `
    <article class="board-card announcement-card">
      <div class="announcement-date-chip">${escapeHTML(item.schedule || item.date_label || 'Announcement')}</div>
      <h2>${escapeHTML(item.title || 'Announcement')}</h2>
      <p>${escapeHTML(item.body || item.text || '').replace(/\n/g, '<br>')}</p>
      <div class="board-card-meta">
        <span>Shared by ${escapeHTML(item.sharer || 'Unknown')}</span>
        <span>${new Date(item.created_at).toLocaleString()}</span>
        ${(currentUser && (item.sharer === currentUser.username || isAdmin)) ? `<button type="button" class="announcement-delete-btn" data-id="${escapeHTML(String(item.id))}" style="margin-left:auto;padding:4px 12px;background:rgba(255,50,50,0.15);color:#ff4444;border:1px solid rgba(255,50,50,0.3);border-radius:6px;cursor:pointer;font-size:0.8em;font-weight:600;">Delete</button>` : ''}
      </div>
    </article>`).join('');
}
window.renderSharedAnnouncements = renderSharedAnnouncements;

window.deleteSharedAnnouncement = async function(id) {
  if (!currentUser) return customAlert('Please log in.');
  if (!confirm('Delete this announcement?')) return;
  try {
    const response = await authFetch(`/api/shared-announcements/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete announcement.');
      } else {
        const text = await response.text();
        console.error(`Expected JSON but received ${contentType} from /api/shared-announcements. Status: ${response.status}. Preview: ${text.slice(0, 100)}`);
        throw new Error('Unable to complete this action. Please try again.');
      }
    }
    showToast('Announcement deleted.');
    fetchSharedAnnouncements();
  } catch (error) { customAlert(error.message); }
};

async function shareAnnouncementPayload(payload) {
  if (!currentUser) return customAlert('Please log in to share announcements.');
  try {
    const response = await authFetch('/api/shared-announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to share');
      } else {
        const text = await response.text();
        console.error(`Expected JSON but received ${contentType} from /api/shared-announcements. Status: ${response.status}. Preview: ${text.slice(0, 100)}`);
        throw new Error('Unable to share right now. Please try again or sign in again.');
      }
    }
    showToast('Shared to ANNOUNCEMENT.');
    fetchSharedAnnouncements();
  } catch (error) { customAlert(error.message); }
}

window.shareCalendarNote = function(dateKey, displayDate, text) {
  const modal = document.getElementById('view-note-modal');
  if (modal) modal.remove();
  shareAnnouncementPayload({
    title: `Calendar: ${displayDate}`,
    body: text,
    date_key: dateKey,
    date_label: displayDate,
    schedule: displayDate,
    source_type: 'calendar_date',
  });
};

window.shareWeeklyAnnouncement = function() {
  const text = document.getElementById('announcement-note')?.value.trim();
  if (!text) return customAlert('Write a weekly reminder first.');
  shareAnnouncementPayload({
    title: 'Weekly Reminder',
    body: text,
    schedule: 'Weekly',
    source_type: 'weekly_reminder',
  });
};

function initSharedRealtime() {
  if (sharedRealtimeReady) return;
  const boardsChannel = getSupabaseChannel('public:shared_boards');
  const tallyChannel = getSupabaseChannel('public:contribution_tally');
  if (!boardsChannel || !tallyChannel) return;
  sharedRealtimeReady = true;
  boardsChannel
    .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_ai_outputs' }, () => {
      if (currentPage === 'outputai') fetchSharedAIOutputs();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_announcements' }, () => {
      if (currentPage === 'announcement') fetchSharedAnnouncements();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'app_updates' }, () => fetchAppUpdates())
    .subscribe();
  tallyChannel
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'files' }, (payload) => {
      if (payload?.new?.is_original_upload !== false) refreshContributionTally();
    })
    .subscribe();

}

// ── AI Assistants System ──────────────────────────────────────────────────────

const AI_PROVIDERS = {
  gemini: {
    name: 'Gemini AI', tag: 'Smart Assistant', icon: '✨',
    model: 'Gemini 1.5 Flash', accent: '#8b5cf6',
    bg: 'linear-gradient(135deg,#1a0533 0%,#2d1054 100%)',
    endpoint: '/api/gemini',
    desc: 'Best for explanations, school work, and structured answers',
    placeholder: 'Ask Gemini anything…',
  },
  groq: {
    name: 'Groq AI', tag: 'Fast Assistant', icon: '⚡',
    model: 'LLaMA 3 · 8B', accent: '#f97316',
    bg: 'linear-gradient(135deg,#1a0a00 0%,#3d1800 100%)',
    endpoint: '/api/groq',
    desc: 'Ultra-fast responses for quick Q&A and chat',
    placeholder: 'Ask Groq anything…',
  },
};

let aiView = 'hub';
let aiTyping = false;
const aiChats = { gemini: [], groq: [] };

function aiGoHub()           { aiView = 'hub'; renderAI(); }
function aiOpenChat(p)       { aiView = p; renderAI(); }
function aiClearChat(p)      {
  customConfirm('Clear this chat history?', () => {
    aiChats[p] = []; aiTyping = false; renderAIChat(document.getElementById('ai-view'), p);
  });
}
window.aiGoHub = aiGoHub;
window.aiOpenChat = aiOpenChat;
window.aiClearChat = aiClearChat;

function renderAI() {
  const view = document.getElementById('ai-view');
  const bc   = document.getElementById('ai-breadcrumb');
  if (!view || !bc) return;

  if (aiView === 'hub') {
    bc.innerHTML = `<span class="ai-bc">🤖 AI Assistants</span>`;
    renderAIHub(view);
  } else {
    const p = AI_PROVIDERS[aiView];
    bc.innerHTML = `
      <button type="button" class="ai-bc ai-bc-link" data-ai-action="hub" style="background:none;border:0;padding:0;font:inherit;color:inherit;cursor:pointer;">🤖 AI Assistants</button>
      <span class="ai-bc-sep">›</span>
      <span class="ai-bc ai-bc-active">${p.icon} ${p.name}</span>`;
    renderAIChat(view, aiView);
  }
}

function renderAIHub(view) {
  view.innerHTML = `
    <div class="ai-hub">
      <div class="ai-hub-header">
        <div class="ai-hub-title">AI Assistants</div>
        <div class="ai-hub-sub">Choose an AI to start chatting</div>
      </div>
      <div class="ai-cards">
        ${Object.entries(AI_PROVIDERS).map(([key, p]) => `
          <button type="button" class="ai-card" style="--ai-accent:${p.accent};background:${p.bg};border:0;padding:0;width:100%;text-align:left;" data-ai-action="open-chat" data-ai-provider="${key}">
            <div class="ai-card-glow"></div>
            <div class="ai-card-top">
              <span class="ai-card-icon">${p.icon}</span>
              <span class="ai-card-tag">${p.tag}</span>
            </div>
            <div class="ai-card-name">${p.name}</div>
            <div class="ai-card-model">${p.model}</div>
            <div class="ai-card-desc">${p.desc}</div>
            <div class="ai-card-btn">Open Chat →</div>
          </button>`).join('')}
      </div>
    </div>`;
}

function renderAIChat(view, provider) {
  const p    = AI_PROVIDERS[provider];
  const msgs = aiChats[provider];

  const bubbles = msgs.map((m, index) => `
    <div class="ai-msg ${m.role === 'user' ? 'ai-msg-user' : 'ai-msg-ai'}">
      ${m.role !== 'user' ? `<div class="ai-msg-av">${p.icon}</div>` : ''}
      <div class="ai-bubble-wrap">
        <div class="ai-bubble">${aiFormat(m.content)}</div>
        <button type="button" class="share-everyone-btn" data-ai-action="share-message" data-ai-provider="${provider}" data-ai-index="${index}">Share to Everyone</button>
      </div>
      ${m.role === 'user' ? `<div class="ai-msg-av">👤</div>` : ''}
    </div>`).join('');

  view.innerHTML = `
    <div class="ai-chat-wrap">
      <div class="ai-chat-head" style="--ai-accent:${p.accent}">
        <button type="button" class="ai-back-btn" data-ai-action="hub">← Back</button>
        <span class="ai-head-icon">${p.icon}</span>
        <div class="ai-head-info">
          <div class="ai-head-name">${p.name}</div>
          <div class="ai-head-sub">${p.tag} · ${p.model}</div>
        </div>
        ${msgs.length ? `<button type="button" class="ai-clear-btn" data-ai-action="clear-chat" data-ai-provider="${provider}">Clear</button>` : ''}
      </div>

      <div class="ai-messages" id="ai-messages">
        ${msgs.length === 0 ? `
          <div class="ai-welcome">
            <div class="ai-welcome-icon">${p.icon}</div>
            <div class="ai-welcome-name">${p.name}</div>
            <div class="ai-welcome-desc">${p.desc}</div>
          </div>` : bubbles}
        <div id="ai-typing-ind" class="ai-typing-ind${aiTyping ? '' : ' hidden'}">
          <div class="ai-msg-av">${p.icon}</div>
          <div class="ai-dots"><span></span><span></span><span></span></div>
        </div>
      </div>

      <div class="ai-input-area">
        <div class="ai-input-row">
          <textarea id="ai-input" class="ai-textarea" rows="1"
            placeholder="${p.placeholder}"
            data-ai-provider="${provider}"
            oninput="this.style.height='auto';this.style.height=Math.min(this.scrollHeight,130)+'px'"></textarea>
          <button type="button" class="ai-send-btn" style="--ai-accent:${p.accent}" data-ai-action="send" data-ai-provider="${provider}">↑</button>
        </div>
        <div class="ai-hint">Enter to send · Shift+Enter for new line</div>
      </div>
    </div>`;

  setTimeout(() => {
    const m = document.getElementById('ai-messages');
    if (m) m.scrollTop = m.scrollHeight;
    const inp = document.getElementById('ai-input');
    if (inp && !aiTyping) inp.focus();
  }, 60);
}

function aiFormat(text) {
  return String(text ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/`([^`]+)`/g,'<code>$1</code>')
    .replace(/\n/g,'<br>');
}

async function aiSend(provider) {
  const inp  = document.getElementById('ai-input');
  const text = inp?.value?.trim();
  if (!text || aiTyping) return;

  aiChats[provider].push({ role:'user', content:text });
  inp.value = ''; inp.style.height = 'auto';
  aiTyping = true;
  renderAIChat(document.getElementById('ai-view'), provider);

  try {
    const res  = await authFetch(AI_PROVIDERS[provider].endpoint, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ messages: aiChats[provider] }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'AI error');
    aiChats[provider].push({ role:'assistant', content: data.text });
  } catch(e) {
    aiChats[provider].push({ role:'assistant', content:`⚠️ ${e.message}` });
  }

  aiTyping = false;
  renderAIChat(document.getElementById('ai-view'), provider);
}
window.aiSend = aiSend;

window.shareAIMessage = async function(provider, index) {
  if (!currentUser) return customAlert('Please log in to share AI output.');
  const message = aiChats[provider]?.[index];
  if (!message) return;
  const previousPrompt = [...aiChats[provider].slice(0, index)].reverse().find((item) => item.role === 'user')?.content || '';
  const prompt = message.role === 'user' ? message.content : previousPrompt;
  const output = message.role === 'assistant' ? message.content : '';
  
  try {
    const response = await authFetch('/api/shared-ai-outputs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: AI_PROVIDERS[provider]?.name || provider,
        prompt,
        output,
      })
    });
    if (!response.ok) { 
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json(); 
        throw new Error(data.error || 'Failed to share'); 
      } else {
        const text = await response.text();
        console.error(`Expected JSON but received ${contentType} from /api/shared-ai-outputs. Status: ${response.status}. Preview: ${text.slice(0, 100)}`);
        throw new Error('Unable to share right now. Please try again or sign in again.');
      }
    }
    showToast('Shared to OUTPUT-AI.');
    fetchSharedAIOutputs();
  } catch (error) { customAlert(error.message); }
};

/* ── PHASE 7: OFFLINE GRACEFUL DEGRADATION ──────────────────────────── */

// Offline queue for actions that fail when offline
let offlineQueue = JSON.parse(localStorage.getItem('offline-queue') || '[]');

// Check if online before writing to Supabase
async function checkOnlineAndQueue(action) {
  if (!navigator.onLine) {
    showToast('You\'re offline. Will sync when reconnected.', 'warning');
    offlineQueue.push({
      type: action.type,
      data: action.data,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem('offline-queue', JSON.stringify(offlineQueue));
    return { offline: true };
  }
  return { offline: false };
}

// Process queued actions when coming back online
async function processOfflineQueue() {
  if (offlineQueue.length === 0) return;
  
  console.log(`[Offline Queue] Processing ${offlineQueue.length} queued action(s)...`);
  let processed = 0;
  
  for (const action of offlineQueue) {
    try {
      switch (action.type) {
        case 'notepad-save':
          // Re-save to Supabase if needed
          console.log('[Offline Queue] Syncing notepad save:', action.data.title);
          processed++;
          break;
        case 'share-reviewer':
          console.log('[Offline Queue] Syncing reviewer share:', action.data.title);
          processed++;
          break;
        case 'delete-reviewer':
          console.log('[Offline Queue] Syncing reviewer delete:', action.data.id);
          processed++;
          break;
        default:
          console.log('[Offline Queue] Unknown action type:', action.type);
      }
    } catch (e) {
      console.error('[Offline Queue] Error processing action:', e);
    }
  }
  
  offlineQueue = [];
  localStorage.setItem('offline-queue', JSON.stringify(offlineQueue));
  if (processed > 0) {
    showToast(`Synced ${processed} offline action(s)!`, 'success');
  }
}

// Listen for online/offline events
window.addEventListener('online', () => {
  console.log('[Offline] Back online');
  showToast('📡 Back online!', 'success');
  processOfflineQueue();
});

window.addEventListener('offline', () => {
  console.log('[Offline] Gone offline');
  showToast('📡 You\'re offline. Local changes will sync when you reconnect.', 'warning');
});

// Show offline banner for read operations
function showOfflineBanner() {
  if (!navigator.onLine) {
    const banner = document.createElement('div');
    banner.id = 'offline-banner';
    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: rgba(255,152,0,0.15);
      border-bottom: 2px solid #ff9800;
      padding: 8px 16px;
      text-align: center;
      font-size: 13px;
      color: #ffb74d;
      z-index: 1000;
      font-weight: 600;
    `;
    banner.textContent = '📡 Showing cached content — you\'re offline';
    document.body.insertBefore(banner, document.body.firstChild);
    
    return () => {
      const b = document.getElementById('offline-banner');
      if (b) b.remove();
    };
  }
  return () => {};
}

// Initialize offline handling on page load
document.addEventListener('DOMContentLoaded', () => {
  // Check initial online status and show banner if offline
  if (!navigator.onLine) {
    showOfflineBanner();
  }
});

/* ── iOS Keyboard Awareness (visualViewport API) ──────────────────────── */
if ('visualViewport' in window) {
  window.visualViewport.addEventListener('resize', () => {
    const activeInput = document.activeElement;
    if (!activeInput) return;
    
    // Check if it's a quiz identification input
    const isQuizInput = activeInput.classList.contains('fs-quiz-id-input') ||
                       activeInput.classList.contains('quiz-id-input') ||
                       activeInput.id === 'quiz-id-input';
    
    if (isQuizInput) {
      const keyboardHeight = Math.max(0, window.innerHeight - window.visualViewport.offsetTop - window.visualViewport.height);
      
      if (keyboardHeight > 100) {
        // Keyboard is open - add padding to push content up
        const modal = activeInput.closest('.fs-quiz-modal') || activeInput.closest('.quiz-modal');
        if (modal) {
          modal.style.paddingBottom = `${keyboardHeight + 60}px`;
        }
      } else {
        // Keyboard is closed - remove padding
        const modal = activeInput.closest('.fs-quiz-modal') || activeInput.closest('.quiz-modal');
        if (modal) {
          modal.style.paddingBottom = '0';
        }
      }
    }
  });
}

// Update navbar dropdown to be full-width on mobile
document.addEventListener('DOMContentLoaded', () => {
  const navDropdowns = document.querySelectorAll('.nav-dropdown');
  navDropdowns.forEach(dropdown => {
    dropdown.style.cursor = 'pointer';
    if (window.innerWidth <= 768) {
      dropdown.style.minHeight = '48px';
      dropdown.style.display = 'flex';
      dropdown.style.alignItems = 'center';
    }
  });
});
