#!/usr/bin/env node
// Stamps sw.js CACHE_VERSION with the current package version + build timestamp.
// Runs automatically via the "prestart" npm script so every deploy gets a fresh cache.

const fs = require('fs');
const path = require('path');

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8'));
const swPath = path.join(__dirname, '../sw.js');
const sw = fs.readFileSync(swPath, 'utf-8');

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

const newVersion = `v${pkg.version}-${stamp}`;
const updated = sw.replace(/const CACHE_VERSION = '[^']+';/, `const CACHE_VERSION = '${newVersion}';`);

if (updated === sw) {
  console.log('[cache-bust] CACHE_VERSION pattern not found in sw.js — skipping');
  process.exit(0);
}

fs.writeFileSync(swPath, updated);
console.log(`[cache-bust] CACHE_VERSION → ${newVersion}`);
