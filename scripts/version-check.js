#!/usr/bin/env node

/**
 * Version Consistency Check
 *
 * This script reads the sw.js ASSETS list and checks that:
 * 1. Each versioned file exists on disk
 * 2. Version numbers in sw.js match version numbers in index.html script tags
 *
 * Usage: node scripts/version-check.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SW_PATH = path.join(ROOT, 'sw.js');
const INDEX_PATH = path.join(ROOT, 'index.html');

console.log('🔍 Checking version consistency...\n');

// Read sw.js
const swContent = fs.readFileSync(SW_PATH, 'utf8');

// Extract ASSETS list from sw.js
const assetsMatch = swContent.match(/const ASSETS = \[([\s\S]*?)\];/);
if (!assetsMatch) {
  console.error('❌ Could not find ASSETS list in sw.js');
  process.exit(1);
}

const assetsContent = assetsMatch[1];
const assetLines = assetsContent.match(/'[^']+'/g) || [];
const assets = assetLines.map(line => line.replace(/'/g, ''));

console.log(`Found ${assets.length} assets in sw.js ASSETS list\n`);

// Read index.html
const indexContent = fs.readFileSync(INDEX_PATH, 'utf8');

let issuesFound = 0;

// Check each asset
assets.forEach(asset => {
  const match = asset.match(/^(.+?)\?v=(\d+)$/);
  if (!match) {
    // No version string, just check if file exists
    const filePath = path.join(ROOT, asset);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  File not found: ${asset}`);
      issuesFound++;
    }
    return;
  }

  const [, filePath, version] = match;
  const fullPath = path.join(ROOT, filePath);

  // Check file exists
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ File not found: ${filePath}`);
    issuesFound++;
    return;
  }

  // Check version matches in index.html
  const indexVersionMatch = indexContent.match(new RegExp(`${filePath}\\?v=(\\d+)`));
  if (indexVersionMatch) {
    const indexVersion = indexVersionMatch[1];
    if (indexVersion !== version) {
      console.error(`❌ Version mismatch for ${filePath}: sw.js has v${version}, index.html has v${indexVersion}`);
      issuesFound++;
    }
  } else if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
    console.warn(`⚠️  Version in index.html not found for: ${filePath}`);
  }
});

// Check index.html has no orphaned version tags
const scriptMatches = indexContent.matchAll(/src="([^"]+\?v=\d+)"/g);
const linkMatches = indexContent.matchAll(/href="([^"]+\?v=\d+)"/g);

[...scriptMatches, ...linkMatches].forEach(match => {
  const tag = match[1];
  if (!assets.includes(tag)) {
    console.warn(`⚠️  Version tag in index.html not in sw.js ASSETS: ${tag}`);
  }
});

console.log('');
if (issuesFound === 0) {
  console.log('✅ All version checks passed!');
  process.exit(0);
} else {
  console.log(`❌ Found ${issuesFound} issue(s)`);
  process.exit(1);
}
