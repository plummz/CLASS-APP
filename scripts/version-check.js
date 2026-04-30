#!/usr/bin/env node

/**
 * Version Consistency Check
 *
 * This script reads the sw.js ASSETS list and checks that:
 * 1. Each versioned file exists on disk
 * 2. Version numbers in sw.js match version numbers in index.html tags
 * 3. index.html does not contain versioned assets missing from sw.js
 *
 * Usage: node scripts/version-check.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SW_PATH = path.join(ROOT, 'sw.js');
const INDEX_PATH = path.join(ROOT, 'index.html');

function normalizeAssetPath(assetPath) {
  return String(assetPath || '').replace(/^\//, '');
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

console.log('Checking version consistency...\n');

const swContent = fs.readFileSync(SW_PATH, 'utf8');
const indexContent = fs.readFileSync(INDEX_PATH, 'utf8');

const assetsMatch = swContent.match(/const ASSETS = \[([\s\S]*?)\];/);
if (!assetsMatch) {
  console.error('ERROR: Could not find ASSETS list in sw.js');
  process.exit(1);
}

const assetLines = assetsMatch[1].match(/'[^']+'/g) || [];
const assets = assetLines.map((line) => line.replace(/'/g, ''));
const normalizedAssets = new Set(assets.map((asset) => normalizeAssetPath(asset)));

console.log(`Found ${assets.length} assets in sw.js ASSETS list\n`);

let issuesFound = 0;

for (const asset of assets) {
  const match = asset.match(/^(.+?)\?v=(\d+)$/);
  if (!match) {
    const fullPath = path.join(ROOT, normalizeAssetPath(asset));
    if (!fs.existsSync(fullPath)) {
      console.error(`ERROR: File not found: ${asset}`);
      issuesFound++;
    }
    continue;
  }

  const [, filePath, version] = match;
  const normalizedFilePath = normalizeAssetPath(filePath);
  const fullPath = path.join(ROOT, normalizedFilePath);

  if (!fs.existsSync(fullPath)) {
    console.error(`ERROR: File not found: ${normalizedFilePath}`);
    issuesFound++;
    continue;
  }

  const indexVersionMatch = indexContent.match(new RegExp(`${escapeRegExp(normalizedFilePath)}\\?v=(\\d+)`));
  if (indexVersionMatch) {
    const indexVersion = indexVersionMatch[1];
    if (indexVersion !== version) {
      console.error(`ERROR: Version mismatch for ${normalizedFilePath}: sw.js has v${version}, index.html has v${indexVersion}`);
      issuesFound++;
    }
  } else if (normalizedFilePath.endsWith('.js') || normalizedFilePath.endsWith('.css')) {
    console.error(`ERROR: Version in index.html not found for: ${normalizedFilePath}`);
    issuesFound++;
  }
}

const scriptMatches = indexContent.matchAll(/src="([^"]+\?v=\d+)"/g);
const linkMatches = indexContent.matchAll(/href="([^"]+\?v=\d+)"/g);

for (const match of [...scriptMatches, ...linkMatches]) {
  const tag = match[1];
  if (!normalizedAssets.has(normalizeAssetPath(tag))) {
    console.error(`ERROR: Version tag in index.html not in sw.js ASSETS: ${tag}`);
    issuesFound++;
  }
}

console.log('');
if (issuesFound === 0) {
  console.log('All version checks passed.');
  process.exit(0);
}

console.error(`Found ${issuesFound} issue(s).`);
process.exit(1);
