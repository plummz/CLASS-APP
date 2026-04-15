/* ============================================================
   SCRIPT.JS — My School Portfolio (FULL INTEGRATED VERSION)
   ============================================================ */

// 1. SUPABASE CONNECTION INFO
const SUPABASE_URL = 'https://rxpezjhsnqkjydurtayx.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4cGV6amhzbnFranlkdXJ0YXl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMTIwODUsImV4cCI6MjA5MTU4ODA4NX0.wAhjVae3O1vFzGwF_JfXeFJJtB7hv3gTD9T5MHsjhRo';

// Initialize Supabase Client
const { createClient } = window.supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

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

// Music Player Global State
let currentPlaylist = [];
let currentTrackIndex = -1;
let isLoop = true;
let isRepeat = false;

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
        if(folders.length === 0) {
            grid.innerHTML = '<p style="color: gray; font-size: 14px;">No folders yet. Create one!</p>';
            return;
        }

        folders.forEach(f => {
            const isOwner = currentUser && (f.owner === currentUser.username || isAdmin);
            grid.innerHTML += `
            <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 15px; display: flex; flex-direction: column;">
                <div onclick="window.openFileExplorer('${f.id}', '${f.name}')" style="cursor:pointer; flex: 1; text-align: center;">
                    <div style="font-size: 40px; margin-bottom: 10px;">📁</div>
                    <div style="color: white; font-weight: bold; font-family: 'Exo 2'; font-size: 16px; word-wrap: break-word;">${f.name}</div>
                    <div style="color: gray; font-size: 10px; margin-top: 5px;">By: ${f.owner}</div>
                </div>
                ${isOwner ? `
                <div style="display: flex; gap: 5px; margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">
                    <button onclick="window.renameFolderAPI('${f.id}', '${f.name}')" style="flex:1; background: transparent; color: #00d4ff; border: 1px solid #00d4ff; border-radius: 5px; cursor: pointer; padding: 5px; font-size: 12px;">Rename</button>
                    <button onclick="window.deleteFolderAPI('${f.id}')" style="flex:1; background: transparent; color: #ff6b6b; border: 1px solid #ff6b6b; border-radius: 5px; cursor: pointer; padding: 5px; font-size: 12px;">Delete</button>
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
        sb.from('folders').insert([{ parent: currentParentContext, name: name, owner: currentUser.username }])
        .then(() => fetchAndRenderFolders()).catch(err => customAlert(err.message));
    });
};

window.renameFolderAPI = function(id, oldName, isSub) {
    customPrompt("Enter new name for folder:", function(newName) {
        if(!newName || newName === oldName) return;
        sb.from('folders').update({ name: newName }).eq('id', id)
        .then(() => isSub ? fetchAndRenderSubFolders() : fetchAndRenderFolders())
        .catch(err => customAlert(err.message));
    }, oldName);
};

window.deleteFolderAPI = function(id) {
    customConfirm("Are you sure? This will delete the folder AND all files inside it forever.", function() {
        sb.from('folders').delete().eq('id', id)
        .then(() => fetchAndRenderFolders()).catch(err => customAlert(err.message));
    });
};

window.openFileExplorer = function(folderId, folderName, parentId) {
    // Push current context onto stack for back navigation
    if (currentFolderContext) {
        folderStack.push({ ...currentFolderContext });
    } else {
        folderStack.push({ id: null, name: currentParentContext }); // root level marker
    }
    currentFolderContext = { id: folderId, name: folderName };
    // Build breadcrumb title
    const crumbs = folderStack
        .filter(f => f.id !== null)
        .map(f => f.name)
        .concat(folderName)
        .join(' / ');
    const title = document.getElementById('file-explorer-title');
    if (title) title.innerText = crumbs || folderName;
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

function fetchAndRenderFiles() {
    sb.from('files').select('*').eq('folder_id', currentFolderContext.id)
    .then(({ data: files, error }) => {
        if (error) return console.error(error);
        
        currentPlaylist = files.filter(f => f.name.toLowerCase().endsWith('.mp3') || f.name.toLowerCase().endsWith('.wav'));
        
        const list = document.getElementById('file-list-container');
        if(!list) return;
        list.innerHTML = '';
        if(files.length === 0) {
            list.innerHTML = '<p style="color: gray; text-align: center;">Folder is empty.</p>';
            return;
        }
        files.forEach(f => {
            const isOwner = currentUser && (f.uploader === currentUser.username || isAdmin);
            const safeName = f.name.replace(/'/g, "\\'");
            list.innerHTML += `
            <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; gap: 15px;">
                <div style="flex: 1; overflow: hidden;">
                    <div style="color: white; font-weight: bold; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">📄 ${f.name}</div>
                    <div style="color: gray; font-size: 11px;">Uploaded by: ${f.uploader}</div>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button onclick="window.playOrOpenFileAPI('${f.url}', '${safeName}')" style="background:#00ff88; color:black; border:none; padding:8px 15px; border-radius:8px; font-weight:bold; cursor:pointer; font-size:12px;">Open</button>
                    ${isOwner ? `<button onclick="window.deleteFileAPI('${f.id}')" style="background: #ff6b6b; color: black; border: none; padding: 8px 15px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 12px;">Delete</button>` : ''}
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
    sb.from('folders').select('*').eq('parent', parentId)
    .then(({ data: subs, error }) => {
        if (error) return console.error('Subfolder fetch error:', error);
        const grid = document.getElementById('subfolder-grid-modal');
        if (!grid) return;
        grid.innerHTML = '';
        if (subs.length === 0) {
            grid.innerHTML = '<p style="color:rgba(255,255,255,0.35);font-size:12px;">No sub-folders yet.</p>';
            return;
        }
        subs.forEach(f => {
            const isOwner = currentUser && (f.owner === currentUser.username || isAdmin);
            grid.innerHTML += `
            <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:15px;display:flex;flex-direction:column;">
                <div onclick="window.openFileExplorer('${f.id}','${f.name.replace(/'/g,"\\'")}','${parentId}')" style="cursor:pointer;flex:1;text-align:center;">
                    <div style="font-size:36px;margin-bottom:8px;">📂</div>
                    <div style="color:white;font-weight:bold;font-family:'Exo 2';font-size:14px;word-wrap:break-word;">${f.name}</div>
                    <div style="color:gray;font-size:10px;margin-top:4px;">By: ${f.owner}</div>
                </div>
                ${isOwner ? `
                <div style="display:flex;gap:5px;margin-top:10px;border-top:1px solid rgba(255,255,255,0.1);padding-top:8px;">
                    <button onclick="window.renameFolderAPI('${f.id}','${f.name.replace(/'/g,"\\'")}',true)" style="flex:1;background:transparent;color:#00d4ff;border:1px solid #00d4ff;border-radius:5px;cursor:pointer;padding:4px;font-size:11px;">Rename</button>
                    <button onclick="window.deleteSubFolderAPI('${f.id}')" style="flex:1;background:transparent;color:#ff6b6b;border:1px solid #ff6b6b;border-radius:5px;cursor:pointer;padding:4px;font-size:11px;">Delete</button>
                </div>` : ''}
            </div>`;
        });
    });
}

window.createSubFolderAPI = function() {
    if (!currentUser) return customAlert("Please log in to create a sub-folder.");
    if (!currentFolderContext || !currentFolderContext.id) return customAlert("No folder selected.");
    customPrompt("Enter sub-folder name:", function(name) {
        if (!name) return;
        sb.from('folders').insert([{ parent: String(currentFolderContext.id), name, owner: currentUser.username }])
        .then(({ error }) => {
            if (error) return customAlert(error.message);
            fetchAndRenderSubFolders();
        });
    });
};

window.deleteSubFolderAPI = function(id) {
    customConfirm("Delete this sub-folder and all files inside it?", function() {
        sb.from('folders').delete().eq('id', id)
        .then(() => fetchAndRenderSubFolders()).catch(err => customAlert(err.message));
    });
};

window.uploadFileToFolderAPI = async function() {
    if(!currentUser) return customAlert("Log in to upload files.");
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
        // Unique path: ms timestamp + 6-char random suffix prevents any collision
        const filePath = `uploads/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safeName}`;

        const { error: storErr } = await sb.storage
            .from('portfolio-assets')
            .upload(filePath, file, { contentType: file.type });
        if(storErr) throw new Error(`Storage: ${storErr.message}`);

        const { data: urlData } = sb.storage.from('portfolio-assets').getPublicUrl(filePath);

        const { error: dbErr } = await sb.from('files').insert([{
            folder_id: folderId,
            name: file.name,
            url: urlData.publicUrl,
            type: file.type,
            uploader: currentUser.username
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
    customConfirm("Delete this file?", function() {
        sb.from('files').delete().eq('id', fileId)
        .then(() => fetchAndRenderFiles())
        .catch(err => customAlert(err.message));
    });
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
        if (!skipIndexUpdate && currentPlaylist.length > 0) {
            currentTrackIndex = currentPlaylist.findIndex(f => f.url === url);
            if (currentTrackIndex === -1) currentTrackIndex = currentPlaylist.findIndex(f => f.name === name);
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
        btn.style.color = isLoop ? 'var(--neon-green)' : 'white';
        btn.style.borderColor = isLoop ? 'var(--neon-green)' : 'white';
    }
};

window.toggleRepeat = function() {
    isRepeat = !isRepeat;
    const btn = document.getElementById('btn-repeat');
    const player = document.getElementById('audio-player');
    if(btn) {
        btn.innerText = `🔂 Repeat 1: ${isRepeat ? 'ON' : 'OFF'}`;
        btn.style.color = isRepeat ? 'var(--neon-green)' : 'white';
        btn.style.borderColor = isRepeat ? 'var(--neon-green)' : 'white';
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
  fetchMessages(currentChat.type, currentChat.target);
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
    card.innerHTML = `
      <div class="user-card-top">
        <div>
          <div class="user-name">${user.display_name || user.username}</div>
          <div class="user-status ${user.online ? 'online' : 'offline'}">${user.online ? 'Online' : 'Offline'}</div>
        </div>
        <button class="user-view-btn" onclick="openUserProfile('${user.username}')">Profile</button>
      </div>
      <div class="user-meta">GitHub: ${user.github || '—'}</div>
      <div class="user-meta">Email: ${user.email || '—'}</div>
      <div class="user-note">${user.note || ''}</div>
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
      item.innerHTML = `
        <div>
          <div class="chat-user-name">${user.display_name || user.username}</div>
          <div class="chat-status ${user.online ? 'online' : 'offline'}">${user.online ? 'Online' : 'Offline'}</div>
        </div>
        <button onclick="openChat('private', '${user.username}')" style="background:#00ff88; border:none; padding:5px 10px; border-radius:5px; font-weight:bold; cursor:pointer; color:black;">Chat</button>
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
  let html = `
    <h2 class="modal-title text-blue" style="margin-bottom: 10px;">${profile.display_name || profile.username}</h2>
    <div class="profile-row"><strong>Username:</strong> ${profile.username}</div>
    <div class="profile-row"><strong>Birthday:</strong> ${profile.birthday || 'Unknown'}</div>
    <div class="profile-row"><strong>Address:</strong> ${profile.address || 'Unknown'}</div>
    <div class="profile-row"><strong>GitHub:</strong> ${profile.github || '—'}</div>
    <div class="profile-row"><strong>Email:</strong> ${profile.email || '—'}</div>
    <div class="profile-row" style="margin-bottom: 20px;"><strong>Note:</strong> ${profile.note || 'No additional note.'}</div>
    <div class="profile-actions modal-btn-group" style="flex-wrap: wrap;">
      <button class="btn-primary flex-1" onclick="openChat('private', '${profile.username}')">Message</button>
  `;

  if (isMine) html += `<button class="btn-blue flex-1" onclick="editUserProfile('${profile.username}')">Edit Profile</button>`;
  if (isAdmin && !isMine) html += `<button class="btn-outline-red flex-1" onclick="deleteUserAPI('${profile.username}')">Delete User</button>`;
  html += `</div>`; 
  details.innerHTML = html;
  profilePanel.classList.add('active');
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
  
  details.innerHTML = `
    <h2 class="modal-title text-blue" style="margin-bottom: 15px;">Edit Profile</h2>
    <div style="margin-bottom: 10px;"><label style="font-size: 12px; color: #00d4ff;">Display Name</label>
        <input type="text" id="profile-displayName" class="modal-input" style="margin-bottom: 5px; padding: 8px;" value="${profile.display_name || profile.username || ''}"></div>
    <div style="margin-bottom: 10px;"><label style="font-size: 12px; color: #00d4ff;">Birthday</label>
        <input type="text" id="profile-birthday" class="modal-input" style="margin-bottom: 5px; padding: 8px;" value="${profile.birthday || ''}"></div>
    <div style="margin-bottom: 10px;"><label style="font-size: 12px; color: #00d4ff;">Address</label>
        <input type="text" id="profile-address" class="modal-input" style="margin-bottom: 5px; padding: 8px;" value="${profile.address || ''}"></div>
    <div style="margin-bottom: 10px;"><label style="font-size: 12px; color: #00d4ff;">GitHub URL</label>
        <input type="text" id="profile-github" class="modal-input" style="margin-bottom: 5px; padding: 8px;" value="${profile.github || ''}"></div>
    <div style="margin-bottom: 10px;"><label style="font-size: 12px; color: #00d4ff;">Email</label>
        <input type="email" id="profile-email" class="modal-input" style="margin-bottom: 5px; padding: 8px;" value="${profile.email || ''}"></div>
    <div style="margin-bottom: 15px;"><label style="font-size: 12px; color: #00d4ff;">Bio / Note</label>
        <textarea id="profile-note" class="modal-input" style="margin-bottom: 5px; padding: 8px; height: 60px; resize: none;">${profile.note || ''}</textarea></div>
    <div class="profile-actions modal-btn-group">
      <button class="btn-primary flex-1" onclick="saveProfileEdits('${profile.username}')">Save</button>
      <button class="btn-outline-red flex-1" onclick="openUserProfile('${profile.username}')">Cancel</button>
    </div>
  `;
};

window.saveProfileEdits = function(username) {
  const payload = {
    display_name: document.getElementById('profile-displayName').value.trim(),
    birthday: document.getElementById('profile-birthday').value.trim(),
    address: document.getElementById('profile-address').value.trim(),
    github: document.getElementById('profile-github').value.trim(),
    email: document.getElementById('profile-email').value.trim(),
    note: document.getElementById('profile-note').value.trim(),
  };
  
  sb.from('profiles').update(payload).eq('username', username)
    .then(() => { fetchUsers(); customAlert("Profile updated successfully!"); openUserProfile(username); })
    .catch((err) => customAlert(err.message));
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
  if (currentChat.type === 'group') header.textContent = 'Group Chat';
  else if (currentChat.type === 'todo') header.textContent = 'To-Do Group';
  else if (currentChat.type === 'private' && currentChat.target) header.textContent = `Private Chat: ${currentChat.target}`;
  else header.textContent = 'Select a chat';
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
  await sb.from('messages').insert([{ chat_type: currentChat.type, target: currentChat.type === 'private' ? currentChat.target : null, sender: currentUser.username, text: text, attachment: attachmentData }]);
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
  pokemon:  { bg: 'bg-galaxy',   particles: 'particles-galaxy',   wave: false, mountain: false, aurora: false, label: '⚔️ Pokemon' },
  witfb:    { bg: 'bg-galaxy',   particles: 'particles-galaxy',   wave: false, mountain: false, aurora: false, label: '📘 WIT FB Page' },
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

  // YouTube mini-player: show when leaving music, hide when returning
  const ytMini = document.getElementById('yt-mini-player');
  if (ytMini) {
    if (pageName === 'music') ytMini.classList.add('hidden');
    else if (ytActive && currentPage === 'music') ytMini.classList.remove('hidden');
  }

  // Ping server when music page opens so Render wakes up before the user searches
  if (pageName === 'music') fetch('/api/ping').catch(() => {});

  // Lazy-load Facebook SDK the first time WIT FB Page is visited
  if (pageName === 'witfb' && typeof loadFBSDK === 'function') {
    loadFBSDK();
    // Re-parse after the page is painted so the embed measures full container width
    setTimeout(() => { if (window.FB && window.FB.XFBML) window.FB.XFBML.parse(); }, 400);
  }

  // Hide chat bauble on Pokémon page (FABs occupy bottom-right)
  const chatBauble = document.getElementById('chat-bauble');
  if (chatBauble) chatBauble.style.display = pageName === 'pokemon' ? 'none' : '';

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
};

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
    const modalHtml = `<div id="view-note-modal" class="custom-modal-overlay blur-bg high-z" style="display:flex;"><div class="custom-modal-box small-box border-blue"><button class="modal-close-btn" onclick="document.getElementById('view-note-modal').remove()">&times;</button><h3 class="modal-title text-blue" style="font-size: 1.2rem; margin-bottom: 15px;">Note for ${displayDate}</h3><div style="color:white; margin-bottom:25px; white-space:pre-wrap; max-height:40vh; overflow-y:auto; font-size:16px; text-align: left; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px;">${text}</div><div class="modal-btn-group"><button class="btn-primary flex-1" id="edit-note-btn">Edit Note</button></div></div></div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('edit-note-btn').onclick = function() { document.getElementById('view-note-modal').remove(); openNotePrompt(dateKey, displayDate, text); };
};

window.openNotePrompt = function(dateKey, displayDate, existingNote) {
    let existingModal = document.getElementById('edit-note-modal'); if (existingModal) existingModal.remove();
    const modalHtml = `<div id="edit-note-modal" class="custom-modal-overlay blur-bg high-z" style="display:flex;"><div class="custom-modal-box small-box border-blue"><h3 class="modal-title text-blue" style="font-size: 1.2rem; margin-bottom: 15px;">${existingNote ? 'Edit' : 'Add'} Note</h3><textarea id="note-textarea" class="modal-input" placeholder="Type..." style="height:120px; resize:none; margin-bottom: 20px;">${existingNote}</textarea><div class="modal-btn-group"><button class="btn-blue flex-1" id="save-note-btn">Save</button><button class="btn-outline-red flex-1" onclick="document.getElementById('edit-note-modal').remove()">Cancel</button></div></div></div>`;
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
  buildFolderCards('grid-events', eventCount, 'Event');
  buildFolderCards('grid-random', randomCount, 'Random');
  fetchCalendarNotes(); updateClock();

  const player = document.getElementById('audio-player');
  if(player) player.addEventListener('ended', () => { if (!player.loop) window.playNextSong(); });

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

window.saveAnnouncement = function() { const noteContent = document.getElementById('announcement-note').value; localStorage.setItem('savedWeeklyAnnouncement', noteContent); customAlert("Saved!"); };

window.addEventListener('DOMContentLoaded', () => {
    const savedNote = localStorage.getItem('savedWeeklyAnnouncement');
    if (savedNote) { const noteBox = document.getElementById('announcement-note'); if(noteBox) noteBox.value = savedNote; }
});

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

/* ============================================================
   POKEMON MODULE — Overworld + Battle (Stage 1)
   ============================================================ */
const pokemonModule = (() => {
  /* ── TILE TYPES ── */
  const T = { WATER:0, GRASS:1, PATH:2, TALL:3, TREE:4, BUILDING:5, SAND:6, ROCK:7 };
  const TSIZE = 32, MAP_W = 50, MAP_H = 40, CHAR_S = 24;
  const SPAWN = { x: 25, y: 35 };
  const TILE_COLORS = ['#1a6b9e','#3d8b3d','#c8a878','#2d6b2d','#1a3a0a','#8a6a4a','#d4b483','#7a6a5a'];

  /* ── SPECIES DATA ── */
  const SP = {
    /* ── Starters ── */
    pikachu:   {name:'Pikachu',   types:['electric'],        dexId:25,  hp:35, atk:55,def:40, spd:90,  moves:['thunderShock','quickAtk','tailWhip','growl'],   xpY:112,catchRate:190,starter:true, evolvesAt:36, evolvesInto:'raichu'},
    bulbasaur: {name:'Bulbasaur', types:['grass','poison'],  dexId:1,   hp:45, atk:49,def:49, spd:45,  moves:['vineWhip','tackle','growl','tailWhip'],          xpY:64, catchRate:45, starter:true, evolvesAt:16, evolvesInto:'ivysaur'},
    squirtle:  {name:'Squirtle',  types:['water'],           dexId:7,   hp:44, atk:48,def:65, spd:43,  moves:['waterGun','tackle','tailWhip','growl'],          xpY:65, catchRate:45, starter:true, evolvesAt:16, evolvesInto:'wartortle'},
    chikorita: {name:'Chikorita', types:['grass'],           dexId:152, hp:45, atk:49,def:65, spd:45,  moves:['razorLeaf','tackle','growl','tailWhip'],         xpY:64, catchRate:45, starter:true, evolvesAt:16, evolvesInto:'bayleef'},
    torchic:   {name:'Torchic',   types:['fire'],            dexId:255, hp:45, atk:60,def:40, spd:45,  moves:['ember','scratch','growl','tackle'],              xpY:62, catchRate:45, starter:true, evolvesAt:16, evolvesInto:'combusken'},
    cyndaquil: {name:'Cyndaquil', types:['fire'],            dexId:155, hp:39, atk:52,def:43, spd:65,  moves:['ember','tackle','leer','smokescreen'],           xpY:62, catchRate:45, starter:true, evolvesAt:14, evolvesInto:'quilava'},
    totodile:  {name:'Totodile',  types:['water'],           dexId:158, hp:50, atk:65,def:64, spd:43,  moves:['waterGun','scratch','leer','tackle'],            xpY:63, catchRate:45, starter:true, evolvesAt:18, evolvesInto:'croconaw'},
    mudkip:    {name:'Mudkip',    types:['water','ground'],  dexId:258, hp:50, atk:70,def:50, spd:40,  moves:['waterGun','tackle','growl','mudSlap'],           xpY:62, catchRate:45, starter:true, evolvesAt:16, evolvesInto:'marshtomp'},
    treecko:   {name:'Treecko',   types:['grass'],           dexId:252, hp:40, atk:45,def:35, spd:70,  moves:['pound','leer','absorb','quickAtk'],              xpY:62, catchRate:45, starter:true, evolvesAt:16, evolvesInto:'grovyle'},
    eevee:     {name:'Eevee',     types:['normal'],          dexId:133, hp:55, atk:55,def:50, spd:55,  moves:['tackle','quickAtk','sandAtk','growl'],           xpY:92, catchRate:45, starter:true, evolvesAt:36, evolvesInto:'vaporeon'},
    /* ── Wild Pokémon ── */
    rattata:   {name:'Rattata',   types:['normal'],          dexId:19,  hp:30, atk:56,def:35, spd:72,  moves:['tackle','quickAtk'],                            xpY:51, catchRate:255, evolvesAt:20, evolvesInto:'raticate'},
    pidgey:    {name:'Pidgey',    types:['normal','flying'], dexId:16,  hp:40, atk:45,def:40, spd:56,  moves:['tackle','gust'],                                xpY:50, catchRate:255, evolvesAt:18, evolvesInto:'pidgeotto'},
    caterpie:  {name:'Caterpie',  types:['bug'],             dexId:10,  hp:45, atk:30,def:35, spd:45,  moves:['tackle','stringShot'],                          xpY:39, catchRate:255, evolvesAt:7,  evolvesInto:'metapod'},
    weedle:    {name:'Weedle',    types:['bug','poison'],    dexId:13,  hp:40, atk:35,def:30, spd:50,  moves:['poisonSting','stringShot'],                     xpY:39, catchRate:255, evolvesAt:7,  evolvesInto:'kakuna'},
    oddish:    {name:'Oddish',    types:['grass','poison'],  dexId:43,  hp:45, atk:50,def:55, spd:30,  moves:['absorb','poisonSting'],                         xpY:64, catchRate:255, evolvesAt:21, evolvesInto:'gloom'},
    psyduck:   {name:'Psyduck',   types:['water'],           dexId:54,  hp:50, atk:52,def:48, spd:55,  moves:['scratch','waterGun'],                           xpY:80, catchRate:190, evolvesAt:33, evolvesInto:'golduck'},
    geodude:   {name:'Geodude',   types:['rock','ground'],   dexId:74,  hp:40, atk:80,def:100,spd:20,  moves:['tackle','rockThrow'],                           xpY:86, catchRate:255, evolvesAt:25, evolvesInto:'graveler'},
    zubat:     {name:'Zubat',     types:['poison','flying'], dexId:41,  hp:40, atk:45,def:35, spd:55,  moves:['leechLife','tackle'],                           xpY:49, catchRate:255, evolvesAt:22, evolvesInto:'golbat'},
    magikarp:  {name:'Magikarp',  types:['water'],           dexId:129, hp:20, atk:10,def:55, spd:80,  moves:['splash','tackle'],                              xpY:40, catchRate:255, evolvesAt:20, evolvesInto:'gyarados'},
    gastly:    {name:'Gastly',    types:['ghost','poison'],  dexId:92,  hp:30, atk:35,def:30, spd:80,  moves:['lick','poisonSting'],                           xpY:95, catchRate:190, evolvesAt:25, evolvesInto:'haunter'},
    /* ── Evolved forms (not wild-spawnable, used for evolution targets) ── */
    raichu:    {name:'Raichu',    types:['electric'],        dexId:26,  hp:60, atk:90,def:55, spd:110, moves:['thunderShock','quickAtk','thunderbolt','tailWhip'],xpY:122,catchRate:75},
    ivysaur:   {name:'Ivysaur',   types:['grass','poison'],  dexId:2,   hp:60, atk:62,def:63, spd:60,  moves:['vineWhip','tackle','razorLeaf','growl'],         xpY:142,catchRate:45, evolvesAt:32, evolvesInto:'venusaur'},
    venusaur:  {name:'Venusaur',  types:['grass','poison'],  dexId:3,   hp:80, atk:82,def:83, spd:80,  moves:['vineWhip','razorLeaf','solarBeam','growl'],      xpY:236,catchRate:45},
    wartortle: {name:'Wartortle', types:['water'],           dexId:8,   hp:59, atk:63,def:80, spd:58,  moves:['waterGun','tackle','surf','tailWhip'],           xpY:143,catchRate:45, evolvesAt:36, evolvesInto:'blastoise'},
    blastoise: {name:'Blastoise', types:['water'],           dexId:9,   hp:79, atk:83,def:100,spd:78,  moves:['waterGun','surf','hydropump','tackle'],          xpY:239,catchRate:45},
    bayleef:   {name:'Bayleef',   types:['grass'],           dexId:153, hp:60, atk:62,def:80, spd:60,  moves:['razorLeaf','tackle','bodySlam','growl'],         xpY:142,catchRate:45},
    combusken: {name:'Combusken', types:['fire','fighting'], dexId:256, hp:60, atk:85,def:60, spd:55,  moves:['ember','scratch','bodySlam','growl'],            xpY:142,catchRate:45},
    quilava:   {name:'Quilava',   types:['fire'],            dexId:156, hp:58, atk:64,def:58, spd:80,  moves:['ember','tackle','flamethrower','smokescreen'],   xpY:142,catchRate:45},
    croconaw:  {name:'Croconaw',  types:['water'],           dexId:159, hp:65, atk:80,def:80, spd:58,  moves:['waterGun','scratch','surf','leer'],              xpY:142,catchRate:45},
    marshtomp: {name:'Marshtomp', types:['water','ground'],  dexId:259, hp:70, atk:85,def:70, spd:50,  moves:['waterGun','mudSlap','surf','tackle'],            xpY:142,catchRate:45},
    grovyle:   {name:'Grovyle',   types:['grass'],           dexId:253, hp:50, atk:65,def:45, spd:95,  moves:['pound','absorb','razorLeaf','quickAtk'],         xpY:142,catchRate:45},
    vaporeon:  {name:'Vaporeon',  types:['water'],           dexId:134, hp:130,atk:65,def:60, spd:65,  moves:['waterGun','quickAtk','surf','tackle'],           xpY:184,catchRate:45},
    raticate:  {name:'Raticate',  types:['normal'],          dexId:20,  hp:55, atk:81,def:60, spd:97,  moves:['tackle','quickAtk','hyperFang','bodySlam'],      xpY:145,catchRate:90},
    pidgeotto: {name:'Pidgeotto', types:['normal','flying'], dexId:17,  hp:63, atk:60,def:55, spd:71,  moves:['tackle','gust','wingAtk','quickAtk'],            xpY:122,catchRate:120,evolvesAt:36, evolvesInto:'pidgeot'},
    pidgeot:   {name:'Pidgeot',   types:['normal','flying'], dexId:18,  hp:83, atk:80,def:75, spd:101, moves:['gust','wingAtk','quickAtk','tackle'],            xpY:216,catchRate:45},
    metapod:   {name:'Metapod',   types:['bug'],             dexId:11,  hp:50, atk:20,def:55, spd:30,  moves:['tackle','stringShot'],                          xpY:72, catchRate:120,evolvesAt:10, evolvesInto:'butterfree'},
    butterfree: {name:'Butterfree',types:['bug','flying'],   dexId:12,  hp:60, atk:45,def:50, spd:70,  moves:['gust','tackle','wingAtk','stringShot'],          xpY:178,catchRate:45},
    kakuna:    {name:'Kakuna',    types:['bug','poison'],    dexId:14,  hp:45, atk:25,def:50, spd:35,  moves:['poisonSting','stringShot'],                     xpY:72, catchRate:120,evolvesAt:10, evolvesInto:'beedrill'},
    beedrill:  {name:'Beedrill',  types:['bug','poison'],    dexId:15,  hp:65, atk:90,def:40, spd:75,  moves:['poisonSting','tackle','bodySlam','quickAtk'],    xpY:178,catchRate:45},
    gloom:     {name:'Gloom',     types:['grass','poison'],  dexId:44,  hp:60, atk:65,def:70, spd:40,  moves:['absorb','poisonSting','razorLeaf','sludgeBomb'], xpY:138,catchRate:120},
    golduck:   {name:'Golduck',   types:['water'],           dexId:55,  hp:80, atk:82,def:78, spd:85,  moves:['waterGun','scratch','surf','bodySlam'],          xpY:174,catchRate:75},
    graveler:  {name:'Graveler',  types:['rock','ground'],   dexId:75,  hp:55, atk:95,def:115,spd:35,  moves:['tackle','rockThrow','bodySlam','mudSlap'],       xpY:164,catchRate:120},
    golbat:    {name:'Golbat',    types:['poison','flying'], dexId:42,  hp:75, atk:80,def:70, spd:90,  moves:['leechLife','tackle','wingAtk','poisonSting'],    xpY:171,catchRate:90},
    gyarados:  {name:'Gyarados',  types:['water','flying'],  dexId:130, hp:95, atk:125,def:79,spd:81,  moves:['waterGun','tackle','surf','bodySlam'],           xpY:214,catchRate:45},
    haunter:   {name:'Haunter',   types:['ghost','poison'],  dexId:93,  hp:45, atk:50,def:45, spd:95,  moves:['lick','shadowBall','poisonSting','tackle'],      xpY:126,catchRate:90},
    /* ── Additional wild Pokémon (Gen 1) ── */
    spearow:   {name:'Spearow',   types:['normal','flying'], dexId:21,  hp:40, atk:60,def:30, spd:70,  moves:['peck','growl'],                                  xpY:52, catchRate:255},
    ekans:     {name:'Ekans',     types:['poison'],          dexId:23,  hp:35, atk:60,def:44, spd:55,  moves:['poisonSting','leer'],                            xpY:58, catchRate:255},
    clefairy:  {name:'Clefairy',  types:['normal'],          dexId:35,  hp:70, atk:45,def:48, spd:35,  moves:['pound','growl'],                                 xpY:68, catchRate:150},
    vulpix:    {name:'Vulpix',    types:['fire'],            dexId:37,  hp:38, atk:41,def:40, spd:65,  moves:['ember','tailWhip'],                              xpY:60, catchRate:190},
    jigglypuff:{name:'Jigglypuff',types:['normal'],          dexId:39,  hp:115,atk:45,def:20, spd:20,  moves:['pound','growl'],                                 xpY:76, catchRate:170},
    paras:     {name:'Paras',     types:['bug','grass'],     dexId:46,  hp:35, atk:70,def:55, spd:25,  moves:['scratch','absorb'],                              xpY:57, catchRate:190},
    venonat:   {name:'Venonat',   types:['bug','poison'],    dexId:48,  hp:60, atk:55,def:50, spd:45,  moves:['tackle','poisonSting'],                          xpY:61, catchRate:190},
    meowth:    {name:'Meowth',    types:['normal'],          dexId:52,  hp:40, atk:45,def:35, spd:90,  moves:['scratch','growl'],                               xpY:69, catchRate:255},
    growlithe: {name:'Growlithe', types:['fire'],            dexId:58,  hp:55, atk:70,def:45, spd:60,  moves:['ember','bite'],                                  xpY:91, catchRate:190},
    poliwag:   {name:'Poliwag',   types:['water'],           dexId:60,  hp:40, atk:50,def:40, spd:90,  moves:['waterGun','tackle'],                             xpY:60, catchRate:255},
    bellsprout:{name:'Bellsprout',types:['grass','poison'],  dexId:69,  hp:50, atk:75,def:35, spd:40,  moves:['vineWhip','poisonSting'],                        xpY:60, catchRate:255},
    shellder:  {name:'Shellder',  types:['water'],           dexId:90,  hp:30, atk:65,def:100,spd:40,  moves:['tackle','waterGun'],                             xpY:61, catchRate:190},
    krabby:    {name:'Krabby',    types:['water'],           dexId:98,  hp:30, atk:105,def:90,spd:50,  moves:['tackle','waterGun'],                             xpY:65, catchRate:225},
    horsea:    {name:'Horsea',    types:['water'],           dexId:116, hp:30, atk:40,def:70, spd:60,  moves:['bubble','smokescreen'],                          xpY:59, catchRate:225},
    jynx:      {name:'Jynx',      types:['ice','psychic'],   dexId:124, hp:65, atk:50,def:35, spd:95,  moves:['pound','iceBeam'],                               xpY:137,catchRate:45},
    electabuzz:{name:'Electabuzz',types:['electric'],        dexId:125, hp:65, atk:83,def:57, spd:105, moves:['thunderShock','thunderbolt'],                    xpY:156,catchRate:45},
    magmar:    {name:'Magmar',    types:['fire'],            dexId:126, hp:65, atk:95,def:57, spd:93,  moves:['ember','flamethrower'],                          xpY:167,catchRate:45},
    dratini:   {name:'Dratini',   types:['dragon'],          dexId:147, hp:41, atk:64,def:45, spd:50,  moves:['tackle','dragonRage'],                           xpY:67, catchRate:45},
    /* ── Additional wild Pokémon (Gen 2) ── */
    sentret:   {name:'Sentret',   types:['normal'],          dexId:161, hp:35, atk:46,def:34, spd:20,  moves:['scratch','growl'],                               xpY:43, catchRate:255},
    hoothoot:  {name:'Hoothoot',  types:['normal','flying'], dexId:163, hp:60, atk:30,def:30, spd:50,  moves:['tackle','peck'],                                 xpY:52, catchRate:255},
    ledyba:    {name:'Ledyba',    types:['bug','flying'],    dexId:165, hp:40, atk:20,def:30, spd:55,  moves:['tackle','stringShot'],                           xpY:51, catchRate:255},
    spinarak:  {name:'Spinarak',  types:['bug','poison'],    dexId:167, hp:40, atk:60,def:40, spd:30,  moves:['poisonSting','stringShot'],                      xpY:51, catchRate:255},
    mareep:    {name:'Mareep',    types:['electric'],        dexId:179, hp:55, atk:40,def:40, spd:35,  moves:['thunderShock','growl'],                          xpY:56, catchRate:235},
    aipom:     {name:'Aipom',     types:['normal'],          dexId:190, hp:55, atk:70,def:55, spd:85,  moves:['scratch','quickAtk'],                            xpY:72, catchRate:45},
    wooper:    {name:'Wooper',    types:['water','ground'],  dexId:194, hp:55, atk:45,def:45, spd:15,  moves:['waterGun','mudSlap'],                            xpY:42, catchRate:255},
    misdreavus:{name:'Misdreavus',types:['ghost'],           dexId:200, hp:60, atk:60,def:60, spd:85,  moves:['lick','shadowBall'],                             xpY:147,catchRate:45},
    teddiursa: {name:'Teddiursa', types:['normal'],          dexId:216, hp:60, atk:80,def:50, spd:40,  moves:['scratch','tackle'],                              xpY:66, catchRate:190},
    slugma:    {name:'Slugma',    types:['fire'],            dexId:218, hp:40, atk:40,def:40, spd:20,  moves:['ember','tackle'],                                xpY:50, catchRate:190},
    swinub:    {name:'Swinub',    types:['ice','ground'],    dexId:220, hp:50, atk:50,def:40, spd:50,  moves:['tackle','mudSlap'],                              xpY:50, catchRate:225},
    snubbull:  {name:'Snubbull',  types:['normal'],          dexId:209, hp:60, atk:80,def:50, spd:30,  moves:['tackle','bite'],                                 xpY:63, catchRate:190},
    /* ── 50 more wild Pokémon (Gen 1/2/3) ── */
    /* Gen 1 */
    nidoranF:  {name:'Nidoran♀', types:['poison'],          dexId:29,  hp:55, atk:47,def:52, spd:41,  moves:['tackle','growl'],                                 xpY:55, catchRate:235},
    nidoranM:  {name:'Nidoran♂', types:['poison'],          dexId:32,  hp:46, atk:57,def:40, spd:50,  moves:['poisonSting','leer'],                             xpY:55, catchRate:235},
    mankey:    {name:'Mankey',   types:['fighting'],         dexId:56,  hp:40, atk:80,def:35, spd:70,  moves:['scratch','leer'],                                 xpY:61, catchRate:190},
    tentacool: {name:'Tentacool',types:['water','poison'],   dexId:72,  hp:40, atk:40,def:35, spd:70,  moves:['bubble','poisonSting'],                           xpY:67, catchRate:190},
    slowpoke:  {name:'Slowpoke', types:['water','psychic'],  dexId:79,  hp:90, atk:65,def:65, spd:15,  moves:['tackle','waterGun'],                              xpY:99, catchRate:190},
    magnemite: {name:'Magnemite',types:['electric','steel'], dexId:81,  hp:25, atk:35,def:70, spd:45,  moves:['thunderShock','tackle'],                          xpY:65, catchRate:190},
    doduo:     {name:'Doduo',    types:['normal','flying'],  dexId:84,  hp:35, atk:85,def:45, spd:75,  moves:['peck','growl'],                                   xpY:62, catchRate:190},
    seel:      {name:'Seel',     types:['water'],            dexId:86,  hp:65, atk:45,def:55, spd:45,  moves:['tackle','waterGun'],                              xpY:65, catchRate:190},
    grimer:    {name:'Grimer',   types:['poison'],           dexId:88,  hp:80, atk:80,def:50, spd:25,  moves:['tackle','sludgeBomb'],                            xpY:90, catchRate:190},
    drowzee:   {name:'Drowzee',  types:['psychic'],          dexId:96,  hp:60, atk:48,def:45, spd:42,  moves:['pound','confusion'],                              xpY:102,catchRate:190},
    voltorb:   {name:'Voltorb',  types:['electric'],         dexId:100, hp:40, atk:30,def:50, spd:100, moves:['thunderShock','tackle'],                          xpY:66, catchRate:190},
    exeggcute: {name:'Exeggcute',types:['grass','psychic'],  dexId:102, hp:60, atk:40,def:80, spd:40,  moves:['absorb','confusion'],                             xpY:98, catchRate:90},
    cubone:    {name:'Cubone',   types:['ground'],           dexId:104, hp:50, atk:50,def:95, spd:35,  moves:['tackle','mudSlap'],                               xpY:87, catchRate:190},
    lickitung: {name:'Lickitung',types:['normal'],           dexId:108, hp:90, atk:55,def:75, spd:30,  moves:['tackle','lick'],                                  xpY:127,catchRate:45},
    rhyhorn:   {name:'Rhyhorn',  types:['ground','rock'],    dexId:111, hp:80, atk:85,def:95, spd:25,  moves:['tackle','rockThrow'],                             xpY:135,catchRate:120},
    chansey:   {name:'Chansey',  types:['normal'],           dexId:113, hp:250,atk:5, def:5,  spd:50,  moves:['pound','growl'],                                  xpY:395,catchRate:30},
    tangela:   {name:'Tangela',  types:['grass'],            dexId:114, hp:65, atk:55,def:115,spd:60,  moves:['absorb','vineWhip'],                              xpY:87, catchRate:45},
    kangaskhan:{name:'Kangaskhan',types:['normal'],          dexId:115, hp:105,atk:95,def:80, spd:90,  moves:['tackle','bodySlam'],                              xpY:175,catchRate:45},
    scyther:   {name:'Scyther',  types:['bug','flying'],     dexId:123, hp:70, atk:110,def:80,spd:105, moves:['tackle','wingAtk'],                               xpY:187,catchRate:45},
    lapras:    {name:'Lapras',   types:['water','ice'],      dexId:131, hp:130,atk:85,def:80, spd:60,  moves:['waterGun','iceBeam'],                             xpY:219,catchRate:45},
    eevee2:    {name:'Porygon',  types:['normal'],           dexId:137, hp:65, atk:60,def:70, spd:40,  moves:['tackle','psybeam'],                               xpY:130,catchRate:45},
    omanyte:   {name:'Omanyte',  types:['rock','water'],     dexId:138, hp:35, atk:40,def:100,spd:35,  moves:['waterGun','tackle'],                              xpY:120,catchRate:45},
    kabuto:    {name:'Kabuto',   types:['rock','water'],     dexId:140, hp:30, atk:80,def:90, spd:55,  moves:['tackle','rockThrow'],                             xpY:119,catchRate:45},
    aerodactyl:{name:'Aerodactyl',types:['rock','flying'],   dexId:142, hp:80, atk:105,def:65,spd:130, moves:['tackle','rockThrow','wingAtk','bite'],            xpY:202,catchRate:45},
    snorlax:   {name:'Snorlax',  types:['normal'],           dexId:143, hp:160,atk:110,def:65,spd:30,  moves:['tackle','bodySlam','lick','growl'],               xpY:154,catchRate:25},
    /* Gen 2 */
    flaaffy:   {name:'Flaaffy',  types:['electric'],         dexId:180, hp:70, atk:55,def:55, spd:45,  moves:['thunderShock','tackle','thunderbolt','growl'],    xpY:128,catchRate:120},
    marill:    {name:'Marill',   types:['water','fairy'],    dexId:183, hp:70, atk:20,def:50, spd:40,  moves:['tackle','waterGun','bubble','growl'],             xpY:88, catchRate:190},
    sudowoodo: {name:'Sudowoodo',types:['rock'],             dexId:185, hp:70, atk:100,def:115,spd:30, moves:['tackle','rockThrow','bodySlam'],                  xpY:144,catchRate:65},
    politoed:  {name:'Hoppip',   types:['grass','flying'],   dexId:187, hp:35, atk:35,def:35, spd:50,  moves:['tackle','absorb','gust'],                         xpY:50, catchRate:255},
    yanma:     {name:'Yanma',    types:['bug','flying'],     dexId:193, hp:65, atk:65,def:45, spd:95,  moves:['tackle','gust','wingAtk','bite'],                 xpY:78, catchRate:75},
    espeon:    {name:'Quagsire', types:['water','ground'],   dexId:195, hp:95, atk:85,def:85, spd:35,  moves:['waterGun','mudSlap','tackle','bodySlam'],         xpY:119,catchRate:90},
    umbreon:   {name:'Murkrow',  types:['dark','flying'],    dexId:198, hp:60, atk:85,def:42, spd:91,  moves:['peck','bite','tackle','leer'],                    xpY:107,catchRate:30},
    slowking:  {name:'Slowking', types:['water','psychic'],  dexId:199, hp:95, atk:75,def:80, spd:30,  moves:['waterGun','confusion','tackle','psychic'],        xpY:164,catchRate:70},
    girafarig: {name:'Girafarig',types:['normal','psychic'], dexId:203, hp:70, atk:80,def:65, spd:85,  moves:['tackle','psybeam','confusion','bite'],            xpY:108,catchRate:60},
    pineco:    {name:'Pineco',   types:['bug'],              dexId:204, hp:50, atk:65,def:90, spd:15,  moves:['tackle','stringShot','bodySlam'],                 xpY:58, catchRate:190},
    heracross: {name:'Heracross',types:['bug','fighting'],   dexId:214, hp:80, atk:125,def:75,spd:85,  moves:['tackle','bite','bodySlam','hornAtk'],             xpY:200,catchRate:45},
    sneasel:   {name:'Sneasel',  types:['dark','ice'],       dexId:215, hp:55, atk:95,def:55, spd:115, moves:['scratch','bite','quickAtk','leer'],               xpY:132,catchRate:35},
    /* Gen 3 */
    poochyena: {name:'Poochyena',types:['dark'],             dexId:261, hp:35, atk:55,def:35, spd:35,  moves:['tackle','bite'],                                  xpY:56, catchRate:255},
    zigzagoon: {name:'Zigzagoon',types:['normal'],           dexId:263, hp:38, atk:30,def:41, spd:60,  moves:['tackle','growl'],                                 xpY:56, catchRate:255},
    wurmple:   {name:'Wurmple',  types:['bug'],              dexId:265, hp:45, atk:45,def:35, spd:20,  moves:['tackle','stringShot','poisonSting'],              xpY:56, catchRate:255},
    lotad:     {name:'Lotad',    types:['water','grass'],    dexId:270, hp:40, atk:30,def:30, spd:30,  moves:['absorb','bubble','waterGun'],                     xpY:44, catchRate:255},
    taillow:   {name:'Taillow',  types:['normal','flying'],  dexId:276, hp:40, atk:55,def:30, spd:85,  moves:['peck','growl','wingAtk'],                         xpY:54, catchRate:200},
    shroomish: {name:'Shroomish',types:['grass'],            dexId:285, hp:60, atk:40,def:60, spd:35,  moves:['tackle','absorb','vineWhip'],                     xpY:59, catchRate:255},
    makuhita:  {name:'Makuhita', types:['fighting'],         dexId:296, hp:72, atk:60,def:30, spd:25,  moves:['tackle','bodySlam','leer'],                       xpY:47, catchRate:180},
    nosepass:  {name:'Nosepass', types:['rock'],             dexId:299, hp:30, atk:45,def:135,spd:30,  moves:['tackle','rockThrow'],                             xpY:75, catchRate:255},
    skitty:    {name:'Skitty',   types:['normal'],           dexId:300, hp:50, atk:45,def:45, spd:50,  moves:['tackle','growl','pound'],                         xpY:52, catchRate:255},
    electrike: {name:'Electrike',types:['electric'],         dexId:309, hp:40, atk:45,def:40, spd:65,  moves:['thunderShock','tackle','leer'],                   xpY:59, catchRate:120},
    roselia:   {name:'Roselia',  types:['grass','poison'],   dexId:315, hp:50, atk:60,def:45, spd:65,  moves:['vineWhip','poisonSting','absorb','razorLeaf'],    xpY:140,catchRate:150},
    carvanha:  {name:'Carvanha', types:['water','dark'],     dexId:318, hp:45, atk:90,def:20, spd:65,  moves:['waterGun','bite','tackle'],                       xpY:61, catchRate:225},
    numel:     {name:'Numel',    types:['fire','ground'],    dexId:322, hp:60, atk:60,def:40, spd:35,  moves:['ember','tackle','mudSlap'],                       xpY:61, catchRate:255},
    spoink:    {name:'Spoink',   types:['psychic'],          dexId:325, hp:60, atk:40,def:40, spd:60,  moves:['psybeam','tackle','confusion'],                   xpY:75, catchRate:255},
    swablu:    {name:'Swablu',   types:['normal','flying'],  dexId:333, hp:45, atk:40,def:60, spd:50,  moves:['peck','growl','wingAtk','tackle'],                xpY:62, catchRate:255},
    zangoose:  {name:'Zangoose', types:['normal'],           dexId:335, hp:73, atk:115,def:60,spd:90,  moves:['scratch','quickAtk','bodySlam','bite'],           xpY:160,catchRate:90},
    seviper:   {name:'Seviper',  types:['poison'],           dexId:336, hp:73, atk:100,def:60,spd:65,  moves:['poisonSting','bite','sludgeBomb','tackle'],       xpY:160,catchRate:90},
    trapinch:  {name:'Trapinch', types:['ground'],           dexId:328, hp:45, atk:100,def:45,spd:10,  moves:['tackle','bite','mudSlap'],                        xpY:58, catchRate:255},
    cacnea:    {name:'Cacnea',   types:['grass'],            dexId:331, hp:50, atk:85,def:40, spd:35,  moves:['absorb','tackle','vineWhip','poisonSting'],       xpY:67, catchRate:190},
    absol:     {name:'Absol',    types:['dark'],             dexId:359, hp:65, atk:130,def:60,spd:75,  moves:['scratch','bite','bodySlam','quickAtk'],           xpY:163,catchRate:30},
    wynaut:    {name:'Wynaut',   types:['psychic'],          dexId:360, hp:95, atk:23,def:48, spd:23,  moves:['tackle','confusion'],                             xpY:52, catchRate:125},
    bagon:     {name:'Bagon',    types:['dragon'],           dexId:371, hp:45, atk:75,def:60, spd:50,  moves:['tackle','dragonRage','bite'],                     xpY:60, catchRate:45},
    beldum:    {name:'Beldum',   types:['steel','psychic'],  dexId:374, hp:40, atk:55,def:80, spd:30,  moves:['tackle'],                                         xpY:151,catchRate:3},
  };
  const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
  function spriteUrl(speciesId, back=false){ const id=SP[speciesId]&&SP[speciesId].dexId; return id ? `${SPRITE_BASE}${back?'/back/':'/'}`+id+'.png' : ''; }

  /* ── MOVE DATA ── */
  const MV = {
    tackle:      {name:'Tackle',       type:'normal',  power:40, acc:100,cat:'physical',pp:35},
    scratch:     {name:'Scratch',      type:'normal',  power:40, acc:100,cat:'physical',pp:35},
    pound:       {name:'Pound',        type:'normal',  power:40, acc:100,cat:'physical',pp:35},
    quickAtk:    {name:'Quick Atk',    type:'normal',  power:40, acc:100,cat:'physical',pp:30},
    growl:       {name:'Growl',        type:'normal',  power:0,  acc:100,cat:'status',  pp:40, eff:'atkDown'},
    tailWhip:    {name:'Tail Whip',    type:'normal',  power:0,  acc:100,cat:'status',  pp:30, eff:'defDown'},
    leer:        {name:'Leer',         type:'normal',  power:0,  acc:100,cat:'status',  pp:30, eff:'defDown'},
    sandAtk:     {name:'Sand Attack',  type:'normal',  power:0,  acc:100,cat:'status',  pp:15, eff:'accDown'},
    smokescreen: {name:'Smokescreen',  type:'normal',  power:0,  acc:100,cat:'status',  pp:20, eff:'accDown'},
    splash:      {name:'Splash',       type:'normal',  power:0,  acc:100,cat:'status',  pp:40},
    thunderShock:{name:'Thunder Shock',type:'electric',power:40, acc:100,cat:'special', pp:30},
    vineWhip:    {name:'Vine Whip',    type:'grass',   power:45, acc:100,cat:'physical',pp:25},
    razorLeaf:   {name:'Razor Leaf',   type:'grass',   power:55, acc:95, cat:'physical',pp:25},
    absorb:      {name:'Absorb',       type:'grass',   power:20, acc:100,cat:'special', pp:25,drain:true},
    waterGun:    {name:'Water Gun',    type:'water',   power:40, acc:100,cat:'special', pp:25},
    ember:       {name:'Ember',        type:'fire',    power:40, acc:100,cat:'special', pp:25},
    gust:        {name:'Gust',         type:'flying',  power:40, acc:100,cat:'special', pp:35},
    rockThrow:   {name:'Rock Throw',   type:'rock',    power:50, acc:90, cat:'physical',pp:15},
    poisonSting: {name:'Poison Sting', type:'poison',  power:15, acc:100,cat:'physical',pp:35},
    lick:        {name:'Lick',         type:'ghost',   power:30, acc:100,cat:'physical',pp:30},
    mudSlap:     {name:'Mud-Slap',     type:'ground',  power:20, acc:100,cat:'special', pp:10,eff:'accDown'},
    leechLife:   {name:'Leech Life',   type:'bug',     power:80, acc:100,cat:'physical',pp:10,drain:true},
    stringShot:  {name:'String Shot',  type:'bug',     power:0,  acc:95, cat:'status',  pp:40,eff:'spdDown'},
    thunderbolt: {name:'Thunderbolt',  type:'electric',power:90, acc:100,cat:'special', pp:15},
    bodySlam:    {name:'Body Slam',    type:'normal',  power:85, acc:100,cat:'physical',pp:15},
    hyperFang:   {name:'Hyper Fang',   type:'normal',  power:80, acc:90, cat:'physical',pp:15},
    wingAtk:     {name:'Wing Attack',  type:'flying',  power:60, acc:100,cat:'physical',pp:35},
    surf:        {name:'Surf',         type:'water',   power:90, acc:100,cat:'special', pp:15},
    flamethrower:{name:'Flamethrower', type:'fire',    power:90, acc:100,cat:'special', pp:15},
    hydropump:   {name:'Hydro Pump',   type:'water',   power:110,acc:80, cat:'special', pp:5},
    solarBeam:   {name:'Solar Beam',   type:'grass',   power:120,acc:100,cat:'special', pp:10},
    shadowBall:  {name:'Shadow Ball',  type:'ghost',   power:80, acc:100,cat:'special', pp:15},
    sludgeBomb:  {name:'Sludge Bomb',  type:'poison',  power:90, acc:100,cat:'special', pp:10},
    peck:        {name:'Peck',         type:'flying',  power:35, acc:100,cat:'physical',pp:35},
    bite:        {name:'Bite',         type:'dark',    power:60, acc:100,cat:'physical',pp:25},
    psybeam:     {name:'Psybeam',      type:'psychic', power:65, acc:100,cat:'special', pp:20},
    iceBeam:     {name:'Ice Beam',     type:'ice',     power:90, acc:100,cat:'special', pp:10},
    dragonRage:  {name:'Dragon Rage',  type:'dragon',  power:40, acc:100,cat:'special', pp:10},
    confusion:   {name:'Confusion',    type:'psychic', power:50, acc:100,cat:'special', pp:25},
    bubble:      {name:'Bubble',       type:'water',   power:40, acc:100,cat:'special', pp:30},
    hornAtk:     {name:'Horn Attack',  type:'normal',  power:65, acc:100,cat:'physical',pp:25},
    psychic:     {name:'Psychic',      type:'psychic', power:90, acc:100,cat:'special', pp:10},
  };

  const TYPE_COLORS = {normal:'#A8A878',electric:'#F8D030',fire:'#F08030',water:'#6890F0',
    grass:'#78C850',poison:'#A040A0',rock:'#B8A038',ground:'#E0C068',
    flying:'#A890F0',bug:'#A8B820',ghost:'#705898',
    psychic:'#F85888',ice:'#98D8D8',dark:'#705848',dragon:'#7038F8'};

  // Extended type glow colors for visual fx (more vivid than TYPE_COLORS)
  const TYPE_FX = {
    normal:'rgba(200,200,180,0.7)',   electric:'rgba(255,230,0,0.85)',
    fire:'rgba(255,100,0,0.85)',      water:'rgba(40,140,255,0.85)',
    grass:'rgba(80,220,80,0.85)',     poison:'rgba(180,40,220,0.85)',
    rock:'rgba(180,150,60,0.8)',      ground:'rgba(220,180,80,0.8)',
    flying:'rgba(200,180,255,0.7)',   bug:'rgba(160,220,30,0.8)',
    ghost:'rgba(100,60,180,0.85)',    psychic:'rgba(250,80,150,0.85)',
    ice:'rgba(150,240,255,0.85)',     dark:'rgba(90,70,50,0.8)',
    dragon:'rgba(100,50,255,0.85)',
  };

  function updateCoinsDisplay(){
    const el=document.getElementById('pk-coins');
    if(el) el.textContent='💰 '+coins.toLocaleString();
  }
  function earnCoins(amount){
    coins+=amount;
    updateCoinsDisplay();
    saveGame();
  }

  function flashMove(defIsEnemy, type){
    const id=defIsEnemy?'pk-flash-enemy':'pk-flash-player';
    const el=document.getElementById(id); if(!el)return;
    const col=TYPE_FX[type]||TYPE_FX.normal;
    el.style.background=`radial-gradient(circle, ${col} 0%, transparent 70%)`;
    el.classList.remove('pk-flash-active');
    // Force reflow so animation restarts
    void el.offsetWidth;
    el.classList.add('pk-flash-active');
    el.addEventListener('animationend',()=>el.classList.remove('pk-flash-active'),{once:true});
  }

  const TYPE_EFF = {
    fire:    {fire:0.5,water:0.5,grass:2,bug:2,rock:0.5},
    water:   {fire:2,water:0.5,grass:0.5,rock:2,ground:2},
    grass:   {fire:0.5,water:2,grass:0.5,poison:0.5,ground:2,rock:2,bug:0.5,flying:0.5},
    electric:{water:2,grass:0.5,electric:0.5,ground:0,flying:2},
    normal:  {rock:0.5,ghost:0},
    ghost:   {normal:0,ghost:2},
    poison:  {grass:2,poison:0.5,ground:0.5,ghost:0.5},
    rock:    {fire:2,flying:2,bug:2,ground:0.5},
    ground:  {electric:2,fire:2,grass:0.5,rock:2,bug:0.5},
    bug:     {fire:0.5,grass:2,poison:0.5,flying:0.5,ghost:0.5},
    flying:  {electric:0.5,grass:2,rock:0.5},
  };

  const ZONES = {
    route1:  ['rattata','pidgey','caterpie','weedle','spearow','meowth','sentret','hoothoot',
               'zigzagoon','poochyena','skitty','wurmple','taillow','rattata','pidgey','spearow'],
    forest:  ['caterpie','weedle','oddish','zubat','gastly','paras','venonat','bellsprout',
               'spinarak','ledyba','misdreavus','shroomish','cacnea','pineco','yanma','exeggcute'],
    rocky:   ['geodude','geodude','zubat','rattata','ekans','growlithe','teddiursa','snubbull',
               'slugma','rhyhorn','nosepass','sudowoodo','cubone','trapinch','nidoranM','nidoranF'],
    shore:   ['psyduck','magikarp','magikarp','oddish','poliwag','shellder','krabby','horsea',
               'wooper','tentacool','seel','lotad','marill','carvanha','omanyte','kabuto'],
    route2:  ['rattata','pidgey','psyduck','oddish','weedle','clefairy','jigglypuff','vulpix',
               'mareep','aipom','mankey','drowzee','voltorb','electrike','spoink','swablu'],
    route3:  ['oddish','zubat','gastly','pidgey','rattata','spearow','hoothoot','swinub',
               'snubbull','grimer','lickitung','wynaut','slowpoke','girafarig','roselia','numel'],
    rare:    ['electabuzz','magmar','dratini','jynx','clefairy','misdreavus','growlithe',
               'snorlax','lapras','chansey','heracross','scyther','absol','zangoose','seviper',
               'aerodactyl','bagon','beldum','sneasel','kangaskhan','magnemite','doduo'],
  };

  /* ── STATE ── */
  let canvas, ctx, animFrame;
  let player = null, team = [], worldMap = null;
  let camX = 0, camY = 0;
  let keys = {}, dpad = {up:false,down:false,left:false,right:false};
  let moveThrottle = 0, lastTileKey = null;
  let battle = null, battleLocked = false;
  let _kdown, _kup;
  let mapItems = [];          // HP restore items + Pokéballs on the overworld
  let pcCooldown = 0;         // ms until PC can heal again
  let itemToast = null;       // {text, expires, color}
  let pokeballs = 5;          // player starts with 5 Pokéballs
  let coins = 0;              // in-game currency
  let totalCaught = 0;        // all-time Pokémon catch count
  // Pokémon Center entrance: center-path tiles x=25, y=30-33
  const PC_TILES = [{x:25,y:30},{x:25,y:31},{x:25,y:32},{x:25,y:33}];
  const ITEM_TYPES = {
    POTION:       {name:'Potion',       heal:20,   color:'#ff80b0',glow:'rgba(255,128,176,0.4)'},
    SUPER_POTION: {name:'Super Potion', heal:50,   color:'#ff40a0',glow:'rgba(255,64,160,0.4)'},
    FULL_RESTORE: {name:'Full Restore', heal:9999, color:'#ffd700',glow:'rgba(255,215,0,0.4)'},
    POKEBALL:     {name:'Poké Ball',    heal:0,    color:'#ff3030',glow:'rgba(255,48,48,0.4)'},
    GREAT_BALL:   {name:'Great Ball',   heal:0,    color:'#4488ff',glow:'rgba(68,136,255,0.4)'},
  };

  /* ── MAP GENERATION ── */
  function generateMap() {
    const m = Array.from({length:MAP_H}, () => new Array(MAP_W).fill(T.TREE));
    const fill = (x1,y1,x2,y2,tile) => {
      for(let y=Math.max(0,y1);y<=Math.min(MAP_H-1,y2);y++)
        for(let x=Math.max(0,x1);x<=Math.min(MAP_W-1,x2);x++) m[y][x]=tile;
    };
    fill(2,2,MAP_W-3,MAP_H-3,T.GRASS);
    // Lake top-center
    fill(19,2,30,9,T.WATER);
    fill(16,9,33,10,T.SAND); fill(16,2,18,9,T.SAND); fill(31,2,33,9,T.SAND);
    fill(14,10,18,13,T.TALL); fill(31,10,35,13,T.TALL);
    // Starting town
    fill(20,29,30,MAP_H-3,T.PATH);
    fill(21,30,24,33,T.BUILDING); fill(26,30,29,33,T.BUILDING);
    fill(21,34,24,37,T.BUILDING); fill(26,34,29,37,T.BUILDING);
    fill(19,29,19,MAP_H-3,T.TREE); fill(31,29,31,MAP_H-3,T.TREE);
    fill(23,25,26,29,T.PATH);
    // Route 1 north
    fill(23,11,26,28,T.PATH);
    fill(20,13,22,27,T.TALL); fill(27,13,29,27,T.TALL);
    // Western forest
    fill(3,13,18,27,T.TALL);
    for(let y=13;y<=27;y+=4) for(let x=3;x<=17;x+=5) m[y][x]=T.TREE;
    fill(9,22,22,24,T.PATH); fill(9,20,22,21,T.TALL); fill(9,25,22,26,T.TALL);
    // Eastern rocky
    fill(30,13,46,27,T.ROCK);
    fill(30,17,46,19,T.PATH); fill(30,13,32,27,T.PATH);
    fill(33,13,46,15,T.TALL); fill(33,21,46,24,T.TALL);
    fill(27,20,30,22,T.PATH); fill(27,18,30,19,T.TALL); fill(27,23,30,24,T.TALL);
    // Hard borders
    fill(0,0,MAP_W-1,1,T.TREE); fill(0,MAP_H-2,MAP_W-1,MAP_H-1,T.TREE);
    fill(0,0,1,MAP_H-1,T.TREE); fill(MAP_W-2,0,MAP_W-1,MAP_H-1,T.TREE);
    fill(23,38,26,39,T.PATH);
    return m;
  }

  function getTile(tx,ty){ return (tx<0||ty<0||tx>=MAP_W||ty>=MAP_H) ? T.TREE : worldMap[ty][tx]; }
  function isSolid(tx,ty){ const t=getTile(tx,ty); return t===T.TREE||t===T.BUILDING||t===T.WATER; }

  /* ── ITEMS ── */
  function initMapItems(){
    mapItems = [
      // Potions scattered around the route and forest
      {tx:24,ty:15,type:'POTION'},{tx:26,ty:20,type:'POTION'},
      {tx:12,ty:18,type:'POTION'},{tx:8,ty:22,type:'POTION'},
      {tx:15,ty:24,type:'POTION'},{tx:32,ty:18,type:'POTION'},
      {tx:38,ty:17,type:'POTION'},{tx:40,ty:22,type:'POTION'},
      // Super Potions in harder areas
      {tx:5,ty:16,type:'SUPER_POTION'},{tx:10,ty:25,type:'SUPER_POTION'},
      {tx:35,ty:14,type:'SUPER_POTION'},{tx:42,ty:23,type:'SUPER_POTION'},
      // Full Restore — rare, near lake shore
      {tx:22,ty:10,type:'FULL_RESTORE'},{tx:27,ty:11,type:'FULL_RESTORE'},
      // Pokéballs scattered around routes
      {tx:23,ty:17,type:'POKEBALL'},{tx:25,ty:22,type:'POKEBALL'},
      {tx:14,ty:15,type:'POKEBALL'},{tx:7,ty:20,type:'POKEBALL'},
      {tx:36,ty:16,type:'POKEBALL'},{tx:43,ty:21,type:'POKEBALL'},
      // Great Balls in tougher zones
      {tx:6,ty:25,type:'GREAT_BALL'},{tx:44,ty:14,type:'GREAT_BALL'},
    ].map(it=>({...it,collected:false}));
  }

  function showToast(text,color,duration=2200){
    if(!canvas)return;
    itemToast={text,color:color||'#ffd700',expires:Date.now()+duration};
  }

  function checkItemPickup(tx,ty){
    for(const item of mapItems){
      if(item.collected)continue;
      if(Math.abs(item.tx-tx)<=0 && Math.abs(item.ty-ty)<=0){
        item.collected=true;
        const it=ITEM_TYPES[item.type];
        if(!it)return;
        if(item.type==='POKEBALL'||item.type==='GREAT_BALL'){
          pokeballs++;
          showToast(`Found a ${it.name}! (${pokeballs} total)`,it.color);
        } else if(team.length>0){
          const target=team.find(p=>p.hp>0)||team[0];
          const before=target.hp;
          target.hp=Math.min(target.maxHp, target.hp+it.heal);
          showToast(`Found ${it.name}! ${target.name} +${target.hp-before} HP`,it.color);
        }
        return;
      }
    }
  }

  function checkPokeCenter(tx,ty){
    if(battle||pcCooldown>Date.now())return;
    const atPC=PC_TILES.some(p=>p.x===tx&&p.y===ty);
    if(!atPC)return;
    const needsHeal=team.some(p=>p.hp<p.maxHp);
    if(!needsHeal)return;
    pcCooldown=Date.now()+3000; // 3 s cooldown before prompting again
    healAtCenter();
  }

  function healAtCenter(){
    // Animate HP bars filling over 1.5 s then show toast
    const steps=20, interval=75;
    let step=0;
    showToast('🏥 Welcome to the Pokémon Center!','#ff80b0',2000);
    const timer=setInterval(()=>{
      step++;
      team.forEach(p=>{ p.hp=Math.min(p.maxHp, p.hp+Math.ceil(p.maxHp/steps)); });
      if(step>=steps){
        team.forEach(p=>{ p.hp=p.maxHp; });
        clearInterval(timer);
        showToast('✨ Your Pokémon are fully healed!','#00ff88',2000);
        saveGame();
      }
    },interval);
  }

  /* ── DRAW ITEMS ON OVERWORLD ── */
  function drawMapItems(){
    const now=Date.now();
    mapItems.forEach(item=>{
      if(item.collected)return;
      const it=ITEM_TYPES[item.type]; if(!it)return;
      const sx=item.tx*TSIZE-camX+TSIZE/2, sy=item.ty*TSIZE-camY+TSIZE/2;
      if(sx<-16||sx>canvas.width+16||sy<-16||sy>canvas.height+16)return;
      // Glow pulse
      const pulse=0.5+0.5*Math.sin(now/400);
      ctx.save();
      ctx.globalAlpha=0.35+0.25*pulse;
      ctx.fillStyle=it.glow;
      ctx.beginPath(); ctx.arc(sx,sy,10+4*pulse,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=1;
      ctx.fillStyle=it.color;
      ctx.beginPath(); ctx.arc(sx,sy,5,0,Math.PI*2); ctx.fill();
      // Sparkle cross
      ctx.strokeStyle='#fff'; ctx.lineWidth=1; ctx.globalAlpha=0.7;
      ctx.beginPath(); ctx.moveTo(sx-8,sy); ctx.lineTo(sx+8,sy);
      ctx.moveTo(sx,sy-8); ctx.lineTo(sx,sy+8); ctx.stroke();
      ctx.restore();
    });
  }

  /* ── DRAW TOAST NOTIFICATION ── */
  function drawToast(){
    if(!itemToast||Date.now()>itemToast.expires)return;
    const alpha=Math.min(1,(itemToast.expires-Date.now())/300);
    ctx.save(); ctx.globalAlpha=alpha;
    ctx.fillStyle='rgba(10,5,30,0.88)';
    ctx.font='bold 13px "Exo 2",sans-serif';
    const tw=ctx.measureText(itemToast.text).width+24;
    const tx2=(canvas.width-tw)/2, ty2=18;
    if(ctx.roundRect){ctx.beginPath();ctx.roundRect(tx2,ty2,tw,28,6);ctx.fill();}
    else ctx.fillRect(tx2,ty2,tw,28);
    ctx.strokeStyle=itemToast.color; ctx.lineWidth=2;
    if(ctx.roundRect){ctx.beginPath();ctx.roundRect(tx2,ty2,tw,28,6);ctx.stroke();}
    ctx.fillStyle='#fff'; ctx.textBaseline='middle';
    ctx.fillText(itemToast.text,tx2+12,ty2+14);
    ctx.restore();
  }

  /* ── DRAW POKÉMON CENTER SIGN ── */
  function drawPCSign(){
    // Draw "PC" label on the upper-right building tile (x=26-29,y=30-33)
    const sx=27*TSIZE-camX, sy=30*TSIZE-camY;
    if(sx<-80||sx>canvas.width+80||sy<-80||sy>canvas.height+80)return;
    ctx.save();
    ctx.fillStyle='rgba(255,100,160,0.92)';
    ctx.font='bold 9px monospace';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('🏥 P.C.',sx+2*TSIZE,sy+1.5*TSIZE);
    ctx.restore();
  }
  function getZone(tx,ty){
    // Deep forest top — rare powerful Pokémon
    if(tx>=3&&tx<=18&&ty>=13&&ty<=17)   return 'rare';
    if(tx>=14&&tx<=35&&ty>=10&&ty<=13)  return 'shore';
    if(tx>=3&&tx<=18&&ty>=13&&ty<=27)   return 'forest';
    if(tx>=33&&tx<=46&&ty>=13&&ty<=27)  return 'rocky';
    if(tx>=9&&tx<=22&&(ty===20||ty===21||ty===25||ty===26)) return 'route3';
    if(tx>=27&&tx<=30&&(ty===18||ty===19||ty===23||ty===24)) return 'route2';
    return 'route1';
  }

  /* ── RENDERING ── */
  function drawTile(sx,sy,tile,tx,ty){
    ctx.fillStyle = TILE_COLORS[tile]; ctx.fillRect(sx,sy,TSIZE,TSIZE);
    if(tile===T.GRASS && (tx+ty)%2===0){ ctx.fillStyle='rgba(0,60,0,0.07)'; ctx.fillRect(sx,sy,TSIZE,TSIZE); }
    else if(tile===T.TALL){
      ctx.fillStyle='#1a5c1a';
      ctx.fillRect(sx+4,sy+8,3,8); ctx.fillRect(sx+10,sy+6,3,10);
      ctx.fillRect(sx+18,sy+9,3,7); ctx.fillRect(sx+24,sy+7,3,9);
    } else if(tile===T.TREE){
      ctx.fillStyle='#2a1a08'; ctx.fillRect(sx+TSIZE/2-4,sy+TSIZE/2,8,TSIZE/2);
      ctx.fillStyle='#1a4a10'; ctx.beginPath(); ctx.arc(sx+TSIZE/2,sy+TSIZE/2,TSIZE/2-2,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#2d6b20'; ctx.beginPath(); ctx.arc(sx+TSIZE/2-5,sy+TSIZE/2-4,TSIZE/3,0,Math.PI*2); ctx.fill();
    } else if(tile===T.WATER){
      const s=Math.sin(Date.now()/800+tx*0.5+ty*0.3)*0.12+0.88;
      ctx.fillStyle=`rgba(30,120,180,${s*0.28})`; ctx.fillRect(sx,sy+TSIZE/2,TSIZE,TSIZE/2);
    } else if(tile===T.BUILDING){
      ctx.fillStyle='#c87840'; ctx.fillRect(sx,sy,TSIZE,TSIZE/2-2);
      ctx.fillStyle='#e0c8a0'; ctx.fillRect(sx,sy+TSIZE/2-2,TSIZE,TSIZE/2+2);
      ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.fillRect(sx+TSIZE/2-4,sy+TSIZE/2+4,8,10);
    } else if(tile===T.PATH && (tx+ty)%2===0){
      ctx.fillStyle='rgba(0,0,0,0.05)'; ctx.fillRect(sx,sy,TSIZE,TSIZE);
    } else if(tile===T.ROCK){
      ctx.fillStyle='rgba(0,0,0,0.12)';
      ctx.fillRect(sx+2,sy+4,8,6); ctx.fillRect(sx+16,sy+12,9,5); ctx.fillRect(sx+7,sy+21,7,5);
    }
  }

  function drawPlayerChar(sx,sy){
    const cx=Math.round(sx), cy=Math.round(sy);
    const moving=player.moving, frame=player.frame||0;
    ctx.fillStyle='rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(cx+CHAR_S/2,cy+CHAR_S+2,CHAR_S/2,3,0,0,Math.PI*2); ctx.fill();
    const la=moving?(frame%2===0?3:-1):0, lb=moving?(frame%2===0?-1:3):0;
    ctx.fillStyle='#221610'; ctx.fillRect(cx+3,cy+16,4,6+la); ctx.fillRect(cx+9,cy+16,4,6+lb);
    ctx.fillStyle='#3366cc'; ctx.fillRect(cx+2,cy+8,CHAR_S-4,10);
    const ao=moving?(frame%2===0?2:-2):0;
    ctx.fillStyle='#3366cc'; ctx.fillRect(cx-3,cy+9+ao,4,6); ctx.fillRect(cx+CHAR_S-1,cy+9-ao,4,6);
    ctx.fillStyle='#f5c28a'; ctx.fillRect(cx+4,cy+1,8,9);
    ctx.fillStyle='#1a1010'; ctx.fillRect(cx+5,cy+4,2,2); ctx.fillRect(cx+9,cy+4,2,2);
    ctx.fillStyle='#cc2222'; ctx.fillRect(cx+3,cy,10,3);
  }

  function drawOverworld(){
    if(!canvas||!ctx) return;
    const W=canvas.width, H=canvas.height;
    ctx.clearRect(0,0,W,H);
    const tpx=Math.round(player.x-W/2+CHAR_S/2);
    const tpy=Math.round(player.y-H/2+CHAR_S/2);
    camX=Math.max(0,Math.min(tpx,MAP_W*TSIZE-W));
    camY=Math.max(0,Math.min(tpy,MAP_H*TSIZE-H));
    const tx0=Math.floor(camX/TSIZE), ty0=Math.floor(camY/TSIZE);
    const tx1=Math.min(MAP_W-1,tx0+Math.ceil(W/TSIZE)+1);
    const ty1=Math.min(MAP_H-1,ty0+Math.ceil(H/TSIZE)+1);
    for(let ty=ty0;ty<=ty1;ty++)
      for(let tx=tx0;tx<=tx1;tx++)
        drawTile(tx*TSIZE-camX, ty*TSIZE-camY, getTile(tx,ty), tx, ty);
    drawMapItems();
    drawPCSign();
    drawPlayerChar(player.x-camX, player.y-camY);
    drawToast();
  }

  /* ── POKEMON INSTANCES ── */
  function xpForLevel(lvl){ return Math.floor(0.5*lvl*lvl*lvl); }
  function calcStats(sid,lvl){
    const s=SP[sid];
    return { maxHp:Math.floor(2*s.hp*lvl/100+lvl+10), atk:Math.floor(2*s.atk*lvl/100+5),
             def:Math.floor(2*s.def*lvl/100+5), spd:Math.floor(2*s.spd*lvl/100+5) };
  }
  function mkMon(sid,lvl,xp=0){
    const s=SP[sid], st=calcStats(sid,lvl);
    return { speciesId:sid, level:lvl, name:s.name, emoji:s.emoji, types:s.types,
             hp:st.maxHp, maxHp:st.maxHp, atk:st.atk, def:st.def, spd:st.spd,
             moves:s.moves.map(m=>({id:m,pp:MV[m].pp,maxPp:MV[m].pp})),
             xp, xpToNext:xpForLevel(lvl+1),
             atkStg:0, defStg:0, spdStg:0, accStg:0 };
  }
  function stageMul(s){ return [0.25,0.28,0.33,0.4,0.5,0.66,1,1.5,2,2.5,3,3.5,4][Math.max(0,Math.min(12,s+6))]; }

  /* ── DAMAGE ── */
  function typeEff(atk,defTypes){
    let e=1; const tbl=TYPE_EFF[atk]||{};
    for(const d of defTypes) e*=(tbl[d]!==undefined?tbl[d]:1);
    return e;
  }
  function damage(att,def,moveId){
    const mv=MV[moveId]; if(!mv||mv.power===0) return 0;
    const atk=att.atk*stageMul(att.atkStg), dfn=def.def*stageMul(def.defStg);
    let d=Math.floor((2*att.level/5+2)*mv.power*atk/dfn/50)+2;
    const eff=typeEff(mv.type,def.types);
    if(eff===0) return 0;  // immune — no damage
    d=Math.floor(d*eff);
    return Math.max(1,Math.floor(d*(0.85+Math.random()*0.15)));
  }

  /* ── BATTLE UI ── */
  function setLog(a,b){ const l1=document.getElementById('pk-log-line1'),l2=document.getElementById('pk-log-line2'); if(l1)l1.textContent=a||''; if(l2)l2.textContent=b!==undefined?b:''; }
  function updateBallBtn(){ const b=document.getElementById('pk-ball-btn'); if(b){b.disabled=!battle||battleLocked||pokeballs<=0; const s=document.getElementById('pk-ball-count'); if(s)s.textContent=`(${pokeballs})`;} }
  function enableBtns(on){
    battleLocked=!on;
    for(let i=0;i<4;i++){ const b=document.getElementById(`pk-move-${i}`); if(b)b.disabled=!on||(battle&&battle.pm.moves[i]&&battle.pm.moves[i].pp<=0); }
    const rb=document.querySelector('.pk-run-btn'); if(rb)rb.disabled=!on;
    const sb=document.getElementById('pk-swap-btn'); if(sb)sb.disabled=!on;
    updateBallBtn();
  }
  function updateBUI(){
    if(!battle)return;
    const {pm:p,em:e}=battle;
    const eph=Math.max(0,Math.round(e.hp/e.maxHp*100));
    const pph=Math.max(0,Math.round(p.hp/p.maxHp*100));
    const hpCol=pct=>pct>50?'#2dcc70':pct>25?'#f0b030':'#e74c3c';
    document.getElementById('pk-ename').textContent=e.name;
    document.getElementById('pk-elvl').textContent=`Lv.${e.level}`;
    const ei=document.getElementById('pk-esprite-img');
    if(ei){ ei.src=spriteUrl(e.speciesId); ei.alt=e.name; }
    const eb=document.getElementById('pk-ehp-bar'); eb.style.width=eph+'%'; eb.style.background=hpCol(eph);
    document.getElementById('pk-ehp-text').textContent=`${Math.max(0,e.hp)}/${e.maxHp}`;
    document.getElementById('pk-pname').textContent=p.name;
    document.getElementById('pk-plvl').textContent=`Lv.${p.level}`;
    const pi=document.getElementById('pk-psprite-img');
    if(pi){ pi.src=spriteUrl(p.speciesId,true); pi.alt=p.name; }
    const pb=document.getElementById('pk-php-bar'); pb.style.width=pph+'%'; pb.style.background=hpCol(pph);
    document.getElementById('pk-php-text').textContent=`${Math.max(0,p.hp)}/${p.maxHp}`;
    document.getElementById('pk-xp-bar').style.width=Math.min(100,Math.round(p.xp/p.xpToNext*100))+'%';
    p.moves.forEach((mv,i)=>{
      const b=document.getElementById(`pk-move-${i}`); if(!b)return;
      const md=MV[mv.id]; if(!md){b.style.visibility='hidden';return;}
      b.style.visibility='visible';
      b.innerHTML=`<strong>${md.name}</strong><br><small style="opacity:0.7">${mv.pp}/${mv.maxPp} PP</small>`;
      b.style.borderLeftColor=TYPE_COLORS[md.type]||'#888'; b.disabled=mv.pp<=0;
    });
    for(let i=p.moves.length;i<4;i++){ const b=document.getElementById(`pk-move-${i}`); if(b)b.style.visibility='hidden'; }
  }

  /* ── BATTLE AUDIO ── */
  let sfxCtx=null;
  function getSfx(){
    if(!sfxCtx||sfxCtx.state==='closed') sfxCtx=new(window.AudioContext||window.webkitAudioContext)();
    if(sfxCtx.state==='suspended') sfxCtx.resume();
    return sfxCtx;
  }
  function playCry(dexId){
    if(!dexId)return;
    try{
      const a=new Audio(`https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${dexId}.ogg`);
      a.volume=0.45; a.play().catch(()=>{});
    }catch(e){}
  }
  function _tone(c,t,f0,f1,type,dur,vol){
    const o=c.createOscillator(),g=c.createGain();
    o.type=type; o.frequency.setValueAtTime(f0,t);
    if(f1) o.frequency.exponentialRampToValueAtTime(f1,t+dur);
    g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.001,t+dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t+dur+0.02);
  }
  function _noise(c,t,dur,fType,fFreq,vol){
    const len=Math.floor(c.sampleRate*dur),buf=c.createBuffer(1,len,c.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
    const src=c.createBufferSource(); src.buffer=buf;
    const f=c.createBiquadFilter(); f.type=fType; f.frequency.value=fFreq;
    const g=c.createGain();
    g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.001,t+dur);
    src.connect(f); f.connect(g); g.connect(c.destination); src.start(t); src.stop(t+dur+0.02);
  }
  function playMoveSound(type){
    try{
      const c=getSfx(),t=c.currentTime+0.02;
      switch(type){
        case 'electric': _tone(c,t,900,120,'sawtooth',0.25,0.3); _noise(c,t,0.15,'highpass',3000,0.15); break;
        case 'fire':     _noise(c,t,0.4,'bandpass',700,0.35); _tone(c,t,200,70,'sawtooth',0.28,0.12); break;
        case 'water':    _tone(c,t,700,280,'sine',0.45,0.28); _tone(c,t+0.05,500,200,'sine',0.3,0.25); break;
        case 'grass':    _noise(c,t,0.3,'bandpass',2200,0.22); _tone(c,t,320,420,'triangle',0.22,0.2); break;
        case 'psychic':  _tone(c,t,600,1400,'sine',0.4,0.3); _tone(c,t+0.1,1000,2000,'sine',0.18,0.35); break;
        case 'ice':      _tone(c,t,2200,900,'triangle',0.3,0.28); _tone(c,t+0.05,2600,1100,'sine',0.18,0.22); break;
        case 'ghost':    _tone(c,t,180,90,'sine',0.5,0.3); _noise(c,t,0.45,'lowpass',350,0.12); break;
        case 'poison':   _tone(c,t,380,180,'square',0.28,0.22); _noise(c,t+0.1,0.2,'bandpass',750,0.14); break;
        case 'rock':     _noise(c,t,0.2,'lowpass',450,0.55); _tone(c,t,130,50,'sawtooth',0.35,0.15); break;
        case 'ground':   _noise(c,t,0.38,'lowpass',200,0.6); _tone(c,t,70,35,'sine',0.4,0.3); break;
        case 'flying':   _noise(c,t,0.3,'highpass',1600,0.2); _tone(c,t,520,1100,'triangle',0.15,0.3); break;
        case 'bug':      _tone(c,t,580,580,'square',0.18,0.22); _noise(c,t,0.2,'bandpass',1100,0.17); break;
        case 'dark':     _noise(c,t,0.32,'lowpass',280,0.48); _tone(c,t,110,55,'sawtooth',0.3,0.25); break;
        case 'dragon':   _tone(c,t,140,70,'sawtooth',0.42,0.4); _noise(c,t+0.06,0.35,'bandpass',380,0.25); break;
        default:         _noise(c,t,0.15,'lowpass',900,0.4); _tone(c,t,280,180,'triangle',0.22,0.1); break;
      }
    }catch(e){}
  }

  /* ── BATTLE ENGINE ── */
  const wait=ms=>new Promise(r=>setTimeout(r,ms));

  function startBattle(sid,lvl){
    const em=mkMon(sid,lvl);
    // Hide d-pad during battle
    const dpadEl=document.getElementById('pk-dpad');
    if(dpadEl) dpadEl.classList.add('pk-dpad-hidden');
    // Encounter flash: alternate white/black 4 times then reveal battle
    const screen=canvas&&canvas.parentElement;
    const fl=document.createElement('div');
    fl.style.cssText='position:absolute;inset:0;z-index:48;pointer-events:none;border-radius:8px;';
    if(screen) screen.appendChild(fl);
    let f=0;
    const doFlash=()=>{
      fl.style.background=f%2===0?'rgba(255,255,255,0.92)':'rgba(0,0,0,0.05)';
      f++;
      if(f<8) setTimeout(doFlash,70);
      else{
        fl.remove();
        battle={pm:team[0],em,phase:'menu'};
        updateBUI(); enableBtns(true);
        document.getElementById('pk-battle').classList.remove('hidden');
        setLog(`A wild ${em.name} appeared!`,'');
        playCry(SP[em.speciesId]?.dexId);
      }
    };
    doFlash();
  }

  function closeBattle(){
    battle=null;
    document.getElementById('pk-battle').classList.add('hidden');
    document.getElementById('pk-blackout').classList.add('hidden');
    const dpadEl=document.getElementById('pk-dpad');
    if(dpadEl) dpadEl.classList.remove('pk-dpad-hidden');
    enableBtns(true); saveGame();
  }

  /* ── SWAP HELPERS ── */
  function showSwapPanel(forced){
    const panel=document.getElementById('pk-swap-panel');
    const list=document.getElementById('pk-swap-list');
    const title=document.getElementById('pk-swap-title');
    if(!panel||!list)return;
    title.textContent=forced?'Choose your next Pokémon:':'Choose a Pokémon to swap in:';
    list.innerHTML='';
    team.forEach((mon,idx)=>{
      if(mon===battle.pm)return; // skip current battler
      const card=document.createElement('div');
      card.className='pk-swap-card'+(mon.hp<=0?' fainted':'');
      const hpPct=Math.round(mon.hp/mon.maxHp*100);
      card.innerHTML=`<img src="${spriteUrl(mon.speciesId)}" alt="${mon.name}" onerror="this.style.display='none'">
        <div class="pk-swap-card-name">${mon.name} Lv.${mon.level}</div>
        <div class="pk-swap-card-hp">${mon.hp<=0?'Fainted':mon.hp+'/'+mon.maxHp+' HP ('+hpPct+'%)'}</div>`;
      if(mon.hp>0) card.onclick=()=>doSwap(idx,forced);
      list.appendChild(card);
    });
    if(forced){
      // no cancel option when forced
      panel.dataset.forced='1';
    } else {
      panel.dataset.forced='0';
      const cancel=document.createElement('button');
      cancel.textContent='Cancel'; cancel.className='pk-run-btn';
      cancel.style.marginTop='8px';
      cancel.onclick=()=>panel.classList.add('hidden');
      list.appendChild(cancel);
    }
    panel.classList.remove('hidden');
    enableBtns(false);
  }

  async function doSwap(teamIdx, forced){
    const panel=document.getElementById('pk-swap-panel');
    if(panel) panel.classList.add('hidden');
    const incoming=team[teamIdx];
    battle.pm=incoming;
    setLog(`Go, ${incoming.name}!`,'');
    playCry(SP[incoming.speciesId]?.dexId);
    updateBUI();
    if(!forced){
      // Voluntary swap: enemy gets a free attack
      await wait(800);
      const {em:e}=battle;
      const emv=e.moves[Math.floor(Math.random()*e.moves.length)];
      await execMove(e,incoming,emv);
      if(incoming.hp<=0){
        const alive=team.filter(m=>m.hp>0);
        if(alive.length) showSwapPanel(true);
        else endBattle();
      } else { enableBtns(true); }
    } else {
      enableBtns(true);
    }
  }

  function applyLevelUp(mon){
    const ns=calcStats(mon.speciesId,mon.level);
    const ohp=mon.maxHp; mon.maxHp=ns.maxHp;
    mon.hp=Math.min(mon.maxHp,mon.hp+(mon.maxHp-ohp));
    mon.atk=ns.atk; mon.def=ns.def; mon.spd=ns.spd;
    mon.xpToNext=xpForLevel(mon.level+1);
  }
  function tryEvolve(mon){
    const spec=SP[mon.speciesId];
    if(!spec||!spec.evolvesAt||mon.level<spec.evolvesAt||!spec.evolvesInto||!SP[spec.evolvesInto])return false;
    const oldName=mon.name;
    mon.speciesId=spec.evolvesInto;
    const ns2=SP[mon.speciesId];
    mon.name=ns2.name; mon.types=ns2.types;
    applyLevelUp(mon);
    return oldName;
  }
  function endBattle(){
    if(!battle)return;
    const {pm:p,em:e}=battle;
    if(e.hp<=0){
      const xg=Math.floor(e.level*SP[e.speciesId].xpY/7);
      // Award full XP to active battler, half XP to benched alive members (EXP Share)
      const benched=team.filter(m=>m!==p&&m.hp>0);
      benched.forEach(m=>{
        m.xp+=Math.floor(xg/2);
        while(m.xp>=m.xpToNext){ m.level++; applyLevelUp(m); const evo=tryEvolve(m); if(evo) showToast(`${m.name} evolved!`,'#ffd700',2500); }
      });
      // Award coins for winning the battle
      const battleCoins=5+e.level*2+Math.floor((SP[e.speciesId]?.xpY||50)*0.3);
      coins+=battleCoins; updateCoinsDisplay();
      p.xp+=xg; setLog(`${e.name} fainted!`,`+${xg} XP  +${battleCoins}💰`);
      const doLvl=()=>{
        if(p.xp>=p.xpToNext){
          const lvlCoins=p.level*2;
          p.level++; applyLevelUp(p);
          coins+=lvlCoins; updateCoinsDisplay();
          const evo=tryEvolve(p);
          updateBUI();
          if(evo){ setLog(`${evo} evolved into ${p.name}!`,'✨ New form!'); setTimeout(doLvl,1600); }
          else { setLog(`${p.name} grew to Lv.${p.level}!`,`+${lvlCoins}💰`); setTimeout(doLvl,1400); }
        } else { updateBUI(); setTimeout(closeBattle,1200); }
      };
      setTimeout(doLvl,1200);
    } else if(p.hp<=0){
      setLog(`${p.name} fainted!`,'');
      const alive=team.filter(m=>m!==p&&m.hp>0);
      if(alive.length){
        setTimeout(()=>{ setLog(`${p.name} fainted!`,'Send out another?'); showSwapPanel(true); },1200);
      } else {
        setLog(`${p.name} fainted!`,'You blacked out!');
        setTimeout(()=>document.getElementById('pk-blackout').classList.remove('hidden'),1400);
      }
    } else { enableBtns(true); }
  }

  async function execMove(att,def,mvObj){
    const md=MV[mvObj.id]; if(!md)return;
    // defIsEnemy = true when the defender is the enemy Pokémon (player is attacking)
    const defIsEnemy = battle && def===battle.em;
    if(Math.random()*100>md.acc*stageMul(att.accStg)){
      setLog(`${att.name} used ${md.name}!`,'But it missed!'); await wait(1100); return;
    }
    if(md.power>0){
      const dmg=damage(att,def,mvObj.id);
      def.hp=Math.max(0,def.hp-dmg);
      if(md.drain) att.hp=Math.min(att.maxHp,att.hp+Math.floor(dmg/2));
      const eff=typeEff(md.type,def.types);
      const et=eff>1?' Super effective!':eff<1&&eff>0?" Not very effective…":eff===0?" No effect!":'';
      setLog(`${att.name} used ${md.name}!`,`${def.name} took ${dmg} dmg!${et}`);
      flashMove(defIsEnemy, md.type);
      playMoveSound(md.type);
    } else {
      let et='';
      if(md.eff==='atkDown'){def.atkStg=Math.max(-6,def.atkStg-1);et=`${def.name}'s Attack fell!`;}
      if(md.eff==='defDown'){def.defStg=Math.max(-6,def.defStg-1);et=`${def.name}'s Defense fell!`;}
      if(md.eff==='spdDown'){def.spdStg=Math.max(-6,def.spdStg-1);et=`${def.name}'s Speed fell!`;}
      if(md.eff==='accDown'){def.accStg=Math.max(-6,def.accStg-1);et=`${def.name}'s accuracy fell!`;}
      setLog(`${att.name} used ${md.name}!`,et||'But nothing happened…');
      flashMove(!defIsEnemy, md.type);
      playMoveSound(md.type);
    }
    updateBUI(); await wait(1100);
  }

  async function doTurn(idx){
    if(!battle||battleLocked)return;
    const {pm:p,em:e}=battle;
    const pmv=p.moves[idx]; if(!pmv||pmv.pp<=0)return;
    pmv.pp--; enableBtns(false);
    const emv=e.moves[Math.floor(Math.random()*e.moves.length)];
    const pFirst=p.spd*stageMul(p.spdStg)>=e.spd*stageMul(e.spdStg);
    await execMove(pFirst?p:e, pFirst?e:p, pFirst?pmv:emv);
    if(e.hp<=0||p.hp<=0){endBattle();return;}
    await execMove(pFirst?e:p, pFirst?p:e, pFirst?emv:pmv);
    endBattle();
  }

  /* ── ENCOUNTER ── */
  function checkEncounter(tx,ty){
    const tile=getTile(tx,ty), key=`${tx},${ty}`;
    if(tile!==T.TALL||key===lastTileKey||battle){lastTileKey=key;return;}
    lastTileKey=key;
    if(Math.random()>0.28)return;  // ~28% per step in tall grass
    const zone=getZone(tx,ty);
    const pool=ZONES[zone]||ZONES.route1;
    const sid=pool[Math.floor(Math.random()*pool.length)];
    const wlvl=Math.max(2,(team[0]?team[0].level:5)+Math.floor(Math.random()*3)-1);
    startBattle(sid,wlvl);
  }

  /* ── GAME LOOP ── */
  function gameLoop(ts){
    if(!canvas)return;
    animFrame=requestAnimationFrame(gameLoop);
    if(battle)return;
    const up=keys.ArrowUp||keys.w||dpad.up, dn=keys.ArrowDown||keys.s||dpad.down;
    const lt=keys.ArrowLeft||keys.a||dpad.left, rt=keys.ArrowRight||keys.d||dpad.right;
    if(up||dn||lt||rt){
      const nx=player.x+(rt?2:lt?-2:0), ny=player.y+(dn?2:up?-2:0);
      const mg=3, ok=(cx,cy)=>!isSolid(Math.floor((cx+mg)/TSIZE),Math.floor((cy+10)/TSIZE))
        &&!isSolid(Math.floor((cx+CHAR_S-mg)/TSIZE),Math.floor((cy+10)/TSIZE))
        &&!isSolid(Math.floor((cx+mg)/TSIZE),Math.floor((cy+CHAR_S-1)/TSIZE))
        &&!isSolid(Math.floor((cx+CHAR_S-mg)/TSIZE),Math.floor((cy+CHAR_S-1)/TSIZE));
      if(ok(nx,ny)){ player.x=Math.max(0,Math.min(nx,MAP_W*TSIZE-CHAR_S)); player.y=Math.max(0,Math.min(ny,MAP_H*TSIZE-CHAR_S)); }
      else if((lt||rt)&&ok(nx,player.y)) player.x=Math.max(0,Math.min(nx,MAP_W*TSIZE-CHAR_S));
      else if((up||dn)&&ok(player.x,ny)) player.y=Math.max(0,Math.min(ny,MAP_H*TSIZE-CHAR_S));
      player.moving=true; player.frame=Math.floor(ts/160)%4;
      if(Date.now()-moveThrottle>150){
        moveThrottle=Date.now();
        const ptx=Math.floor((player.x+CHAR_S/2)/TSIZE), pty=Math.floor((player.y+CHAR_S/2)/TSIZE);
        checkEncounter(ptx,pty);
        checkItemPickup(ptx,pty);
        checkPokeCenter(ptx,pty);
      }
    } else { player.moving=false; }
    drawOverworld();
  }

  /* ── PP REGENERATION — +1 PP to every move on every Pokémon every 150 s ── */
  setInterval(()=>{
    if(!team.length)return;
    let anyRestored=false;
    team.forEach(mon=>{
      mon.moves.forEach(mv=>{
        if(mv.pp<mv.maxPp){ mv.pp++; anyRestored=true; }
      });
    });
    if(anyRestored){
      showToast('+1 PP restored to all moves!','#00ff88',2200);
      if(battle) updateBUI(); // refresh button states if mid-battle
    }
  }, 150000);

  /* ── SAVE / LOAD ── */
  function saveGame(){
    if(!player||!team.length)return;
    localStorage.setItem('pkSave',JSON.stringify({
      team:team.map(p=>({speciesId:p.speciesId,level:p.level,hp:p.hp,maxHp:p.maxHp,xp:p.xp,xpToNext:p.xpToNext,moves:p.moves})),
      px:Math.floor(player.x/TSIZE), py:Math.floor(player.y/TSIZE),
      pokeballs, coins, totalCaught
    }));
    syncPkStats();
  }

  /* ── LEADERBOARD SYNC — returns null on success, error string on failure ── */
  async function syncPkStats(){
    if(!window.currentUser||!team.length) return null;
    try{
      const totalLevels=team.reduce((s,m)=>s+m.level,0);
      const {error}=await sb.from('pokemon_saves').upsert({
        username:currentUser.username,
        pokemon_count:team.length,
        total_levels:totalLevels,
        updated_at:new Date().toISOString()
      },{onConflict:'username'});
      return error ? error.message : null;
    }catch(e){ return e.message; }
  }
  function loadGame(){
    try{
      const raw=localStorage.getItem('pkSave'); if(!raw)return false;
      const sv=JSON.parse(raw); if(!sv.team||!sv.team.length)return false;
      team=sv.team.map(t=>{ const m=mkMon(t.speciesId,t.level,t.xp); m.hp=t.hp; m.maxHp=t.maxHp; m.moves=t.moves||m.moves; return m; });
      pokeballs=sv.pokeballs??5;
      coins=sv.coins??0;
      totalCaught=sv.totalCaught??team.length;
      const spx=sv.px||SPAWN.x, spy=sv.py||SPAWN.y;
      player={x:spx*TSIZE, y:spy*TSIZE, dir:'down',moving:false,frame:0};
      // Validate saved position — reset to SPAWN if it landed inside a solid tile
      if(worldMap && isSolid(spx,spy)){ player.x=SPAWN.x*TSIZE; player.y=SPAWN.y*TSIZE; }
      return true;
    }catch(e){return false;}
  }

  /* ── D-PAD ── */
  function setupDpad(){
    const map={'pk-dpad-up':'up','pk-dpad-down':'down','pk-dpad-left':'left','pk-dpad-right':'right'};
    Object.entries(map).forEach(([id,dir])=>{
      const btn=document.getElementById(id); if(!btn)return;
      const on=()=>{dpad[dir]=true;btn.classList.add('pressed');};
      const off=()=>{dpad[dir]=false;btn.classList.remove('pressed');};
      btn.addEventListener('mousedown',on); btn.addEventListener('mouseup',off); btn.addEventListener('mouseleave',off);
      btn.addEventListener('touchstart',e=>{e.preventDefault();on();},{passive:false});
      btn.addEventListener('touchend',e=>{e.preventDefault();off();},{passive:false});
      btn.addEventListener('touchcancel',e=>{e.preventDefault();off();},{passive:false});
    });
  }

  /* ── STARTER MODAL ── */
  function showStarterModal(){
    const modal=document.getElementById('pk-starter-modal'), grid=document.getElementById('pk-starter-grid');
    if(!modal||!grid)return; grid.innerHTML='';
    Object.entries(SP).filter(([,s])=>s.starter).forEach(([id,s])=>{
      const c=document.createElement('div'); c.className='pk-starter-card';
      c.innerHTML=`<span class="pk-starter-emoji">${s.emoji}</span><div class="pk-starter-name">${s.name}</div><div class="pk-starter-type">${s.types.join(' / ')}</div>`;
      c.onclick=()=>{ team=[mkMon(id,5)]; player={x:SPAWN.x*TSIZE,y:SPAWN.y*TSIZE,dir:'down',moving:false,frame:0}; modal.classList.add('hidden'); saveGame(); };
      grid.appendChild(c);
    });
    modal.classList.remove('hidden');
  }

  /* ── PUBLIC API ── */
  return {
    init(){
      canvas=document.getElementById('pk-canvas'); if(!canvas)return;
      ctx=canvas.getContext('2d');
      const resize=()=>{
        const wrapper=canvas.parentElement&&canvas.parentElement.parentElement;
        const maxW=wrapper?wrapper.clientWidth:800;
        const maxH=wrapper?wrapper.clientHeight:560;
        const sc=Math.min(1,maxW/800,maxH/560);
        const cw=Math.round(800*sc), ch=Math.round(560*sc);
        canvas.style.width=cw+'px'; canvas.style.height=ch+'px';
        const screen=canvas.parentElement;
        if(screen){screen.style.width=cw+'px';screen.style.height=ch+'px';}
        const btl=document.getElementById('pk-battle');
        if(btl) btl.style.transform=`translate(-50%,-50%) scale(${sc})`;
      };
      resize(); window.addEventListener('resize',resize); canvas._pkResize=resize;
      if(!worldMap) worldMap=generateMap();
      if(mapItems.length===0) initMapItems();
      if(!loadGame()){ player={x:SPAWN.x*TSIZE,y:SPAWN.y*TSIZE,dir:'down',moving:false,frame:0}; showStarterModal(); }
      updateCoinsDisplay();
      _kdown=e=>{ if(['INPUT','TEXTAREA'].includes(e.target.tagName))return; if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].includes(e.key)){keys[e.key]=true;if(e.key.startsWith('Arrow'))e.preventDefault();} };
      _kup=e=>{ keys[e.key]=false; };
      document.addEventListener('keydown',_kdown); document.addEventListener('keyup',_kup);
      setupDpad();
      if(animFrame)cancelAnimationFrame(animFrame);
      animFrame=requestAnimationFrame(gameLoop);
    },
    destroy(){
      if(animFrame){cancelAnimationFrame(animFrame);animFrame=null;}
      if(_kdown){document.removeEventListener('keydown',_kdown);_kdown=null;}
      if(_kup){document.removeEventListener('keyup',_kup);_kup=null;}
      if(canvas&&canvas._pkResize)window.removeEventListener('resize',canvas._pkResize);
      saveGame(); canvas=null; ctx=null; battle=null;
      Object.keys(keys).forEach(k=>keys[k]=false);
      dpad={up:false,down:false,left:false,right:false};
    },
    useMove(i){ if(battle&&!battleLocked)doTurn(i); },
    throwBall(){
      if(!battle||battleLocked||pokeballs<=0)return;
      pokeballs--; updateBallBtn(); enableBtns(false);
      const {pm:p,em:e}=battle;
      setLog('Threw a Poké Ball!','…');
      // Catch rate formula: higher chance when enemy HP is low
      const hpFactor=(e.maxHp-e.hp*3/4)/e.maxHp; // 0-1, higher when low HP
      const catchRate=(SP[e.speciesId]?.catchRate||45)/255;
      const chance=Math.min(0.95, catchRate*(0.5+hpFactor*0.5));
      setTimeout(()=>{
        if(Math.random()<chance){
          // Caught!
          const caught=mkMon(e.speciesId,e.level,e.xp);
          caught.hp=Math.max(1,e.hp); // keep current HP
          team.push(caught);
          totalCaught++;
          const catchCoins=20+e.level*4+Math.floor((SP[e.speciesId]?.xpY||50)*0.8);
          coins+=catchCoins; updateCoinsDisplay();
          setLog(`${e.name} was caught!`,`+${catchCoins}💰`);
          setTimeout(()=>{ closeBattle(); showToast(`🎉 Caught ${e.name}! +${catchCoins}💰`,'#ffd700',2800); },1400);
        } else {
          setLog(`${e.name} broke free!`,`Balls left: ${pokeballs}`);
          // Enemy gets a counter-attack
          setTimeout(async()=>{
            const emv=e.moves[Math.floor(Math.random()*e.moves.length)];
            await execMove(e,p,emv);
            if(p.hp<=0)endBattle(); else enableBtns(true);
          },900);
        }
      },900);
    },
    tryRun(){
      if(!battle||battleLocked)return;
      const {pm:p,em:e}=battle;
      const chance=Math.min(0.95,0.5+(p.spd-e.spd)/512);
      if(Math.random()<chance){ setLog('Got away safely!',''); setTimeout(closeBattle,1000); }
      else {
        setLog("Couldn't get away!",''); enableBtns(false);
        setTimeout(async()=>{
          const emv=e.moves[Math.floor(Math.random()*e.moves.length)];
          await execMove(e,p,emv); if(p.hp<=0)endBattle(); else enableBtns(true);
        },600);
      }
    },
    dismissBlackout(){
      team.forEach(m=>{ m.hp=Math.max(1,Math.floor(m.maxHp/2)); });
      player={x:SPAWN.x*TSIZE,y:SPAWN.y*TSIZE,dir:'down',moving:false,frame:0};
      saveGame(); closeBattle();
    },
    toggleDex(){
      const ov=document.getElementById('pk-dex-overlay');
      if(!ov)return;
      const open=ov.classList.toggle('hidden');
      if(!open){ // opened (hidden removed = now visible)
        const grid=document.getElementById('pk-dex-grid');
        const sub=document.getElementById('pk-dex-subtitle');
        if(!grid)return;
        grid.innerHTML='';
        if(!team.length){ grid.innerHTML='<p style="color:#888;padding:20px;font-family:\'Exo 2\',sans-serif">No Pokémon yet — choose a starter first!</p>'; return; }
        sub.textContent=`Party: ${team.length} Pokémon`;
        team.forEach(mon=>{
          const spec=SP[mon.speciesId]||{};
          const card=document.createElement('div');
          card.className='pk-dex-card';
          const tc=TYPE_COLORS;
          const typeBadges=(mon.types||spec.types||[]).map(t=>`<span class="pk-dex-type" style="background:${tc[t]||'#aaa'}">${t}</span>`).join('');
          card.innerHTML=`
            <img src="${spriteUrl(mon.speciesId)}" alt="${mon.name}" onerror="this.style.display='none'">
            <div class="pk-dex-name">${mon.name}</div>
            <div class="pk-dex-level">Lv. ${mon.level}</div>
            <div class="pk-dex-types">${typeBadges}</div>
            <div class="pk-dex-stats">HP ${mon.hp}/${mon.maxHp}<br>Atk ${mon.atk} Def ${mon.def}<br>Spd ${mon.spd}</div>
          `;
          grid.appendChild(card);
        });
      }
    },
    async showLeaderboard(tab='caught'){
      const ov=document.getElementById('pk-lb-overlay');
      if(!ov)return;
      ov.classList.remove('hidden');
      // update tab buttons
      ['caught','levels'].forEach(t=>{
        const b=document.getElementById(`pk-lb-tab-${t}`);
        if(b)b.classList.toggle('active',t===tab);
      });
      const list=document.getElementById('pk-lb-list');
      if(!list)return;
      list.innerHTML='<div class="pk-lb-loading">Loading…</div>';
      try{
        const col=tab==='caught'?'pokemon_count':'total_levels';
        const label=tab==='caught'?' caught':' total lvl';
        const {data,error}=await sb.from('pokemon_saves')
          .select('username,pokemon_count,total_levels')
          .order(col,{ascending:false})
          .limit(10);
        if(error||!data||!data.length){
          list.innerHTML='<div class="pk-lb-empty">No data yet — play Pokémon and save to appear here!</div>';
          return;
        }
        const me=window.currentUser?.username;
        const medals=['🥇','🥈','🥉'];
        list.innerHTML=data.map((row,i)=>{
          const isMe=row.username===me;
          const rankClass=i<3?`pk-lb-rank-${i+1}`:'pk-lb-rank-n';
          const rankIcon=medals[i]||`#${i+1}`;
          const val=tab==='caught'?row.pokemon_count:row.total_levels;
          return `<div class="pk-lb-row${isMe?' pk-lb-me':''}">
            <span class="pk-lb-rank ${rankClass}">${rankIcon}</span>
            <span class="pk-lb-name">${row.username}${isMe?'<span class="pk-lb-you">(you)</span>':''}</span>
            <span class="pk-lb-val">${val}<span>${label}</span></span>
          </div>`;
        }).join('');
      }catch(e){
        list.innerHTML='<div class="pk-lb-empty">Could not load leaderboard.</div>';
      }
    },
    closeLeaderboard(){
      const ov=document.getElementById('pk-lb-overlay');
      if(ov)ov.classList.add('hidden');
    },
    showSwapPanel(forced){ showSwapPanel(forced); },
    async manualSave(){
      if(!player||!team.length){ showToast('Nothing to save yet!','#ff6b6b',1800); return; }
      // Always persist to localStorage immediately
      localStorage.setItem('pkSave',JSON.stringify({
        team:team.map(p=>({speciesId:p.speciesId,level:p.level,hp:p.hp,maxHp:p.maxHp,xp:p.xp,xpToNext:p.xpToNext,moves:p.moves})),
        px:Math.floor(player.x/TSIZE), py:Math.floor(player.y/TSIZE),
        pokeballs, coins, totalCaught
      }));
      if(!window.currentUser){
        showToast('Saved locally ✓ (log in to sync leaderboard)','#ffbb00',2800);
        return;
      }
      showToast('Syncing...','#00d4ff',1000);
      const err=await syncPkStats();
      if(err===null) showToast('Saved & synced to leaderboard! 💾','#00ff88',2200);
      else showToast('Local ✓ — sync error: '+err,'#ff9900',5000);
    },
  };
})();
window.pokemonModule = pokemonModule;
