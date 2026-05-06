/* ============================================================
   SCRIPT.JS — My School Portfolio (FULL INTEGRATED VERSION)
   ============================================================ */

// Phase 1.6: Global Error Handler — Catch unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('[unhandled-rejection]', event.reason);
  const msg = event.reason?.message || String(event.reason) || 'Unknown error';
  showToast(`Error: ${msg}`, 'error');
  // Don't preventDefault — still log to console for debugging
});

window.addEventListener('error', (event) => {
  console.error('[error]', event.message, event.filename, event.lineno);
  showToast(`Error: ${event.message}`, 'error');
});

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

// Phase 1.1: Token Storage — HttpOnly cookies + localStorage fallback
// Server sets HttpOnly cookie on login. Frontend reads cookie first (secure),
// falls back to localStorage (backwards compat).
function getCookieValue(name) {
  const nameEQ = name + '=';
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    cookie = cookie.trim();
    if (cookie.indexOf(nameEQ) === 0) return cookie.substring(nameEQ.length);
  }
  return '';
}

function setServerAuthToken(token) {
  serverAuthToken = token || '';
  // Store in both localStorage (fallback) and in-memory (cache)
  if (serverAuthToken) localStorage.setItem('classAppToken', serverAuthToken);
  else localStorage.removeItem('classAppToken');
}

function getServerAuthToken() {
  // Priority: 1) HttpOnly cookie (secure), 2) in-memory cache, 3) localStorage (fallback)
  const cookieToken = getCookieValue('classAppToken');
  if (cookieToken) {
    serverAuthToken = cookieToken;
    return cookieToken;
  }
  if (serverAuthToken) return serverAuthToken;
  const storedToken = localStorage.getItem('classAppToken') || '';
  if (storedToken) {
    serverAuthToken = storedToken;
    console.warn('[auth] Using localStorage token — consider logging in again for secure HttpOnly cookie storage');
  }
  return storedToken;
}

function getAuthHeaders(extraHeaders = {}) {
  const headers = new Headers(extraHeaders || {});
  const token = getServerAuthToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return headers;
}

window.getAuthToken = getServerAuthToken;
window.setServerAuthToken = setServerAuthToken; // Phase 3.1: exposed for token refresh
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

// APP_VERSION and APP_CHANGELOG are in features/updates/changelog.js


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
            if (!f?.id || typeof f.name !== 'string') return; // Phase 2.2: skip malformed API data
            const canManage = canManageFolder(f);
            const canEdit = canEditFolder(f);
            const safeId = escapeJS(f.id);
            const safeName = escapeJS(f.name);
            grid.innerHTML += `
            <div class="folder-card-modern">
                <div class="folder-card-main" role="button" tabindex="0" data-folder-open="${safeId}" data-folder-name="${safeName}">
                    <div class="folder-card-icon">📁</div>
                    <div class="folder-card-title" title="${escapeHTML(f.name)}">${escapeHTML(window.formValidation?.truncateDisplay(f.name, 40) ?? f.name)}</div>
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
        const nameErr = window.formValidation?.validateFolderName(name);
        if (nameErr) return customAlert(nameErr);
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
        const nameErr = window.formValidation?.validateFolderName(newName);
        if (nameErr) return customAlert(nameErr);
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
            if (!f?.id || typeof f.name !== 'string') return; // Phase 2.2: skip malformed API data
            const canModifyFile = allowEdit || (currentUser && (f.uploader === currentUser.username || isAdmin));
            const canSummarizeFile = isSummarizableFileName(f.name);
            const safeName = escapeJS(f.name);
            const safeId = escapeJS(f.id);
            const safeUrl = escapeJS(f.url);
            const safeType = escapeJS(f.type || '');
            list.innerHTML += `
            <div class="file-row-modern">
                <div class="file-row-meta">
                    <div class="file-row-name" title="${escapeHTML(f.name)}">📄 ${escapeHTML(window.formValidation?.truncateDisplay(f.name, 55) ?? f.name)}</div>
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
            if (!f?.id || typeof f.name !== 'string') return; // Phase 2.2: skip malformed API data
            const canManage = canManageFolder(f);
            const safeId = escapeJS(f.id);
            const safeName = escapeJS(f.name);
            grid.innerHTML += `
            <div class="folder-card-modern compact">
                <div class="folder-card-main" role="button" tabindex="0" data-folder-open="${safeId}" data-folder-name="${safeName}">
                    <div class="folder-card-icon">📂</div>
                    <div class="folder-card-title" title="${escapeHTML(f.name)}">${escapeHTML(window.formValidation?.truncateDisplay(f.name, 40) ?? f.name)}</div>
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
        const nameErr = window.formValidation?.validateFolderName(name);
        if (nameErr) return customAlert(nameErr);
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
                  <span class="profile-folder-name" title="${escapeHTML(folder.name)}">${escapeHTML(window.formValidation?.truncateDisplay(folder.name, 40) ?? folder.name)}</span>
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
        const nameErr = window.formValidation?.validateFolderName(name);
        if (nameErr) return customAlert(nameErr);
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

// Phase 1.2: Validate Admin Status from Server
// Called on page load + every 60 seconds to ensure admin status is current
let adminValidationPollerID = null;
let lastAdminValidationAt = 0;
const ADMIN_VALIDATION_CACHE_MS = 5 * 60 * 1000; // 5 minutes

async function validateAdminStatus() {
  if (!currentUser?.username) return;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const response = await fetch('/api/session/validate', {
      headers: getAuthHeaders(),
      signal: controller.signal
    });
    clearTimeout(timer);

    if (!response.ok) {
      console.warn('[admin-validation] Server returned', response.status);
      // Don't update isAdmin on error; keep cached value
      return;
    }

    const data = await response.json();
    const wasAdmin = isAdmin;
    isAdmin = Boolean(data.isAdmin);
    lastAdminValidationAt = Date.now();

    // Update currentUser with latest admin status
    if (currentUser) {
      currentUser.isAdmin = isAdmin;
      currentUser._adminValidatedAt = lastAdminValidationAt;
      saveSession();
    }

    // If admin status changed, refresh UI
    if (wasAdmin !== isAdmin) {
      console.log(`[admin-validation] Admin status changed: ${wasAdmin} → ${isAdmin}`);
      renderAppState(); // Re-render to hide/show admin UI
    }
  } catch (error) {
    console.warn('[admin-validation] Failed:', error.message);
    // Keep using cached admin status if validation fails
  }
}

function startAdminValidationPoller() {
  if (adminValidationPollerID) return;
  validateAdminStatus(); // Validate immediately
  adminValidationPollerID = window.setInterval(() => {
    validateAdminStatus();
  }, 60 * 1000); // 60 seconds
}

function stopAdminValidationPoller() {
  if (!adminValidationPollerID) return;
  clearInterval(adminValidationPollerID);
  adminValidationPollerID = null;
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
    startAdminValidationPoller(); // Phase 1.2: Start admin status polling
    window.sessionManager?.init(); // Phase 3: token refresh, idle timeout, multi-tab sync
    establishSession().catch((error) => {
      console.warn('[auth] establishSession (post-login) failed:', error?.message || error);
    });
    logActivity('login');
    recordAppOpen().catch((error) => console.warn('[AppOpen] post-login record failed:', error?.message || error));
    syncSubjectsFromServer().catch(() => {}); // non-blocking — refresh grids with server subjects
  } catch (error) {
    console.error('[auth] finalizeLogin failed:', error);
    stopLastSeenHeartbeat();
    stopAdminValidationPoller(); // Phase 1.2: Stop admin polling on login failure
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
    stopAdminValidationPoller(); // Phase 1.2: Stop admin status polling on logout
    window.sessionManager?.destroy(); // Phase 3: stop token refresh, idle timer, multi-tab sync
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
  const msgErr = window.formValidation?.validateChatMessage(text);
  if (msgErr) return customAlert(msgErr);

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
pageConfig.tetris     = { bg: 'bg-galaxy', particles: 'particles-galaxy', wave: false, mountain: false, aurora: false, label: '🟪 Tetris' };
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

// CODED_BACKGROUND_PRESETS and ANIMATED_BACKGROUND_PRESETS are in features/personalization/background-presets.js


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
  if (currentPage === 'tetris' && typeof tetrisModule !== 'undefined') tetrisModule.destroy();
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

  // Lazy-load game scripts on first visit
  const gameLazyMap = {
    pokemon: { src: 'features/pokemon/pokemon.js?v=4', loaded: '_pokemonLazyLoaded' },
    royale:  { src: 'features/royale/royale.js?v=27',  loaded: '_royaleLazyLoaded' },
    pacman:  { src: 'features/pacman/pacman.js?v=4',   loaded: '_pacmanLazyLoaded' },
    candy:   { src: 'features/candy/candy.js?v=11',    loaded: '_candyLazyLoaded' },
    tetris:  { src: 'features/tetris/tetris.js?v=2',  loaded: '_tetrisLazyLoaded' },
  };
  if (gameLazyMap[pageName] && !window[gameLazyMap[pageName].loaded]) {
    window[gameLazyMap[pageName].loaded] = true;
    const s = document.createElement('script');
    s.src = gameLazyMap[pageName].src;
    // On first visit the module doesn't exist yet when init() runs below,
    // so call init() once the script actually finishes loading.
    s.onload = () => {
      if (currentPage !== pageName) return;
      if (pageName === 'pokemon' && typeof pokemonModule !== 'undefined') runSafeUiAction('Pokemon', () => pokemonModule.init());
      if (pageName === 'royale'  && typeof royaleModule  !== 'undefined') runSafeUiAction('Battle Royale', () => royaleModule.init());
      if (pageName === 'pacman'  && typeof pacmanModule  !== 'undefined') runSafeUiAction('Pac-Man', () => pacmanModule.init());
      if (pageName === 'candy'   && typeof candyModule   !== 'undefined') runSafeUiAction('Candy Match', () => candyModule.init());
      if (pageName === 'tetris'  && typeof tetrisModule  !== 'undefined') runSafeUiAction('Tetris', () => tetrisModule.init());
    };
    document.body.appendChild(s);
  }

  // Hide chat bauble on pages where it blocks controls or the AI input
  const chatBauble = document.getElementById('chat-bauble');
  if (chatBauble) chatBauble.style.display = (pageName === 'personal-tools' || pageName === 'pokemon' || pageName === 'royale' || pageName === 'pacman' || pageName === 'candy' || pageName === 'tetris' || pageName === 'lobby' || pageName === 'ai' || pageName === 'outputai' || pageName === 'codelab' || pageName === 'coding-educational') ? 'none' : '';

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
  if (pageName === 'tetris' && typeof tetrisModule !== 'undefined') runSafeUiAction('Tetris', () => tetrisModule.init());
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
      })
      .catch((error) => {
        console.warn('[sw] registration failed:', error);
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
