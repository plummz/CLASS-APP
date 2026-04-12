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

const upload = multer({ dest: UPLOAD_DIR });

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

let state = loadData();

// --- USERS & AUTH ---
function findUser(username) {
  return state.users.find((user) => user.username.toLowerCase() === username.toLowerCase());
}

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  if (username === ADMIN_USERNAME && password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Invalid admin password' });
  let user = findUser(username);
  if (!user) {
    user = { username, displayName: username, online: true };
    state.users.push(user);
  } else {
    user.online = true;
  }
  saveData(state);
  io.emit('users', state.users);
  res.json({ user, isAdmin: user.username === ADMIN_USERNAME });
});

app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (findUser(username)) return res.status(400).json({ error: 'Username exists' });
  const user = { username, displayName: username, online: true };
  state.users.push(user);
  saveData(state);
  io.emit('users', state.users);
  res.json({ user, isAdmin: false });
});

app.get('/api/users', (req, res) => res.json(state.users));

// --- FOLDERS API ---
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

// --- FILES API ---
app.get('/api/files', (req, res) => {
  res.json(state.files.filter(f => f.folderId === req.query.folderId));
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'File required' });
  res.json({ name: req.file.originalname, url: `/uploads/${req.file.filename}` });
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

// --- CHAT ENDPOINTS ---
app.get('/api/messages', (req, res) => {
  const { chat, target } = req.query;
  if (chat === 'private' && target) {
    return res.json(state.chatHistory.private[target] || []);
  }
  return res.json(state.chatHistory[chat] || []);
});

io.on('connection', (socket) => {
  socket.on('sendMessage', ({ chat, target, sender, text }) => {
    const msg = { id: Date.now().toString(), sender, text, time: new Date().toLocaleTimeString() };
    if (chat === 'private') {
      state.chatHistory.private[target] = state.chatHistory.private[target] || [];
      state.chatHistory.private[target].push(msg);
      io.emit('message', { chat, target, message: msg });
    } else {
      state.chatHistory[chat] = state.chatHistory[chat] || [];
      state.chatHistory[chat].push(msg);
      io.emit('message', { chat, message: msg });
    }
    saveData(state);
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
