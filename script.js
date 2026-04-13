/* ============================================================
   SCRIPT.JS — My School Portfolio (FULL SUPABASE VERSION)
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
    document.getElementById('alert-text').innerText = text;
    document.getElementById('custom-alert-modal').style.display = 'flex';
};

window.customPrompt = function(title, callback, defaultValue = '') {
    const modal = document.getElementById('custom-prompt-modal');
    const inputEl = document.getElementById('prompt-input');
    document.getElementById('prompt-title').innerText = title;
    inputEl.value = defaultValue;
    modal.style.display = 'flex';
    inputEl.focus();

    document.getElementById('prompt-submit').onclick = function() {
        modal.style.display = 'none';
        callback(inputEl.value.trim());
    };
};

window.customConfirm = function(text, callback) {
    document.getElementById('confirm-text').innerText = text;
    const modal = document.getElementById('custom-confirm-modal');
    modal.style.display = 'flex';
    
    document.getElementById('confirm-yes').onclick = function() {
        modal.style.display = 'none';
        callback();
    };
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
 
const eventCount  = 15;
const randomCount = 10;
 
/* ============================================================
   BUILD SUBJECT CARDS (Opens Folders)
   ============================================================ */
function buildSubjectCards(gridId, subjects) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  grid.innerHTML = '';
 
  subjects.forEach((subject) => {
    const card = document.createElement('div');
    card.className = 'subject-card';
    card.style.cursor = 'pointer';
    card.onclick = () => window.openFolderExplorer(subject.code);
 
    card.innerHTML = `
      <span class="card-icon">${subject.icon}</span>
      <div class="card-subject">${subject.code}</div>
      <div class="card-teacher">${subject.teacher || 'No teacher assigned'}</div>
      <div style="margin-top: 15px; font-size: 11px; color: #00ff88; text-transform: uppercase; font-weight: bold; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">
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
        <div style="font-size: 10px; color: #00d4ff; margin-top: 5px;">View Folders</div>
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

window.closeFolderModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if(modal) modal.style.display = 'none';
}

window.openFolderModalObj = function(modalId) {
    const modal = document.getElementById(modalId);
    if(modal) modal.style.display = 'flex';
}

window.openFolderExplorer = function(parentName) {
    currentParentContext = parentName;
    document.getElementById('folder-explorer-title').innerText = `${parentName} Folders`;
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
    document.getElementById('file-explorer-title').innerText = `${currentParentContext} / ${folderName}`;
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

// ---------------------------------------------------------
// SUPABASE STORAGE UPLOAD WITH LIVE PROGRESS BAR & CONTENT TYPE
// ---------------------------------------------------------
window.uploadFileToFolderAPI = async function() {
    if(!currentUser) return customAlert("Log in to upload files.");
    const input = document.getElementById('file-upload-input');
    const status = document.getElementById('file-upload-status');
    const file = input.files[0];
    
    if(!file) return customAlert("Please select a file first.");
    
    if(status) status.innerText = "Uploading to Supabase Cloud...";
    
    try {
        // Clean filename to prevent Supabase "Invalid Key" errors
        const safeName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
        const filePath = `uploads/${Date.now()}_${safeName}`;
        
        // Added contentType to fix PDFs opening as raw code
        const { data, error } = await sb.storage
            .from('portfolio-assets')
            .upload(filePath, file, { contentType: file.type });
            
        if (error) throw error;

        if(status) status.innerText = "Upload 100%. Saving to database...";
        
        // Get Public URL
        const { data: urlData } = sb.storage.from('portfolio-assets').getPublicUrl(filePath);

        // Save metadata to Files table
        await sb.from('files').insert([{
            folder_id: currentFolderContext.id,
            name: file.name,
            url: urlData.publicUrl,
            type: file.type,
            uploader: currentUser.username
        }]);

        if(status) status.innerText = "Upload Complete!";
        input.value = "";
        fetchAndRenderFiles();
        
    } catch(e) {
        if(status) status.innerText = "Error: " + e.message;
        console.error(e);
    }
};

window.deleteFileAPI = function(fileId) {
    customConfirm("Delete this file?", function() {
        sb.from('files').delete().eq('id', fileId)
        .then(() => fetchAndRenderFiles())
        .catch(err => customAlert(err.message));
    });
};

window.playOrOpenFileAPI = function(url, name) {
    const fullUrl = url.startsWith('http') ? url : SERVER_BASE + url; 
    const player = document.getElementById('audio-player');
    
    if (name.toLowerCase().endsWith('.mp3') || name.toLowerCase().endsWith('.wav')) {
        if(player) {
            player.src = fullUrl;
            player.play();
        }
        const text = document.getElementById('now-playing-text');
        if(text) text.innerText = "Playing: " + name;
        
        if(currentPage !== 'music') window.goToPage('music');
        closeFolderModal('file-explorer-modal');
        
    } else {
        window.open(fullUrl, '_blank');
    }
};

window.startVisualizer = (audioElement) => {
  if (!window.audioCtx) {
    window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    window.analyser = window.audioCtx.createAnalyser();
    const source = window.audioCtx.createMediaElementSource(audioElement);
    source.connect(window.analyser);
    window.analyser.connect(window.audioCtx.destination);
  }
  
  const data = new Uint8Array(window.analyser.frequencyBinCount);
  const speaker = document.getElementById('dancing-speaker');
  
  function loop() {
    requestAnimationFrame(loop);
    window.analyser.getByteFrequencyData(data);
    const bass = data.slice(0, 10).reduce((a, b) => a + b) / 10;
    if(speaker) speaker.style.transform = `scale(${1 + (bass / 255)})`;
  }
  loop();
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
  const password = document.getElementById('password').value.trim();
  if (!username) return customAlert('Enter username');
  
  document.getElementById('errorMessage').style.display = 'none';

  const { data: profile, error } = await sb.from('profiles').select('*').eq('username', username).single();
  if (error || !profile) {
      document.getElementById('errorMessage').innerText = "User not found. Please register.";
      document.getElementById('errorMessage').style.display = 'block';
      return;
  }
  
  currentUser = profile;
  isAdmin = (profile.username === 'Marquillero');
  saveSession();
  
  // Set user online
  await sb.from('profiles').update({ online: true }).eq('username', currentUser.username);
  establishSession();
};

window.register = async function() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  if (!username) return customAlert('Enter username');
  
  document.getElementById('errorMessage').style.display = 'none';

  const { error } = await sb.from('profiles').insert([{ username: username, display_name: username, online: true }]);
  if (error) {
      document.getElementById('errorMessage').innerText = "Username taken or Error occurred.";
      document.getElementById('errorMessage').style.display = 'block';
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

  if (isMine) {
    html += `<button class="btn-blue flex-1" onclick="editUserProfile('${profile.username}')">Edit Profile</button>`;
  }
  
  if (isAdmin && !isMine) {
    html += `<button class="btn-outline-red flex-1" onclick="deleteUserAPI('${profile.username}')">Delete User</button>`;
  }

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
    <div style="margin-bottom: 10px;">
        <label style="font-size: 12px; color: #00d4ff;">Display Name</label>
        <input type="text" id="profile-displayName" class="modal-input" style="margin-bottom: 5px; padding: 8px;" value="${profile.display_name || profile.username || ''}">
    </div>
    <div style="margin-bottom: 10px;">
        <label style="font-size: 12px; color: #00d4ff;">Birthday</label>
        <input type="text" id="profile-birthday" class="modal-input" style="margin-bottom: 5px; padding: 8px;" value="${profile.birthday || ''}">
    </div>
    <div style="margin-bottom: 10px;">
        <label style="font-size: 12px; color: #00d4ff;">Address</label>
        <input type="text" id="profile-address" class="modal-input" style="margin-bottom: 5px; padding: 8px;" value="${profile.address || ''}">
    </div>
    <div style="margin-bottom: 10px;">
        <label style="font-size: 12px; color: #00d4ff;">GitHub URL</label>
        <input type="text" id="profile-github" class="modal-input" style="margin-bottom: 5px; padding: 8px;" value="${profile.github || ''}">
    </div>
    <div style="margin-bottom: 10px;">
        <label style="font-size: 12px; color: #00d4ff;">Email</label>
        <input type="email" id="profile-email" class="modal-input" style="margin-bottom: 5px; padding: 8px;" value="${profile.email || ''}">
    </div>
    <div style="margin-bottom: 15px;">
        <label style="font-size: 12px; color: #00d4ff;">Bio / Note</label>
        <textarea id="profile-note" class="modal-input" style="margin-bottom: 5px; padding: 8px; height: 60px; resize: none;">${profile.note || ''}</textarea>
    </div>
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
    .then(() => {
      fetchUsers(); 
      customAlert("Profile updated successfully!");
      openUserProfile(username); 
    })
    .catch((err) => customAlert(err.message));
};

/* ============================================================
   100% SUPABASE SERVERLESS CHAT ENGINE
   ============================================================ */
let chatHistory = { group: [], todo: [], private: {} };
let currentChat = { type: 'group', target: null };
let realtimeSubscription = null;

function getPrivateKey(userA, userB) {
    return [userA, userB].sort().join('||');
}

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

// Start listening for new messages live from Supabase
function initSupabaseRealtimeChat() {
    if (realtimeSubscription) return;

    realtimeSubscription = sb.channel('public:messages')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, payload => {
            
            // If a message was inserted (someone sent a chat)
            if (payload.eventType === 'INSERT') {
                const m = payload.new;
                const formattedMsg = {
                    id: m.id, sender: m.sender, text: m.text, attachment: m.attachment,
                    time: new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                };

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
            
            // If a message was deleted or edited, just re-fetch the current chat to update screen
            if (payload.eventType === 'DELETE' || payload.eventType === 'UPDATE') {
                fetchMessages(currentChat.type, currentChat.target);
            }
        }).subscribe();
}

// Fetch old messages from the database
async function fetchMessages(chatType, target = null) {
  if (!chatType) return;
  
  let query = sb.from('messages').select('*');
  
  if (chatType === 'private') {
      // Get messages between Me and Target
      query = query.eq('chat_type', 'private')
                   .or(`and(sender.eq.${currentUser.username},target.eq.${target}),and(sender.eq.${target},target.eq.${currentUser.username})`);
  } else {
      // Get group or todo messages
      query = query.eq('chat_type', chatType);
  }

  const { data: messages, error } = await query.order('created_at', { ascending: true });
  if (error) return console.warn(error);

  const formattedMessages = messages.map(m => ({
      id: m.id, sender: m.sender, text: m.text, attachment: m.attachment,
      time: new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
  }));

  if (chatType === 'private') {
      const key = getPrivateKey(currentUser.username, target);
      chatHistory.private[key] = formattedMessages;
  } else {
      chatHistory[chatType] = formattedMessages;
  }
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
  
  if (!visibleMessages.length) {
    container.innerHTML = '<p class="empty-chat">No messages yet.</p>';
    return;
  }
  
  const pinned = visibleMessages.filter((message) => message.pinned);
  const normal = visibleMessages.filter((message) => !message.pinned);
  
  pinned.concat(normal).forEach((message) => {
    if (message.type === 'system') {
      const sysDiv = document.createElement('div');
      sysDiv.className = 'chat-system-message';
      sysDiv.textContent = message.text;
      container.appendChild(sysDiv);
      return;
    }
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message${message.pinned ? ' message-pinned' : ''}`;
    
    const senderLine = document.createElement('div');
    senderLine.innerHTML = `
      <span class="chat-sender">${message.sender}</span>
      <span class="chat-time">${message.time}</span>
      ${message.edited ? '<span class="chat-edited">(edited)</span>' : ''}
    `;
    msgDiv.appendChild(senderLine);
    
    const textLine = document.createElement('div');
    textLine.className = 'chat-text';
    textLine.textContent = message.text;
    msgDiv.appendChild(textLine);
    
    if (message.attachment) {
      const attach = document.createElement('div');
      attach.className = 'chat-attachment';
      const info = document.createElement('div');
      info.textContent = `Attachment: ${message.attachment.name}`;
      attach.appendChild(info);
      
      const fullUrl = message.attachment.url.startsWith('http') ? message.attachment.url : SERVER_BASE + message.attachment.url;
      
      if (message.attachment.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = fullUrl;
        img.style.maxWidth = '200px';
        attach.appendChild(img);
      } else if (message.attachment.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.src = fullUrl;
        video.controls = true;
        video.style.maxWidth = '250px';
        attach.appendChild(video);
      } else {
        const link = document.createElement('a');
        link.className = 'chat-attachment-link';
        link.href = fullUrl;
        link.target = '_blank';
        link.textContent = `Download`;
        attach.appendChild(link);
      }
      msgDiv.appendChild(attach);
    }
    
    const actions = document.createElement('div');
    actions.className = 'chat-actions';
    
    if (currentUser && message.sender === currentUser.username) {
        const editBtn = document.createElement('button');
        editBtn.className = 'chat-action-button';
        editBtn.textContent = 'Edit';
        editBtn.onclick = () => editChatMessage(message.id);
        actions.appendChild(editBtn);
        
        const delAllBtn = document.createElement('button');
        delAllBtn.className = 'chat-action-button';
        delAllBtn.textContent = 'Delete All';
        delAllBtn.onclick = () => deleteMessageForEveryone(message.id);
        actions.appendChild(delAllBtn);
    }
    msgDiv.appendChild(actions);
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
  if (currentChat.type === 'private' && !currentChat.target) return customAlert('Select a private contact.');

  let attachmentData = null;

  if (file) {
      // Fixes the "Invalid Key" error for chat attachments too!
      const safeName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
      const filePath = `chat-attachments/${Date.now()}_${safeName}`;
      
      const { error } = await sb.storage.from('portfolio-assets').upload(filePath, file, { contentType: file.type });
      if (!error) {
          const { data: urlData } = sb.storage.from('portfolio-assets').getPublicUrl(filePath);
          attachmentData = { name: file.name, type: file.type, url: urlData.publicUrl };
      }
  }
  
  // Save directly to Supabase. Realtime will automatically broadcast it to everyone!
  await sb.from('messages').insert([{
      chat_type: currentChat.type,
      target: currentChat.type === 'private' ? currentChat.target : null,
      sender: currentUser.username,
      text: text,
      attachment: attachmentData
  }]);

  input.value = '';
  attachmentInput.value = '';
  const lbl = document.getElementById('attachment-selected');
  if(lbl) lbl.textContent = 'No file chosen';
};

window.editChatMessage = function(id) {
  const message = getCurrentHistory().find(m => m.id === id);
  if (!message) return;
  customPrompt('Edit your message:', async function(updated) {
      if (updated === null) return;
      await sb.from('messages').update({ text: updated }).eq('id', id);
  }, message.text);
};

window.deleteMessageForEveryone = async function(id) {
  customConfirm("Delete message?", async function() {
      await sb.from('messages').delete().eq('id', id);
  });
};

/* ============================================================
   UI & NAVIGATION LOGIC
   ============================================================ */
const pageConfig = {
  first:    { bg: 'bg-mountain', particles: 'particles-mountain', wave: false, mountain: true,  aurora: true,  label: '⛰️ First Semester' },
  second:   { bg: 'bg-ocean',    particles: 'particles-ocean',    wave: true,  mountain: false, aurora: false, label: '🌊 Second Semester' },
  events:   { bg: 'bg-aerial',   particles: 'particles-aerial',   wave: false, mountain: false, aurora: false, label: '🛩️ Event Pictures' },
  random:   { bg: 'bg-galaxy',   particles: 'particles-galaxy',   wave: false, mountain: false, aurora: false, label: '🌌 Random Pictures' },
  chat:     { bg: 'bg-galaxy',   particles: 'particles-galaxy',   wave: false, mountain: false, aurora: false, label: '💬 Chat' },  
  users:    { bg: 'bg-aerial',   particles: 'particles-aerial',   wave: false, mountain: false, aurora: false, label: '👥 User Directory' },  
  calendar: { bg: 'bg-aerial',   particles: 'particles-aerial',   wave: false, mountain: false, aurora: false, label: '📅 Calendar' },
  music:    { bg: 'bg-ocean',    particles: 'particles-ocean',    wave: true,  mountain: false, aurora: false, label: '🎵 Music' },
};

let currentPage = 'first';

window.goToPage = function(pageName) {
  if (pageName === currentPage) {
    const p = document.getElementById('page-' + pageName);
    if(p) p.scrollTop = 0;
    closeMenu();
    return;
  }

  const old = pageConfig[currentPage];
  const oldPage = document.getElementById('page-' + currentPage);
  if(oldPage) oldPage.classList.remove('active');
  
  document.getElementById(old.bg).classList.remove('active');
  document.getElementById(old.particles).classList.remove('active');
  if (old.wave) document.getElementById('wave-container').classList.remove('active');
  if (old.mountain) document.getElementById('mountain-svg').classList.remove('active');
  if (old.aurora) document.getElementById('aurora').classList.remove('active');

  currentPage = pageName;
  const cfg = pageConfig[pageName];
  const newPage = document.getElementById('page-' + pageName);
  
  if(newPage) newPage.classList.add('active');
  document.getElementById(cfg.bg).classList.add('active');
  document.getElementById(cfg.particles).classList.add('active');
  if (cfg.wave) document.getElementById('wave-container').classList.add('active');
  if (cfg.mountain) document.getElementById('mountain-svg').classList.add('active');
  if (cfg.aurora) document.getElementById('aurora').classList.add('active');

  document.getElementById('page-indicator').textContent = cfg.label;
  if(newPage) newPage.scrollTop = 0;

  document.querySelectorAll('.nav-item').forEach(item => {
    if(item.dataset.page) item.classList.toggle('active', item.dataset.page === pageName);
  });

  closeMenu();
};

window.toggleMenu = function() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('active');
};

window.closeMenu = function() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('active');
};

// Calendar Base
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

function renderCalendar() {
  const grid = document.getElementById('calendar-grid');
  if(!grid) return;
  grid.innerHTML = '';
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  for (let i = 0; i < firstDay; i++) { grid.appendChild(document.createElement('div')); }
  for (let day = 1; day <= daysInMonth; day++) {
    const dayDiv = document.createElement('div');
    dayDiv.textContent = day;
    dayDiv.onclick = () => window.addNote(day);
    grid.appendChild(dayDiv);
  }
  const title = document.getElementById('month-year');
  if(title) title.textContent = `${new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' })} ${currentYear}`;
}

window.prevMonth = () => { currentMonth--; if (currentMonth < 0) { currentMonth = 11; currentYear--; } renderCalendar(); };
window.nextMonth = () => { currentMonth++; if (currentMonth > 11) { currentMonth = 0; currentYear++; } renderCalendar(); };

window.addNote = function(day) {
    customPrompt('Add note:', function(note) {
        if(note) customAlert(`Note added for ${day}: ${note}`);
    });
};

function updateClock() {
  const now = new Date();
  const el = document.getElementById('live-clock');
  if(el) el.textContent = now.toLocaleTimeString();
}
setInterval(updateClock, 1000);

let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const installBtn = document.getElementById('install-btn');
  if (installBtn) installBtn.style.display = 'block';
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  const installBtn = document.getElementById('install-btn');
  if (installBtn) installBtn.style.display = 'none';
});

/* ============================================================
   INITIALIZATION 
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  const installBtn = document.getElementById('install-btn');
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      deferredPrompt = null;
      installBtn.style.display = 'none';
    });
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch((err) => {
      console.warn('Service Worker registration failed:', err);
    });
  }

  const customBgUpload = document.getElementById('custom-bg-upload');
  if (customBgUpload) {
    customBgUpload.addEventListener('change', function() {
      handleCustomBgUpload(this.files[0]);
    });
  }

  const attachmentInput = document.getElementById('attachment-input');
  if (attachmentInput) {
    attachmentInput.addEventListener('change', () => {
      const selectedLabel = document.getElementById('attachment-selected');
      if(selectedLabel) selectedLabel.textContent = attachmentInput.files[0]?.name || 'No file chosen';
    });
  }

  const menuToggle = document.getElementById('menu-toggle');
  if (menuToggle) menuToggle.addEventListener('click', window.toggleMenu);

  if (currentUser) {
    establishSession();
  } else {
    const modal = document.getElementById('auth-modal');
    if(modal) modal.style.display = 'flex';
  }

  buildSubjectCards('grid-first', firstSem);
  buildSubjectCards('grid-second', secondSem);
  buildFolderCards('grid-events', eventCount, 'Event');
  buildFolderCards('grid-random', randomCount, 'Random');

  renderCalendar();
  updateClock();
});

document.getElementById('custom-bg-upload').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Create a temporary URL for the uploaded image/video
    const localUrl = URL.createObjectURL(file);
    
    // Turn off the default animated backgrounds
    document.querySelectorAll('.scene-bg').forEach(bg => bg.classList.remove('active'));
    document.getElementById('aurora').classList.remove('active');
    document.getElementById('mountain-svg').classList.remove('active');
    
    // Apply the custom background to the body
    document.body.style.backgroundImage = `url(${localUrl})`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundAttachment = 'fixed';
    
    customAlert("Custom Background Applied!");
});

// 2. Weekly Announcement Logic (Saves to local storage)
window.saveAnnouncement = function() {
    const noteContent = document.getElementById('announcement-note').value;
    localStorage.setItem('savedWeeklyAnnouncement', noteContent);
    customAlert("Weekly Announcement Saved!");
};

// Auto-load the saved announcement when the page refreshes
window.addEventListener('DOMContentLoaded', () => {
    const savedNote = localStorage.getItem('savedWeeklyAnnouncement');
    if (savedNote) {
        const noteBox = document.getElementById('announcement-note');
        if(noteBox) noteBox.value = savedNote;
    }
});
