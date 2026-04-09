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

const users = [
  {
    username: 'Marquillero',
    displayName: 'Marquillero',
    birthday: 'May 12, 2005',
    address: 'Manila, Philippines',
    github: 'marquillero',
    email: 'marquillero@example.com',
    note: 'Admin account with full access.',
    online: false,
  },
  {
    username: 'Amina',
    displayName: 'Amina Cruz',
    birthday: 'Nov 1, 2006',
    address: 'Cebu City',
    github: 'aminacruz',
    email: 'amina@example.com',
    note: 'Math tutor and study notes keeper.',
    online: false,
  },
  {
    username: 'Jayson',
    displayName: 'Jayson Reyes',
    birthday: 'Mar 22, 2006',
    address: 'Quezon City',
    github: 'jaysonr',
    email: 'jayson@example.com',
    note: 'Science project planner and group helper.',
    online: false,
  },
  {
    username: 'Lara',
    displayName: 'Lara Velasco',
    birthday: 'Aug 19, 2006',
    address: 'Davao',
    github: 'laravelasco',
    email: 'lara@example.com',
    note: 'Event photographer and reminder maker.',
    online: false,
  },
  {
    username: 'Nico',
    displayName: 'Nico Dela Cruz',
    birthday: 'Jan 3, 2007',
    address: 'Bacolod',
    github: 'nicodelacruz',
    email: 'nico@example.com',
    note: 'Group tasks coordinator and note taker.',
    online: false,
  },
];

const SERVER_BASE = 'https://class-app-y67k.onrender.com';
let socket = null;
let currentUser = null;
let isAdmin = false;
const adminUsername = 'Marquillero';
const adminPassword = '120524';
let chatHistory = { group: [], todo: [], private: {} };
let currentChat = { type: 'group', target: null };

function apiFetch(path, options = {}) {
  return fetch(`${SERVER_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  }).then(async (res) => {
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || res.statusText);
    return body;
  });
}

function loadSession() {
  const stored = localStorage.getItem('classAppUser');
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function saveSession() {
  if (currentUser) {
    localStorage.setItem('classAppUser', JSON.stringify(currentUser));
  } else {
    localStorage.removeItem('classAppUser');
  }
}

function initSocket() {
  if (socket) return;
  socket = io('https://class-app-y67k.onrender.com');

  socket.on('connect', () => {
    if (currentUser) {
      socket.emit('identify', { username: currentUser.username });
      socket.emit('joinChat', { chat: currentChat.type, target: currentChat.type === 'private' ? getPrivateKey(currentUser.username, currentChat.target) : null, user: currentUser });
    }
  });

  socket.on('users', (payload) => {
    users = payload;
    renderUserDirectory();
    renderChatUsersList();
  });

  socket.on('message', ({ chat, target, message }) => {
    if (chat === 'private') {
      const key = getPrivateKey(target.userA, target.userB);
      chatHistory.private[key] = chatHistory.private[key] || [];
      chatHistory.private[key].push(message);
      if (currentChat.type === 'private' && getPrivateKey(currentUser.username, currentChat.target) === key) {
        renderMessages();
      }
      return;
    }
    chatHistory[chat] = chatHistory[chat] || [];
    chatHistory[chat].push(message);
    if (currentChat.type === chat) renderMessages();
  });

  socket.on('messageUpdated', (message) => {
    const history = getAllMessages();
    const found = history.find((msg) => msg.id === message.id);
    if (found) {
      Object.assign(found, message);
      renderMessages();
    }
  });

  socket.on('messageDeleted', ({ id }) => {
    const history = getAllMessages();
    const index = history.findIndex((message) => message.id === id);
    if (index !== -1) {
      history.splice(index, 1);
      renderMessages();
    }
  });
}

function getAllMessages() {
  return [
    ...(chatHistory.group || []),
    ...(chatHistory.todo || []),
    ...Object.values(chatHistory.private || {}).flat(),
  ];
}

function login() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  if (!username || !password) {
    alert('Enter username and password');
    return;
  }
  apiFetch('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) })
    .then((data) => {
      currentUser = data.user;
      isAdmin = data.isAdmin;
      saveSession();
      establishSession();
    })
    .catch((err) => alert(err.message));
}

function register() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  if (!username || !password) {
    alert('Enter username and password');
    return;
  }
  apiFetch('/api/register', { method: 'POST', body: JSON.stringify({ username, password }) })
    .then((data) => {
      currentUser = data.user;
      isAdmin = data.isAdmin;
      saveSession();
      establishSession();
    })
    .catch((err) => alert(err.message));
}

function closeModal() {
  document.getElementById('auth-modal').classList.remove('active');
}

function establishSession() {
  closeModal();
  document.getElementById('admin-panel').style.display = isAdmin ? 'block' : 'none';
  renderUserDirectory();
  renderChatUsersList();
  updateChatHeader();
  initSocket();
  fetchUsers();
  fetchMessages(currentChat.type, currentChat.target);
}

function fetchUsers() {
  apiFetch('/api/users')
    .then((data) => {
      users = data;
      renderUserDirectory();
      renderChatUsersList();
    })
    .catch((err) => console.warn(err.message));
}

function fetchMessages(chat, target = null) {
  if (!chat) return;
  const query = new URLSearchParams({ chat });
  if (chat === 'private' && target) {
    query.set('target', getPrivateKey(currentUser.username, target));
  }
  apiFetch(`/api/messages?${query.toString()}`)
    .then((messages) => {
      if (chat === 'private') {
        const key = getPrivateKey(currentUser.username, target);
        chatHistory.private[key] = messages;
      } else {
        chatHistory[chat] = messages;
      }
      renderMessages();
    })
    .catch((err) => console.warn(err.message));
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
          <div class="user-name">${user.displayName}</div>
          <div class="user-status ${user.online ? 'online' : 'offline'}">${user.online ? 'Online' : 'Offline'}</div>
        </div>
        <button class="user-view-btn" onclick="openUserProfile('${user.username}')">Profile</button>
      </div>
      <div class="user-meta">GitHub: ${user.github || '—'}</div>
      <div class="user-meta">Email: ${user.email || '—'}</div>
      <div class="user-note">${user.note}</div>
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
          <div class="chat-user-name">${user.displayName}</div>
          <div class="chat-status ${user.online ? 'online' : 'offline'}">${user.online ? 'Online' : 'Offline'}</div>
        </div>
        <button onclick="openChat('private', '${user.username}')">Open</button>
      `;
      list.appendChild(item);
    });
}

function updateChatHeader() {
  const header = document.getElementById('chat-header');
  if (!header) return;
  if (currentChat.type === 'group') {
    header.textContent = 'Group Chat';
  } else if (currentChat.type === 'todo') {
    header.textContent = 'To-Do Group';
  } else if (currentChat.type === 'private' && currentChat.target) {
    header.textContent = `Private Chat with ${currentChat.target}`;
  } else {
    header.textContent = 'Select a chat';
  }
}

function openChat(type, target = null) {
  currentChat = { type, target };
  updateChatHeader();
  if (socket && currentUser) {
    socket.emit('joinChat', { chat: currentChat.type, target: currentChat.type === 'private' ? getPrivateKey(currentUser.username, target) : null, user: currentUser });
  }
  fetchMessages(type, target);
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
      if (message.attachment.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = message.attachment.url;
        img.alt = message.attachment.name;
        attach.appendChild(img);
      } else if (message.attachment.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.src = message.attachment.url;
        video.controls = true;
        attach.appendChild(video);
      } else {
        const link = document.createElement('a');
        link.className = 'chat-attachment-link';
        link.href = message.attachment.url;
        link.download = message.attachment.name;
        link.textContent = `Download ${message.attachment.name}`;
        attach.appendChild(link);
      }
      msgDiv.appendChild(attach);
    }
    const actions = document.createElement('div');
    actions.className = 'chat-actions';
    const pinButton = document.createElement('button');
    pinButton.className = 'chat-action-button';
    pinButton.textContent = message.pinned ? 'Unpin' : 'Pin';
    pinButton.onclick = () => togglePinMessage(message.id, !message.pinned);
    actions.appendChild(pinButton);
    const bumpButton = document.createElement('button');
    bumpButton.className = 'chat-action-button';
    bumpButton.textContent = 'Bump';
    bumpButton.onclick = () => bumpMessage(message.id);
    actions.appendChild(bumpButton);
    if (currentUser && message.sender === currentUser.username) {
      const editButton = document.createElement('button');
      editButton.className = 'chat-action-button';
      editButton.textContent = 'Edit';
      editButton.onclick = () => editChatMessage(message.id);
      actions.appendChild(editButton);
      const deleteEverywhere = document.createElement('button');
      deleteEverywhere.className = 'chat-action-button';
      deleteEverywhere.textContent = 'Delete Everyone';
      deleteEverywhere.onclick = () => deleteMessageForEveryone(message.id);
      actions.appendChild(deleteEverywhere);
    }
    const deleteMeButton = document.createElement('button');
    deleteMeButton.className = 'chat-action-button';
    deleteMeButton.textContent = 'Delete for Me';
    deleteMeButton.onclick = () => deleteMessageForMe(message.id);
    actions.appendChild(deleteMeButton);
    msgDiv.appendChild(actions);
    container.appendChild(msgDiv);
  });
  container.scrollTop = container.scrollHeight;
}

function sendMessage() {
  const input = document.getElementById('message-input');
  const attachmentInput = document.getElementById('attachment-input');
  const text = input.value.trim();
  const file = attachmentInput.files[0];
  if (!text && !file) {
    alert('Enter a message or attach a file.');
    return;
  }
  if (!currentUser) {
    alert('Please login first to send messages.');
    return;
  }
  if (currentChat.type === 'private' && !currentChat.target) {
    alert('Select a private contact first.');
    return;
  }
  const uploadPromise = file ? uploadAttachment(file) : Promise.resolve(null);
  uploadPromise
    .then((attachment) => {
      if (socket) {
        socket.emit('sendMessage', {
          chat: currentChat.type,
          target: currentChat.type === 'private' ? getPrivateKey(currentUser.username, currentChat.target) : null,
          sender: currentUser.username,
          text,
          attachment,
        });
      }
      input.value = '';
      attachmentInput.value = '';
      document.getElementById('attachment-selected').textContent = 'No file chosen';
    })
    .catch((err) => alert('Upload failed: ' + err.message));
}

function uploadAttachment(file) {
  const form = new FormData();
  form.append('file', file);
  return fetch(`${SERVER_BASE}/api/upload`, { method: 'POST', body: form })
    .then((res) => {
      if (!res.ok) throw new Error('Upload failed');
      return res.json();
    })
    .then((data) => data);
}

function togglePinMessage(id, pin) {
  apiFetch(`/api/messages/${id}`, { method: 'PUT', body: JSON.stringify({ pinned: pin }) })
    .then(() => fetchMessages(currentChat.type, currentChat.target))
    .catch((err) => alert(err.message));
}

function editChatMessage(id) {
  const message = findMessageById(id);
  if (!message) return;
  if (message.sender !== currentUser?.username) {
    alert('You can only edit your own messages.');
    return;
  }
  const updated = prompt('Edit your message:', message.text);
  if (updated === null) return;
  apiFetch(`/api/messages/${id}`, { method: 'PUT', body: JSON.stringify({ text: updated }) })
    .then(() => fetchMessages(currentChat.type, currentChat.target))
    .catch((err) => alert(err.message));
}

function deleteMessageForMe(id) {
  const message = findMessageById(id);
  if (!message) return;
  if (!message.deletedFor) message.deletedFor = [];
  if (currentUser && !message.deletedFor.includes(currentUser.username)) {
    message.deletedFor.push(currentUser.username);
  }
  renderMessages();
}

function deleteMessageForEveryone(id) {
  const message = findMessageById(id);
  if (!message) return;
  if (message.sender !== currentUser?.username && !isAdmin) {
    alert('Only the sender or admin can delete for everyone.');
    return;
  }
  fetch(`${SERVER_BASE}/api/messages/${id}`, { method: 'DELETE' })
    .then((res) => res.json())
    .then(() => fetchMessages(currentChat.type, currentChat.target))
    .catch((err) => alert(err.message));
}

function bumpMessage(id) {
  if (!currentUser) return;
  const bumpText = `${currentUser.displayName || currentUser.username} bumped the chat.`;
  if (socket) {
    socket.emit('sendMessage', {
      chat: currentChat.type,
      target: currentChat.type === 'private' ? getPrivateKey(currentUser.username, currentChat.target) : null,
      sender: 'System',
      text: bumpText,
      attachment: null,
    });
  }
}

function findMessageById(id) {
  const history = getCurrentHistory();
  return history.find((message) => message.id === id);
}

function openUserProfile(username) {
  const profile = users.find((user) => user.username === username);
  if (!profile) return;
  const profilePanel = document.getElementById('profile-panel');
  const details = document.getElementById('profile-details');
  if (!profilePanel || !details) return;
  const isMine = currentUser?.username === profile.username;
  details.innerHTML = `
    <h2>${profile.displayName}</h2>
    <div class="profile-row"><strong>Username:</strong> ${profile.username}</div>
    <div class="profile-row"><strong>Birthday:</strong> ${profile.birthday}</div>
    <div class="profile-row"><strong>Address:</strong> ${profile.address}</div>
    <div class="profile-row"><strong>GitHub:</strong> ${profile.github || '—'}</div>
    <div class="profile-row"><strong>Email:</strong> ${profile.email || '—'}</div>
    <div class="profile-row"><strong>Note:</strong> ${profile.note || 'No additional note.'}</div>
    <div class="profile-actions">
      <button onclick="openChat('private', '${profile.username}')">Message</button>
      ${isMine ? `<button onclick="editUserProfile('${profile.username}')">Edit Profile</button>` : ''}
    </div>
  `;
  profilePanel.classList.add('active');
}

function editUserProfile(username) {
  const profile = users.find((user) => user.username === username);
  if (!profile) return;
  const details = document.getElementById('profile-details');
  if (!details) return;
  details.innerHTML = `
    <h2>Edit Profile</h2>
    <div class="profile-row"><strong>Display Name:</strong> <input id="profile-displayName" value="${profile.displayName}"></div>
    <div class="profile-row"><strong>Birthday:</strong> <input id="profile-birthday" value="${profile.birthday}"></div>
    <div class="profile-row"><strong>Address:</strong> <input id="profile-address" value="${profile.address}"></div>
    <div class="profile-row"><strong>GitHub:</strong> <input id="profile-github" value="${profile.github}"></div>
    <div class="profile-row"><strong>Email:</strong> <input id="profile-email" value="${profile.email}"></div>
    <div class="profile-row"><strong>Note:</strong> <textarea id="profile-note">${profile.note}</textarea></div>
    <div class="profile-actions">
      <button onclick="saveProfileEdits('${profile.username}')">Save</button>
      <button onclick="openUserProfile('${profile.username}')">Cancel</button>
    </div>
  `;
}

function saveProfileEdits(username) {
  const profile = users.find((user) => user.username === username);
  if (!profile) return;
  const payload = {
    displayName: document.getElementById('profile-displayName').value.trim(),
    birthday: document.getElementById('profile-birthday').value.trim(),
    address: document.getElementById('profile-address').value.trim(),
    github: document.getElementById('profile-github').value.trim(),
    email: document.getElementById('profile-email').value.trim(),
    note: document.getElementById('profile-note').value.trim(),
  };
  apiFetch(`/api/users/${username}`, { method: 'PUT', body: JSON.stringify(payload) })
    .then(() => {
      fetchUsers();
      openUserProfile(username);
    })
    .catch((err) => alert(err.message));
}

function closeProfile() {
  document.getElementById('profile-panel').classList.remove('active');
}

function blockUser() {
  alert('User blocked');
}

function moderateFiles() {
  alert('Files moderated');
}

function closeAdminPanel() {
  document.getElementById('admin-panel').style.display = 'none';
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
  const storedUser = loadSession();
  if (storedUser) {
    currentUser = storedUser;
  }

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

  const attachmentInput = document.getElementById('attachment-input');
  if (attachmentInput) {
    attachmentInput.addEventListener('change', () => {
      const selectedLabel = document.getElementById('attachment-selected');
      selectedLabel.textContent = attachmentInput.files[0]?.name || 'No file chosen';
    });
  }

  if (currentUser) {
    establishSession();
  } else {
    renderUserDirectory();
    renderChatUsersList();
    updateChatHeader();
    const authModal = document.getElementById('auth-modal');
    if (authModal) authModal.classList.add('active');
  }

  renderCalendar();
  updateClock();
});

// Update pageConfig for new pages
const pageConfig = {
  first:    { bg: 'bg-mountain', particles: 'particles-mountain', wave: false, mountain: true,  aurora: true,  label: '⛰️ First Semester' },
  second:   { bg: 'bg-ocean',    particles: 'particles-ocean',    wave: true,  mountain: false, aurora: false, label: '🌊 Second Semester' },
  events:   { bg: 'bg-aerial',   particles: 'particles-aerial',   wave: false, mountain: false, aurora: false, label: '🛩️ Event Pictures' },
  random:   { bg: 'bg-galaxy',   particles: 'particles-galaxy',   wave: false, mountain: false, aurora: false, label: '🌌 Random Pictures' },
  chat:     { bg: 'bg-galaxy',   particles: 'particles-galaxy',   wave: false, mountain: false, aurora: false, label: '💬 Chat' },  users:    { bg: 'bg-aerial',   particles: 'particles-aerial',   wave: false, mountain: false, aurora: false, label: '👥 User Directory' },  calendar: { bg: 'bg-aerial',   particles: 'particles-aerial',   wave: false, mountain: false, aurora: false, label: '📅 Calendar' },
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