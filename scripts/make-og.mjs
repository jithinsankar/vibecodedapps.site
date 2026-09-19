/**
 * Generates the share and icon images from the live listing data:
 *
 *   public/og.png                1200x630  social preview, with real numbers
 *   public/logo.png               512x512  schema.org Organization logo
 *   public/apple-touch-icon.png   180x180  iOS home screen
 *
 * The two square marks are rasterised from public/favicon.svg, so the logo can
 * never drift from the tab icon.
 *
 * Run with: npm run og
 * It also runs automatically before `npm run build` (see package.json).
 * If sharp is unavailable the script skips quietly, since a missing preview image
 * must never break a build.
 */
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = join(root, 'public', 'og.png');

function escapeXml(value) {
  return value.replace(/[<>&'"]/g, (char) => {
    switch (char) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case "'":
        return '&apos;';
      default:
        return '&quot;';
    }
  });
}

async function readStats() {
  const dir = join(root, 'data', 'apps');
  const files = (await readdir(dir)).filter((file) => file.endsWith('.json'));
  const tools = new Set();
  const replaced = new Set();

  for (const file of files) {
    const listing = JSON.parse(await readFile(join(dir, file), 'utf8'));
    for (const tool of listing.builtWith ?? []) tools.add(tool);
    for (const replacement of listing.replaces ?? []) {
      replaced.add(String(replacement.product).toLowerCase());
    }
  }

  const products = JSON.parse(await readFile(join(root, 'data', 'products.json'), 'utf8'));
  const catalogue = new Set(products.map((product) => product.name.toLowerCase()));
  const covered = [...replaced].filter((name) => catalogue.has(name)).length;

  return { apps: files.length, tools: tools.size, products: products.length, covered };
}

function buildSvg({ apps, products, covered }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#f4f1ea"/>
  <rect width="1200" height="8" fill="#cf3a11"/>

  <text x="84" y="112" font-family="Georgia, 'DejaVu Serif', serif"
        font-size="34" font-weight="700" fill="#16150f" letter-spacing="-0.6">Vibecoded</text>
  <text x="262" y="112" font-family="Georgia, 'DejaVu Serif', serif"
        font-size="34" font-weight="700" fill="#cf3a11">.</text>

  <line x1="84" y1="152" x2="1116" y2="152" stroke="#16150f" stroke-opacity="0.3"/>

  <text x="84" y="300" font-family="Georgia, 'DejaVu Serif', serif"
        font-size="62" font-weight="700" fill="#16150f" letter-spacing="-1.6">Is there a vibecoded</text>
  <text x="84" y="372" font-family="Georgia, 'DejaVu Serif', serif"
        font-size="62" font-weight="700" fill="#16150f" letter-spacing="-1.6">clone of</text>
  <text x="84" y="444" font-family="Georgia, 'DejaVu Serif', serif"
        font-size="62" font-weight="700" font-style="italic" fill="#cf3a11" letter-spacing="-1.6">Photoshop?</text>

  <line x1="84" y1="510" x2="1116" y2="510" stroke="#16150f" stroke-opacity="0.3"/>

  <text x="84" y="552" font-family="Consolas, 'DejaVu Sans Mono', monospace"
        font-size="19" fill="#726c5c" letter-spacing="2.4">${escapeXml(
          `${String(covered).padStart(3, '0')} OF ${String(products).padStart(
            3,
            '0',
          )} PRODUCTS REPLACED / ${String(apps).padStart(3, '0')} LISTINGS`,
        )}</text>

  <text x="1116" y="552" text-anchor="end" font-family="Consolas, 'DejaVu Sans Mono', monospace"
        font-size="19" fill="#726c5c" letter-spacing="2.4">VIBECODEDAPPS.VERCEL.APP</text>
</svg>`;
}

try {
  const sharp = (await import('sharp')).default;
  const stats = await readStats();
  const svg = buildSvg(stats);

  await mkdir(dirname(outFile), { recursive: true });
  const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
  await writeFile(outFile, png);
  console.log(`og.png written (${stats.apps} apps)`);
} catch (error) {
  console.warn(`[make-og] skipped: ${error.message}`);
}

const icons = [
  { file: join(root, 'public', 'logo.png'), size: 512 },
  { file: join(root, 'public', 'apple-touch-icon.png'), size: 180 },
];

try {
  const sharp = (await import('sharp')).default;
  const favicon = await readFile(join(root, 'public', 'favicon.svg'));

  for (const { file, size } of icons) {
    // Rasterise well above the target and scale down: cheap supersampling, so
    // the question mark's curve stays clean rather than stair-stepping.
    const png = await sharp(favicon, { density: 1152 })
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9 })
      .toBuffer();

    await writeFile(file, png);
  }

  console.log(`icons written (${icons.map((icon) => `${icon.size}px`).join(', ')})`);
} catch (error) {
  console.warn(`[icons] skipped: ${error.message}`);
}
