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

window.renameFolderAPI = function(id, oldName) {
    customPrompt("Enter new name for folder:", function(newName) {
        if(!newName || newName === oldName) return;
        sb.from('folders').update({ name: newName }).eq('id', id)
        .then(() => fetchAndRenderFolders()).catch(err => customAlert(err.message));
    }, oldName);
};

window.deleteFolderAPI = function(id) {
    customConfirm("Are you sure? This will delete the folder AND all files inside it forever.", function() {
        sb.from('folders').delete().eq('id', id)
        .then(() => fetchAndRenderFolders()).catch(err => customAlert(err.message));
    });
};

window.openFileExplorer = function(folderId, folderName) {
    currentFolderContext = { id: folderId, name: folderName };
    const title = document.getElementById('file-explorer-title');
    if (title) title.innerText = `${currentParentContext} / ${folderName}`;
    closeFolderModal('folder-explorer-modal');
    fetchAndRenderFiles();
    openFolderModalObj('file-explorer-modal');
};

window.backToFoldersAPI = function() {
    closeFolderModal('file-explorer-modal');
    openFolderModalObj('folder-explorer-modal');
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
    
    // Set for rainbow block detail
    analyser.fftSize = 128;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    function draw() {
        requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / 40) * 1.5;
        let x = 0;

        for (let i = 0; i < 40; i++) {
            let barHeight = dataArray[i] / 1.5;
            const hue = (i / 40) * 360; // Rainbow color
            ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;

            // Draw individual stacking blocks
            const blockSize = 10;
            const gap = 3;
            const numBlocks = Math.floor(barHeight / (blockSize + gap));

            for (let j = 0; j < numBlocks; j++) {
                // Main top bars
                ctx.fillRect(x, (canvas.height / 2) - (j * (blockSize + gap)) - 5, barWidth - 2, blockSize);
                
                // Reflection logic
                ctx.globalAlpha = 0.3; 
                ctx.fillRect(x, (canvas.height / 2) + (j * (blockSize + gap)) + 5, barWidth - 2, blockSize);
                ctx.globalAlpha = 1.0;
            }
            x += barWidth;
        }
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
    pikachu:   {name:'Pikachu',  types:['electric'],        emoji:'⚡', hp:35, atk:55,def:40,spd:90,  moves:['thunderShock','quickAtk','tailWhip','growl'],  xpY:112,starter:true},
    bulbasaur: {name:'Bulbasaur',types:['grass','poison'],  emoji:'🌱', hp:45, atk:49,def:49,spd:45,  moves:['vineWhip','tackle','growl','tailWhip'],         xpY:64, starter:true},
    squirtle:  {name:'Squirtle', types:['water'],           emoji:'🐢', hp:44, atk:48,def:65,spd:43,  moves:['waterGun','tackle','tailWhip','growl'],         xpY:65, starter:true},
    chikorita: {name:'Chikorita',types:['grass'],           emoji:'🍃', hp:45, atk:49,def:65,spd:45,  moves:['razorLeaf','tackle','growl','tailWhip'],        xpY:64, starter:true},
    torchic:   {name:'Torchic',  types:['fire'],            emoji:'🔥', hp:45, atk:60,def:40,spd:45,  moves:['ember','scratch','growl','tackle'],             xpY:62, starter:true},
    cyndaquil: {name:'Cyndaquil',types:['fire'],            emoji:'🌋', hp:39, atk:52,def:43,spd:65,  moves:['ember','tackle','leer','smokescreen'],          xpY:62, starter:true},
    totodile:  {name:'Totodile', types:['water'],           emoji:'🐊', hp:50, atk:65,def:64,spd:43,  moves:['waterGun','scratch','leer','tackle'],           xpY:63, starter:true},
    mudkip:    {name:'Mudkip',   types:['water','ground'],  emoji:'💧', hp:50, atk:70,def:50,spd:40,  moves:['waterGun','tackle','growl','mudSlap'],          xpY:62, starter:true},
    treecko:   {name:'Treecko',  types:['grass'],           emoji:'🦎', hp:40, atk:45,def:35,spd:70,  moves:['pound','leer','absorb','quickAtk'],             xpY:62, starter:true},
    eevee:     {name:'Eevee',    types:['normal'],          emoji:'🦊', hp:55, atk:55,def:50,spd:55,  moves:['tackle','quickAtk','sandAtk','growl'],          xpY:92, starter:true},
    rattata:   {name:'Rattata',  types:['normal'],          emoji:'🐀', hp:30, atk:56,def:35,spd:72,  moves:['tackle','quickAtk'],                           xpY:51},
    pidgey:    {name:'Pidgey',   types:['normal','flying'], emoji:'🐦', hp:40, atk:45,def:40,spd:56,  moves:['tackle','gust'],                               xpY:50},
    caterpie:  {name:'Caterpie', types:['bug'],             emoji:'🐛', hp:45, atk:30,def:35,spd:45,  moves:['tackle','stringShot'],                         xpY:39},
    weedle:    {name:'Weedle',   types:['bug','poison'],    emoji:'🪲', hp:40, atk:35,def:30,spd:50,  moves:['poisonSting','stringShot'],                    xpY:39},
    oddish:    {name:'Oddish',   types:['grass','poison'],  emoji:'🌿', hp:45, atk:50,def:55,spd:30,  moves:['absorb','poisonSting'],                        xpY:64},
    psyduck:   {name:'Psyduck',  types:['water'],           emoji:'🦆', hp:50, atk:52,def:48,spd:55,  moves:['scratch','waterGun'],                          xpY:80},
    geodude:   {name:'Geodude',  types:['rock','ground'],   emoji:'🪨', hp:40, atk:80,def:100,spd:20, moves:['tackle','rockThrow'],                          xpY:86},
    zubat:     {name:'Zubat',    types:['poison','flying'], emoji:'🦇', hp:40, atk:45,def:35,spd:55,  moves:['leechLife','tackle'],                          xpY:49},
    magikarp:  {name:'Magikarp', types:['water'],           emoji:'🐟', hp:20, atk:10,def:55,spd:80,  moves:['splash','tackle'],                             xpY:40},
    gastly:    {name:'Gastly',   types:['ghost','poison'],  emoji:'👻', hp:30, atk:35,def:30,spd:80,  moves:['lick','poisonSting'],                          xpY:95},
  };

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
  };

  const TYPE_COLORS = {normal:'#A8A878',electric:'#F8D030',fire:'#F08030',water:'#6890F0',
    grass:'#78C850',poison:'#A040A0',rock:'#B8A038',ground:'#E0C068',
    flying:'#A890F0',bug:'#A8B820',ghost:'#705898'};

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
    route1: ['rattata','pidgey','caterpie','weedle','rattata','pidgey'],
    forest: ['caterpie','weedle','oddish','zubat','oddish','gastly'],
    rocky:  ['geodude','geodude','zubat','rattata','geodude'],
    shore:  ['psyduck','magikarp','magikarp','oddish','psyduck'],
    route2: ['rattata','pidgey','psyduck','oddish','weedle'],
    route3: ['oddish','zubat','gastly','pidgey','rattata'],
  };

  /* ── STATE ── */
  let canvas, ctx, animFrame;
  let player = null, team = [], worldMap = null;
  let camX = 0, camY = 0;
  let keys = {}, dpad = {up:false,down:false,left:false,right:false};
  let moveThrottle = 0, lastTileKey = null;
  let battle = null, battleLocked = false;
  let _kdown, _kup;

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
  function getZone(tx,ty){
    if(tx>=14&&tx<=35&&ty>=10&&ty<=13) return 'shore';
    if(tx>=3&&tx<=18&&ty>=13&&ty<=27)  return 'forest';
    if(tx>=33&&tx<=46&&ty>=13&&ty<=27) return 'rocky';
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
    drawPlayerChar(player.x-camX, player.y-camY);
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
  function enableBtns(on){
    battleLocked=!on;
    for(let i=0;i<4;i++){ const b=document.getElementById(`pk-move-${i}`); if(b)b.disabled=!on||(battle&&battle.pm.moves[i]&&battle.pm.moves[i].pp<=0); }
    const rb=document.querySelector('.pk-run-btn'); if(rb)rb.disabled=!on;
  }
  function updateBUI(){
    if(!battle)return;
    const {pm:p,em:e}=battle;
    const eph=Math.max(0,Math.round(e.hp/e.maxHp*100));
    const pph=Math.max(0,Math.round(p.hp/p.maxHp*100));
    const hpCol=pct=>pct>50?'#2dcc70':pct>25?'#f0b030':'#e74c3c';
    document.getElementById('pk-ename').textContent=e.name;
    document.getElementById('pk-elvl').textContent=`Lv.${e.level}`;
    document.getElementById('pk-esprite').textContent=e.emoji;
    const eb=document.getElementById('pk-ehp-bar'); eb.style.width=eph+'%'; eb.style.background=hpCol(eph);
    document.getElementById('pk-ehp-text').textContent=`${Math.max(0,e.hp)}/${e.maxHp}`;
    document.getElementById('pk-pname').textContent=p.name;
    document.getElementById('pk-plvl').textContent=`Lv.${p.level}`;
    document.getElementById('pk-psprite').textContent=p.emoji;
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

  function endBattle(){
    if(!battle)return;
    const {pm:p,em:e}=battle;
    if(e.hp<=0){
      const xg=Math.floor(e.level*SP[e.speciesId].xpY/7);
      p.xp+=xg; setLog(`${e.name} fainted!`,`+${xg} XP!`);
      const doLvl=()=>{
        if(p.xp>=p.xpToNext){
          p.level++; const ns=calcStats(p.speciesId,p.level);
          const ohp=p.maxHp; p.maxHp=ns.maxHp; p.hp=Math.min(p.maxHp,p.hp+(p.maxHp-ohp));
          p.atk=ns.atk; p.def=ns.def; p.spd=ns.spd; p.xpToNext=xpForLevel(p.level+1);
          updateBUI(); setLog(`${p.name} grew to Lv.${p.level}!`,'🎉');
          setTimeout(doLvl,1400);
        } else { updateBUI(); setTimeout(closeBattle,1200); }
      };
      setTimeout(doLvl,1200);
    } else if(p.hp<=0){
      setLog(`${p.name} fainted!`,'You blacked out!');
      setTimeout(()=>document.getElementById('pk-blackout').classList.remove('hidden'),1400);
    } else { enableBtns(true); }
  }

  async function execMove(att,def,mvObj){
    const md=MV[mvObj.id]; if(!md)return;
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
    } else {
      let et='';
      if(md.eff==='atkDown'){def.atkStg=Math.max(-6,def.atkStg-1);et=`${def.name}'s Attack fell!`;}
      if(md.eff==='defDown'){def.defStg=Math.max(-6,def.defStg-1);et=`${def.name}'s Defense fell!`;}
      if(md.eff==='spdDown'){def.spdStg=Math.max(-6,def.spdStg-1);et=`${def.name}'s Speed fell!`;}
      if(md.eff==='accDown'){def.accStg=Math.max(-6,def.accStg-1);et=`${def.name}'s accuracy fell!`;}
      setLog(`${att.name} used ${md.name}!`,et||'But nothing happened…');
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
        checkEncounter(Math.floor((player.x+CHAR_S/2)/TSIZE),Math.floor((player.y+CHAR_S/2)/TSIZE));
      }
    } else { player.moving=false; }
    drawOverworld();
  }

  /* ── SAVE / LOAD ── */
  function saveGame(){
    if(!player||!team.length)return;
    localStorage.setItem('pkSave',JSON.stringify({
      team:team.map(p=>({speciesId:p.speciesId,level:p.level,hp:p.hp,maxHp:p.maxHp,xp:p.xp,xpToNext:p.xpToNext,moves:p.moves})),
      px:Math.floor(player.x/TSIZE), py:Math.floor(player.y/TSIZE)
    }));
  }
  function loadGame(){
    try{
      const raw=localStorage.getItem('pkSave'); if(!raw)return false;
      const sv=JSON.parse(raw); if(!sv.team||!sv.team.length)return false;
      team=sv.team.map(t=>{ const m=mkMon(t.speciesId,t.level,t.xp); m.hp=t.hp; m.maxHp=t.maxHp; m.moves=t.moves||m.moves; return m; });
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
      if(!loadGame()){ player={x:SPAWN.x*TSIZE,y:SPAWN.y*TSIZE,dir:'down',moving:false,frame:0}; showStarterModal(); }
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
  };
})();
window.pokemonModule = pokemonModule;
