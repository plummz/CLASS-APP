require('dotenv').config();
const { tryWithFallback } = require('./ai-service');
const express  = require('express');
const http     = require('http');
const https    = require('https');
const path     = require('path');
const fs       = require('fs');
const os       = require('os');
const { spawn } = require('child_process');
const cors     = require('cors');
const multer   = require('multer');
const sharp    = require('sharp');
const ffmpeg   = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const { Server } = require('socket.io');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const bcrypt   = require('bcryptjs');
const crypto   = require('crypto');
const jwt      = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet   = require('helmet');
const pdfParse = require('pdf-parse');
const mammoth  = require('mammoth');
const AdmZip   = require('adm-zip');

let webpush = null;
try {
  webpush = require('web-push');
} catch (_) {
  webpush = null;
}

ffmpeg.setFfmpegPath(ffmpegPath);

// â”€â”€ Cloudflare R2 client â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});
const R2_BUCKET = process.env.R2_BUCKET || 'class-app-storage';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
  console.error('[security] ADMIN_USERNAME and ADMIN_PASSWORD must be set in env. Admin login disabled.');
}
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('[fatal] JWT_SECRET must be set in production. Refusing to start.');
}
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
  if (process.env.NODE_ENV !== 'production' && !process.env.JWT_SECRET) console.warn('[security] JWT_SECRET not set - using insecure default for local development');
const DATA_PATH = process.env.DATA_PATH_OVERRIDE || path.join(__dirname, 'data.json');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const PORT = process.env.PORT || 3000;
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT_RAW = process.env.VAPID_SUBJECT || 'mailto:admin@class-app.local';
const VAPID_SUBJECT = /^https?:\/\//i.test(VAPID_SUBJECT_RAW) || /^mailto:/i.test(VAPID_SUBJECT_RAW)
  ? VAPID_SUBJECT_RAW
  : `mailto:${VAPID_SUBJECT_RAW}`;
let PUSH_READY = Boolean(webpush && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

if (PUSH_READY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  } catch (error) {
    PUSH_READY = false;
    console.warn('Push notifications disabled: invalid VAPID configuration:', error.message);
  }
}

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// MULTER CONFIG: 50 MB for video, 10 MB for everything else (checked per route)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

function loadData() {
  if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, JSON.stringify({
      users: [],
      chatHistory: { group: [], todo: [], private: {} },
      folders: [],
      files: [],
      pushSubscriptions: {},
      sentPushMessageIds: [],
      appOpenCount: 0,
      appOpenCounts: {},
      lobbyScores: {},
    }, null, 2));
  }
  try {
    const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
    if (!data.folders) data.folders = [];
    if (!data.files) data.files = [];
    if (!data.pushSubscriptions) data.pushSubscriptions = {};
    if (!data.sentPushMessageIds) data.sentPushMessageIds = [];
    if (typeof data.appOpenCount !== 'number') data.appOpenCount = 0;
    if (!data.appOpenCounts || typeof data.appOpenCounts !== 'object' || Array.isArray(data.appOpenCounts)) data.appOpenCounts = {};
    if (!data.lobbyScores || typeof data.lobbyScores !== 'object' || Array.isArray(data.lobbyScores)) data.lobbyScores = {};
    return data;
  } catch (error) {
    console.error('Error loading data.json:', error);
    return {
      users: [],
      chatHistory: { group: [], todo: [], private: {} },
      folders: [],
      files: [],
      pushSubscriptions: {},
      sentPushMessageIds: [],
      appOpenCount: 0,
      appOpenCounts: {},
      lobbyScores: {},
    };
  }
}

let _saveQueue = Promise.resolve();
function saveData(data) {
  _saveQueue = _saveQueue
    .then(() => fs.promises.writeFile(DATA_PATH, JSON.stringify(data, null, 2)))
    .catch((err) => console.error('[saveData] Failed:', err.message));
  return _saveQueue;
}

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '';
if (!ALLOWED_ORIGIN && process.env.NODE_ENV === 'production') {
  console.error('[security] ALLOWED_ORIGIN is not set. CORS will reject all cross-origin requests.');
}

const RESOLVED_CORS_ORIGIN = ALLOWED_ORIGIN || false;
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: RESOLVED_CORS_ORIGIN, methods: ['GET', 'POST', 'PUT', 'DELETE'] } });

// Security headers â€” CSP disabled to avoid breaking inline scripts (tighten in later phase)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://cdn.socket.io', 'https://www.youtube.com', 'https://www.gstatic.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdn.jsdelivr.net'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      frameSrc: ["'self'", 'https://www.youtube-nocookie.com', 'https://www.youtube.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      connectSrc: ["'self'", 'https://*.supabase.co', 'wss://*.supabase.co', 'https://pipedapi.kavin.rocks', 'https://pipedapi.tokhmi.xyz', 'https://piped-api.garudalinux.org', 'https://pipedapi.adminforge.de', 'https://www.googleapis.com'],
      mediaSrc: ["'self'", 'blob:', 'https:'],
      workerSrc: ["'self'", 'blob:'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
const STATIC_CACHE_OPTIONS = {
  maxAge: '1y',
  immutable: true,
};
const STATIC_ASSET_CHECKS = [
  'style.css',
  'script.js',
  'assets/css/codelab.css',
  'assets/js/codelab.js',
  'assets/images/code-web-card.svg',
  'assets/images/code-java-card.svg',
  'features/ai/ai.css',
  'features/ai/ai.js',
  'features/updates/updates.css',
  'features/pokemon/pokemon.css',
  'features/royale/royale.css',
];

function getStaticAssetStatus() {
  return STATIC_ASSET_CHECKS.map((file) => {
    const absolutePath = path.join(__dirname, file);
    const exists = fs.existsSync(absolutePath);
    const stat = exists ? fs.statSync(absolutePath) : null;
    return {
      file,
      exists,
      size: stat?.size || 0,
      mtime: stat?.mtime?.toISOString() || null,
    };
  });
}

function formatUptime(seconds) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

app.use(cors({ origin: RESOLVED_CORS_ORIGIN }));
app.use(express.json());

// Wraps sync/async route handlers so any thrown error reaches the global error handler
const wrap = fn => (req, res, next) => { try { const r = fn(req, res, next); if (r && typeof r.catch === 'function') r.catch(next); } catch (e) { next(e); } };

// â”€â”€ Auth helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, try again later.' },
});
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many AI requests. Please wait a minute.' },
});
const ALLOWED_PROFILE_FIELDS = ['displayName', 'birthday', 'address', 'github', 'email', 'note', 'avatar'];
const ALLOWED_CHATS = new Set(['group', 'todo']);
const SUPABASE_AUTH_SELECT = 'username,display_name,birthday,address,github,email,note,online,avatar,last_seen_at,password_hash,username_last_changed_at';
const SUPABASE_PUBLIC_PROFILE_SELECT = 'username,display_name,birthday,address,github,email,note,online,avatar,last_seen_at,username_last_changed_at,updated_at';

function hashPassword(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function isPasswordLongEnough(value) {
  return typeof value === 'string' && value.length >= 8;
}

function applyAllowedProfileFields(target, source = {}) {
  for (const field of ALLOWED_PROFILE_FIELDS) {
    if (source[field] !== undefined) target[field] = source[field];
  }
}

function toStateUserProfile(profile = {}, passwordHash = '') {
  return {
    username: profile.username,
    displayName: profile.display_name || profile.displayName || profile.username,
    birthday: profile.birthday || 'Unknown',
    address: profile.address || 'Unknown',
    github: profile.github || '',
    email: profile.email || '',
    note: profile.note || 'New user profile',
    online: Boolean(profile.online),
    avatar: profile.avatar || '',
    passwordHash: passwordHash || profile.password_hash || profile.passwordHash || '',
  };
}

async function fetchSupabaseProfile(username) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  const url = new URL('/rest/v1/profiles', SUPABASE_URL);
  url.searchParams.set('select', SUPABASE_AUTH_SELECT);
  url.searchParams.set('username', `eq.${username}`);
  url.searchParams.set('limit', '1');
  const response = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Accept: 'application/json',
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase profile lookup failed (${response.status}): ${text.slice(0, 160)}`);
  }
  const rows = await response.json();
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function fetchSupabasePublicProfiles() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return [];
  const url = new URL('/rest/v1/profiles', SUPABASE_URL);
  url.searchParams.set('select', SUPABASE_PUBLIC_PROFILE_SELECT);
  url.searchParams.set('order', 'display_name.asc.nullslast,username.asc');
  const response = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Accept: 'application/json',
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase users lookup failed (${response.status}): ${text.slice(0, 160)}`);
  }
  const rows = await response.json();
  return Array.isArray(rows) ? rows : [];
}

async function resolveAuthProfile(username) {
  if (!username) return null;
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    return fetchSupabaseProfile(username);
  }
  const localUser = findUser(username);
  if (!localUser) return null;
  return {
    username: localUser.username,
    display_name: localUser.displayName,
    birthday: localUser.birthday,
    address: localUser.address,
    github: localUser.github,
    email: localUser.email,
    note: localUser.note,
    online: localUser.online,
    avatar: localUser.avatar,
    password_hash: localUser.passwordHash || '',
  };
}

function issueToken(username, isAdminUser) {
  return jwt.sign({ username, isAdmin: isAdminUser }, JWT_SECRET, { expiresIn: '7d' });
}

function issueLegacyPasswordSetupToken(username) {
  return jwt.sign({ username, purpose: 'legacy-password-setup' }, JWT_SECRET, { expiresIn: '10m' });
}

function sanitizeAuthProfile(profile = {}) {
  return {
    username: profile.username || '',
    display_name: profile.display_name || profile.displayName || profile.username || '',
    birthday: profile.birthday || 'Unknown',
    address: profile.address || 'Unknown',
    github: profile.github || '',
    email: profile.email || '',
    note: profile.note || '',
    online: Boolean(profile.online),
    avatar: profile.avatar || '',
    last_seen_at: profile.last_seen_at || null,
    username_last_changed_at: profile.username_last_changed_at || null,
  };
}

async function updateAuthProfilePasswordHash(username, passwordHash) {
  if (!username) throw new Error('Username is required for password setup.');
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    const url = new URL('/rest/v1/profiles', SUPABASE_URL);
    url.searchParams.set('username', `eq.${username}`);
    url.searchParams.set('select', SUPABASE_AUTH_SELECT);
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
        'x-class-username': username,
      },
      body: JSON.stringify({ password_hash: passwordHash }),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Supabase password update failed (${response.status}): ${text.slice(0, 160)}`);
    }
    const rows = await response.json();
    return Array.isArray(rows) ? rows[0] || null : null;
  }

  let user = findUser(username);
  if (!user) {
    user = createUser(username, { username }, passwordHash);
  } else {
    user.passwordHash = passwordHash;
    await saveData(state);
  }
  return {
    username: user.username,
    display_name: user.displayName,
    birthday: user.birthday,
    address: user.address,
    github: user.github,
    email: user.email,
    note: user.note,
    online: user.online,
    avatar: user.avatar,
    last_seen_at: null,
    password_hash: passwordHash,
  };
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user?.isAdmin) return res.status(403).json({ error: 'Forbidden' });
  next();
}

// Middleware: requireAuth + must be the resource owner or admin
function requireSelf(paramField) {
  return [requireAuth, (req, res, next) => {
    if (req.user.isAdmin || req.user.username === req.params[paramField]) return next();
    res.status(403).json({ error: 'Forbidden' });
  }];
}
app.use('/assets', express.static(path.join(__dirname, 'assets'), STATIC_CACHE_OPTIONS));
app.use('/features', express.static(path.join(__dirname, 'features'), STATIC_CACHE_OPTIONS));
app.use('/icons', express.static(path.join(__dirname, 'icons'), STATIC_CACHE_OPTIONS));
app.use(express.static(path.join(__dirname)));
// Serve uploads â€” local disk fallback then R2 (supports /uploads/filename and subfolders)
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

app.get('/api/static-check', (req, res) => {
  const files = getStaticAssetStatus();
  res.json({
    ok: files.every((file) => file.exists),
    root: path.basename(__dirname),
    files,
  });
});

app.get('/api/diagnostics', requireAuth, requireAdmin, async (req, res) => {
  const packageInfo = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));
  let cacheVersion = 'unknown';
  try {
    const sw = fs.readFileSync(path.join(__dirname, 'sw.js'), 'utf-8');
    cacheVersion = sw.match(/CACHE_VERSION\s*=\s*['"`]([^'"`]+)/)?.[1] || cacheVersion;
  } catch (_e) { /* sw.js unreadable â€” use default */ }

  let java = { available: false, message: 'Java status not checked.' };
  try {
    java = await checkJavaToolchain();
  } catch (error) {
    java = { available: false, message: error.message };
  }

  const memory = process.memoryUsage();
  res.json({
    ok: true,
    appVersion: packageInfo.version,
    cacheVersion,
    runtime: process.env.RENDER ? 'Render' : 'Local',
    node: process.version,
    platform: `${process.platform} ${process.arch}`,
    dockerDetected: fs.existsSync('/.dockerenv') || Boolean(process.env.RENDER),
    uptime: formatUptime(process.uptime()),
    memory: `${Math.round(memory.rss / 1024 / 1024)} MB RSS`,
    r2: {
      configured: Boolean(process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && R2_BUCKET),
      endpointConfigured: Boolean(process.env.R2_ENDPOINT),
      bucket: R2_BUCKET || '',
    },
    push: {
      ready: PUSH_READY,
      publicKey: Boolean(VAPID_PUBLIC_KEY),
      privateKey: Boolean(VAPID_PRIVATE_KEY),
      subject: VAPID_SUBJECT,
    },
    java: {
      available: Boolean(java.available),
      javacVersion: java.javacVersion || '',
      javaVersion: java.javaVersion || '',
      timeouts: java.timeouts || {},
      message: java.message || '',
    },
    staticAssets: getStaticAssetStatus(),
    dataCounts: {
      users: state.users.length,
      folders: state.folders.length,
      files: state.files.length,
      privateRooms: Object.keys(state.chatHistory.private || {}).length,
    },
  });
});

// Redirect old PWA installs that used /CLASS-APP/ as start_url.
// Users who installed before the manifest fix open to /CLASS-APP/ â€” redirect
// them to / so the app loads normally without requiring a reinstall.
app.get('/CLASS-APP', (req, res) => res.redirect('/'));
app.get('/CLASS-APP/', (req, res) => res.redirect('/'));
app.get('/CLASS-APP/*', (req, res) => res.redirect('/'));

/* â”€â”€ Wake-up ping (keeps Render free tier warm) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
app.get('/api/ping', (req, res) => res.json({ ok: true }));

/* â”€â”€ Client config â€” serves non-secret public keys to frontend â”€â”€ */
app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseKey: process.env.SUPABASE_ANON_KEY || '',
  });
});

app.get('/api/app-open-count', (req, res) => {
  const users = Object.entries(state.appOpenCounts || {})
    .map(([username, count]) => ({ username, count }))
    .sort((a, b) => b.count - a.count || a.username.localeCompare(b.username));
  res.json({ count: state.appOpenCount || 0, users });
});

app.post('/api/app-open-count', wrap((req, res) => {
  state.appOpenCount = (state.appOpenCount || 0) + 1;
  const username = String(req.body?.username || '').trim().slice(0, 40);
  if (username) {
    if (!state.appOpenCounts || typeof state.appOpenCounts !== 'object' || Array.isArray(state.appOpenCounts)) state.appOpenCounts = {};
    state.appOpenCounts[username] = (state.appOpenCounts[username] || 0) + 1;
  }
  saveData(state);
  const users = Object.entries(state.appOpenCounts || {})
    .map(([name, count]) => ({ username: name, count }))
    .sort((a, b) => b.count - a.count || a.username.localeCompare(b.username));
  const payload = { count: state.appOpenCount, users };
  io.emit('appOpenCount', payload);
  res.json(payload);
}));

/* â”€â”€ Search diagnostics â€” visit /api/search-test?q=test to debug â”€â”€â”€â”€â”€â”€â”€ */
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

/* â”€â”€ YouTube search proxy â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   Key stays on the server â€” the browser never sees it.
   Usage: GET /api/yt-search?q=despacito
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

/* â”€â”€ Piped search proxy (no API key needed, avoids browser CORS blocks) â”€â”€â”€â”€
   Usage: GET /api/piped-search?q=despacito
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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
      } catch (_e) { /* unparseable response â€” try next host */ }
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

/* â”€â”€ YouTube InnerTube search (no API key â€” uses YouTube's own internal API) â”€
   The InnerTube API is what youtube.com and the YouTube app use internally.
   All major YouTube scraping libraries (ytsr, youtube-sr) call this same
   endpoint under the hood. Returns structured JSON â€” no HTML parsing.
   Usage: GET /api/yt-scrape?q=payphone
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
app.get('/api/yt-scrape', (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'Missing query' });

  console.log('[innertube] Searching for:', q);

  // Use MWEB client â€” simpler JSON structure, less bot-detection than WEB
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
          return res.status(404).json({ error: 'No results â€” structure: ' + structureKeys });
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

function safeDirectoryUsersFromProfiles(rows = []) {
  return rows.map((row) => ({
    username: row.username || '',
    display_name: row.display_name || row.displayName || row.username || '',
    birthday: row.birthday || 'Unknown',
    address: row.address || 'Unknown',
    github: row.github || '',
    email: row.email || '',
    note: row.note || '',
    online: Boolean(row.online),
    avatar: row.avatar || '',
    last_seen_at: row.last_seen_at || null,
    username_last_changed_at: row.username_last_changed_at || null,
    updated_at: row.updated_at || null,
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

function syncStateUserFromProfile(user, profile = {}, passwordHash = '') {
  const next = toStateUserProfile(profile, passwordHash);
  user.displayName = next.displayName;
  user.birthday = next.birthday;
  user.address = next.address;
  user.github = next.github;
  user.email = next.email;
  user.note = next.note;
  user.avatar = next.avatar;
  if (passwordHash || next.passwordHash) user.passwordHash = passwordHash || next.passwordHash;
  return user;
}

function createUser(username, profile = {}, passwordHash = '') {
  const user = toStateUserProfile({ username, ...profile }, passwordHash);
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

function pruneSentPushIds() {
  if (state.sentPushMessageIds.length > 500) {
    state.sentPushMessageIds = state.sentPushMessageIds.slice(-250);
  }
}

async function sendPrivatePushNotification({ sender, target, text, messageId }) {
  if (!PUSH_READY || !sender || !target || !messageId) return { sent: 0, skipped: true };
  if (state.sentPushMessageIds.includes(messageId)) return { sent: 0, duplicate: true };

  const subscriptions = state.pushSubscriptions[target] || [];
  if (!subscriptions.length) {
    state.sentPushMessageIds.push(messageId);
    pruneSentPushIds();
    await saveData(state);
    return { sent: 0 };
  }

  const conversationKey = getPrivateKey(sender, target);
  const payload = JSON.stringify({
    title: `New message from ${sender}`,
    body: text ? String(text).slice(0, 140) : 'Sent an attachment',
    url: `/?chat=${encodeURIComponent(sender)}`,
    sender,
    target,
    messageId,
    conversationKey,
    tag: `private-${conversationKey}`,
  });

  let sent = 0;
  const keep = [];
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(sub, payload);
      keep.push(sub);
      sent++;
    } catch (error) {
      if (![404, 410].includes(error.statusCode)) keep.push(sub);
      console.warn('Push send failed:', error.statusCode || error.message);
    }
  }

  state.pushSubscriptions[target] = keep;
  state.sentPushMessageIds.push(messageId);
  pruneSentPushIds();
  await saveData(state);
  return { sent };
}

app.get('/api/push/public-key', (req, res) => {
  res.json({ enabled: PUSH_READY, publicKey: VAPID_PUBLIC_KEY });
});

app.post('/api/push/subscribe', requireAuth, async (req, res) => {
  const { username, subscription } = req.body || {};
  if (!username || !subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'username and subscription are required' });
  }
  if (username !== req.user.username) return res.status(403).json({ error: 'Forbidden' });
  state.pushSubscriptions[username] = state.pushSubscriptions[username] || [];
  const existing = state.pushSubscriptions[username].find((sub) => sub.endpoint === subscription.endpoint);
  if (!existing) state.pushSubscriptions[username].push(subscription);
  await saveData(state);
  res.json({ success: true, enabled: PUSH_READY });
});

app.post('/api/push/unsubscribe', requireAuth, async (req, res) => {
  const { username, endpoint } = req.body || {};
  if (!username || !endpoint) return res.status(400).json({ error: 'username and endpoint are required' });
  if (username !== req.user.username) return res.status(403).json({ error: 'Forbidden' });
  state.pushSubscriptions[username] = (state.pushSubscriptions[username] || []).filter((sub) => sub.endpoint !== endpoint);
  await saveData(state);
  res.json({ success: true });
});

app.post('/api/push/private-message', requireAuth, async (req, res) => {
  const { sender, target, text, messageId } = req.body || {};
  if (!sender || !target || !messageId) {
    return res.status(400).json({ error: 'sender, target, and messageId are required' });
  }
  if (sender !== req.user.username) return res.status(403).json({ error: 'Forbidden' });
  if (sender === target) return res.status(400).json({ error: 'Cannot notify self' });
  try {
    const result = await sendPrivatePushNotification({ sender, target, text, messageId });
    res.json({ success: true, ...result, enabled: PUSH_READY });
  } catch (error) {
    console.error('Push notification error:', error);
    res.status(500).json({ error: 'Push notification failed' });
  }
});

// --- FOLDERS & FILES API ---
app.get('/api/folders', wrap((req, res) => {
  const parent = req.query.parent;
  res.json(state.folders.filter(f => f.parent === parent));
}));

app.post('/api/folders', requireAuth, wrap(async (req, res) => {
  const folder = { id: Date.now().toString(), parent: req.body.parent, name: req.body.name, owner: req.user.username };
  state.folders.push(folder);
  await saveData(state);
  res.json(folder);
}));

app.put('/api/folders/:id', requireAuth, (req, res) => {
  const folder = state.folders.find(f => f.id === req.params.id);
  if (!folder) return res.status(404).json({ error: 'Folder not found' });
  if (!req.user.isAdmin && folder.owner !== req.user.username) return res.status(403).json({ error: 'Forbidden' });
  folder.name = req.body.name;
  saveData(state);
  res.json(folder);
});

app.delete('/api/folders/:id', requireAuth, (req, res) => {
  const folder = state.folders.find(f => f.id === req.params.id);
  if (!folder) return res.status(404).json({ error: 'Folder not found' });
  if (!req.user.isAdmin && folder.owner !== req.user.username) return res.status(403).json({ error: 'Forbidden' });
  state.folders = state.folders.filter(f => f.id !== req.params.id);
  state.files = state.files.filter(f => f.folderId !== req.params.id);
  saveData(state);
  res.json({ success: true });
});

app.get('/api/files', wrap((req, res) => {
  res.json(state.files.filter(f => f.folderId === req.query.folderId));
}));

app.post('/api/files', requireAuth, wrap(async (req, res) => {
  const file = {
    id: Date.now().toString(),
    folderId: req.body.folderId,
    name: req.body.name,
    url: req.body.url,
    type: req.body.type,
    size: req.body.size,
    uploadedBy: req.user.username,
    owner: req.user.username,
    attachment: req.body.attachment || null,
  };
  state.files.push(file);
  await saveData(state);
  res.json(file);
}));

app.delete('/api/files/:id', requireAuth, (req, res) => {
  const file = state.files.find(f => f.id === req.params.id);
  if (!file) return res.status(404).json({ error: 'File not found' });
  if (!req.user.isAdmin && file.uploadedBy !== req.user.username) return res.status(403).json({ error: 'Forbidden' });
  state.files = state.files.filter(f => f.id !== req.params.id);
  saveData(state);
  res.json({ success: true });
});

// --- AUTH & USERS API ---
app.post('/api/login', loginLimiter, wrap(async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }
  const normalizedUsername = String(username).trim();
  if (ADMIN_USERNAME && ADMIN_PASSWORD && normalizedUsername === ADMIN_USERNAME) {
    const valid = ADMIN_PASSWORD.startsWith('$2')
      ? await bcrypt.compare(password, ADMIN_PASSWORD)
      : password === ADMIN_PASSWORD;
    if (!valid) return res.status(401).json({ error: 'Invalid admin password' });
    let adminUser = findUser(normalizedUsername);
    if (!adminUser) adminUser = createUser(normalizedUsername);
    adminUser.online = true;
    await saveData(state);
    io.emit('users', safeUsers());
    return res.json({
      user: safeUsers().find((item) => item.username === adminUser.username),
      isAdmin: true,
      token: issueToken(adminUser.username, true),
    });
  }

  const authProfile = await resolveAuthProfile(normalizedUsername);
  if (!authProfile) {
    return res.status(404).json({ error: 'User not found. Please register.' });
  }
  if (!authProfile.password_hash) {
    return res.status(428).json({
      error: 'Password setup required',
      code: 'PASSWORD_SETUP_REQUIRED',
      setupToken: issueLegacyPasswordSetupToken(normalizedUsername),
      profile: sanitizeAuthProfile(authProfile),
    });
  }
  if (hashPassword(password) !== authProfile.password_hash) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  let user = findUser(normalizedUsername);
  if (!user) user = createUser(normalizedUsername, authProfile, authProfile.password_hash);
  else syncStateUserFromProfile(user, authProfile, authProfile.password_hash);
  user.online = true;
  await saveData(state);
  io.emit('users', safeUsers());
  const isAdminUser = Boolean(ADMIN_USERNAME && user.username === ADMIN_USERNAME);
  const token = issueToken(user.username, isAdminUser);
  res.json({ user: safeUsers().find((item) => item.username === user.username), isAdmin: isAdminUser, token });
}));

app.post('/api/password-setup', loginLimiter, wrap(async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password) {
    return res.status(400).json({ error: 'token and password are required' });
  }
  if (!isPasswordLongEnough(password)) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  let setupPayload;
  try {
    setupPayload = jwt.verify(String(token), JWT_SECRET);
  } catch (_) {
    return res.status(401).json({ error: 'Password setup request expired. Please try signing in again.' });
  }
  if (setupPayload?.purpose !== 'legacy-password-setup' || !setupPayload.username) {
    return res.status(403).json({ error: 'Invalid password setup request.' });
  }

  const normalizedUsername = String(setupPayload.username).trim();
  const authProfile = await resolveAuthProfile(normalizedUsername);
  if (!authProfile) {
    return res.status(404).json({ error: 'User not found. Please register.' });
  }
  if (authProfile.password_hash) {
    return res.status(409).json({ error: 'This account already has a password. Please sign in normally.' });
  }

  const passwordHash = hashPassword(password);
  const updatedProfile = await updateAuthProfilePasswordHash(normalizedUsername, passwordHash);
  const finalProfile = updatedProfile || { ...authProfile, password_hash: passwordHash };

  let user = findUser(normalizedUsername);
  if (!user) user = createUser(normalizedUsername, finalProfile, passwordHash);
  else syncStateUserFromProfile(user, finalProfile, passwordHash);
  user.passwordHash = passwordHash;
  user.online = true;
  await saveData(state);
  io.emit('users', safeUsers());

  const isAdminUser = Boolean(ADMIN_USERNAME && user.username === ADMIN_USERNAME);
  const sessionToken = issueToken(user.username, isAdminUser);
  res.json({
    user: safeUsers().find((item) => item.username === user.username),
    isAdmin: isAdminUser,
    token: sessionToken,
    profile: sanitizeAuthProfile({ ...finalProfile, password_hash: passwordHash }),
  });
}));

app.post('/api/register', loginLimiter, wrap(async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }
  if (!isPasswordLongEnough(password)) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }
  const normalizedUsername = String(username).trim();
  const passwordHash = hashPassword(password);
  const authProfile = await resolveAuthProfile(normalizedUsername);
  if (SUPABASE_URL && SUPABASE_ANON_KEY && !authProfile) {
    return res.status(400).json({ error: 'Profile record not found. Please create the account in the app first.' });
  }
  if (authProfile && !authProfile.password_hash) {
    return res.status(400).json({ error: 'Profile password hash is missing. Please retry registration.' });
  }
  if (authProfile && authProfile.password_hash && authProfile.password_hash !== passwordHash) {
    return res.status(401).json({ error: 'Password does not match the stored profile.' });
  }
  let user = findUser(normalizedUsername);
  if (!user) user = createUser(normalizedUsername, authProfile || { username: normalizedUsername }, passwordHash);
  else syncStateUserFromProfile(user, authProfile || { username: normalizedUsername }, passwordHash);
  user.passwordHash = passwordHash;
  user.online = true;
  await saveData(state);
  io.emit('users', safeUsers());
  const isAdminUser = Boolean(ADMIN_USERNAME && user.username === ADMIN_USERNAME);
  const token = issueToken(user.username, isAdminUser);
  res.json({ user: safeUsers().find((item) => item.username === user.username), isAdmin: isAdminUser, token });
}));

app.get('/api/users', requireAuth, wrap(async (req, res) => {
  try {
    const rows = await fetchSupabasePublicProfiles();
    if (rows.length) return res.json(safeDirectoryUsersFromProfiles(rows));
  } catch (error) {
    console.warn('[users] Falling back to local state:', error.message);
  }
  res.json(safeDirectoryUsersFromProfiles(safeUsers()));
}));

app.put('/api/users/:username', ...requireSelf('username'), async (req, res) => {
  const username = req.params.username;
  const user = findUser(username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  applyAllowedProfileFields(user, req.body || {});
  await saveData(state);
  io.emit('users', safeUsers());
  res.json(user);
});

app.delete('/api/users/:username', ...requireSelf('username'), (req, res) => {
  const username = req.params.username;
  const initialLength = state.users.length;
  state.users = state.users.filter(u => u.username !== username);
  if (state.users.length === initialLength) return res.status(404).json({ error: 'User not found' });
  saveData(state);
  io.emit('users', safeUsers());
  res.json({ success: true });
});

// --- CHAT & FILE UPLOAD API ---
app.get('/api/messages', wrap((req, res) => {
  const { chat, target } = req.query;
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
  if (!chat) return res.status(400).json({ error: 'chat query required' });
  const sliceHistory = (history) => {
    const end = Math.max(history.length - offset, 0);
    const start = Math.max(end - limit, 0);
    return history.slice(start, end);
  };
  if (chat === 'private') {
    if (!target) return res.status(400).json({ error: 'target required for private chat' });
    const [userA, userB] = target.split('||');
    return res.json(sliceHistory(getHistory('private', { userA, userB })));
  }
  return res.json(sliceHistory(getHistory(chat)));
}));

app.post('/api/messages', requireAuth, wrap(async (req, res) => {
  const { chat, text, target, attachment } = req.body || {};
  const sender = req.user.username;
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
    await saveData(state);
    emitMessage(chat, { userA, userB }, message);
    const recipient = sender === userA ? userB : userA;
    sendPrivatePushNotification({ sender, target: recipient, text: message.text, messageId: message.id })
      .catch((error) => console.warn('Private push failed:', error.message));
    return res.json(message);
  }
  state.chatHistory[chat] = state.chatHistory[chat] || [];
  state.chatHistory[chat].push(message);
  await saveData(state);
  emitMessage(chat, null, message);
  res.json(message);
}));

// â”€â”€ Compression helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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


// â”€â”€ Upload endpoint (compress â†’ R2) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.post('/api/upload', requireAuth, upload.single('file'), async (req, res) => {
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
    }
    // Videos: skip re-encoding â€” phone videos are already H.264; FFmpeg pass is too slow

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

function safePracticeUser(value) {
  return String(value || 'guest').trim().replace(/[^a-z0-9_-]/gi, '_').slice(0, 40) || 'guest';
}

app.post('/api/code-lab/assets', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'File required' });
  const ext = path.extname(req.file.originalname).toLowerCase();
  const allowed = IMAGE_EXTS.has(ext) || VIDEO_EXTS.has(ext);
  if (!allowed) return res.status(400).json({ error: 'Only image and video practice assets are allowed' });
  const username = safePracticeUser(req.user.username);
  const key = `practice-assets/${username}/asset-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
  try {
    await r2.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    }));
    res.json({
      name: req.file.originalname,
      type: req.file.mimetype,
      size: req.file.size,
      url: `/uploads/${key}`,
    });
  } catch (error) {
    console.error('Code Lab asset upload failed:', error);
    res.status(500).json({ error: 'Practice asset upload failed' });
  }
});

const JAVA_TOOLCHAIN_TIMEOUT_MS = Number(process.env.CODE_LAB_JAVA_TOOLCHAIN_TIMEOUT_MS || 5000);
const JAVA_COMPILE_TIMEOUT_MS = Number(process.env.CODE_LAB_JAVA_COMPILE_TIMEOUT_MS || process.env.CODE_LAB_JAVA_TIMEOUT_MS || 20000);
const JAVA_RUN_TIMEOUT_MS = Number(process.env.CODE_LAB_JAVA_RUN_TIMEOUT_MS || process.env.CODE_LAB_JAVA_TIMEOUT_MS || 8000);
const JAVAC_BIN = process.env.JAVAC_BIN || 'javac';
const JAVA_BIN = process.env.JAVA_BIN || 'java';
/* eslint-disable security/detect-unsafe-regex */
const JAVA_BLOCKLIST = [
  /Runtime\.getRuntime/i,
  /ProcessBuilder/i,
  /System\.exit/i,
  /java\.io\.File/i,
  /Files\./i,
  /Socket/i,
  /URLClassLoader/i,
  /ClassLoader/i,
  /reflect/i,
];
let javaToolchainCache = null;

function hasJavaMain(source) {
  return /public\s+static\s+void\s+main\s*\(\s*String\s*(?:\[\]\s*\w+|\w+\s*\[\])\s*\)/.test(source);
}

function hasJavaClass(source) {
  return /\b(?:public\s+)?class\s+\w+\b/.test(source);
}

function firstJavaClassName(source) {
  const match = source.match(/\b(?:public\s+)?class\s+([A-Za-z_]\w*)\b/);
  return match ? match[1] : null;
}

function hasRunnableMethod(source) {
  return /\b(?:public|private|protected)?\s*(?:static\s+)?void\s+run\s*\(\s*\)/.test(source);
}
/* eslint-enable security/detect-unsafe-regex */

function looksLikeMemberSource(source) {
  // eslint-disable-next-line security/detect-unsafe-regex
  return /\b(?:public|private|protected)?\s*(?:static\s+)?(?:void|int|double|float|boolean|char|byte|short|long|String|[A-Z]\w*)\s+\w+\s*\([^;{}]*\)\s*\{/.test(source);
}

function usesSwing(source) {
  return /javax\.swing|java\.awt|JFrame|JPanel|JButton|JLabel|JTextField|setVisible\s*\(\s*true\s*\)/.test(source);
}

function cleanJavaOutput(value) {
  return String(value || '')
    .split(/\r?\n/)
    .filter((line) => !/^Picked up JAVA_TOOL_OPTIONS:/i.test(line.trim()))
    .join('\n')
    .trim();
}

function cleanJavaError(value, processed) {
  const raw = cleanJavaOutput(value);
  if (/Main method not found/i.test(raw)) {
    return {
      message: processed.autoWrapped
        ? 'Java could not find a runnable entry point. Add executable statements, a run() method, or public static void main(String[] args).'
        : 'Your program needs public static void main(String[] args).',
      raw,
    };
  }
  return { message: raw || 'Java execution failed.', raw };
}

function processJavaSource(code) {
  const original = String(code || '').slice(0, 20000).trim();
  if (!original) {
    return {
      source: '',
      autoWrapped: false,
      wrapperType: 'empty',
      swing: false,
    };
  }
  const imports = original.match(/\bimport\s+[^;]+;/g) || [];
  const body = original.replace(/\bimport\s+[^;]+;/g, '').trim();
  const importBlock = imports.join('\n');
  const swing = usesSwing(original);
  const validMain = hasJavaMain(original);

  if (validMain) {
    if (!hasJavaClass(body)) {
      return {
        source: `${importBlock ? `${importBlock}\n\n` : ''}public class Main {\n${body}\n}`,
        autoWrapped: true,
        wrapperType: 'main-method',
        swing,
      };
    }
    const className = firstJavaClassName(body);
    if (className && className !== 'Main') {
      const classSource = body.replace(/\bpublic\s+class\s+([A-Za-z_]\w*)\b/, 'class $1');
      return {
        source: `${importBlock ? `${importBlock}\n\n` : ''}${classSource}\n\npublic class Main {\n  public static void main(String[] args) {\n    ${className}.main(args);\n  }\n}`,
        autoWrapped: true,
        wrapperType: 'main-delegator',
        swing,
      };
    }
    return {
      source: original,
      autoWrapped: false,
      wrapperType: 'existing-main',
      swing,
    };
  }

  if (!hasJavaClass(body)) {
    const isMemberSource = looksLikeMemberSource(body);
    const memberRunner = hasRunnableMethod(body)
      ? '    Main app = new Main();\n    app.run();'
      : '';
    const source = isMemberSource
      ? `${importBlock ? `${importBlock}\n\n` : ''}public class Main {\n${body}\n\n  public static void main(String[] args) {\n${memberRunner}\n  }\n}`
      : `${importBlock ? `${importBlock}\n\n` : ''}public class Main {\n  public static void main(String[] args) {\n${body.split(/\r?\n/).map((line) => `    ${line}`).join('\n')}\n  }\n}`;
    return {
      source,
      autoWrapped: true,
      wrapperType: isMemberSource ? 'members' : 'statements',
      swing,
    };
  }

  const originalClassName = firstJavaClassName(body);
  const runnerClassName = originalClassName === 'Main' ? 'UserProgram' : originalClassName;
  let classSource = body.replace(/\bpublic\s+class\s+([A-Za-z_]\w*)\b/, 'class $1');
  if (originalClassName === 'Main') {
    classSource = classSource.replace(/\bclass\s+Main\b/, 'class UserProgram');
  }
  const runner = hasRunnableMethod(body) && runnerClassName
    ? `    new ${runnerClassName}().run();`
    : '';
  return {
    source: `${importBlock ? `${importBlock}\n\n` : ''}${classSource}\n\npublic class Main {\n  public static void main(String[] args) {\n${runner}\n  }\n}`,
    autoWrapped: true,
    wrapperType: 'class-runner',
    swing,
  };
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve) => {
    const timeoutMs = Number(options.timeoutMs || JAVA_RUN_TIMEOUT_MS);
    const phase = options.phase || 'command';
    const spawnOptions = { ...options, windowsHide: true };
    delete spawnOptions.timeoutMs;
    delete spawnOptions.phase;
    delete spawnOptions.stdinText;
    const child = spawn(command, args, spawnOptions);
    let stdout = '';
    let stderr = '';
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill('SIGKILL');
        resolve({ code: 124, stdout, stderr: `${stderr}\nTimed out while ${phase} after ${timeoutMs}ms`.trim() });
      }
    }, timeoutMs);
    if (child.stdin) {
      child.stdin.end(options.stdinText || '');
    }
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ code: 127, stdout, stderr: error.message });
    });
    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

function firstLine(value) {
  return String(value || '').split(/\r?\n/).find(Boolean) || '';
}

async function checkJavaToolchain(force = false) {
  if (javaToolchainCache && !force) return javaToolchainCache;
  const javac = await runCommand(JAVAC_BIN, ['-version'], { timeoutMs: JAVA_TOOLCHAIN_TIMEOUT_MS, phase: 'checking javac' });
  const java = await runCommand(JAVA_BIN, ['-version'], { timeoutMs: JAVA_TOOLCHAIN_TIMEOUT_MS, phase: 'checking java' });
  const available = javac.code === 0 && java.code === 0;
  javaToolchainCache = {
    available,
    javacBin: JAVAC_BIN,
    javaBin: JAVA_BIN,
    javacVersion: firstLine(javac.stderr || javac.stdout),
    javaVersion: firstLine(java.stderr || java.stdout),
    timeouts: {
      toolchainMs: JAVA_TOOLCHAIN_TIMEOUT_MS,
      compileMs: JAVA_COMPILE_TIMEOUT_MS,
      runMs: JAVA_RUN_TIMEOUT_MS,
    },
    message: available
      ? 'Java toolchain is available.'
      : 'Java toolchain is unavailable. Deploy with the included Dockerfile, which installs OpenJDK 17, or configure JAVAC_BIN/JAVA_BIN to valid binaries.',
    diagnostics: {
      javac: javac.stderr || javac.stdout,
      java: java.stderr || java.stdout,
    },
  };
  return javaToolchainCache;
}

async function runJavaSource(code) {
  const toolchain = await checkJavaToolchain();
  if (!toolchain.available) {
    return {
      ok: false,
      error: toolchain.message,
      code: 'java_unavailable',
      diagnostics: toolchain.diagnostics,
    };
  }
  const processed = processJavaSource(code);
  if (!processed.source.trim()) {
    return { ok: false, error: 'Enter Java code before running.' };
  }
  if (JAVA_BLOCKLIST.some((pattern) => pattern.test(processed.source))) {
    return { ok: false, error: 'This Java practice sandbox blocks file, process, reflection, network, and exit APIs.' };
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'class-app-code-lab-'));
  const file = path.join(dir, 'Main.java');
  try {
    fs.writeFileSync(file, processed.source);
    const compile = await runCommand(JAVAC_BIN, ['-J-Xmx160m', 'Main.java'], {
      cwd: dir,
      timeoutMs: JAVA_COMPILE_TIMEOUT_MS,
      phase: 'compiling Java',
    });
    if (compile.code !== 0) {
      const compileError = cleanJavaError(compile.stderr || compile.stdout || 'Compile failed.', processed);
      return { ok: false, status: 'Execution failed', error: compileError.message, raw: compileError.raw, autoWrapped: processed.autoWrapped };
    }
    if (processed.swing) {
      return {
        ok: true,
        output: 'Your Swing code compiled, but GUI windows cannot open in this headless environment.',
        autoWrapped: processed.autoWrapped,
        wrapperType: processed.wrapperType,
      };
    }
    const run = await runCommand(JAVA_BIN, ['-Xmx160m', '-Djava.awt.headless=true', '-cp', dir, 'Main'], {
      cwd: dir,
      env: { ...process.env, JAVA_TOOL_OPTIONS: '-Djava.awt.headless=true' },
      timeoutMs: JAVA_RUN_TIMEOUT_MS,
      phase: 'running Java',
    });
    const stdout = cleanJavaOutput(run.stdout);
    const stderr = cleanJavaOutput(run.stderr);
    if (run.code !== 0) {
      const runtimeError = cleanJavaError(stderr || stdout || 'Runtime error.', processed);
      return { ok: false, status: 'Execution failed', error: runtimeError.message, raw: runtimeError.raw, autoWrapped: processed.autoWrapped };
    }
    return {
      ok: true,
      output: stdout || '[No output]',
      autoWrapped: processed.autoWrapped,
      wrapperType: processed.wrapperType,
    };
  } finally {
    fs.rm(dir, { recursive: true, force: true }, () => {});
  }
}

app.post('/api/code-lab/run-java', async (req, res) => {
  try {
    res.json(await runJavaSource(req.body?.code || ''));
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/code-lab/java-status', async (req, res) => {
  try {
    res.json(await checkJavaToolchain(true));
  } catch (error) {
    res.status(500).json({ available: false, message: error.message });
  }
});

function validateDailyChallenge(challengeId, files = {}) {
  const html = String(files.html || '');
  const css = String(files.css || '');
  const js = String(files.javascript || '');
  const java = String(files.java || '');
  const baseChallengeId = String(challengeId || '').replace(/-day-\d+-(web|java)$/i, '');
  if (baseChallengeId === 'html-missing-image-alt') {
    const ok = /<h1[^>]*>[\s\S]*?<\/h1>/i.test(html)
      && /<img\b(?=[^>]*\bsrc\s*=\s*["'][^"']+["'])(?=[^>]*\balt\s*=\s*["'][^"']+["'])[^>]*>/i.test(html)
      && /<button[^>]*>[\s\S]*?Toggle[\s\S]*?<\/button>/i.test(html);
    return ok ? null : 'Fix the h1 closing tag, complete the img tag with src and alt, and keep the Toggle button valid.';
  }
  if (baseChallengeId === 'js-total-loop') {
    const ok = /i\s*=\s*0/.test(js) && /i\s*<\s*prices\.length/.test(js) && /Total:\s*['"]?\s*\+?\s*total/.test(js);
    return ok ? null : 'The loop should start at 0, stay below prices.length, and print the computed total.';
  }
  if (baseChallengeId === 'css-center-button') {
    const ok = /display\s*:\s*flex/i.test(css) && /align-items\s*:\s*center/i.test(css) && /border-radius\s*:\s*(?!none\b)[^;]+/i.test(css);
    return ok ? null : 'Use display:flex, align-items:center, and a real border-radius value.';
  }
  if (baseChallengeId === 'java-hello-total') {
    return /public\s+static\s+void\s+main\s*\(\s*String\[\]\s+args\s*\)/.test(java)
      && /int\s+sum\s*=\s*\d+\s*\+\s*\d+\s*;/.test(java)
      && /System\.out\.println\s*\(\s*"Sum[^"]*:\s*"\s*\+\s*sum\s*\)/.test(java)
      ? null
      : 'Fix main(String[] args), end the sum line with a semicolon, and print sum.';
  }
  if (baseChallengeId === 'swing-button-label') {
    return /import\s+javax\.swing\.JButton\s*;/.test(java) && /new\s+JButton\s*\(/.test(java) && /Swing source compiles/i.test(java)
      ? null
      : 'Fix the JButton import/class name and keep the Swing compile message.';
  }
  return 'Unknown daily challenge.';
}

app.post('/api/code-lab/validate', async (req, res) => {
  try {
    const challengeId = String(req.body?.challengeId || '');
    const files = req.body?.files || {};
    const message = validateDailyChallenge(challengeId, files);
    if (message) return res.json({ ok: false, error: message });
    if (challengeId.startsWith('java-') || challengeId.startsWith('swing-')) {
      const javaResult = await runJavaSource(files.java || '');
      if (!javaResult.ok) return res.json({ ok: false, error: javaResult.error });
    }
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.put('/api/messages/:id', requireAuth, (req, res) => {
  const { text, pinned } = req.body;
  const id = req.params.id;
  const allMessages = [...state.chatHistory.group, ...state.chatHistory.todo];
  Object.values(state.chatHistory.private).forEach((room) => room.forEach((message) => allMessages.push(message)));
  const message = allMessages.find((msg) => msg.id === id);
  if (!message) return res.status(404).json({ error: 'Message not found' });
  if (!req.user.isAdmin && message.sender !== req.user.username) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (typeof text === 'string') { message.text = text; message.edited = true; }
  if (typeof pinned === 'boolean') message.pinned = pinned;
  saveData(state);
  io.emit('messageUpdated', message);
  res.json(message);
});

app.delete('/api/messages/:id', requireAuth, (req, res) => {
  const id = req.params.id;
  const allMessages = [...state.chatHistory.group, ...state.chatHistory.todo];
  Object.values(state.chatHistory.private).forEach((room) => allMessages.push(...room));
  const message = allMessages.find((msg) => msg.id === id);
  if (!message) return res.status(404).json({ error: 'Message not found' });
  if (!req.user.isAdmin && message.sender !== req.user.username) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const removeFrom = (array) => { const idx = array.findIndex((msg) => msg.id === id); if (idx !== -1) array.splice(idx, 1); };
  removeFrom(state.chatHistory.group);
  removeFrom(state.chatHistory.todo);
  Object.values(state.chatHistory.private).forEach(removeFrom);
  saveData(state);
  io.emit('messageDeleted', { id });
  res.json({ success: true });
});

/* â”€â”€ File Summarizer Endpoint â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
app.post('/api/summarize-file', requireAuth, aiLimiter, upload.single('file'), async (req, res) => {
  const hasFile = !!req.file;
  const hasText = !!(req.body && req.body.text);
  const ctype   = (req.headers['content-type'] || '').split(';')[0].trim();
  console.log(`[FileSummarizer] HIT | hasFile:${hasFile} hasText:${hasText} ctype:"${ctype}"`);

  // â”€â”€ PATH 1: File upload â†’ extract text â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (hasFile) {
    const fileName  = req.file.originalname || 'unknown';
    const fileSize  = req.file.size || 0;
    const mimeType  = req.file.mimetype || 'unknown';
    const bufferLen = req.file.buffer ? req.file.buffer.length : 0;
    const ext       = path.extname(fileName).toLowerCase();

    console.log(`[FileSummarizer] File: "${fileName}" | ${(fileSize/1024).toFixed(1)} KB | mime: ${mimeType} | buffer: ${bufferLen} bytes | ext: "${ext}"`);

    if (!req.file.buffer || bufferLen === 0) {
      console.error('[FileSummarizer] Buffer missing or empty â€” multer may not have received the file');
      return res.status(400).json({ error: 'File data was not received by the server. Please try again.' });
    }

    try {
      let extractedText = '';

      if (ext === '.pdf') {
        console.log('[FileSummarizer] Parsing PDF with pdf-parseâ€¦');
        const data = await pdfParse(req.file.buffer);
        extractedText = data.text || '';
        console.log(`[FileSummarizer] PDF parsed: ${extractedText.length} chars`);
      } else if (ext === '.docx' || ext === '.doc') {
        console.log('[FileSummarizer] Parsing DOCX/DOC with mammothâ€¦');
        const result = await mammoth.extractRawText({ buffer: req.file.buffer });
        extractedText = result.value || '';
        console.log(`[FileSummarizer] DOCX/DOC parsed: ${extractedText.length} chars`);
      } else if (ext === '.pptx') {
        console.log('[FileSummarizer] Parsing PPTX with adm-zipâ€¦');
        const zip = new AdmZip(req.file.buffer);
        const slideFiles = zip.getEntries().filter(e =>
          e.entryName.startsWith('ppt/slides/slide') && e.entryName.endsWith('.xml')
        );
        console.log(`[FileSummarizer] PPTX slides found: ${slideFiles.length}`);
        let text = '';
        for (const file of slideFiles) {
          const content = zip.readAsText(file);
          const matches = content.match(/<a:t>([^<]+)<\/a:t>/g);
          if (matches) text += matches.map(m => m.replace(/<\/?a:t>/g, '')).join(' ') + '\n';
        }
        extractedText = text;
        console.log(`[FileSummarizer] PPTX parsed: ${extractedText.length} chars`);
      } else if (ext === '.ppt') {
        return res.status(400).json({ error: 'PowerPoint 97-2003 (.ppt) is not supported. Please convert your file to .pptx and try again.' });
      } else {
        return res.status(400).json({ error: `"${ext}" files are not supported. Please upload PDF, DOCX, or PPTX.` });
      }

      const trimmed = extractedText.trim();
      if (!trimmed) {
        console.log(`[FileSummarizer] No text found in "${fileName}" â€” possibly image-based or empty`);
        return res.status(400).json({ error: 'No readable text found in this file. It may be image-based, empty, or password-protected.' });
      }

      console.log(`[FileSummarizer] EXTRACTION SUCCESS: "${fileName}" â†’ ${trimmed.length} chars`);
      return res.json({ text: trimmed.slice(0, 50000), type: ext });

    } catch (parseErr) {
      console.error(`[FileSummarizer] PARSE ERROR for "${fileName}":`, parseErr.message);
      console.error(parseErr.stack);
      return res.status(400).json({ error: `Could not read "${fileName}". The file may be corrupted, password-protected, or in an incompatible format.` });
    }
  }

  // â”€â”€ PATH 2: Text â†’ AI summary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (hasText) {
    const { text, type, customPrompt } = req.body;
    console.log(`[FileSummarizer] Summarize | type: "${type}" | text: ${text ? text.length : 0} chars`);

    if (!text || !text.trim()) return res.status(400).json({ error: 'No text provided to summarize.' });

    const prompts = {
      short:    'Provide a short, concise summary of the following text:',
      detailed: 'Provide detailed study notes based on the following text. Use bullet points and clear headings:',
      key:      'Extract the key points and main ideas from the following text:',
      terms:    'Extract a list of important terms or vocabulary from the following text, along with short definitions:',
      quiz:     'Generate 5 multiple-choice quiz questions based on the following text to test comprehension. Include answers at the bottom:',
    };

    let prompt = customPrompt || prompts[type];
    if (!prompt) return res.status(400).json({ error: 'Invalid summary type. Must be: short, detailed, key, terms, or quiz.' });

    try {
      const messages = [{ role: 'user', content: `${prompt}\n\nTEXT:\n${text}` }];
      const result = await tryWithFallback('gemini', messages);
      console.log(`[FileSummarizer] AI summary OK | type: ${type} | ${result.text.length} chars`);
      return res.json({ summary: result.text });
    } catch (aiErr) {
      console.error('[FileSummarizer] AI ERROR:', aiErr.message);
      return res.status(500).json({ error: 'Could not generate a summary. The AI service may be temporarily unavailable. Please try again in a moment.' });
    }
  }

  console.log('[FileSummarizer] Invalid request â€” no file, no text body');
  return res.status(400).json({ error: 'Invalid request. Please upload a file to summarize.' });
});

/* â”€â”€ Quiz Generation Endpoint â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
app.post('/api/quiz', requireAuth, aiLimiter, express.json(), async (req, res) => {
  const { text, quizType, count } = req.body || {};
  if (!text || !quizType || !count) {
    return res.status(400).json({ error: 'text, quizType, and count are required.' });
  }

  const n = parseInt(count);
  if (!n || n < 1 || n > 100) return res.status(400).json({ error: 'count must be 1â€“100.' });

  const typeDescriptions = {
    'identification': `${n} identification/fill-in-the-blank questions. For each question, ask students to identify a term, person, place, or concept. The answer should be a short word or phrase.`,
    'multiple-choice': `${n} multiple choice questions, each with exactly 4 choices labeled A, B, C, D. Indicate the correct answer letter.`,
    'both': `${Math.ceil(n/2)} identification questions and ${Math.floor(n/2)} multiple choice questions (4 choices each, labeled A-D).`,
  };

  const typeDesc = typeDescriptions[quizType];
  if (!typeDesc) return res.status(400).json({ error: 'Invalid quizType.' });

  const prompt = `You are a quiz generator. Generate ${typeDesc} based on the provided text.

IMPORTANT: Return ONLY valid JSON â€” no explanation, no markdown, no code fences. The JSON must follow this exact schema:
{
  "questions": [
    {
      "id": 1,
      "type": "multiple-choice",
      "text": "What is...?",
      "choices": ["A) First option", "B) Second option", "C) Third option", "D) Fourth option"],
      "answer": "A",
      "explanation": "Brief explanation why this is correct."
    },
    {
      "id": 2,
      "type": "identification",
      "text": "___ is responsible for...",
      "answer": "Short Answer",
      "explanation": "Brief explanation."
    }
  ]
}

Rules:
- For identification questions, omit "choices" field entirely.
- For multiple-choice, "answer" must be just the letter: A, B, C, or D.
- Make questions directly about the provided text content.
- Generate exactly ${n} questions total.`;

  try {
    const messages = [{ role: 'user', content: `${prompt}\n\nTEXT:\n${text.slice(0, 30000)}` }];
    const result = await tryWithFallback('gemini', messages);

    // Extract JSON from AI response â€” strip any markdown/text wrapping
    let raw = result.text.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI did not return valid JSON.');

    const quizData = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(quizData.questions)) throw new Error('Invalid quiz structure from AI.');

    console.log(`[Quiz] Generated ${quizData.questions.length} questions | type: ${quizType}`);
    return res.json({ questions: quizData.questions });
  } catch (err) {
    console.error('[Quiz] Error:', err.message);
    return res.status(500).json({ error: 'Failed to generate quiz. Please try again.' });
  }
});

/* â”€â”€ AI Endpoints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
app.post('/api/gemini', requireAuth, aiLimiter, express.json(), async (req, res) => {
  const { messages } = req.body || {};
  if (!messages?.length) return res.status(400).json({ error: 'messages required' });
  try {
    res.json(await tryWithFallback('gemini', messages));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/groq', requireAuth, aiLimiter, express.json(), async (req, res) => {
  const { messages } = req.body || {};
  if (!messages?.length) return res.status(400).json({ error: 'messages required' });
  try {
    res.json(await tryWithFallback('groq', messages));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* â”€â”€ In-memory lobby player map â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const lobbyPlayers = new Map(); // socketId â†’ { username, x, y, dir, color, bodyColor, score }
const lobbyMoveThrottle = new Map(); // socketId â†’ last broadcast timestamp (50ms / 20fps)

/* â”€â”€ Star Collector mini-game â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const lobbyScores = {}; // username â†’ score
Object.assign(lobbyScores, state.lobbyScores || {});
state.lobbyScores = lobbyScores;
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
  socket.on('identify', async (payload = {}) => {
    const username = String(payload.username || '').trim();
    const token = payload.token || '';
    if (!username || !token) return;
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.username !== username) return;
      socket.data.username = decoded.username;
      socket.data.isAdmin = Boolean(decoded.isAdmin);
    } catch {
      return;
    }
    socket.join('group');
    socket.join('todo');
    if (socket.data.username) {
      const existing = findUser(socket.data.username);
      if (existing) {
        existing.online = true;
        await saveData(state);
      }
      io.emit('users', safeUsers());
    }
  });

  socket.on('joinChat', ({ chat, target }) => {
    if (!chat) return;
    if (chat === 'private') {
      if (!socket.data.username || !target) return;
      socket.join(getPrivateKey(socket.data.username, target));
      return;
    }
    if (!ALLOWED_CHATS.has(chat)) return;
    socket.join(chat);
  });

  socket.on('sendMessage', async ({ chat, target, text, attachment }) => {
    const sender = socket.data.username;
    if (!sender || !chat) return;
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
      if (!target) return;
      const [userA, userB] = target.split('||');
      const key = getPrivateKey(userA, userB);
      state.chatHistory.private[key] = state.chatHistory.private[key] || [];
      state.chatHistory.private[key].push(message);
      await saveData(state);
      io.to(key).emit('message', { chat, target: { userA, userB }, message });
      const recipient = sender === userA ? userB : userA;
      sendPrivatePushNotification({ sender, target: recipient, text: message.text, messageId: message.id })
        .catch((error) => console.warn('Private push failed:', error.message));
      return;
    }
    if (!ALLOWED_CHATS.has(chat)) return;
    state.chatHistory[chat] = state.chatHistory[chat] || [];
    state.chatHistory[chat].push(message);
    await saveData(state);
    io.to(chat).emit('message', { chat, message });
  });

  socket.on('updateProfile', async (payload = {}) => {
    if (!socket.data.username || socket.data.username !== payload.username) return;
    const user = findUser(payload.username);
    if (!user) return;
    applyAllowedProfileFields(user, payload);
    await saveData(state);
    io.emit('users', safeUsers());
  });

  /* â”€â”€ Lobby events â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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
    const now = Date.now();
    if (now - (lobbyMoveThrottle.get(socket.id) || 0) < 50) return; // 20fps cap
    lobbyMoveThrottle.set(socket.id, now);
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

  socket.on('lobby:collect_star', async ({ starId }) => {
    const player = lobbyPlayers.get(socket.id);
    if (!player || !lobbyStar || lobbyStar.id !== starId) return;
    const old = lobbyStar;
    lobbyStar = null; // remove immediately to prevent double-collect
    lobbyScores[player.username] = (lobbyScores[player.username] || 0) + 1;
    player.score = lobbyScores[player.username];
    await saveData(state);
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
    lobbyMoveThrottle.delete(socket.id);
  });
});

// â”€â”€ Global Express error handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[express error]', err.message || err);
  if (res.headersSent) return;
  res.status(500).json({ error: 'Internal server error' });
});

// â”€â”€ Process-level safety nets â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

// â”€â”€ Graceful shutdown â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function shutdown(signal) {
  console.log(`[shutdown] ${signal} received â€” closing server`);
  server.close(() => {
    console.log('[shutdown] HTTP server closed');
    process.exit(0);
  });
  // Force-exit if server takes too long
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// â”€â”€ Alarm check scheduler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ALARM_FUNCTION_URL = process.env.ALARM_FUNCTION_URL ||
  'https://rxpezjhsnqkjydurtayx.supabase.co/functions/v1/check-alarms';
const ALARM_CHECK_SECRET = process.env.ALARM_CHECK_SECRET || '';

if (ALARM_CHECK_SECRET) {
  setInterval(async () => {
    try {
      const res = await fetch(ALARM_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${ALARM_CHECK_SECRET}` },
      });
      const data = await res.json();
      if (data.processed > 0) {
        console.log('[alarm-check]', data);
      }
    } catch (err) {
      console.warn('[alarm-check] failed:', err.message);
    }
  }, 60_000);
  console.log('[alarm-check] Scheduler started â€” checking every 60s');
} else {
  console.warn('[alarm-check] ALARM_CHECK_SECRET not set â€” scheduler disabled');
}

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

module.exports = { app, server };
