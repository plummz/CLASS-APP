require('dotenv').config(); // loads .env for local dev; on Render set vars in the dashboard
const express = require('express');
const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const multer = require('multer');
const { Server } = require('socket.io');

const ADMIN_USERNAME = 'Marquillero';
const ADMIN_PASSWORD = '120524';
const DATA_PATH = path.join(__dirname, 'data.json');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const PORT = process.env.PORT || 3000;

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// MULTER CONFIG: Preserves original file extensions (.pdf, .mp3, etc.)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'file-' + uniqueSuffix + ext);
  }
});
const upload = multer({ storage: storage });

function loadData() {
  if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, JSON.stringify({ users: [], chatHistory: { group: [], todo: [], private: {} }, folders: [], files: [] }, null, 2));
  }
  try {
    const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
    if (!data.folders) data.folders = [];
    if (!data.files) data.files = [];
    return data;
  } catch (error) {
    console.error('Error loading data.json:', error);
    return { users: [], chatHistory: { group: [], todo: [], private: {} }, folders: [], files: [] };
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] } });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static(UPLOAD_DIR));

/* ── Wake-up ping (keeps Render free tier warm) ─────────── */
app.get('/api/ping', (req, res) => res.json({ ok: true }));

/* ── YouTube search proxy ──────────────────────────────────
   Key stays on the server — the browser never sees it.
   Usage: GET /api/yt-search?q=despacito
   ──────────────────────────────────────────────────────── */
app.get('/api/yt-search', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'Missing query parameter q' });

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'YouTube API key not configured on server' });

  const ytPath =
    `/youtube/v3/search?part=snippet&type=video&maxResults=6` +
    `&q=${encodeURIComponent(q)}&key=${apiKey}`;

  const options = {
    hostname: 'www.googleapis.com',
    path: ytPath,
    method: 'GET',
  };

  https.get(options, (ytRes) => {
    let raw = '';
    ytRes.on('data', chunk => { raw += chunk; });
    ytRes.on('end', () => {
      try {
        const ytData = JSON.parse(raw);
        if (ytRes.statusCode !== 200) {
          console.error('YouTube API error:', ytData.error);
          return res.status(ytRes.statusCode).json({ error: ytData.error?.message || 'YouTube API error' });
        }
        const items = (ytData.items || []).map(item => ({
          videoId:   item.id.videoId,
          title:     item.snippet.title,
          author:    item.snippet.channelTitle,
          thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
        }));
        res.json({ items });
      } catch (e) {
        console.error('YouTube parse error:', e);
        res.status(500).json({ error: 'Failed to parse YouTube response' });
      }
    });
  }).on('error', (err) => {
    console.error('YouTube search proxy error:', err);
    res.status(500).json({ error: 'Search request failed' });
  });
});

/* ── Piped search proxy (no API key needed, avoids browser CORS blocks) ────
   Usage: GET /api/piped-search?q=despacito
   ─────────────────────────────────────────────────────────────────────── */
const PIPED_HOSTS = [
  'pipedapi.kavin.rocks',
  'pipedapi.tokhmi.xyz',
  'piped-api.garudalinux.org',
  'pipedapi.adminforge.de',
];

function pipedSearchRequest(host, q, resolve) {
  const options = {
    hostname: host,
    path: `/search?q=${encodeURIComponent(q)}&filter=videos`,
    method: 'GET',
    headers: { 'User-Agent': 'class-app/1.0' },
  };
  const req = https.get(options, (pRes) => {
    let raw = '';
    pRes.on('data', chunk => { raw += chunk; });
    pRes.on('end', () => {
      try {
        if (pRes.statusCode === 200) {
          const data = JSON.parse(raw);
          const items = (data.items || []).filter(v => v.type === 'stream').slice(0, 6).map(v => ({
            videoId:   (v.url || '').split('v=')[1],
            title:     v.title,
            author:    v.uploaderName || '',
            thumbnail: v.thumbnail || '',
          })).filter(v => v.videoId);
          if (items.length) return resolve({ items });
        }
      } catch (_) {}
      resolve(null);
    });
  });
  req.on('error', () => resolve(null));
  req.setTimeout(6000, () => { req.destroy(); resolve(null); });
}

app.get('/api/piped-search', (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'Missing query parameter q' });

  let idx = 0;
  function tryNext() {
    if (idx >= PIPED_HOSTS.length) return res.status(502).json({ error: 'All Piped instances failed' });
    const host = PIPED_HOSTS[idx++];
    pipedSearchRequest(host, q, (result) => {
      if (result) return res.json(result);
      tryNext();
    });
  }
  tryNext();
});

let state = loadData();

function safeUsers() {
  return state.users.map((user) => ({
    username: user.username,
    displayName: user.displayName,
    birthday: user.birthday,
    address: user.address,
    github: user.github,
    email: user.email,
    note: user.note,
    online: user.online,
    avatar: user.avatar || '',
  }));
}

function getPrivateKey(userA, userB) {
  return [userA, userB].sort().join('||');
}

function getHistory(chat, target) {
  if (chat === 'group') return state.chatHistory.group;
  if (chat === 'todo') return state.chatHistory.todo;
  if (chat === 'private') {
    const key = getPrivateKey(target.userA, target.userB);
    return state.chatHistory.private[key] || [];
  }
  return [];
}

function findUser(username) {
  return state.users.find((user) => user.username.toLowerCase() === username.toLowerCase());
}

function createUser(username) {
  const user = {
    username,
    displayName: username,
    birthday: 'Unknown',
    address: 'Unknown',
    github: '',
    email: '',
    note: 'New user profile',
    online: false,
    avatar: '',
  };
  state.users.push(user);
  saveData(state);
  return user;
}

function updatePresence(username, online) {
  const user = findUser(username);
  if (!user) return;
  user.online = online;
  saveData(state);
  io.emit('users', safeUsers());
}

function emitMessage(chat, target, message) {
  const payload = { chat, target, message };
  if (chat === 'private') {
    const room = getPrivateKey(target.userA, target.userB);
    io.to(room).emit('message', payload);
    return;
  }
  io.to(chat).emit('message', payload);
}

// --- FOLDERS & FILES API ---
app.get('/api/folders', (req, res) => {
  const parent = req.query.parent;
  res.json(state.folders.filter(f => f.parent === parent));
});

app.post('/api/folders', (req, res) => {
  const folder = { id: Date.now().toString(), parent: req.body.parent, name: req.body.name, owner: req.body.owner };
  state.folders.push(folder);
  saveData(state);
  res.json(folder);
});

app.put('/api/folders/:id', (req, res) => {
  const folder = state.folders.find(f => f.id === req.params.id);
  if (folder) folder.name = req.body.name;
  saveData(state);
  res.json(folder);
});

app.delete('/api/folders/:id', (req, res) => {
  state.folders = state.folders.filter(f => f.id !== req.params.id);
  state.files = state.files.filter(f => f.folderId !== req.params.id);
  saveData(state);
  res.json({ success: true });
});

app.get('/api/files', (req, res) => {
  res.json(state.files.filter(f => f.folderId === req.query.folderId));
});

app.post('/api/files', (req, res) => {
  const file = { id: Date.now().toString(), ...req.body };
  state.files.push(file);
  saveData(state);
  res.json(file);
});

app.delete('/api/files/:id', (req, res) => {
  state.files = state.files.filter(f => f.id !== req.params.id);
  saveData(state);
  res.json({ success: true });
});

// --- AUTH & USERS API ---
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }
  if (username === ADMIN_USERNAME && password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid admin password' });
  }
  let user = findUser(username);
  if (!user) {
    user = createUser(username);
  }
  user.online = true;
  saveData(state);
  io.emit('users', safeUsers());
  res.json({ user: safeUsers().find((item) => item.username === user.username), isAdmin: user.username === ADMIN_USERNAME });
});

app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }
  let user = findUser(username);
  if (user) {
    return res.status(400).json({ error: 'Username already exists' });
  }
  user = createUser(username);
  user.online = true;
  saveData(state);
  io.emit('users', safeUsers());
  res.json({ user: safeUsers().find((item) => item.username === user.username), isAdmin: false });
});

app.get('/api/users', (req, res) => {
  res.json(safeUsers());
});

app.put('/api/users/:username', (req, res) => {
  const username = req.params.username;
  const user = findUser(username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  Object.assign(user, req.body);
  saveData(state);
  io.emit('users', safeUsers());
  res.json(user);
});

// NEW API: DELETE USER
app.delete('/api/users/:username', (req, res) => {
  const username = req.params.username;
  const initialLength = state.users.length;
  state.users = state.users.filter(u => u.username !== username);
  
  if (state.users.length === initialLength) {
      return res.status(404).json({ error: 'User not found' });
  }
  
  saveData(state);
  io.emit('users', safeUsers()); 
  res.json({ success: true });
});

// --- CHAT & FILE UPLOAD API ---
app.get('/api/messages', (req, res) => {
  const { chat, target } = req.query;
  if (!chat) return res.status(400).json({ error: 'chat query required' });
  if (chat === 'private') {
    if (!target) return res.status(400).json({ error: 'target required for private chat' });
    const [userA, userB] = target.split('||');
    return res.json(getHistory('private', { userA, userB }));
  }
  return res.json(getHistory(chat));
});

app.post('/api/messages', (req, res) => {
  const { chat, sender, text, target, attachment } = req.body;
  if (!chat || !sender) return res.status(400).json({ error: 'chat and sender are required' });
  const message = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sender,
    text: text || '',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    pinned: false,
    edited: false,
    deletedFor: [],
    attachment: attachment || null,
    type: 'message',
  };
  if (chat === 'private') {
    if (!target) return res.status(400).json({ error: 'target required for private chat' });
    const [userA, userB] = target.split('||');
    const key = getPrivateKey(userA, userB);
    state.chatHistory.private[key] = state.chatHistory.private[key] || [];
    state.chatHistory.private[key].push(message);
    saveData(state);
    emitMessage(chat, { userA, userB }, message);
    return res.json(message);
  }
  state.chatHistory[chat] = state.chatHistory[chat] || [];
  state.chatHistory[chat].push(message);
  saveData(state);
  emitMessage(chat, null, message);
  res.json(message);
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'File required' });
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ name: req.file.originalname, type: req.file.mimetype, size: req.file.size, url: fileUrl });
});

app.put('/api/messages/:id', (req, res) => {
  const { text, pinned } = req.body;
  const id = req.params.id;
  const allMessages = [...state.chatHistory.group, ...state.chatHistory.todo];
  Object.values(state.chatHistory.private).forEach((room) => room.forEach((message) => allMessages.push(message)));
  const message = allMessages.find((msg) => msg.id === id);
  if (!message) return res.status(404).json({ error: 'Message not found' });
  if (typeof text === 'string') {
    message.text = text;
    message.edited = true;
  }
  if (typeof pinned === 'boolean') {
    message.pinned = pinned;
  }
  saveData(state);
  io.emit('messageUpdated', message);
  res.json(message);
});

app.delete('/api/messages/:id', (req, res) => {
  const id = req.params.id;
  const removeFrom = (array) => {
    const idx = array.findIndex((msg) => msg.id === id);
    if (idx !== -1) array.splice(idx, 1);
  };
  removeFrom(state.chatHistory.group);
  removeFrom(state.chatHistory.todo);
  Object.values(state.chatHistory.private).forEach(removeFrom);
  saveData(state);
  io.emit('messageDeleted', { id });
  res.json({ success: true });
});

io.on('connection', (socket) => {
  socket.on('identify', (user) => {
    socket.data.username = user.username;
    socket.join('group');
    socket.join('todo');
    if (user.username) {
      const existing = findUser(user.username);
      if (existing) {
        existing.online = true;
        saveData(state);
      }
      io.emit('users', safeUsers());
    }
  });

  socket.on('joinChat', ({ chat, target, user }) => {
    if (!chat) return;
    socket.join(chat === 'private' ? getPrivateKey(user.username, target) : chat);
  });

  socket.on('sendMessage', ({ chat, target, sender, text, attachment }) => {
    const message = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sender,
      text: text || '',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      pinned: false,
      edited: false,
      deletedFor: [],
      attachment: attachment || null,
      type: 'message',
    };
    if (chat === 'private') {
      const [userA, userB] = target.split('||');
      const key = getPrivateKey(userA, userB);
      state.chatHistory.private[key] = state.chatHistory.private[key] || [];
      state.chatHistory.private[key].push(message);
      saveData(state);
      io.to(key).emit('message', { chat, target: { userA, userB }, message });
      return;
    }
    state.chatHistory[chat] = state.chatHistory[chat] || [];
    state.chatHistory[chat].push(message);
    saveData(state);
    io.to(chat).emit('message', { chat, message });
  });

  socket.on('updateProfile', (payload) => {
    const user = findUser(payload.username);
    if (!user) return;
    Object.assign(user, payload);
    saveData(state);
    io.emit('users', safeUsers());
  });

  socket.on('disconnect', () => {
    const username = socket.data.username;
    if (username) {
      updatePresence(username, false);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
