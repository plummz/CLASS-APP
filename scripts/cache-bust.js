#!/usr/bin/env node
// Stamps sw.js CACHE_VERSION with the current package version + build timestamp.
// Runs automatically via the "prestart" npm script so every deploy gets a fresh cache.

const fs = require('fs');
const path = require('path');

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8'));
const changelogPath = path.join(__dirname, '../features/updates/changelog.js');
const swPath = path.join(__dirname, '../sw.js');
const sw = fs.readFileSync(swPath, 'utf-8');

function getAppVersion() {
  try {
    const changelog = fs.readFileSync(changelogPath, 'utf-8');
    const match = changelog.match(/const APP_VERSION = '([^']+)'/);
    if (match && match[1]) return match[1];
  } catch (_) {}
  return pkg.version;
}

// Format: v{semver}-{YYYYMMDD-HHmm}  e.g. v1.5.1-20260424-0801
const now = new Date();
const stamp = [
  now.getUTCFullYear(),
  String(now.getUTCMonth() + 1).padStart(2, '0'),
  String(now.getUTCDate()).padStart(2, '0'),
].join('') + '-' + [
  String(now.getUTCHours()).padStart(2, '0'),
  String(now.getUTCMinutes()).padStart(2, '0'),
].join('');

const appVersion = getAppVersion();
const newVersion = `v${appVersion}-${stamp}`;
const versionPattern = /^\s*const\s+CACHE_VERSION\s*=\s*(['"`])([^'"`]+)\1\s*;\s*$/gm;
const matches = [...sw.matchAll(versionPattern)];

if (matches.length === 0) {
  console.log('[cache-bust] CACHE_VERSION pattern not found in sw.js — skipping');
  process.exit(0);
}

if (matches.length > 1) {
  console.warn(`[cache-bust] Multiple CACHE_VERSION matches found (${matches.length}) — skipping`);
  process.exit(0);
}

const currentVersion = matches[0][2];
if (currentVersion === newVersion) {
  console.log(`[cache-bust] CACHE_VERSION already ${newVersion} — no change`);
  process.exit(0);
}

const updated = sw.replace(versionPattern, (full, quote) => `const CACHE_VERSION = ${quote}${newVersion}${quote};`);

if (updated === sw) {
  console.log('[cache-bust] CACHE_VERSION replacement produced no changes — skipping');
  process.exit(0);
}

try {
  fs.writeFileSync(swPath, updated, 'utf-8');
  console.log(`[cache-bust] CACHE_VERSION → ${newVersion}`);
} catch (error) {
  console.warn(`[cache-bust] Could not update sw.js (${error.code || error.message}) — continuing without blocking startup`);
}
