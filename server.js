const express = require('express');
const http = require('http');
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

function loadData() {
  if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, JSON.stringify({ users: [], chatHistory: { group: [], todo: [], private: {} }, folders: [], files: [] }, null, 2));
  }
  try {
    const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
    // Ensure arrays exist if migrating from old data format
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

const upload = multer({ dest: UPLOAD_DIR });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static(UPLOAD_DIR));

let state = loadData();

// --- USER & CHAT LOGIC ---
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

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  if (username === ADMIN_USERNAME && password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Invalid admin password' });
  let user = findUser(username);
  if (!user) user = createUser(username);
  user.online = true;
  saveData(state);
  io.emit('users', safeUsers());
  res.json({ user: safeUsers().find((item) => item.username === user.username), isAdmin: user.username === ADMIN_USERNAME });
});

app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  if (findUser(username)) return res.status(400).json({ error: 'Username already exists' });
  const user = createUser(username);
  user.online = true;
  saveData(state);
  io.emit('users', safeUsers());
  res.json({ user: safeUsers().find((item) => item.username === user.username), isAdmin: false });
});

app.get('/api/users', (req, res) => res.json(safeUsers()));

app.put('/api/users/:username', (req, res) => {
  const user = findUser(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  Object.assign(user, req.body);
  saveData(state);
  io.emit('users', safeUsers());
  res.json(user);
});

// --- CHAT ENDPOINTS ---
app.get('/api/messages', (req, res) => {
  const { chat, target } = req.query;
  if (!chat) return res.status(400).json({ error: 'chat query required' });
  if (chat === 'private') {
    if (!target) return res.status(400).json({ error: 'target required' });
    const [userA, userB] = target.split('||');
    return res.json(getHistory('private', { userA, userB }));
  }
  return res.json(getHistory(chat));
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

// --- FOLDERS & FILES API ---
app.get('/api/folders', (req, res) => {
  const { parent } = req.query; // parent = Subject name or 'Music'
  res.json(state.folders.filter(f => f.parent === parent));
});

app.post('/api/folders', (req, res) => {
  const folder = { 
    id: Date.now().toString(), 
    parent: req.body.parent, 
    name: req.body.name, 
    owner: req.body.owner,
    createdAt: new Date().toISOString()
  };
  state.folders.push(folder);
  saveData(state);
  res.json(folder);
});

app.put('/api/folders/:id', (req, res) => {
  const folder = state.folders.find(f => f.id === req.params.id);
  if (!folder) return res.status(404).json({ error: 'Folder not found' });
  folder.name = req.body.name;
  saveData(state);
  res.json(folder);
});

app.delete('/api/folders/:id', (req, res) => {
  state.folders = state.folders.filter(f => f.id !== req.params.id);
  state.files = state.files.filter(f => f.folderId !== req.params.id); // Delete files inside
  saveData(state);
  res.json({ success: true });
});

// Fetch files in a folder
app.get('/api/files', (req, res) => {
  const { folderId } = req.query;
  res.json(state.files.filter(f => f.folderId === folderId));
});

// Save file metadata after upload
app.post('/api/files', (req, res) => {
  const fileData = {
    id: Date.now().toString(),
    folderId: req.body.folderId,
    name: req.body.name,
    url: req.body.url,
    type: req.body.type,
    uploader: req.body.uploader,
    createdAt: new Date().toISOString()
  };
  state.files.push(fileData);
  saveData(state);
  res.json(fileData);
});

app.delete('/api/files/:id', (req, res) => {
  state.files = state.files.filter(f => f.id !== req.params.id);
  saveData(state);
  res.json({ success: true });
});

// File Upload Route (Multer)
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'File required' });
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ name: req.file.originalname, type: req.file.mimetype, size: req.file.size, url: fileUrl });
});

// --- SOCKET.IO ---
io.on('connection', (socket) => {
  socket.on('identify', (user) => {
    socket.data.username = user.username;
    socket.join('group');
    socket.join('todo');
    const existing = findUser(user.username);
    if (existing) { existing.online = true; saveData(state); }
    io.emit('users', safeUsers());
  });

  socket.on('joinChat', ({ chat, target, user }) => {
    if (!chat) return;
    socket.join(chat === 'private' ? getPrivateKey(user.username, target) : chat);
  });

  socket.on('sendMessage', ({ chat, target, sender, text, attachment }) => {
    const message = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sender, text: text || '',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      pinned: false, edited: false, deletedFor: [], attachment: attachment || null, type: 'message',
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

  socket.on('disconnect', () => {
    if (socket.data.username) updatePresence(socket.data.username, false);
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
