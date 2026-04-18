require('dotenv').config();
const express  = require('express');
const http     = require('http');
const https    = require('https');
const path     = require('path');
const fs       = require('fs');
const os       = require('os');
const cors     = require('cors');
const multer   = require('multer');
const sharp    = require('sharp');
const ffmpeg   = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const { Server } = require('socket.io');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

ffmpeg.setFfmpegPath(ffmpegPath);

// ── Cloudflare R2 client ──────────────────────────────────
const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});
const R2_BUCKET = process.env.R2_BUCKET || 'class-app-storage';

const ADMIN_USERNAME = 'Marquillero';
const ADMIN_PASSWORD = '120524';
const DATA_PATH = path.join(__dirname, 'data.json');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const PORT = process.env.PORT || 3000;

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// MULTER CONFIG: memory storage — files go straight to R2, not disk (500 MB max)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });

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
// Serve uploads — local disk fallback then R2 (supports /uploads/filename and subfolders)
app.get('/uploads/*', async (req, res) => {
  const filename = req.params[0]; // everything after /uploads/
  // Local fallback (old files before migration)
  const localPath = path.join(UPLOAD_DIR, path.basename(filename));
  if (fs.existsSync(localPath)) return res.sendFile(localPath);
  // Try R2: exact key first, then subfolder variants
  const candidates = [
    filename,
    `uploads/images/${path.basename(filename)}`,
    `uploads/videos/${path.basename(filename)}`,
    `uploads/other/${path.basename(filename)}`,
  ];
  for (const key of candidates) {
    try {
      const data = await r2.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }));
      res.setHeader('Content-Type', data.ContentType || 'application/octet-stream');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      data.Body.pipe(res);
      return;
    } catch { /* try next */ }
  }
  res.status(404).json({ error: 'File not found' });
});

// Prevent browsers and service workers from caching ANY API response.
// This stops the 'Unexpected token <' bug where a cold-start HTML page
// gets cached and replayed on every subsequent API call.
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// Redirect old PWA installs that used /CLASS-APP/ as start_url.
// Users who installed before the manifest fix open to /CLASS-APP/ — redirect
// them to / so the app loads normally without requiring a reinstall.
app.get('/CLASS-APP', (req, res) => res.redirect('/'));
app.get('/CLASS-APP/', (req, res) => res.redirect('/'));
app.get('/CLASS-APP/*', (req, res) => res.redirect('/'));

/* ── Wake-up ping (keeps Render free tier warm) ─────────── */
app.get('/api/ping', (req, res) => res.json({ ok: true }));

/* ── Search diagnostics — visit /api/search-test?q=test to debug ─────── */
app.get('/api/search-test', (req, res) => {
  const q = (req.query.q || 'test').trim();
  const report = { q, ytApi: null, piped: null, scrape: null };
  let done = 0;
  const finish = () => { if (++done === 3) res.json(report); };

  // 1) YouTube Data API
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    report.ytApi = { status: 'NO KEY SET' };
    finish();
  } else {
    const ytOpts = { hostname: 'www.googleapis.com', path: `/youtube/v3/search?part=snippet&type=video&maxResults=2&q=${encodeURIComponent(q)}&key=${apiKey}` };
    const ytReq = https.get(ytOpts, ytRes => {
      let raw = '';
      ytRes.on('data', c => raw += c);
      ytRes.on('end', () => {
        try {
          const d = JSON.parse(raw);
          report.ytApi = ytRes.statusCode === 200
            ? { status: 'OK', items: (d.items||[]).length }
            : { status: 'ERROR', code: ytRes.statusCode, msg: d.error?.message };
        } catch (e) { report.ytApi = { status: 'PARSE_ERROR', msg: e.message }; }
        finish();
      });
    });
    ytReq.on('error', e => { report.ytApi = { status: 'NETWORK_ERROR', msg: e.message }; finish(); });
    ytReq.setTimeout(8000, () => { ytReq.destroy(); report.ytApi = { status: 'TIMEOUT' }; finish(); });
  }

  // 2) Piped
  const pipedReq = https.get({ hostname: 'pipedapi.kavin.rocks', path: `/search?q=${encodeURIComponent(q)}&filter=videos`, headers: { 'User-Agent': 'class-app/1.0' } }, pRes => {
    let raw = '';
    pRes.on('data', c => raw += c);
    pRes.on('end', () => {
      try {
        const d = JSON.parse(raw);
        report.piped = { status: pRes.statusCode === 200 ? 'OK' : 'ERROR', code: pRes.statusCode, items: (d.items||[]).length };
      } catch (e) { report.piped = { status: 'PARSE_ERROR', msg: e.message, body: raw.slice(0,100) }; }
      finish();
    });
  });
  pipedReq.on('error', e => { report.piped = { status: 'NETWORK_ERROR', msg: e.message }; finish(); });
  pipedReq.setTimeout(8000, () => { pipedReq.destroy(); report.piped = { status: 'TIMEOUT' }; finish(); });

  // 3) YouTube scrape
  const scrapeOpts = { hostname: 'www.youtube.com', path: `/results?search_query=${encodeURIComponent(q)}`, headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en-US,en;q=0.9' } };
  const scrapeReq = https.get(scrapeOpts, sRes => {
    let raw = '', size = 0;
    sRes.on('data', c => { raw += c; size += c.length; if (size > 800000) sRes.destroy(); });
    sRes.on('end', () => {
      const hasData = raw.includes('var ytInitialData = ');
      const hasVideos = raw.includes('"videoId"');
      report.scrape = { status: sRes.statusCode === 200 ? 'OK' : 'ERROR', code: sRes.statusCode, hasInitData: hasData, hasVideoIds: hasVideos, bodyKB: Math.round(size/1024) };
      finish();
    });
  });
  scrapeReq.on('error', e => { report.scrape = { status: 'NETWORK_ERROR', msg: e.message }; finish(); });
  scrapeReq.setTimeout(10000, () => { scrapeReq.destroy(); report.scrape = { status: 'TIMEOUT' }; finish(); });
});

/* ── YouTube search proxy ──────────────────────────────────
   Key stays on the server — the browser never sees it.
   Usage: GET /api/yt-search?q=despacito
   ──────────────────────────────────────────────────────── */
app.get('/api/yt-search', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'Missing query parameter q' });

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error('[yt-search] YOUTUBE_API_KEY is not set in environment');
    return res.status(503).json({ error: 'YouTube API key not configured on server' });
  }

  console.log('[yt-search] Searching for:', q);

  const ytPath =
    `/youtube/v3/search?part=snippet&type=video&maxResults=6` +
    `&q=${encodeURIComponent(q)}&key=${apiKey}`;

  const options = { hostname: 'www.googleapis.com', path: ytPath, method: 'GET' };

  https.get(options, (ytRes) => {
    let raw = '';
    ytRes.on('data', chunk => { raw += chunk; });
    ytRes.on('end', () => {
      try {
        const ytData = JSON.parse(raw);
        if (ytRes.statusCode !== 200) {
          console.error('[yt-search] API error status', ytRes.statusCode, ':', ytData.error?.message || raw.slice(0, 200));
          return res.status(ytRes.statusCode).json({ error: ytData.error?.message || 'YouTube API error' });
        }
        const items = (ytData.items || []).map(item => ({
          videoId:   item.id.videoId,
          title:     item.snippet.title,
          author:    item.snippet.channelTitle,
          thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
        }));
        console.log('[yt-search] OK, returned', items.length, 'results');
        res.json({ items });
      } catch (e) {
        console.error('[yt-search] Parse error:', e.message);
        res.status(500).json({ error: 'Failed to parse YouTube response' });
      }
    });
  }).on('error', (err) => {
    console.error('[yt-search] Network error:', err.message);
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

  console.log('[piped-search] Searching for:', q);
  let idx = 0;
  function tryNext() {
    if (idx >= PIPED_HOSTS.length) {
      console.error('[piped-search] All Piped instances failed for query:', q);
      return res.status(502).json({ error: 'All Piped instances failed' });
    }
    const host = PIPED_HOSTS[idx++];
    pipedSearchRequest(host, q, (result) => {
      if (result) {
        console.log('[piped-search] OK via', host, '- returned', result.items.length, 'results');
        return res.json(result);
      }
      console.warn('[piped-search] Failed on', host, '- trying next');
      tryNext();
    });
  }
  tryNext();
});

/* ── YouTube InnerTube search (no API key — uses YouTube's own internal API) ─
   The InnerTube API is what youtube.com and the YouTube app use internally.
   All major YouTube scraping libraries (ytsr, youtube-sr) call this same
   endpoint under the hood. Returns structured JSON — no HTML parsing.
   Usage: GET /api/yt-scrape?q=payphone
   ─────────────────────────────────────────────────────────────────────── */
app.get('/api/yt-scrape', (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'Missing query' });

  console.log('[innertube] Searching for:', q);

  // Use MWEB client — simpler JSON structure, less bot-detection than WEB
  const body = JSON.stringify({
    context: {
      client: {
        clientName: 'MWEB',
        clientVersion: '2.20240101.00.00',
        hl: 'en',
        gl: 'US',
      },
    },
    query: q,
    params: 'EgIQAQ%3D%3D', // filter: videos only
  });

  const options = {
    hostname: 'www.youtube.com',
    path: '/youtubei/v1/search',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.210 Mobile Safari/537.36',
      'X-YouTube-Client-Name': '2',
      'X-YouTube-Client-Version': '2.20240101.00.00',
      'Origin': 'https://www.youtube.com',
      'Referer': 'https://www.youtube.com/',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cookie': 'CONSENT=YES+1;',
    },
  };

  const ytReq = https.request(options, (ytRes) => {
    let raw = '';
    ytRes.on('data', chunk => { raw += chunk; });
    ytRes.on('end', () => {
      try {
        const data = JSON.parse(raw);

        // MWEB uses singleColumnSearchResultsRenderer; WEB uses twoColumnSearchResultsRenderer
        const mwebContents = data?.contents
          ?.singleColumnSearchResultsRenderer
          ?.primaryContents
          ?.sectionListRenderer
          ?.contents || [];
        const webContents = data?.contents
          ?.twoColumnSearchResultsRenderer
          ?.primaryContents
          ?.sectionListRenderer
          ?.contents || [];
        const allContents = mwebContents.length ? mwebContents : webContents;

        const items = [];
        for (const section of allContents) {
          const sectionItems = section?.itemSectionRenderer?.contents || [];
          for (const item of sectionItems) {
            if (item.videoRenderer && items.length < 6) {
              const v = item.videoRenderer;
              if (!v.videoId) continue;
              items.push({
                videoId:   v.videoId,
                title:     v.title?.runs?.[0]?.text || v.title?.simpleText || '',
                author:    v.ownerText?.runs?.[0]?.text || v.shortBylineText?.runs?.[0]?.text || '',
                thumbnail: `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`,
              });
            }
          }
        }

        if (!items.length) {
          const structureKeys = Object.keys(data?.contents || {}).join(',') || 'none';
          console.warn('[innertube] No video results for:', q, '| HTTP:', ytRes.statusCode, '| top-level keys:', structureKeys);
          return res.status(404).json({ error: 'No results — structure: ' + structureKeys });
        }
        console.log('[innertube] OK, returned', items.length, 'results for:', q);
        res.json({ items });
      } catch (e) {
        console.error('[innertube] Parse error:', e.message, '| HTTP:', ytRes.statusCode, '| Body[:300]:', raw.slice(0, 300));
        res.status(500).json({ error: 'Parse failed: ' + e.message });
      }
    });
  });

  ytReq.on('error', (err) => {
    console.error('[innertube] Network error:', err.message);
    res.status(500).json({ error: 'Request failed: ' + err.message });
  });
  ytReq.setTimeout(15000, () => {
    ytReq.destroy();
    console.error('[innertube] Timeout for:', q);
    res.status(504).json({ error: 'Timeout' });
  });

  ytReq.write(body);
  ytReq.end();
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

// ── Compression helpers ───────────────────────────────────
const IMAGE_EXTS = new Set(['.jpg','.jpeg','.png','.gif','.webp']);
const VIDEO_EXTS = new Set(['.mp4','.mov','.webm','.avi','.mkv','.m4v']);

async function compressImage(buffer, ext) {
  let img = sharp(buffer).resize({ width: 1920, withoutEnlargement: true });
  switch (ext) {
    case '.jpg': case '.jpeg': return img.jpeg({ quality: 70, mozjpeg: true }).toBuffer();
    case '.png':               return img.png({ quality: 70, compressionLevel: 9 }).toBuffer();
    case '.webp':              return img.webp({ quality: 70 }).toBuffer();
    case '.gif':               return img.gif().toBuffer();
    default:                   return img.jpeg({ quality: 70 }).toBuffer();
  }
}

function compressVideo(inputPath, outputPath, ext) {
  return new Promise((resolve, reject) => {
    const isWebm = ext === '.webm';
    ffmpeg(inputPath)
      .videoCodec(isWebm ? 'libvpx-vp9' : 'libx264')
      .audioCodec(isWebm ? 'libopus' : 'aac')
      .addOutputOptions(isWebm
        ? ['-crf 33', '-b:v 0', '-row-mt 1']
        : ['-crf 26', '-preset fast', '-movflags +faststart']
      )
      .save(outputPath)
      .on('end', resolve)
      .on('error', reject);
  });
}

// ── Upload endpoint (compress → R2) ───────────────────────
app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'File required' });

  const ext      = path.extname(req.file.originalname).toLowerCase();
  const isImage  = IMAGE_EXTS.has(ext);
  const isVideo  = VIDEO_EXTS.has(ext);
  const folder   = isImage ? 'uploads/images' : isVideo ? 'uploads/videos' : 'uploads/other';
  const key      = `${folder}/file-${Date.now()}-${Math.round(Math.random()*1e9)}${ext}`;

  let finalBuffer = req.file.buffer;
  let tmpIn, tmpOut;

  try {
    if (isImage) {
      finalBuffer = await compressImage(req.file.buffer, ext);

    } else if (isVideo) {
      tmpIn  = path.join(os.tmpdir(), `up_in_${Date.now()}${ext}`);
      tmpOut = path.join(os.tmpdir(), `up_out_${Date.now()}${ext}`);
      fs.writeFileSync(tmpIn, req.file.buffer);
      await compressVideo(tmpIn, tmpOut, ext);
      finalBuffer = fs.readFileSync(tmpOut);
    }

    await r2.send(new PutObjectCommand({
      Bucket:      R2_BUCKET,
      Key:         key,
      Body:        finalBuffer,
      ContentType: req.file.mimetype,
    }));

    const url = `/uploads/${path.basename(key)}`;
    res.json({
      name: req.file.originalname,
      type: req.file.mimetype,
      size: finalBuffer.length,
      url,
    });

  } catch (err) {
    console.error('Upload/compress error:', err);
    res.status(500).json({ error: 'Upload failed' });
  } finally {
    if (tmpIn  && fs.existsSync(tmpIn))  fs.unlinkSync(tmpIn);
    if (tmpOut && fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
  }
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

/* ── In-memory lobby player map ─────────────────────────── */
const lobbyPlayers = new Map(); // socketId → { username, x, y, dir, color, bodyColor, score }

/* ── Star Collector mini-game ────────────────────────────── */
const lobbyScores = {}; // username → score
let lobbyStar = null;

function spawnStar() {
  let x, y, attempts = 0;
  do {
    x = 70 + Math.floor(Math.random() * 650);
    y = 70 + Math.floor(Math.random() * 360);
    attempts++;
  } while (Math.hypot(x - 400, y - 250) < 75 && attempts < 20); // avoid fountain
  lobbyStar = { id: Date.now(), x, y };
  io.to('lobby').emit('lobby:star', lobbyStar);
}
spawnStar();

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

  /* ── Lobby events ──────────────────────────────────────── */
  socket.on('lobby:join', (playerData) => {
    const player = {
      username: playerData.username || 'Unknown',
      x: Math.max(22, Math.min(780, playerData.x || 200)),
      y: Math.max(22, Math.min(470, playerData.y || 200)),
      dir: playerData.dir || 'down',
      color: playerData.color || '#00d4ff',
      bodyColor: playerData.bodyColor || '#336699',
    };
    player.score = lobbyScores[player.username] || 0;
    lobbyPlayers.set(socket.id, player);
    socket.join('lobby');
    // Send current players to the newcomer
    socket.emit('lobby:players', Array.from(lobbyPlayers.values()));
    // Send current star to the newcomer
    if (lobbyStar) socket.emit('lobby:star', lobbyStar);
    // Tell everyone else
    socket.to('lobby').emit('lobby:player_joined', player);
  });

  socket.on('lobby:move', ({ x, y, dir }) => {
    const player = lobbyPlayers.get(socket.id);
    if (!player) return;
    player.x = Math.max(22, Math.min(780, x || player.x));
    player.y = Math.max(22, Math.min(470, y || player.y));
    player.dir = dir || player.dir;
    socket.to('lobby').emit('lobby:player_moved', { username: player.username, x: player.x, y: player.y, dir: player.dir });
  });

  socket.on('lobby:chat', ({ text }) => {
    let player = lobbyPlayers.get(socket.id);
    // Fallback: if lobby:join was delayed but socket is identified, auto-register
    if (!player && socket.data.username) {
      player = {
        username: socket.data.username, x: 200, y: 200,
        dir: 'down', color: '#00d4ff', bodyColor: '#336699',
        score: lobbyScores[socket.data.username] || 0,
      };
      lobbyPlayers.set(socket.id, player);
      socket.join('lobby');
      socket.emit('lobby:players', Array.from(lobbyPlayers.values()));
      if (lobbyStar) socket.emit('lobby:star', lobbyStar);
      socket.to('lobby').emit('lobby:player_joined', player);
    }
    if (!player || !text) return;
    const msg = {
      username: player.username,
      text: String(text).slice(0, 100),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    io.to('lobby').emit('lobby:chat', msg);
  });

  socket.on('lobby:collect_star', ({ starId }) => {
    const player = lobbyPlayers.get(socket.id);
    if (!player || !lobbyStar || lobbyStar.id !== starId) return;
    const old = lobbyStar;
    lobbyStar = null; // remove immediately to prevent double-collect
    lobbyScores[player.username] = (lobbyScores[player.username] || 0) + 1;
    player.score = lobbyScores[player.username];
    io.to('lobby').emit('lobby:star_collected', {
      username: player.username,
      score: player.score,
      starId: old.id,
    });
    setTimeout(spawnStar, 1500);
  });

  socket.on('lobby:leave', () => {
    const player = lobbyPlayers.get(socket.id);
    if (player) {
      lobbyPlayers.delete(socket.id);
      io.to('lobby').emit('lobby:player_left', { username: player.username });
    }
    socket.leave('lobby');
  });

  socket.on('disconnect', () => {
    const username = socket.data.username;
    if (username) {
      updatePresence(username, false);
    }
    // Remove from lobby on disconnect
    const lobbyPlayer = lobbyPlayers.get(socket.id);
    if (lobbyPlayer) {
      lobbyPlayers.delete(socket.id);
      io.to('lobby').emit('lobby:player_left', { username: lobbyPlayer.username });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
