/* ============================================================
   SCRIPT.JS — My School Portfolio
   ============================================================ */
 
 
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
 
const eventCount  = 15; // Number of event folders
const randomCount = 10; // Number of random folders
 
 
/* ============================================================
   BUILD SUBJECT CARDS (PDF Upload)
   ============================================================ */
 
function buildSubjectCards(gridId, subjects) {
  const grid = document.getElementById(gridId);
 
  subjects.forEach((subject, index) => {
    const card = document.createElement('div');
    card.className = 'subject-card';
 
    card.innerHTML = `
      <div class="uploaded-badge" id="badge-${gridId}-${index}">✓ Done</div>
      <span class="card-icon">${subject.icon}</span>
      <div class="card-subject">${subject.code}</div>
      <div class="card-teacher">${subject.teacher || 'No teacher assigned'}</div>
      <div class="card-upload-area">
        <span class="upload-btn-label">Browse</span>
        <span class="file-name-display" id="fname-${gridId}-${index}">No file chosen</span>
      </div>
      <input type="file" accept=".pdf,application/pdf,video/*"
             onchange="handlePDF(this, '${gridId}', ${index})">
      <button class="delete-btn" onclick="deleteFile('${gridId}', ${index})">×</button>
      <div class="author-credit" id="author-${gridId}-${index}"></div>
    `;

    grid.appendChild(card);
  });
}

function handlePDF(input, gridId, index) {
  const file = input.files[0];
  if (!file) return;
 
  // Show filename (truncated if too long)
  const nameEl = document.getElementById(`fname-${gridId}-${index}`);
  nameEl.textContent = file.name.length > 22 ? file.name.slice(0, 20) + '…' : file.name;
 
  // Show the uploaded badge
  document.getElementById(`badge-${gridId}-${index}`).style.display = 'block';
 
  // Show author credit
  const authorEl = document.getElementById(`author-${gridId}-${index}`);
  authorEl.textContent = `Uploaded by: ${currentUser || 'Anonymous'}`;
 
  // If video, show preview
  if (file.type.startsWith('video/')) {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    video.controls = true;
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';
    input.closest('.subject-card').appendChild(video);
  }

  // Bounce animation
  bounce(input.closest('.subject-card'));
}

function deleteFile(gridId, index) {
  // Reset the card
  document.getElementById(`fname-${gridId}-${index}`).textContent = 'No file chosen';
  document.getElementById(`badge-${gridId}-${index}`).style.display = 'none';
  document.getElementById(`author-${gridId}-${index}`).textContent = '';
  // Remove video if exists
  const card = document.getElementById(`fname-${gridId}-${index}`).closest('.subject-card');
  const video = card.querySelector('video');
  if (video) video.remove();
  // Clear input
  card.querySelector('input[type="file"]').value = '';
}


/* ============================================================
   BUILD FOLDER CARDS (Image Upload)
   ============================================================ */
 
function buildFolderCards(gridId, count) {
  const grid = document.getElementById(gridId);
 
  for (let i = 0; i < count; i++) {
    const card = document.createElement('div');
    card.className = 'folder-card';
 
    card.innerHTML = `
      <div class="folder-bg"></div>
      <div class="folder-pattern"></div>
      <div class="folder-orb"></div>
      <div class="folder-overlay"></div>
      <img class="folder-preview" id="fprev-${gridId}-${i}" alt="preview" />
      <video class="folder-preview" id="fvid-${gridId}-${i}" alt="preview" controls style="display:none;"></video>
      <div class="folder-uploaded" id="fbadge-${gridId}-${i}">✓ Uploaded</div>
      <div class="folder-info">
        <div class="folder-name">Folder ${i + 1}</div>
        <div class="folder-upload-row">
          <span class="folder-btn">Upload</span>
          <span class="folder-filename" id="ffname-${gridId}-${i}">No file chosen</span>
        </div>
      </div>
      <input type="file" accept="image/*,video/*"
             onchange="handleFolder(this, '${gridId}', ${i})">
      <button class="delete-btn" onclick="deleteFolderFile('${gridId}', ${i})">×</button>
      <div class="author-credit" id="fauthor-${gridId}-${i}"></div>
    `;

    grid.appendChild(card);
  }
}

function handleFolder(input, gridId, index) {
  const file = input.files[0];
  if (!file) return;
 
  // Show filename
  const nameEl = document.getElementById(`ffname-${gridId}-${index}`);
  nameEl.textContent = file.name.length > 20 ? file.name.slice(0, 18) + '…' : file.name;
 
  // Show the uploaded badge
  document.getElementById(`fbadge-${gridId}-${index}`).style.display = 'block';
 
  // Show author credit
  const authorEl = document.getElementById(`fauthor-${gridId}-${index}`);
  authorEl.textContent = `Uploaded by: ${currentUser || 'Anonymous'}`;
 
  // Show preview
  const imgPreview = document.getElementById(`fprev-${gridId}-${index}`);
  const vidPreview = document.getElementById(`fvid-${gridId}-${index}`);
  if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (e) => {
      imgPreview.src = e.target.result;
      imgPreview.style.display = 'block';
      vidPreview.style.display = 'none';
    };
    reader.readAsDataURL(file);
  } else if (file.type.startsWith('video/')) {
    vidPreview.src = URL.createObjectURL(file);
    vidPreview.style.display = 'block';
    imgPreview.style.display = 'none';
  }

  // Bounce animation
  bounce(input.closest('.folder-card'));
}

function deleteFolderFile(gridId, index) {
  document.getElementById(`ffname-${gridId}-${index}`).textContent = 'No file chosen';
  document.getElementById(`fbadge-${gridId}-${index}`).style.display = 'none';
  document.getElementById(`fauthor-${gridId}-${index}`).textContent = '';
  document.getElementById(`fprev-${gridId}-${index}`).style.display = 'none';
  document.getElementById(`fvid-${gridId}-${index}`).style.display = 'none';
  const card = document.getElementById(`ffname-${gridId}-${index}`).closest('.folder-card');
  card.querySelector('input[type="file"]').value = '';
}

// ...existing code...

/* ============================================================
   NEW FEATURES: AUTH, ADMIN, CHAT, CALENDAR, MUSIC, ETC.
   ============================================================ */

let currentUser = null;
let isAdmin = false;
const adminUsername = 'Marquillero';
const adminPassword = '120524';

function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  if (username === adminUsername && password === adminPassword) {
    currentUser = username;
    isAdmin = true;
    closeModal();
    document.getElementById('admin-panel').style.display = 'block';
  } else if (username && password) {
    currentUser = username;
    closeModal();
  } else {
    alert('Invalid credentials');
  }
}

function register() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  if (username && password) {
    currentUser = username;
    closeModal();
  } else {
    alert('Enter surname and password');
  }
}

function closeModal() {
  document.getElementById('auth-modal').classList.remove('active');
}

function blockUser() {
  // Placeholder for blocking user
  alert('User blocked');
}

function moderateFiles() {
  // Placeholder for moderation
  alert('Files moderated');
}

function closeAdminPanel() {
  document.getElementById('admin-panel').style.display = 'none';
}

// Chat System
let currentChat = 'private';
function openChat(type) {
  currentChat = type;
  document.getElementById('chat-messages').innerHTML = `<p>Opened ${type} chat</p>`;
}

function sendMessage() {
  const input = document.getElementById('message-input');
  const message = input.value;
  if (message) {
    const msgDiv = document.createElement('div');
    msgDiv.textContent = `${currentUser || 'You'}: ${message}`;
    document.getElementById('chat-messages').appendChild(msgDiv);
    input.value = '';
  }
}

// Calendar
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

function renderCalendar() {
  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  for (let i = 0; i < firstDay; i++) {
    grid.appendChild(document.createElement('div'));
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dayDiv = document.createElement('div');
    dayDiv.textContent = day;
    dayDiv.onclick = () => addNote(day);
    grid.appendChild(dayDiv);
  }
  document.getElementById('month-year').textContent = `${new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' })} ${currentYear}`;
}

function prevMonth() {
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  renderCalendar();
}

function nextMonth() {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  renderCalendar();
}

function addNote(day) {
  const note = prompt('Add note:');
  if (note) {
    // Store note (placeholder)
    alert(`Note added for ${day}: ${note}`);
  }
}

function saveAnnouncement() {
  const note = document.getElementById('announcement-note').value;
  // Save note (placeholder)
  alert('Announcement saved');
}

// Music Player
function handleMusicUpload() {
  const files = document.getElementById('music-upload').files;
  const playlist = document.getElementById('playlist');
  playlist.innerHTML = '';
  Array.from(files).forEach(file => {
    const item = document.createElement('div');
    item.textContent = file.name;
    item.onclick = () => playSong(file);
    playlist.appendChild(item);
  });
}

function playSong(file) {
  const audio = document.getElementById('audio-player');
  audio.src = URL.createObjectURL(file);
  audio.play();
}

// Live Clock
function updateClock() {
  const now = new Date();
  document.getElementById('live-clock').textContent = now.toLocaleTimeString();
}
setInterval(updateClock, 1000);

// Custom BG Upload
function handleCustomBgUpload(file) {
  if (!file) return;
  const url = URL.createObjectURL(file);
  if (file.type.startsWith('image/')) {
    document.body.style.backgroundImage = `url(${url})`;
  } else if (file.type.startsWith('video/')) {
    const video = document.createElement('video');
    video.src = url;
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.style.position = 'fixed';
    video.style.zIndex = '-1';
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';
    document.body.appendChild(video);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  buildSubjectCards('grid-first', firstSem);
  buildSubjectCards('grid-second', secondSem);
  buildFolderCards('grid-events', eventCount);
  buildFolderCards('grid-random', randomCount);

  const menuToggle = document.getElementById('menu-toggle');
  if (menuToggle) menuToggle.addEventListener('click', toggleMenu);

  const musicUpload = document.getElementById('music-upload');
  if (musicUpload) musicUpload.addEventListener('change', handleMusicUpload);

  const customBgUpload = document.getElementById('custom-bg-upload');
  if (customBgUpload) {
    customBgUpload.addEventListener('change', function() {
      handleCustomBgUpload(this.files[0]);
    });
  }

  renderCalendar();
  updateClock();

  if (!currentUser) {
    const authModal = document.getElementById('auth-modal');
    if (authModal) authModal.classList.add('active');
  }
});

// Update pageConfig for new pages
const pageConfig = {
  first:    { bg: 'bg-mountain', particles: 'particles-mountain', wave: false, mountain: true,  aurora: true,  label: '⛰️ First Semester' },
  second:   { bg: 'bg-ocean',    particles: 'particles-ocean',    wave: true,  mountain: false, aurora: false, label: '🌊 Second Semester' },
  events:   { bg: 'bg-aerial',   particles: 'particles-aerial',   wave: false, mountain: false, aurora: false, label: '🛩️ Event Pictures' },
  random:   { bg: 'bg-galaxy',   particles: 'particles-galaxy',   wave: false, mountain: false, aurora: false, label: '🌌 Random Pictures' },
  chat:     { bg: 'bg-galaxy',   particles: 'particles-galaxy',   wave: false, mountain: false, aurora: false, label: '💬 Chat' },
  calendar: { bg: 'bg-aerial',   particles: 'particles-aerial',   wave: false, mountain: false, aurora: false, label: '📅 Calendar' },
  music:    { bg: 'bg-ocean',    particles: 'particles-ocean',    wave: true,  mountain: false, aurora: false, label: '🎵 Music' },
};

let currentPage = 'first';

function goToPage(pageName) {
  if (pageName === currentPage) {
    document.getElementById('page-' + pageName).scrollTop = 0;
    closeMenu();
    return;
  }

  const old = pageConfig[currentPage];
  document.getElementById('page-' + currentPage).classList.remove('active');
  document.getElementById(old.bg).classList.remove('active');
  document.getElementById(old.particles).classList.remove('active');
  if (old.wave) document.getElementById('wave-container').classList.remove('active');
  if (old.mountain) document.getElementById('mountain-svg').classList.remove('active');
  if (old.aurora) document.getElementById('aurora').classList.remove('active');

  currentPage = pageName;
  const cfg = pageConfig[pageName];
  document.getElementById('page-' + pageName).classList.add('active');
  document.getElementById(cfg.bg).classList.add('active');
  document.getElementById(cfg.particles).classList.add('active');
  if (cfg.wave) document.getElementById('wave-container').classList.add('active');
  if (cfg.mountain) document.getElementById('mountain-svg').classList.add('active');
  if (cfg.aurora) document.getElementById('aurora').classList.add('active');

  document.getElementById('page-indicator').textContent = cfg.label;
  document.getElementById('page-' + pageName).scrollTop = 0;

  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === pageName);
  });

  closeMenu();
}

function toggleMenu() {
  document.getElementById('menu-toggle').classList.toggle('open');
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('active');
}

function closeMenu() {
  document.getElementById('menu-toggle').classList.remove('open');
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('active');
}

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
});