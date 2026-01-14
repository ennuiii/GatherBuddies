/**
 * Download LPC Assets Script
 *
 * Downloads required LPC sprite sheets from GitHub to local assets folder.
 * Run with: node scripts/download-lpc-assets.js
 *
 * Source: https://github.com/sanderfrenken/Universal-LPC-Spritesheet-Character-Generator
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LPC_BASE = 'https://raw.githubusercontent.com/sanderfrenken/Universal-LPC-Spritesheet-Character-Generator/master/spritesheets';

// Map local asset paths to LPC repo paths
// Local path -> GitHub repo path
const ASSETS = {
  // ========== BODIES ==========
  // Masculine body types
  'bodies/masculine/light': 'body/bodies/male/light.png',
  'bodies/masculine/olive': 'body/bodies/male/olive.png',
  'bodies/masculine/tan': 'body/bodies/male/bronze.png',
  'bodies/masculine/dark': 'body/bodies/male/brown.png',

  // Feminine body types
  'bodies/feminine/light': 'body/bodies/female/light.png',
  'bodies/feminine/olive': 'body/bodies/female/olive.png',
  'bodies/feminine/tan': 'body/bodies/female/bronze.png',
  'bodies/feminine/dark': 'body/bodies/female/brown.png',

  // Neutral (use male as base)
  'bodies/neutral/light': 'body/bodies/male/light.png',
  'bodies/neutral/fair': 'body/bodies/male/light.png',
  'bodies/neutral/olive': 'body/bodies/male/olive.png',
  'bodies/neutral/tan': 'body/bodies/male/bronze.png',
  'bodies/neutral/dark': 'body/bodies/male/brown.png',

  // ========== HAIR ==========
  // Using black base color for tinting
  // Hair structure: hair/{style}/{male|female|adult}/{color}.png
  // Note: Some styles use 'adult' folder instead of male/female
  'hair/short': 'hair/buzzcut/adult/black.png',
  'hair/long': 'hair/long/male/black.png',
  'hair/curly': 'hair/curly_long/male/black.png',
  'hair/ponytail': 'hair/ponytail/male/black.png',
  'hair/mohawk': 'hair/longhawk/male/black.png',
  'hair/afro': 'hair/afro/male/black.png',
  'hair/bob': 'hair/bob/adult/black.png',
  // Note: 'bald' doesn't need an asset

  // ========== TOPS (CLOTHING) ==========
  // Using white base for color tinting
  'tops/tshirt': 'torso/clothes/shortsleeve/tshirt/female/white.png',
  'tops/hoodie': 'torso/clothes/longsleeve/longsleeve/male/white.png',
  'tops/jacket': 'torso/jacket/collared/male/white.png',
  'tops/dress': 'torso/clothes/robe/female/white.png',
  'tops/tanktop': 'torso/clothes/sleeveless/tanktop/female/white.png',
  'tops/suit': 'torso/clothes/vest/male/white.png',

  // ========== BOTTOMS ==========
  'bottoms/jeans': 'legs/pants/male/navy.png',
  'bottoms/shorts': 'legs/shorts/shorts/male/white.png',
  'bottoms/skirt': 'legs/skirts/plain/female/white.png',
  'bottoms/pants': 'legs/pants/male/white.png',
  'bottoms/sweatpants': 'legs/pants/male/gray.png',

  // ========== SHOES ==========
  'shoes/sneakers': 'feet/shoes/male/white.png',
  'shoes/boots': 'feet/boots/male/brown.png',
  'shoes/sandals': 'feet/sandals/male/brown.png',
  'shoes/dress_shoes': 'feet/shoes/male/black.png',
};

// Track download progress
let downloaded = 0;
let failed = 0;
const total = Object.keys(ASSETS).length;

/**
 * Download a single asset file
 */
function downloadAsset(localPath, remotePath) {
  const url = `${LPC_BASE}/${remotePath}`;
  const destDir = path.dirname(localPath);

  // Create directory if needed
  fs.mkdirSync(destDir, { recursive: true });

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(localPath);

    https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        https.get(response.headers.location, (redirectResponse) => {
          redirectResponse.pipe(file);
          file.on('finish', () => {
            file.close();
            downloaded++;
            console.log(`[${downloaded}/${total}] Downloaded: ${path.basename(localPath)}`);
            resolve();
          });
        }).on('error', (err) => {
          fs.unlink(localPath, () => {});
          failed++;
          console.error(`Failed: ${path.basename(localPath)} - ${err.message}`);
          reject(err);
        });
        return;
      }

      // Handle 404
      if (response.statusCode === 404) {
        fs.unlink(localPath, () => {});
        failed++;
        console.error(`Not found: ${remotePath}`);
        reject(new Error(`404: ${remotePath}`));
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        downloaded++;
        console.log(`[${downloaded}/${total}] Downloaded: ${path.basename(localPath)}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(localPath, () => {});
      failed++;
      console.error(`Failed: ${path.basename(localPath)} - ${err.message}`);
      reject(err);
    });
  });
}

/**
 * Check if asset already exists
 */
function assetExists(localPath) {
  try {
    const stats = fs.statSync(localPath);
    return stats.size > 0;
  } catch {
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  const baseDir = path.join(__dirname, '../public/assets/avatars');

  console.log('========================================');
  console.log('LPC Avatar Asset Downloader');
  console.log('========================================');
  console.log(`Target directory: ${baseDir}`);
  console.log(`Total assets: ${total}`);
  console.log('');

  // Check which assets need downloading
  const toDownload = [];
  for (const [local, remote] of Object.entries(ASSETS)) {
    const localPath = path.join(baseDir, `${local}.png`);
    if (!assetExists(localPath)) {
      toDownload.push({ local, remote, localPath });
    } else {
      downloaded++;
      console.log(`[SKIP] Already exists: ${local}.png`);
    }
  }

  if (toDownload.length === 0) {
    console.log('');
    console.log('All assets already downloaded!');
    return;
  }

  console.log('');
  console.log(`Downloading ${toDownload.length} assets...`);
  console.log('');

  // Download sequentially to avoid rate limiting
  for (const { local, remote, localPath } of toDownload) {
    try {
      await downloadAsset(localPath, remote);
    } catch (err) {
      // Continue with other files even if one fails
    }
  }

  console.log('');
  console.log('========================================');
  console.log(`Download complete!`);
  console.log(`Success: ${downloaded}`);
  console.log(`Failed: ${failed}`);
  console.log('========================================');

  if (failed > 0) {
    process.exit(1);
  }
}

// Run
main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
