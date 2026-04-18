/**
 * migrate-to-r2.js
 *
 * Migrates every file stored in Supabase Storage (or any public URL)
 * to Cloudflare R2 with compression:
 *   - Images (jpg/png/gif/webp) → Sharp @ 75 % quality, same format
 *   - Videos (mp4/mov/webm/avi) → FFmpeg CRF 26, same format
 *
 * Usage:
 *   node migrate-to-r2.js          ← live run
 *   node migrate-to-r2.js --dry    ← dry run (no upload, no DB update)
 */

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const pLimit  = require('p-limit');
const fetch   = require('node-fetch');
const fs      = require('fs');
const path    = require('path');
const os      = require('os');
const stream  = require('stream');
const { promisify } = require('util');

// Optional compression — skipped gracefully if native binaries unavailable (e.g. Android)
let sharp = null;
try { sharp = require('sharp'); } catch (_) {}

let ffmpeg = null;
try {
  ffmpeg = require('fluent-ffmpeg');
  const ffmpegPath = require('ffmpeg-static');
  if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);
  else { const { execSync } = require('child_process'); ffmpeg.setFfmpegPath(execSync('which ffmpeg').toString().trim()); }
} catch (_) {}

const pipeline = promisify(stream.pipeline);

// ── Config ────────────────────────────────────────────────
const DRY_RUN     = process.argv.includes('--dry');
const CONCURRENCY = 3;   // files processed in parallel
const MAX_RETRIES = 3;

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rxpezjhsnqkjydurtayx.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY; // service role key (not anon)

const r2 = new S3Client({
  region:   'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});
const R2_BUCKET    = process.env.R2_BUCKET || 'class-app-storage';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';   // optional: set if bucket is public

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Helpers ───────────────────────────────────────────────
const IMAGE_EXTS = new Set(['.jpg','.jpeg','.png','.gif','.webp','.bmp','.tiff']);
const VIDEO_EXTS = new Set(['.mp4','.mov','.webm','.avi','.mkv','.m4v']);

function fileCategory(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (IMAGE_EXTS.has(ext)) return 'image';
  if (VIDEO_EXTS.has(ext)) return 'video';
  return 'other';
}

function r2KeyFor(originalUrl, filename) {
  const cat = fileCategory(filename);
  const base = path.basename(filename);
  if (cat === 'image') return `uploads/images/${base}`;
  if (cat === 'video') return `uploads/videos/${base}`;
  return `uploads/other/${base}`;
}

function publicR2Url(key) {
  if (R2_PUBLIC_URL) return `${R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`;
  return `/uploads/${path.basename(key)}`; // proxy route fallback
}

function log(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }
function warn(msg) { console.warn(`[WARN] ${msg}`); }

async function downloadToBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} downloading ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

// ── Compression ───────────────────────────────────────────
async function compressImage(buffer, filename) {
  if (!sharp) return buffer; // no sharp available, upload original
  const ext = path.extname(filename).toLowerCase();
  let img = sharp(buffer);
  switch (ext) {
    case '.jpg': case '.jpeg': img = img.jpeg({ quality: 75, mozjpeg: true }); break;
    case '.png':  img = img.png({ quality: 75, compressionLevel: 8 }); break;
    case '.gif':  img = img.gif(); break;
    case '.webp': img = img.webp({ quality: 75 }); break;
    default:      img = img.jpeg({ quality: 75 });
  }
  return img.toBuffer();
}

function compressVideo(inputPath, outputPath) {
  if (!ffmpeg) { fs.copyFileSync(inputPath, outputPath); return Promise.resolve(); }
  return new Promise((resolve, reject) => {
    const ext = path.extname(inputPath).toLowerCase();
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

// ── Upload to R2 ──────────────────────────────────────────
async function uploadToR2(buffer, key, contentType) {
  await r2.send(new PutObjectCommand({
    Bucket:      R2_BUCKET,
    Key:         key,
    Body:        buffer,
    ContentType: contentType,
  }));
  return publicR2Url(key);
}

// ── Process one file record ────────────────────────────────
async function processFile(record, index, total) {
  const { id, url, name, type } = record;
  const label = `[${index}/${total}] ${name || id}`;

  if (!url) { warn(`${label} — no URL, skipping`); return; }

  // Skip if already on R2
  if (url.includes(R2_BUCKET) || url.startsWith('/uploads/')) {
    log(`${label} — already on R2, skipping`);
    return;
  }

  const cat = fileCategory(name || url);
  log(`${label} — ${cat.toUpperCase()} — downloading…`);

  let buffer;
  try {
    buffer = await downloadToBuffer(url);
  } catch (e) {
    warn(`${label} — download failed: ${e.message}`);
    return;
  }

  const filename = name || path.basename(new URL(url).pathname) || `file_${id}`;
  const key = r2KeyFor(url, filename);

  if (DRY_RUN) {
    log(`${label} — DRY RUN → would upload to r2://${R2_BUCKET}/${key}`);
    return;
  }

  let finalBuffer = buffer;
  let tmpIn, tmpOut;

  try {
    if (cat === 'image') {
      log(`${label} — compressing image…`);
      finalBuffer = await compressImage(buffer, filename);
      log(`${label} — ${(buffer.length/1024).toFixed(0)} KB → ${(finalBuffer.length/1024).toFixed(0)} KB`);

    } else if (cat === 'video') {
      log(`${label} — compressing video (this may take a while)…`);
      const tmpDir = os.tmpdir();
      tmpIn  = path.join(tmpDir, `r2_in_${id}${path.extname(filename)}`);
      tmpOut = path.join(tmpDir, `r2_out_${id}${path.extname(filename)}`);
      fs.writeFileSync(tmpIn, buffer);
      await compressVideo(tmpIn, tmpOut);
      finalBuffer = fs.readFileSync(tmpOut);
      log(`${label} — ${(buffer.length/1024/1024).toFixed(1)} MB → ${(finalBuffer.length/1024/1024).toFixed(1)} MB`);
    }

    const contentType = type || (cat === 'image' ? 'image/jpeg' : 'video/mp4');
    const newUrl = await uploadToR2(finalBuffer, key, contentType);
    log(`${label} — uploaded → ${newUrl}`);

    // Update Supabase record
    const { error } = await sb.from('files').update({ url: newUrl }).eq('id', id);
    if (error) warn(`${label} — DB update failed: ${error.message}`);
    else log(`${label} — DB updated ✓`);

  } catch (e) {
    warn(`${label} — FAILED: ${e.message}`);
  } finally {
    if (tmpIn  && fs.existsSync(tmpIn))  fs.unlinkSync(tmpIn);
    if (tmpOut && fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
  }
}

// ── Retry wrapper ─────────────────────────────────────────
async function withRetry(fn, retries = MAX_RETRIES) {
  for (let i = 1; i <= retries; i++) {
    try { return await fn(); }
    catch (e) {
      if (i === retries) throw e;
      const delay = 1000 * 2 ** (i - 1);
      warn(`Retry ${i}/${retries} in ${delay}ms — ${e.message}`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

// ── Main ──────────────────────────────────────────────────
(async () => {
  if (!SUPABASE_KEY) {
    console.error('ERROR: Set SUPABASE_SERVICE_KEY in .env (service role key, not anon key)');
    process.exit(1);
  }

  log(DRY_RUN ? '=== DRY RUN MODE ===' : '=== LIVE MIGRATION ===');
  log(`Concurrency: ${CONCURRENCY} | Retries: ${MAX_RETRIES}`);

  // Fetch all file records from Supabase
  log('Fetching file records from Supabase…');
  const { data: records, error } = await sb
    .from('files')
    .select('id, name, url, type')
    .order('id');

  if (error) { console.error('Supabase fetch failed:', error); process.exit(1); }
  log(`Found ${records.length} file records`);

  const limit = pLimit(CONCURRENCY);
  const tasks = records.map((rec, i) =>
    limit(() => withRetry(() => processFile(rec, i + 1, records.length)))
  );

  await Promise.all(tasks);

  log('=== Migration complete ===');
})();
