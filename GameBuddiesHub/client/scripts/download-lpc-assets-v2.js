/**
 * Download LPC Assets Script v2 - Comprehensive Edition
 *
 * Downloads a comprehensive set of LPC sprite sheets for the avatar system.
 * Run with: node scripts/download-lpc-assets-v2.js
 *
 * Source: https://github.com/sanderfrenken/Universal-LPC-Spritesheet-Character-Generator
 *
 * Structure discovered:
 * - Bodies: body/bodies/{type}/{skin}.png
 * - Hair: hair/{style}/adult/{color}.png
 * - Tops: torso/clothes/{category}/{type}/{gender}/{color}.png
 * - Bottoms: legs/{type}/{gender}/{color}.png
 * - Shoes: feet/{type}/{gender}/{color}.png
 * - Hats: hat/{category}/{type}/adult/{color}.png
 * - Glasses: facial/glasses/{type}/adult.png
 * - Beards: beards/beard/{style}/{color}.png
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LPC_BASE = 'https://raw.githubusercontent.com/sanderfrenken/Universal-LPC-Spritesheet-Character-Generator/master/spritesheets';

// ============================================================================
// SKIN TONES
// ============================================================================
const SKIN_TONES = ['light', 'olive', 'bronze', 'brown', 'black', 'amber', 'taupe'];

// ============================================================================
// BODY TYPES
// ============================================================================
const BODY_TYPES = ['male', 'female', 'muscular', 'child', 'teen'];

// ============================================================================
// HAIR STYLES - path format: hair/{style}/adult/black.png
// ============================================================================
const HAIR_STYLES = [
  'pixie', 'bedhead', 'bob', 'bangs', 'bangslong', 'ponytail', 'ponytail2',
  'braid', 'parted', 'spiked', 'swoop', 'long', 'long_straight', 'long_messy',
  'curly_long', 'wavy', 'princess', 'high_ponytail', 'pigtails', 'afro',
  'dreadlocks_long', 'mohawk', 'longhawk', 'messy', 'unkempt', 'loose',
  'halfmessy', 'shoulderl', 'shoulderr', 'curtains', 'idol', 'page',
  'cowlick', 'cowlick_tall', 'single'
];

// ============================================================================
// CLOTHING - TOPS
// ============================================================================
const TOPS = [
  // Sleeveless
  { id: 'tanktop', path: 'torso/clothes/sleeveless/tanktop/female/white.png' },
  { id: 'sleeveless', path: 'torso/clothes/sleeveless/sleeveless/female/white.png' },
  // Short sleeve
  { id: 'tshirt', path: 'torso/clothes/shortsleeve/tshirt/female/white.png' },
  // Long sleeve
  { id: 'longsleeve', path: 'torso/clothes/longsleeve/longsleeve/male/white.png' },
  // Robes/dresses
  { id: 'robe', path: 'torso/clothes/robe/robe/female/white.png' },
  { id: 'dress', path: 'dress/sleeveless/female/white.png' },
  // Jackets
  { id: 'jacket', path: 'torso/jacket/collared/male/white.png' },
  { id: 'hoodie', path: 'torso/jacket/hoodie/male/white.png' },
];

// ============================================================================
// CLOTHING - BOTTOMS
// ============================================================================
const BOTTOMS = [
  { id: 'pants', path: 'legs/pants/male/white.png' },
  { id: 'pants_formal', path: 'legs/formal/male/white.png' },
  { id: 'shorts', path: 'legs/shorts/shorts/male/white.png' },
  { id: 'skirt', path: 'legs/skirts/plain/female/white.png' },
  { id: 'leggings', path: 'legs/leggings/leggings/female/white.png' },
  { id: 'pantaloons', path: 'legs/pantaloons/pantaloons/male/white.png' },
];

// ============================================================================
// FOOTWEAR
// ============================================================================
const SHOES = [
  { id: 'shoes', path: 'feet/shoes/male/white.png' },
  { id: 'shoes2', path: 'feet/shoes2/male/white.png' },
  { id: 'boots', path: 'feet/boots/male/white.png' },
  { id: 'boots2', path: 'feet/boots2/male/white.png' },
  { id: 'sandals', path: 'feet/sandals/male/white.png' },
  { id: 'slippers', path: 'feet/slippers/male/white.png' },
];

// ============================================================================
// HATS - path format: hat/{category}/{type}/adult/{color}.png
// ============================================================================
const HATS = [
  { id: 'hat_bandana', path: 'hat/cloth/bandana/adult/white.png' },
  { id: 'hat_cap', path: 'hat/cloth/cap/adult/white.png' },
  { id: 'hat_beanie', path: 'hat/cloth/beanie/adult/white.png' },
  { id: 'hat_hood', path: 'hat/cloth/hood/adult/white.png' },
  { id: 'hat_headband', path: 'hat/headband/headband/adult/white.png' },
  { id: 'hat_tophat', path: 'hat/formal/tophat/adult/black.png' },
  { id: 'hat_bowler', path: 'hat/formal/bowler/adult/black.png' },
  { id: 'hat_pirate', path: 'hat/pirate/pirate/adult/black.png' },
  { id: 'hat_wizard', path: 'hat/magic/wizard/adult/white.png' },
];

// ============================================================================
// GLASSES - path format: facial/glasses/{type}/adult.png
// ============================================================================
const GLASSES = [
  { id: 'glasses', path: 'facial/glasses/glasses/adult.png' },
  { id: 'glasses_round', path: 'facial/glasses/round/adult.png' },
  { id: 'glasses_nerd', path: 'facial/glasses/nerd/adult.png' },
  { id: 'sunglasses', path: 'facial/glasses/sunglasses/adult.png' },
  { id: 'shades', path: 'facial/glasses/shades/adult.png' },
];

// ============================================================================
// BEARDS - path format: beards/beard/{style}/black.png
// ============================================================================
const BEARDS = [
  { id: 'beard_stubble', path: 'beards/beard/5_o_clock_shadow/black.png' },
  { id: 'beard_basic', path: 'beards/beard/basic/black.png' },
  { id: 'beard_medium', path: 'beards/beard/medium/black.png' },
  { id: 'beard_trimmed', path: 'beards/beard/trimmed/black.png' },
  { id: 'beard_full', path: 'beards/beard/winter/black.png' },
  { id: 'mustache_basic', path: 'beards/mustache/basic/black.png' },
  { id: 'mustache_curly', path: 'beards/mustache/curly/black.png' },
];

// ============================================================================
// EYES - path format: eyes/human/{age}/{color}.png
// ============================================================================
const EYES = [
  { id: 'eyes_blue', path: 'eyes/human/adult/blue.png' },
  { id: 'eyes_brown', path: 'eyes/human/adult/brown.png' },
  { id: 'eyes_green', path: 'eyes/human/adult/green.png' },
  { id: 'eyes_gray', path: 'eyes/human/adult/gray.png' },
];

// ============================================================================
// FACES (HEADS) - path format: head/heads/human/{gender}/{skin}.png
// ============================================================================
const FACE_GENDERS = ['male', 'female'];

// ============================================================================
// NOSES - path format: head/nose/{style}/adult/{skin}.png
// ============================================================================
const NOSE_STYLES = ['straight', 'big', 'button', 'buttonnose'];

// ============================================================================
// EARS - path format: head/ears/{style}/adult.png
// ============================================================================
const EARS = [
  { id: 'ears_default', path: 'head/ears/bigears/adult.png' },
  { id: 'ears_elven', path: 'head/ears/elven/adult.png' },
];

// Track progress
let downloaded = 0;
let failed = 0;
let skipped = 0;
let total = 0;

/**
 * Download a single asset file
 */
function downloadAsset(localPath, url) {
  const destDir = path.dirname(localPath);
  fs.mkdirSync(destDir, { recursive: true });

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(localPath);

    const request = https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        try { fs.unlinkSync(localPath); } catch {}
        https.get(response.headers.location, (redirectResponse) => {
          if (redirectResponse.statusCode !== 200) {
            failed++;
            reject(new Error(`HTTP ${redirectResponse.statusCode}`));
            return;
          }
          const newFile = fs.createWriteStream(localPath);
          redirectResponse.pipe(newFile);
          newFile.on('finish', () => {
            newFile.close();
            downloaded++;
            resolve();
          });
        }).on('error', reject);
        return;
      }

      if (response.statusCode !== 200) {
        file.close();
        try { fs.unlinkSync(localPath); } catch {}
        failed++;
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        downloaded++;
        resolve();
      });
    }).on('error', (err) => {
      file.close();
      try { fs.unlinkSync(localPath); } catch {}
      failed++;
      reject(err);
    });

    request.setTimeout(30000, () => {
      request.destroy();
      file.close();
      try { fs.unlinkSync(localPath); } catch {}
      failed++;
      reject(new Error('Timeout'));
    });
  });
}

/**
 * Check if asset already exists
 */
function assetExists(localPath) {
  try {
    const stats = fs.statSync(localPath);
    return stats.size > 1000;
  } catch {
    return false;
  }
}

/**
 * Build list of all assets to download
 */
function buildAssetList(baseDir) {
  const assets = [];

  // Bodies
  console.log('Scanning body assets...');
  for (const body of BODY_TYPES) {
    for (const skin of SKIN_TONES) {
      assets.push({
        local: path.join(baseDir, `bodies/${body}/${skin}.png`),
        remote: `${LPC_BASE}/body/bodies/${body}/${skin}.png`,
        category: 'body',
      });
    }
  }

  // Hair - using black base for tinting
  console.log('Scanning hair assets...');
  for (const style of HAIR_STYLES) {
    assets.push({
      local: path.join(baseDir, `hair/${style}.png`),
      remote: `${LPC_BASE}/hair/${style}/adult/black.png`,
      category: 'hair',
    });
  }

  // Tops
  console.log('Scanning top assets...');
  for (const item of TOPS) {
    assets.push({
      local: path.join(baseDir, `tops/${item.id}.png`),
      remote: `${LPC_BASE}/${item.path}`,
      category: 'tops',
    });
  }

  // Bottoms
  console.log('Scanning bottom assets...');
  for (const item of BOTTOMS) {
    assets.push({
      local: path.join(baseDir, `bottoms/${item.id}.png`),
      remote: `${LPC_BASE}/${item.path}`,
      category: 'bottoms',
    });
  }

  // Shoes
  console.log('Scanning shoe assets...');
  for (const item of SHOES) {
    assets.push({
      local: path.join(baseDir, `shoes/${item.id}.png`),
      remote: `${LPC_BASE}/${item.path}`,
      category: 'shoes',
    });
  }

  // Hats
  console.log('Scanning hat assets...');
  for (const item of HATS) {
    assets.push({
      local: path.join(baseDir, `accessories/${item.id}.png`),
      remote: `${LPC_BASE}/${item.path}`,
      category: 'hats',
    });
  }

  // Glasses
  console.log('Scanning glasses assets...');
  for (const item of GLASSES) {
    assets.push({
      local: path.join(baseDir, `accessories/${item.id}.png`),
      remote: `${LPC_BASE}/${item.path}`,
      category: 'glasses',
    });
  }

  // Beards
  console.log('Scanning beard assets...');
  for (const item of BEARDS) {
    assets.push({
      local: path.join(baseDir, `beards/${item.id}.png`),
      remote: `${LPC_BASE}/${item.path}`,
      category: 'beards',
    });
  }

  // Eyes
  console.log('Scanning eye assets...');
  for (const item of EYES) {
    assets.push({
      local: path.join(baseDir, `eyes/${item.id}.png`),
      remote: `${LPC_BASE}/${item.path}`,
      category: 'eyes',
    });
  }

  return assets;
}

/**
 * Main function
 */
async function main() {
  const baseDir = path.join(__dirname, '../public/assets/avatars');

  console.log('========================================');
  console.log('LPC Avatar Asset Downloader v2');
  console.log('========================================');
  console.log(`Target directory: ${baseDir}`);
  console.log('');

  // Build asset list
  const allAssets = buildAssetList(baseDir);
  total = allAssets.length;
  console.log(`Total assets to check: ${total}`);
  console.log('');

  // Filter to only assets that need downloading
  const toDownload = [];
  for (const asset of allAssets) {
    if (!assetExists(asset.local)) {
      toDownload.push(asset);
    } else {
      skipped++;
    }
  }

  console.log(`Already downloaded: ${skipped}`);
  console.log(`To download: ${toDownload.length}`);
  console.log('');

  if (toDownload.length === 0) {
    console.log('All assets already downloaded!');
    return;
  }

  // Group by category
  const byCategory = {};
  for (const asset of toDownload) {
    byCategory[asset.category] = (byCategory[asset.category] || 0) + 1;
  }
  console.log('Assets to download by category:');
  for (const [cat, count] of Object.entries(byCategory)) {
    console.log(`  ${cat}: ${count}`);
  }
  console.log('');

  // Download with concurrency limit
  const CONCURRENCY = 5;
  let current = 0;

  async function downloadNext() {
    while (current < toDownload.length) {
      const index = current++;
      const asset = toDownload[index];
      const filename = path.basename(asset.local);

      try {
        await downloadAsset(asset.local, asset.remote);
        process.stdout.write(`\r[${downloaded + failed}/${toDownload.length}] Downloaded: ${filename}                    `);
      } catch (err) {
        process.stdout.write(`\r[${downloaded + failed}/${toDownload.length}] Failed: ${filename} - ${err.message}        `);
      }
    }
  }

  const workers = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push(downloadNext());
  }
  await Promise.all(workers);

  console.log('\n');
  console.log('========================================');
  console.log('Download Complete!');
  console.log('========================================');
  console.log(`Success: ${downloaded}`);
  console.log(`Failed: ${failed}`);
  console.log(`Skipped (already exist): ${skipped}`);
  console.log('========================================');

  if (failed > 0) {
    console.log('\nSome assets failed. Run again to retry.');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
