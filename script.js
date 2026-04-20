/* ============================================================
   SCRIPT.JS — My School Portfolio (FULL INTEGRATED VERSION)
   ============================================================ */

// 1. SUPABASE CONNECTION INFO
const SUPABASE_URL = 'https://rxpezjhsnqkjydurtayx.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4cGV6amhzbnFranlkdXJ0YXl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMTIwODUsImV4cCI6MjA5MTU4ODA4NX0.wAhjVae3O1vFzGwF_JfXeFJJtB7hv3gTD9T5MHsjhRo';

// Initialize Supabase Client
const { createClient } = window.supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  global: {
    fetch: (url, options = {}) => {
      const headers = new Headers(options.headers || {});
      try {
        const sessionUser = JSON.parse(localStorage.getItem('classAppUser') || 'null');
        if (sessionUser?.username) headers.set('x-class-username', sessionUser.username);
      } catch (_) {}
      return fetch(url, { ...options, headers });
    },
  },
});

// Kept purely so any old files you uploaded to Render can still open without breaking
const SERVER_BASE = 'https://class-app-y67k.onrender.com';

/* ============================================================
   CUSTOM MODALS (Replaces prompt/alert/confirm for PWA support)
   ============================================================ */
window.customAlert = function(text) {
    const alertBox = document.getElementById('alert-text');
    if (alertBox) alertBox.innerText = text;
    const modal = document.getElementById('custom-alert-modal');
    if (modal) modal.style.display = 'flex';
};

window.customPrompt = function(title, callback, defaultValue = '') {
    const modal = document.getElementById('custom-prompt-modal');
    const inputEl = document.getElementById('prompt-input');
    const titleEl = document.getElementById('prompt-title');
    const submitBtn = document.getElementById('prompt-submit');
    
    if (titleEl) titleEl.innerText = title;
    if (inputEl) inputEl.value = defaultValue;
    if (modal) modal.style.display = 'flex';
    if (inputEl) inputEl.focus();

    if (submitBtn) {
        submitBtn.onclick = function() {
            modal.style.display = 'none';
            callback(inputEl.value.trim());
        };
    }
};

window.customConfirm = function(text, callback) {
    const confirmBox = document.getElementById('confirm-text');
    if (confirmBox) confirmBox.innerText = text;
    const modal = document.getElementById('custom-confirm-modal');
    if (modal) modal.style.display = 'flex';
    
    const yesBtn = document.getElementById('confirm-yes');
    if (yesBtn) {
        yesBtn.onclick = function() {
            modal.style.display = 'none';
            callback();
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

const eventCount  = 15;
const randomCount = 10;
 
/* ============================================================
   BUILD SUBJECT CARDS (Opens Folders)
   ============================================================ */
function buildSubjectCards(gridId, subjects) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  grid.innerHTML = '';

  if (subjects.length === 0) {
    grid.innerHTML = '<p style="color:rgba(255,255,255,0.35);text-align:center;width:100%;margin-top:40px;font-size:13px;letter-spacing:1px;">No subjects added yet — they will appear here once added.</p>';
    return;
  }

  subjects.forEach((subject) => {
    const card = document.createElement('div');
    card.className = 'subject-card';
    card.style.cursor = 'pointer';
    card.onclick = () => window.openFolderExplorer(subject.code);
 
    card.innerHTML = `
      <span class="card-icon">${subject.icon}</span>
      <div class="card-subject">${subject.code}</div>
      <div class="card-teacher">${subject.teacher || 'No teacher assigned'}</div>
      <div class="card-view-label">
        View Folders 📂
      </div>
    `;
    grid.appendChild(card);
  });
}

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

function normalizeFolderPermissions(folder) {
    const raw = folder?.permissions;
    if (!raw) return { viewers: [], editors: [] };
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw);
            return {
                viewers: Array.isArray(parsed.viewers) ? parsed.viewers : [],
                editors: Array.isArray(parsed.editors) ? parsed.editors : [],
            };
        } catch (_) {
            return { viewers: [], editors: [] };
        }
    }
    return {
        viewers: Array.isArray(raw.viewers) ? raw.viewers : [],
        editors: Array.isArray(raw.editors) ? raw.editors : [],
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
    return perms.viewers.includes(currentUser.username) || perms.editors.includes(currentUser.username);
}

function canEditFolder(folder) {
    if (!folder) return false;
    if (!isProfileFolder(folder)) return Boolean(currentUser);
    if (isFolderOwner(folder)) return true;
    if (!currentUser) return false;
    return normalizeFolderPermissions(folder).editors.includes(currentUser.username);
}

function canManageFolder(folder) {
    return isFolderOwner(folder);
}

function folderAccessLabel(folder) {
    if (isFolderOwner(folder)) return 'Owner';
    if (!isProfileFolder(folder)) return currentUser ? 'Editor' : 'Viewer';
    const perms = normalizeFolderPermissions(folder);
    if (currentUser && perms.editors.includes(currentUser.username)) return 'Editor';
    if (currentUser && perms.viewers.includes(currentUser.username)) return 'Viewer';
    return 'No access';
}

async function fetchFolderById(id) {
    const { data, error } = await sb.from('folders').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
}

window.closeFolderModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if(modal) modal.style.display = 'none';
};

window.openFolderModalObj = function(modalId) {
    const modal = document.getElementById(modalId);
    if(modal) modal.style.display = 'flex';
};

window.openFolderExplorer = function(parentName) {
    currentParentContext = parentName;
    folderStack = []; // reset navigation stack
    const title = document.getElementById('folder-explorer-title');
    if (title) title.innerText = `${parentName} Folders`;
    fetchAndRenderFolders();
    openFolderModalObj('folder-explorer-modal');
};

function fetchAndRenderFolders() {
    sb.from('folders').select('*').eq('parent', currentParentContext)
    .then(({ data: folders, error }) => {
        if (error) return console.error("Folder fetch error:", error);
        
        const grid = document.getElementById('folder-grid-modal');
        if(!grid) return;
        grid.innerHTML = '';
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
                <div onclick="window.openFileExplorer('${safeId}', '${safeName}')" class="folder-card-main">
                    <div class="folder-card-icon">📁</div>
                    <div class="folder-card-title">${escapeHTML(f.name)}</div>
                    <div class="folder-card-owner">Owned by ${escapeHTML(f.owner || 'Unknown')}</div>
                    <div class="folder-access-pill ${canEdit ? 'editor' : 'viewer'}">${folderAccessLabel(f)}</div>
                </div>
                ${canManage ? `
                <div class="folder-card-actions">
                    <button onclick="window.renameFolderAPI('${safeId}', '${safeName}')" class="mini-action-btn">Rename</button>
                    <button onclick="window.openFolderPermissions('${safeId}')" class="mini-action-btn">Permissions</button>
                    <button onclick="window.deleteFolderAPI('${safeId}')" class="mini-action-btn danger">Delete</button>
                </div>
                ` : ''}
            </div>
            `;
        });
    });
}

window.createFolderAPI = function() {
    if(!currentUser) return customAlert("Please log in to create a folder.");
    customPrompt("Enter new folder name:", function(name) {
        if(!name) return;
        sb.from('folders').insert([{ parent: currentParentContext, name: name, owner: currentUser.username, permissions: { viewers: [], editors: [] } }])
        .then(({ error }) => {
            if (error) return customAlert(error.message);
            fetchAndRenderFolders();
            showToast('Folder created.');
        });
    });
};

window.renameFolderAPI = async function(id, oldName, isSub) {
    let folder;
    try { folder = await fetchFolderById(id); } catch (error) { return customAlert(error.message); }
    if (!canManageFolder(folder)) return customAlert('Only the folder owner can rename this folder.');
    customPrompt("Enter new name for folder:", function(newName) {
        if(!newName || newName === oldName) return;
        sb.from('folders').update({ name: newName }).eq('id', id)
        .then(({ error }) => {
            if (error) return customAlert(error.message);
            isSub ? fetchAndRenderSubFolders() : fetchAndRenderFolders();
            if (String(folder.parent || '').startsWith(PROFILE_FOLDER_PREFIX)) {
                renderProfileFolders(folder.parent.replace(PROFILE_FOLDER_PREFIX, ''));
            }
            showToast('Folder renamed.');
        });
    }, oldName);
};

window.deleteFolderAPI = async function(id) {
    let folder;
    try { folder = await fetchFolderById(id); } catch (error) { return customAlert(error.message); }
    if (!canManageFolder(folder)) return customAlert('Only the folder owner can delete this folder.');
    customConfirm("Are you sure? This will delete the folder AND all files inside it forever.", function() {
        sb.from('folders').delete().eq('id', id)
        .then(({ error }) => {
            if (error) return customAlert(error.message);
            fetchAndRenderFolders();
            if (String(folder.parent || '').startsWith(PROFILE_FOLDER_PREFIX)) {
                renderProfileFolders(folder.parent.replace(PROFILE_FOLDER_PREFIX, ''));
            }
            showToast('Folder deleted.', 'warning');
        });
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

function fetchAndRenderFiles() {
    if (!currentFolderContext || !canViewFolder(currentFolderContext)) {
        const list = document.getElementById('file-list-container');
        if (list) list.innerHTML = '<p class="empty-state-text">You do not have permission to view files here.</p>';
        return;
    }
    const allowEdit = canEditFolder(currentFolderContext);
    const uploadArea = document.querySelector('#file-explorer-modal .file-upload-area');
    if (uploadArea) uploadArea.style.display = allowEdit ? '' : 'none';
    sb.from('files').select('*').eq('folder_id', currentFolderContext.id)
    .then(({ data: files, error }) => {
        if (error) return console.error(error);
        
        currentPlaylist = (files || []).filter(f => f.name.toLowerCase().endsWith('.mp3') || f.name.toLowerCase().endsWith('.wav'));
        
        const list = document.getElementById('file-list-container');
        if(!list) return;
        list.innerHTML = '';
        if(!files || files.length === 0) {
            list.innerHTML = '<p class="empty-state-text">Folder is empty.</p>';
            return;
        }
        files.forEach(f => {
            const canModifyFile = allowEdit || (currentUser && (f.uploader === currentUser.username || isAdmin));
            const safeName = escapeJS(f.name);
            const safeId = escapeJS(f.id);
            const safeUrl = escapeJS(f.url);
            list.innerHTML += `
            <div class="file-row-modern">
                <div class="file-row-meta">
                    <div class="file-row-name">📄 ${escapeHTML(f.name)}</div>
                    <div class="file-row-sub">${f.size ? `<span>${formatFileSize(f.size)}</span> · ` : ''}Uploaded by ${escapeHTML(f.uploader || 'Unknown')}</div>
                </div>
                <div class="file-row-actions">
                    <button onclick="window.playOrOpenFileAPI('${safeUrl}', '${safeName}')" class="file-action primary">Open</button>
                    ${canModifyFile ? `<button onclick="window.openMoveFileModal('${safeId}', '${escapeJS(currentFolderContext.id)}', 'folder')" class="file-action">Move</button>` : ''}
                    ${canModifyFile ? `<button onclick="window.deleteFileAPI('${safeId}')" class="file-action danger">Delete</button>` : ''}
                </div>
            </div>
            `;
        });
    });
}

/* ── Sub-folder support ── */
function fetchAndRenderSubFolders() {
    if (!currentFolderContext || !currentFolderContext.id) return;
    const parentId = String(currentFolderContext.id);
    const subfolderSection = document.getElementById('subfolder-section');
    if (subfolderSection) subfolderSection.classList.toggle('read-only-folder', !canEditFolder(currentFolderContext));
    sb.from('folders').select('*').eq('parent', parentId)
    .then(({ data: subs, error }) => {
        if (error) return console.error('Subfolder fetch error:', error);
        const grid = document.getElementById('subfolder-grid-modal');
        if (!grid) return;
        grid.innerHTML = '';
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
                <div onclick="window.openFileExplorer('${safeId}','${safeName}','${escapeJS(parentId)}')" class="folder-card-main">
                    <div class="folder-card-icon">📂</div>
                    <div class="folder-card-title">${escapeHTML(f.name)}</div>
                    <div class="folder-card-owner">Owned by ${escapeHTML(f.owner || 'Unknown')}</div>
                    <div class="folder-access-pill ${canEditFolder(f) ? 'editor' : 'viewer'}">${folderAccessLabel(f)}</div>
                </div>
                ${canManage ? `
                <div class="folder-card-actions">
                    <button onclick="window.renameFolderAPI('${safeId}','${safeName}',true)" class="mini-action-btn">Rename</button>
                    <button onclick="window.openFolderPermissions('${safeId}')" class="mini-action-btn">Permissions</button>
                    <button onclick="window.deleteSubFolderAPI('${safeId}')" class="mini-action-btn danger">Delete</button>
                </div>` : ''}
            </div>`;
        });
    });
}

window.createSubFolderAPI = function() {
    if (!currentUser) return customAlert("Please log in to create a sub-folder.");
    if (!currentFolderContext || !currentFolderContext.id) return customAlert("No folder selected.");
    if (!canEditFolder(currentFolderContext)) return customAlert('You do not have permission to add sub-folders here.');
    customPrompt("Enter sub-folder name:", function(name) {
        if (!name) return;
        sb.from('folders').insert([{
            parent: String(currentFolderContext.id),
            name,
            owner: currentUser.username,
            permissions: { viewers: [], editors: [] },
            folder_type: isProfileFolder(currentFolderContext) ? 'profile' : null,
        }])
        .then(({ error }) => {
            if (error) return customAlert(error.message);
            fetchAndRenderSubFolders();
            showToast('Sub-folder created.');
        });
    });
};

window.deleteSubFolderAPI = async function(id) {
    let folder;
    try { folder = await fetchFolderById(id); } catch (error) { return customAlert(error.message); }
    if (!canManageFolder(folder)) return customAlert('Only the folder owner can delete this sub-folder.');
    customConfirm("Delete this sub-folder and all files inside it?", function() {
        sb.from('folders').delete().eq('id', id)
        .then(({ error }) => {
            if (error) return customAlert(error.message);
            fetchAndRenderSubFolders();
            showToast('Sub-folder deleted.', 'warning');
        });
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
          const r = await fetch('/api/upload', { method: 'POST', body: fd });
          if (!r.ok) throw new Error(`R2: ${(await r.json()).error || r.status}`);
          const rData = await r.json();
          fileUrl = rData.url;
          fileSize = rData.size;
        } else {
          // Docs / PDFs / other → Supabase Storage
          const filePath = `uploads/${Date.now()}_${Math.random().toString(36).slice(2,8)}_${safeName}`;
          const { error: storErr } = await sb.storage
              .from('portfolio-assets')
              .upload(filePath, file, { contentType: file.type });
          if (storErr) throw new Error(`Storage: ${storErr.message}`);
          fileUrl = sb.storage.from('portfolio-assets').getPublicUrl(filePath).data.publicUrl;
          fileSize = file.size;
        }

        const { error: dbErr } = await sb.from('files').insert([{
            folder_id: folderId,
            name: file.name,
            url: fileUrl,
            type: file.type,
            uploader: currentUser.username,
            size: fileSize
        }]);
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

window.deleteFileAPI = function(fileId) {
    if (!currentFolderContext || !canEditFolder(currentFolderContext)) return customAlert('You do not have permission to delete files here.');
    customConfirm("Delete this file?", function() {
        sb.from('files').delete().eq('id', fileId)
        .then(({ error }) => {
            if (error) return customAlert(error.message);
            fetchAndRenderFiles();
            showToast('File deleted.', 'warning');
        });
    });
};

async function getAllFolders() {
    const { data, error } = await sb.from('folders').select('*').order('name', { ascending: true });
    if (error) throw error;
    return data || [];
}

function removeDynamicModal(id) {
    const existing = document.getElementById(id);
    if (existing) existing.remove();
}

window.openFolderPermissions = async function(folderId) {
    if (!currentUser) return customAlert('Please log in.');
    let folder;
    try { folder = await fetchFolderById(folderId); } catch (error) { return customAlert(error.message); }
    if (!canManageFolder(folder)) return customAlert('Only the folder owner can manage permissions.');

    const perms = normalizeFolderPermissions(folder);
    removeDynamicModal('folder-permission-modal');
    const people = users.filter((user) => user.username !== folder.owner);
    const rows = people.map((user) => {
        const role = perms.editors.includes(user.username) ? 'edit' : perms.viewers.includes(user.username) ? 'view' : 'none';
        return `
          <label class="permission-user-row">
            <span>
              <strong>${escapeHTML(user.display_name || user.username)}</strong>
              <small>@${escapeHTML(user.username)}</small>
            </span>
            <select data-permission-user="${escapeHTML(user.username)}">
              <option value="none"${role === 'none' ? ' selected' : ''}>No access</option>
              <option value="view"${role === 'view' ? ' selected' : ''}>Can view</option>
              <option value="edit"${role === 'edit' ? ' selected' : ''}>Can edit</option>
            </select>
          </label>`;
    }).join('') || '<p class="empty-state-text small">No other users found.</p>';

    document.body.insertAdjacentHTML('beforeend', `
      <div id="folder-permission-modal" class="custom-modal-overlay blur-bg high-z" style="display:flex;">
        <div class="custom-modal-box permission-modal-box">
          <button class="modal-close-btn" onclick="removeDynamicModal('folder-permission-modal')">&times;</button>
          <h3 class="modal-title text-blue">Folder Permissions</h3>
          <p class="modal-text align-left">Owner: ${escapeHTML(folder.owner)} · Folder: ${escapeHTML(folder.name)}</p>
          <div class="permission-list">${rows}</div>
          <div class="modal-btn-group">
            <button class="btn-primary flex-1" onclick="saveFolderPermissions('${escapeJS(folder.id)}')">Save Permissions</button>
            <button class="btn-outline-red flex-1" onclick="removeDynamicModal('folder-permission-modal')">Cancel</button>
          </div>
        </div>
      </div>
    `);
};

window.saveFolderPermissions = async function(folderId) {
    let folder;
    try { folder = await fetchFolderById(folderId); } catch (error) { return customAlert(error.message); }
    if (!canManageFolder(folder)) return customAlert('Only the folder owner can manage permissions.');
    const viewers = [];
    const editors = [];
    document.querySelectorAll('#folder-permission-modal [data-permission-user]').forEach((select) => {
        const username = select.dataset.permissionUser;
        if (select.value === 'view') viewers.push(username);
        if (select.value === 'edit') editors.push(username);
    });
    const { error } = await sb.from('folders').update({ permissions: { viewers, editors } }).eq('id', folderId);
    if (error) return customAlert(error.message);
    removeDynamicModal('folder-permission-modal');
    showToast('Permissions updated.');
    if (currentFolderContext?.id === folderId) currentFolderContext = { ...currentFolderContext, permissions: { viewers, editors } };
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
        const { error } = await sb.from('folders').insert([{
            parent: `${PROFILE_FOLDER_PREFIX}${username}`,
            name,
            owner: username,
            permissions: { viewers: [], editors: [] },
            folder_type: 'profile',
        }]);
        if (error) return customAlert(error.message);
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

window.openMoveFileModal = async function(fileId, currentFolderId, refreshMode = 'folder') {
    if (!currentUser) return customAlert('Please log in.');
    let folders;
    try { folders = await getAllFolders(); } catch (error) { return customAlert(error.message); }
    const folderMap = new Map(folders.map((folder) => [String(folder.id), folder]));
    const source = folderMap.get(String(currentFolderId));
    if (!canEditFolder(source)) return customAlert('You do not have permission to move files from this folder.');
    const targets = folders.filter((folder) => String(folder.id) !== String(currentFolderId) && canEditFolder(folder));
    removeDynamicModal('move-file-modal');
    const cards = targets.map((folder) => `
      <button class="move-target-card" onclick="moveFileToFolder('${escapeJS(fileId)}','${escapeJS(folder.id)}','${escapeJS(refreshMode)}')">
        <span class="move-target-icon">📁</span>
        <span class="move-target-title">${escapeHTML(folder.name)}</span>
        <span class="move-target-path">${escapeHTML(buildFolderPath(folder, folderMap))}</span>
      </button>`).join('') || '<p class="empty-state-text small">No editable destination folders found.</p>';
    document.body.insertAdjacentHTML('beforeend', `
      <div id="move-file-modal" class="custom-modal-overlay blur-bg high-z" style="display:flex;">
        <div class="custom-modal-box move-modal-box">
          <button class="modal-close-btn" onclick="removeDynamicModal('move-file-modal')">&times;</button>
          <h3 class="modal-title text-green">Move File</h3>
          <p class="modal-text align-left">Choose a destination folder where you have editor access.</p>
          <div class="move-target-grid">${cards}</div>
        </div>
      </div>`);
};

window.moveFileToFolder = async function(fileId, targetFolderId, refreshMode = 'folder') {
    let target;
    try { target = await fetchFolderById(targetFolderId); } catch (error) { return customAlert(error.message); }
    if (!canEditFolder(target)) return customAlert('You do not have permission to move files to that folder.');
    const { error } = await sb.from('files').update({ folder_id: targetFolderId, moved_at: new Date().toISOString() }).eq('id', fileId);
    if (error) return customAlert(error.message);
    removeDynamicModal('move-file-modal');
    showToast('File moved.');
    if (refreshMode === 'gallery-ep') renderGallery('ep');
    else if (refreshMode === 'gallery-rp') renderGallery('rp');
    else fetchAndRenderFiles();
};

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

function loadYouTubeIframe(videoId, title) {
    const iframe = document.getElementById('yt-iframe');
    const placeholder = document.getElementById('yt-placeholder');
    if (!iframe) return;
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    iframe.classList.remove('hidden');
    if (placeholder) placeholder.style.display = 'none';
    ytActive = true;
    const miniLabel = document.getElementById('yt-mini-label');
    if (miniLabel) miniLabel.textContent = title || 'YouTube Playing';
    // Hide results list once a track is chosen
    const res = document.getElementById('yt-results');
    if (res) res.classList.add('hidden');
}

function extractYouTubeId(val) {
    const match = val.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/);
    if (match) return match[1];
    if (/^[a-zA-Z0-9_-]{11}$/.test(val.trim())) return val.trim();
    return null;
}

// Fetch a server API endpoint, retrying on 503 (Render cold start) until deadline
async function serverFetch(url, onWaking) {
    const deadline = Date.now() + 90000; // 90s total — Render can take up to ~70s to wake
    let firstAttempt = true;
    while (Date.now() < deadline) {
        try {
            const remaining = deadline - Date.now();
            const ctrl = new AbortController();
            // First attempt: stay open 65s so Render's cold-start connection completes.
            // Retries: 20s each (server is already awake by then).
            const attemptTimeout = firstAttempt ? Math.min(65000, remaining) : Math.min(20000, remaining);
            const tid = setTimeout(() => ctrl.abort(), attemptTimeout);
            const r = await fetch(url, { signal: ctrl.signal });
            clearTimeout(tid);
            if (r.status === 503 || r.status === 502) {
                if (firstAttempt && onWaking) { onWaking(); firstAttempt = false; }
                await new Promise(res => setTimeout(res, 5000));
                continue;
            }
            // Render sometimes returns a 200 HTML "starting up" page during cold start.
            const ct = r.headers.get('content-type') || '';
            if (ct.includes('text/html')) {
                if (firstAttempt && onWaking) { onWaking(); firstAttempt = false; }
                await new Promise(res => setTimeout(res, 5000));
                continue;
            }
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
    const iframe = document.getElementById('yt-iframe');
    const placeholder = document.getElementById('yt-placeholder');
    if (iframe) { iframe.src = ''; iframe.classList.add('hidden'); }
    if (placeholder) placeholder.style.display = '';
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

window.playOrOpenFileAPI = function(url, name, skipIndexUpdate = false) {
    const fullUrl = url.startsWith('http') ? url : SERVER_BASE + url; 
    const player = document.getElementById('audio-player');
    
    if (name.toLowerCase().endsWith('.mp3') || name.toLowerCase().endsWith('.wav')) {
        if (!skipIndexUpdate) {
            if (currentPlaylist.length > 0) {
                currentTrackIndex = currentPlaylist.findIndex(f => f.url === url);
                if (currentTrackIndex === -1) currentTrackIndex = currentPlaylist.findIndex(f => f.name === name);
            }
            // If still not found, seed a single-item playlist so loop still triggers
            if (currentPlaylist.length === 0 || currentTrackIndex === -1) {
                currentPlaylist = [{ url, name }];
                currentTrackIndex = 0;
            }
        }
        
        if(player) {
            player.src = fullUrl;
            player.loop = isRepeat;
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
            else { currentTrackIndex = -1; return; }
        }
    }
    const nextSong = currentPlaylist[currentTrackIndex];
    playOrOpenFileAPI(nextSong.url, nextSong.name, true);
};

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
                <div class="music-search-item-name">${f.name}</div>
                <div class="music-search-item-meta">📂 ${folderPath} · by ${f.uploader}</div>
              </div>
              ${isAudio ? `<button onclick="window.playOrOpenFileAPI('${safeUrl}','${safeName}')" style="background:#00ff88;color:#000;border:none;padding:7px 14px;border-radius:8px;font-weight:700;cursor:pointer;font-size:12px;white-space:nowrap;">▶ Play</button>` : `<a href="${f.url}" target="_blank" style="background:#00d4ff;color:#000;border:none;padding:7px 14px;border-radius:8px;font-weight:700;cursor:pointer;font-size:12px;white-space:nowrap;text-decoration:none;">Open</a>`}
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
    const player = document.getElementById('audio-player');
    if(btn) {
        btn.innerText = `🔂 Repeat 1: ${isRepeat ? 'ON' : 'OFF'}`;
        btn.classList.toggle('neon-active', isRepeat);
        btn.style.color = isRepeat ? 'var(--neon-green)' : 'white';
    }
    if(player) player.loop = isRepeat;
};

/* ============================================================
   AUTH & USER MANAGEMENT
   ============================================================ */
let users = [];
let currentUser = JSON.parse(localStorage.getItem('classAppUser')) || null;
let isAdmin = currentUser?.username === 'Marquillero';

function saveSession() {
  if (currentUser) { localStorage.setItem('classAppUser', JSON.stringify(currentUser)); } 
  else { localStorage.removeItem('classAppUser'); }
}

window.login = async function() {
  const username = document.getElementById('username').value.trim();
  if (!username) return customAlert('Enter username');
  
  const errBox = document.getElementById('errorMessage');
  if (errBox) errBox.style.display = 'none';

  const { data: profile, error } = await sb.from('profiles').select('*').eq('username', username).single();
  if (error || !profile) {
      if (errBox) {
          errBox.innerText = "User not found. Please register.";
          errBox.style.display = 'block';
      }
      return;
  }
  
  currentUser = profile;
  isAdmin = (profile.username === 'Marquillero');
  saveSession();
  await sb.from('profiles').update({ online: true }).eq('username', currentUser.username);
  establishSession();
};

window.register = async function() {
  const username = document.getElementById('username').value.trim();
  if (!username) return customAlert('Enter username');
  const formatError = validateUsernameFormat(username);
  if (formatError) return customAlert(formatError);
  
  const errBox = document.getElementById('errorMessage');
  if (errBox) errBox.style.display = 'none';

  const { error } = await sb.from('profiles').insert([{ username: username, display_name: username, online: true }]);
  if (error) {
      if (errBox) {
          errBox.innerText = "Username taken or Error occurred.";
          errBox.style.display = 'block';
      }
  } else {
      window.login();
  }
};

window.handleLogout = async function() {
    if(currentUser) {
        await sb.from('profiles').update({ online: false }).eq('username', currentUser.username);
    }
    currentUser = null;
    saveSession();
    location.reload();
};

function establishSession() {
  const authModal = document.getElementById('auth-modal');
  if(authModal) authModal.style.display = 'none';
  const navLogout = document.getElementById('nav-logout');
  if(navLogout) navLogout.style.display = 'flex';

  fetchUsers();
  updateChatHeader();
  initSupabaseRealtimeChat();
  initSharedRealtime();
  ensureAdminUpdateControl();
  fetchAppUpdates();
  registerPushSubscription(false);
  fetchMessages(currentChat.type, currentChat.target);
  handleNotificationDeepLink();
}

function fetchUsers() {
  sb.from('profiles').select('*')
    .then(({data}) => {
      users = data || [];
      renderUserDirectory();
      renderChatUsersList();
    }).catch((err) => console.warn(err.message));
}

function renderUserDirectory() {
  const grid = document.getElementById('user-grid');
  if (!grid) return;
  grid.innerHTML = '';
  users.forEach((user) => {
    const card = document.createElement('div');
    card.className = 'user-card';
    const safeUsername = escapeJS(user.username);
    card.innerHTML = `
      <div class="user-card-top">
        <div>
          <div class="user-name">${escapeHTML(user.display_name || user.username)}</div>
          <div class="user-status ${user.online ? 'online' : 'offline'}">${user.online ? 'Online' : 'Offline'}</div>
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
      item.innerHTML = `
        <div>
          <div class="chat-user-name">${escapeHTML(user.display_name || user.username)}</div>
          <div class="chat-status ${user.online ? 'online' : 'offline'}">${user.online ? 'Online' : 'Offline'}</div>
        </div>
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
  let html = `
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
  if (isAdmin && !isMine) html += `<button class="btn-outline-red flex-1" onclick="deleteUserAPI('${safeUsername}')">Delete User</button>`;
  html += `</div><div id="profile-folders-container" class="profile-folders-container"></div>`;
  details.innerHTML = html;
  profilePanel.classList.add('active');
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
  
  details.innerHTML = `
    <h2 class="modal-title text-blue" style="margin-bottom: 15px;">Edit Profile</h2>
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

async function replaceUsernameReferences(oldUsername, newUsername) {
  await sb.from('folders').update({ owner: newUsername }).eq('owner', oldUsername);
  await sb.from('files').update({ uploader: newUsername }).eq('uploader', oldUsername);
  await sb.from('messages').update({ sender: newUsername }).eq('sender', oldUsername);
  await sb.from('messages').update({ target: newUsername }).eq('target', oldUsername);
  await sb.from('calendar_notes').update({ updated_by: newUsername }).eq('updated_by', oldUsername);
  await sb.from('shared_ai_outputs').update({ sharer: newUsername }).eq('sharer', oldUsername);
  await sb.from('shared_announcements').update({ sharer: newUsername }).eq('sharer', oldUsername);

  const { data: permissionFolders } = await sb.from('folders').select('id,permissions');
  for (const folder of permissionFolders || []) {
    const permissions = normalizeFolderPermissions(folder);
    const viewers = permissions.viewers.map((name) => name === oldUsername ? newUsername : name);
    const editors = permissions.editors.map((name) => name === oldUsername ? newUsername : name);
    if (JSON.stringify(viewers) !== JSON.stringify(permissions.viewers) || JSON.stringify(editors) !== JSON.stringify(permissions.editors)) {
      await sb.from('folders').update({ permissions: { viewers, editors } }).eq('id', folder.id);
    }
  }
}

window.saveProfileEdits = async function(username) {
  const newUsername = document.getElementById('profile-username')?.value.trim() || username;
  const profile = users.find((user) => user.username === username) || currentUser;
  const usernameChanged = newUsername.toLowerCase() !== username.toLowerCase();
  if (usernameChanged) {
    const formatError = validateUsernameFormat(newUsername);
    if (formatError) return customAlert(formatError);
    const lastChange = profile?.username_last_changed_at ? new Date(profile.username_last_changed_at) : null;
    const nextChange = lastChange ? new Date(lastChange.getTime() + 3 * 24 * 60 * 60 * 1000) : null;
    if (nextChange && Date.now() < nextChange.getTime()) {
      return customAlert(`You can change your username again in ${formatRemainingTime(nextChange.getTime() - Date.now())}.`);
    }
    const { data: existing } = await sb.from('profiles').select('username').ilike('username', newUsername).limit(1);
    if (existing && existing.length) return customAlert('That username is already taken.');
  }

  const payload = {
    username: newUsername,
    display_name: document.getElementById('profile-displayName').value.trim(),
    birthday: document.getElementById('profile-birthday').value.trim(),
    address: document.getElementById('profile-address').value.trim(),
    github: document.getElementById('profile-github').value.trim(),
    email: document.getElementById('profile-email').value.trim(),
    note: document.getElementById('profile-note').value.trim(),
  };
  if (usernameChanged) payload.username_last_changed_at = new Date().toISOString();
  
  const { data, error } = await sb.from('profiles').update(payload).eq('username', username).select('*').single();
  if (error) return customAlert(error.message);
  if (usernameChanged) await replaceUsernameReferences(username, newUsername);
  currentUser = data;
  isAdmin = (currentUser.username === 'Marquillero');
  saveSession();
  users = users.map((user) => user.username === username ? data : user);
  fetchUsers();
  showToast('Profile updated.');
  openUserProfile(currentUser.username);
};

/* ============================================================
   SUPABASE SERVERLESS CHAT ENGINE
   ============================================================ */
let chatHistory = { group: [], todo: [], private: {} };
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
  fetchMessages(type, target);
  if (currentPage !== 'chat') window.goToPage('chat');
};

function initSupabaseRealtimeChat() {
    if (realtimeSubscription) return;
    realtimeSubscription = sb.channel('public:messages')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, payload => {
            if (payload.eventType === 'INSERT') {
                const m = payload.new;
                const formattedMsg = {
                    id: m.id, sender: m.sender, text: m.text, attachment: m.attachment,
                    time: new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                };
                if (m.sender !== currentUser.username) {
                    const sound = document.getElementById('notif-sound');
                    if (sound) sound.play().catch(e => console.log('Audio blocked'));
                    if (currentPage !== 'chat' || (currentChat.type === 'private' && m.chat_type === 'private' && currentChat.target !== m.sender)) {
                        const dot = document.getElementById('chat-notif-dot');
                        if (dot) dot.classList.remove('hidden');
                    }
                }
                if (m.chat_type === 'private') {
                    const otherUser = m.sender === currentUser.username ? m.target : m.sender;
                    const key = getPrivateKey(currentUser.username, otherUser);
                    if(!chatHistory.private[key]) chatHistory.private[key] = [];
                    chatHistory.private[key].push(formattedMsg);
                    if (currentChat.type === 'private' && currentChat.target === otherUser) renderMessages();
                } else {
                    if(!chatHistory[m.chat_type]) chatHistory[m.chat_type] = [];
                    chatHistory[m.chat_type].push(formattedMsg);
                    if (currentChat.type === m.chat_type) renderMessages();
                }
            } 
            if (payload.eventType === 'DELETE' || payload.eventType === 'UPDATE') fetchMessages(currentChat.type, currentChat.target);
        }).subscribe();
        
    sb.channel('public:calendar_notes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_notes' }, payload => { fetchCalendarNotes(); }).subscribe();
}

async function fetchMessages(chatType, target = null) {
  if (!chatType) return;
  let query = sb.from('messages').select('*');
  if (chatType === 'private') query = query.eq('chat_type', 'private').or(`and(sender.eq.${currentUser.username},target.eq.${target}),and(sender.eq.${target},target.eq.${currentUser.username})`);
  else query = query.eq('chat_type', chatType);

  const { data: messages, error } = await query.order('created_at', { ascending: true });
  if (error) return console.warn(error);

  const formattedMessages = messages.map(m => ({
      id: m.id, sender: m.sender, text: m.text, attachment: m.attachment,
      time: new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
  }));

  if (chatType === 'private') { const key = getPrivateKey(currentUser.username, target); chatHistory.private[key] = formattedMessages; }
  else chatHistory[chatType] = formattedMessages;
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
    senderLine.innerHTML = `<span class="chat-sender">${message.sender}</span><span class="chat-time">${message.time}</span>${message.edited ? '<span class="chat-edited">(edited)</span>' : ''}`;
    msgDiv.appendChild(senderLine);
    const textLine = document.createElement('div');
    textLine.className = 'chat-text'; textLine.textContent = message.text;
    msgDiv.appendChild(textLine);
    
    if (message.attachment) {
      const attach = document.createElement('div'); attach.className = 'chat-attachment';
      const info = document.createElement('div'); info.textContent = `Attachment: ${message.attachment.name}`; attach.appendChild(info);
      const fullUrl = message.attachment.url.startsWith('http') ? message.attachment.url : SERVER_BASE + message.attachment.url;
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
    msgDiv.appendChild(actions); container.appendChild(msgDiv);
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
  const { data: savedMessage, error: sendError } = await sb.from('messages')
    .insert([{ chat_type: currentChat.type, target: currentChat.type === 'private' ? currentChat.target : null, sender: currentUser.username, text: text, attachment: attachmentData }])
    .select('*')
    .single();
  if (sendError) return customAlert(sendError.message);
  if (currentChat.type === 'private' && currentChat.target && savedMessage?.id) {
    notifyPrivateMessagePush(savedMessage).catch((error) => console.warn('Push trigger failed:', error.message));
  }
  input.value = ''; attachmentInput.value = '';
  const lbl = document.getElementById('attachment-selected'); if(lbl) lbl.textContent = 'No file chosen';
};

window.editChatMessage = function(id) {
  const message = getCurrentHistory().find(m => m.id === id);
  if (!message) return;
  customPrompt('Edit:', async function(updated) { if (updated !== null) await sb.from('messages').update({ text: updated }).eq('id', id); }, message.text);
};

window.deleteMessageForEveryone = async function(id) { customConfirm("Delete message?", async function() { await sb.from('messages').delete().eq('id', id); }); };

/* ============================================================
   UI & DROPDOWN NAVIGATION LOGIC
   ============================================================ */

window.toggleYear = function(yearId) {
    const group = document.querySelector(`.nav-dropdown-group.${yearId.replace('year', 'year-')}-theme`);
    if (!group) return;
    const wasOpen = group.classList.contains('open');
    document.querySelectorAll('.nav-dropdown-group').forEach(g => g.classList.remove('open'));
    if (!wasOpen) group.classList.add('open');
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

let currentPage = 'first';
let customPageBgs = JSON.parse(localStorage.getItem('customPageBgs')) || {};
let calendarNotes = {};

window.goToPage = function(pageName) {
  if (pageName === currentPage) { const p = document.getElementById('page-' + pageName); if(p) p.scrollTop = 0; closeMenu(); return; }
  if (pageName === 'chat') { const dot = document.getElementById('chat-notif-dot'); if (dot) dot.classList.add('hidden'); }

  // Lobby: tear down canvas when leaving
  if (currentPage === 'lobby') lobbyModule.destroy();
  // Pokemon: tear down when leaving
  if (currentPage === 'pokemon' && typeof pokemonModule !== 'undefined') pokemonModule.destroy();
  // Royale: tear down when leaving
  if (currentPage === 'royale' && typeof royaleModule !== 'undefined') royaleModule.destroy();

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
  if (chatBauble) chatBauble.style.display = (pageName === 'pokemon' || pageName === 'royale' || pageName === 'lobby' || pageName === 'ai' || pageName === 'outputai') ? 'none' : '';

  // Hide live clock on AI page — it overlaps the chat header
  const liveClock = document.getElementById('live-clock');
  if (liveClock) liveClock.style.display = (pageName === 'ai' || pageName === 'outputai') ? 'none' : '';

  const old = pageConfig[currentPage];
  const oldPage = document.getElementById('page-' + currentPage);
  if(oldPage) oldPage.classList.remove('active');
  document.getElementById(old.bg).classList.remove('active');
  document.getElementById(old.particles).classList.remove('active');
  if (old.wave && document.getElementById('wave-container')) document.getElementById('wave-container').classList.remove('active');
  if (old.mountain) document.getElementById('mountain-svg').classList.remove('active');
  if (old.aurora) document.getElementById('aurora').classList.remove('active');

  currentPage = pageName;
  const cfg = pageConfig[pageName];
  const newPage = document.getElementById('page-' + pageName);
  if(newPage) newPage.classList.add('active');

  if (customPageBgs[pageName]) {
      document.body.style.backgroundImage = `url(${customPageBgs[pageName]})`;
      document.body.style.backgroundSize = 'cover'; document.body.style.backgroundPosition = 'center'; document.body.style.backgroundAttachment = 'fixed';
      document.querySelectorAll('.scene-bg').forEach(bg => bg.classList.remove('active'));
  } else {
      document.body.style.backgroundImage = '';
      document.getElementById(cfg.bg).classList.add('active');
      document.getElementById(cfg.particles).classList.add('active');
      if (cfg.wave && document.getElementById('wave-container')) document.getElementById('wave-container').classList.add('active');
      if (cfg.mountain) document.getElementById('mountain-svg').classList.add('active');
      if (cfg.aurora) document.getElementById('aurora').classList.add('active');
  }

  const indicator = document.getElementById('page-indicator');
  if (indicator) indicator.textContent = cfg.label;
  if(newPage) newPage.scrollTop = 0;
  document.querySelectorAll('.nav-item').forEach(item => { if(item.dataset.page) item.classList.toggle('active', item.dataset.page === pageName); });
  closeMenu();

  // Lobby: start canvas after page is visible
  if (pageName === 'lobby') { _ensureSocket(); lobbyModule.init(); }
  // Pokemon: start after page is visible
  if (pageName === 'pokemon' && typeof pokemonModule !== 'undefined') pokemonModule.init();
  // Royale: start after page is visible
  if (pageName === 'royale' && typeof royaleModule !== 'undefined') royaleModule.init();
  // Games hub: draw royale preview canvas
  if (pageName === 'games') drawRoyalePreviewCanvas();
  // Event Pictures & Random Pictures: reset and render year cards
  if (pageName === 'events') { galleryStates.ep = { level:'years', year:null, sem:null, folder:null }; renderGallery('ep'); }
  if (pageName === 'random') { galleryStates.rp = { level:'years', year:null, sem:null, folder:null }; renderGallery('rp'); }
  if (pageName === 'announcement') fetchSharedAnnouncements();
  if (pageName === 'outputai') fetchSharedAIOutputs();
  // AI Assistants hub
  if (pageName === 'ai') { aiView = 'hub'; renderAI(); }
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

let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; const btn = document.getElementById('install-btn'); if (btn) btn.style.display = 'block'; });

/* ============================================================
   INITIALIZATION
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  const installBtn = document.getElementById('install-btn');
  if (installBtn) installBtn.addEventListener('click', async () => { if (!deferredPrompt) return; deferredPrompt.prompt(); deferredPrompt = null; installBtn.style.display = 'none'; });

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');

  const attachmentInput = document.getElementById('attachment-input');
  if (attachmentInput) attachmentInput.addEventListener('change', () => { const lbl = document.getElementById('attachment-selected'); if(lbl) lbl.textContent = attachmentInput.files[0]?.name || 'No file chosen'; });

  const menuToggle = document.getElementById('menu-toggle');
  if (menuToggle) menuToggle.addEventListener('click', window.toggleMenu);

  if (currentUser) establishSession();
  else { const modal = document.getElementById('auth-modal'); if(modal) modal.style.display = 'flex'; }

  buildSubjectCards('grid-first',   firstSem);
  buildSubjectCards('grid-second',  secondSem);
  buildSubjectCards('grid-y2first',  y2firstSem);
  buildSubjectCards('grid-y2second', y2secondSem);
  buildSubjectCards('grid-y3first',  y3firstSem);
  buildSubjectCards('grid-y3second', y3secondSem);
  buildSubjectCards('grid-y4first',  y4firstSem);
  buildSubjectCards('grid-y4second', y4secondSem);
  // Event Pictures + Random Pictures handled by gallery system (renderGallery on page nav)
  fetchCalendarNotes(); updateClock();

  const player = document.getElementById('audio-player');
  if(player) player.addEventListener('ended', () => { if (!player.loop) window.playNextSong(); });

  // Reflect initial toggle states on buttons
  const loopBtn = document.getElementById('btn-loop');
  if(loopBtn) loopBtn.classList.toggle('neon-active', isLoop);
  const repeatBtn = document.getElementById('btn-repeat');
  if(repeatBtn) repeatBtn.classList.toggle('neon-active', isRepeat);

  if (customPageBgs[currentPage]) {
      document.querySelectorAll('.scene-bg').forEach(bg => bg.classList.remove('active'));
      document.getElementById('aurora').classList.remove('active'); document.getElementById('mountain-svg').classList.remove('active');
      const wave = document.getElementById('wave-container'); if (wave) wave.classList.remove('active');
      document.body.style.backgroundImage = `url(${customPageBgs[currentPage]})`;
      document.body.style.backgroundSize = 'cover'; document.body.style.backgroundPosition = 'center'; document.body.style.backgroundAttachment = 'fixed';
  }
});

document.getElementById('custom-bg-upload').addEventListener('change', function(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Image = e.target.result;
        customPageBgs[currentPage] = base64Image;
        try {
            localStorage.setItem('customPageBgs', JSON.stringify(customPageBgs));
            customAlert(`Saved to ${currentPage.toUpperCase()} page!`);
            document.querySelectorAll('.scene-bg').forEach(bg => bg.classList.remove('active'));
            document.getElementById('aurora').classList.remove('active'); document.getElementById('mountain-svg').classList.remove('active');
            const wave = document.getElementById('wave-container'); if (wave) wave.classList.remove('active');
            document.body.style.backgroundImage = `url(${base64Image})`;
            document.body.style.backgroundSize = 'cover'; document.body.style.backgroundPosition = 'center'; document.body.style.backgroundAttachment = 'fixed';
        } catch (err) { customAlert("Applied! (Note: File too large to save long-term)."); }
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
    await fetch('/api/push/subscribe', {
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
  await fetch('/api/push/private-message', {
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
    if (event.data?.type === 'OPEN_PRIVATE_CHAT' && event.data.sender) {
      openChat('private', event.data.sender);
    }
  });
}

async function fetchAppUpdates() {
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
    localStorage.setItem(seenKey, '1');
    note.classList.remove('show');
    setTimeout(() => note.remove(), 220);
  };
  requestAnimationFrame(() => note.classList.add('show'));
  setTimeout(() => {
    if (!document.body.contains(note)) return;
    localStorage.setItem(seenKey, '1');
    note.classList.remove('show');
    setTimeout(() => note.remove(), 220);
  }, 6500);
}

function ensureAdminUpdateControl() {
  if (!isAdmin || document.getElementById('admin-update-btn')) return;
  const controls = document.querySelector('.sidebar-controls');
  if (!controls) return;
  const btn = document.createElement('button');
  btn.id = 'admin-update-btn';
  btn.className = 'theme-toggle-btn admin-update-btn';
  btn.title = 'Post app update';
  btn.textContent = '!';
  btn.onclick = openAdminUpdateComposer;
  controls.appendChild(btn);
}

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
    if (currentUser) _socket.emit('identify', currentUser);
    lobbyModule.setupSocket(_socket);
  });
  // If connected immediately (reconnect case), setup at once
  if (_socket.connected) {
    lobbyModule.setupSocket(_socket);
    if (currentUser) _socket.emit('identify', currentUser);
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
                 <button onclick="openMoveFileModal('${safeId}','${safeFolderId}','gallery-${pfx}')">Move</button>
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
    sb.from('folders').insert([{ parent: parentKey, name, owner: currentUser.username, permissions: { viewers: [], editors: [] } }])
      .then(({ error }) => {
        if (error) return customAlert(error.message);
        showToast('Album created.');
        renderGallery(pfx);
      });
  });
}
function gRenameFolder(pfx, id, currentName) {
  fetchFolderById(id).then((folder) => {
  if (!canManageFolder(folder)) return customAlert('Only the album owner can rename this album.');
  customPrompt('New album name:', function(name) {
    if (!name || name === currentName) return;
    sb.from('folders').update({ name }).eq('id', id)
      .then(({ error }) => { if (error) return customAlert(error.message); showToast('Album renamed.'); renderGallery(pfx); });
  }, currentName);
  }).catch((error) => customAlert(error.message));
}
function gDeleteFolder(pfx, id) {
  fetchFolderById(id).then((folder) => {
  if (!canManageFolder(folder)) return customAlert('Only the album owner can delete this album.');
  customConfirm('Delete this album and all its photos?', function() {
    sb.from('files').delete().eq('folder_id', id)
      .then(() => sb.from('folders').delete().eq('id', id))
      .then(() => { showToast('Album deleted.', 'warning'); renderGallery(pfx); });
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
      const r = await fetch('/api/upload', { method:'POST', body:fd });
      if (!r.ok) throw new Error('Upload failed');
      const data = await r.json();
      const { error } = await sb.from('files').insert([{
        folder_id: folderId, name: file.name, url: data.url,
        type: file.type, uploader: currentUser.username, size: data.size,
      }]);
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

window.openSocialPage = function(url) {
  window.open(url, '_blank', 'noopener,noreferrer');
};

async function fetchSharedAIOutputs() {
  const feed = document.getElementById('output-ai-feed');
  if (feed) feed.innerHTML = createInlineLoader('Loading shared AI output...');
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
  feed.innerHTML = sharedAIOutputs.map((item) => `
    <article class="board-card ai-output-card">
      <div class="board-card-meta">
        <span>${escapeHTML(item.sharer || 'Unknown')}</span>
        <span>${new Date(item.created_at).toLocaleString()}</span>
        <span>${escapeHTML(item.provider || 'AI')}</span>
      </div>
      ${item.prompt ? `<div class="board-section"><h4>Prompt</h4><p>${aiFormat(item.prompt)}</p></div>` : ''}
      ${item.output ? `<div class="board-section"><h4>Output</h4><p>${aiFormat(item.output)}</p></div>` : ''}
    </article>`).join('');
}

async function fetchSharedAnnouncements() {
  const feed = document.getElementById('announcement-feed');
  if (feed) feed.innerHTML = createInlineLoader('Loading announcements...');
  const { data, error } = await sb.from('shared_announcements').select('*').order('created_at', { ascending: false }).limit(80);
  if (error) {
    if (feed) feed.innerHTML = `<p class="empty-state-text">${escapeHTML(error.message)}</p>`;
    return;
  }
  sharedAnnouncements = data || [];
  renderSharedAnnouncements();
}

function renderSharedAnnouncements() {
  const feed = document.getElementById('announcement-feed');
  if (!feed) return;
  if (!sharedAnnouncements.length) {
    feed.innerHTML = '<div class="board-empty">No shared announcements yet.</div>';
    return;
  }
  feed.innerHTML = sharedAnnouncements.map((item) => `
    <article class="board-card announcement-card">
      <div class="announcement-date-chip">${escapeHTML(item.schedule || item.date_label || 'Announcement')}</div>
      <h2>${escapeHTML(item.title || 'Announcement')}</h2>
      <p>${escapeHTML(item.body || item.text || '').replace(/\n/g, '<br>')}</p>
      <div class="board-card-meta">
        <span>Shared by ${escapeHTML(item.sharer || 'Unknown')}</span>
        <span>${new Date(item.created_at).toLocaleString()}</span>
      </div>
    </article>`).join('');
}

async function shareAnnouncementPayload(payload) {
  if (!currentUser) return customAlert('Please log in to share announcements.');
  const { error } = await sb.from('shared_announcements').insert([{
    ...payload,
    sharer: currentUser.username,
  }]);
  if (error) return customAlert(error.message);
  showToast('Shared to ANNOUNCEMENT.');
  fetchSharedAnnouncements();
}

window.shareCalendarNote = function(dateKey, displayDate, text) {
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
  sharedRealtimeReady = true;
  sb.channel('public:shared_boards')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_ai_outputs' }, () => {
      if (currentPage === 'outputai') fetchSharedAIOutputs();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_announcements' }, () => {
      if (currentPage === 'announcement') fetchSharedAnnouncements();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'app_updates' }, () => fetchAppUpdates())
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
      <span class="ai-bc ai-bc-link" onclick="aiGoHub()">🤖 AI Assistants</span>
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
          <div class="ai-card" style="--ai-accent:${p.accent};background:${p.bg}" onclick="aiOpenChat('${key}')">
            <div class="ai-card-glow"></div>
            <div class="ai-card-top">
              <span class="ai-card-icon">${p.icon}</span>
              <span class="ai-card-tag">${p.tag}</span>
            </div>
            <div class="ai-card-name">${p.name}</div>
            <div class="ai-card-model">${p.model}</div>
            <div class="ai-card-desc">${p.desc}</div>
            <div class="ai-card-btn">Open Chat →</div>
          </div>`).join('')}
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
        <button class="share-everyone-btn" onclick="shareAIMessage('${provider}', ${index})">Share to Everyone</button>
      </div>
      ${m.role === 'user' ? `<div class="ai-msg-av">👤</div>` : ''}
    </div>`).join('');

  view.innerHTML = `
    <div class="ai-chat-wrap">
      <div class="ai-chat-head" style="--ai-accent:${p.accent}">
        <button class="ai-back-btn" onclick="aiGoHub()">← Back</button>
        <span class="ai-head-icon">${p.icon}</span>
        <div class="ai-head-info">
          <div class="ai-head-name">${p.name}</div>
          <div class="ai-head-sub">${p.tag} · ${p.model}</div>
        </div>
        ${msgs.length ? `<button class="ai-clear-btn" onclick="aiClearChat('${provider}')">Clear</button>` : ''}
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
            onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();aiSend('${provider}');}"
            oninput="this.style.height='auto';this.style.height=Math.min(this.scrollHeight,130)+'px'"></textarea>
          <button class="ai-send-btn" style="--ai-accent:${p.accent}" onclick="aiSend('${provider}')">↑</button>
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
    const res  = await fetch(AI_PROVIDERS[provider].endpoint, {
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

window.shareAIMessage = async function(provider, index) {
  if (!currentUser) return customAlert('Please log in to share AI output.');
  const message = aiChats[provider]?.[index];
  if (!message) return;
  const previousPrompt = [...aiChats[provider].slice(0, index)].reverse().find((item) => item.role === 'user')?.content || '';
  const prompt = message.role === 'user' ? message.content : previousPrompt;
  const output = message.role === 'assistant' ? message.content : '';
  const { error } = await sb.from('shared_ai_outputs').insert([{
    sharer: currentUser.username,
    provider: AI_PROVIDERS[provider]?.name || provider,
    prompt,
    output,
  }]);
  if (error) return customAlert(error.message);
  showToast('Shared to OUTPUT-AI.');
  fetchSharedAIOutputs();
};
