/**
 * Samples a screenshot patch and reports its mean colour and the standard
 * deviation per channel. Used to check the paper tone has not drifted, and that
 * the grain actually varies instead of sitting flat.
 *
 * The editor preview pane captures *beyond* the viewport, and fixed overlays only
 * paint inside the true viewport, so the crop must stay in the top-left region.
 * Coordinates are given in CSS pixels and scaled to device pixels here.
 *
 *   node scripts/sample-patch.mjs <image.png> [viewportWidth] [x] [y] [w] [h]
 */
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';

const [, , file, vwArg, xArg, yArg, wArg, hArg] = process.argv;

if (!file) {
  console.error('Usage: node scripts/sample-patch.mjs <image.png> [vw] [x] [y] [w] [h]');
  process.exit(1);
}

const { default: sharp } = await import('sharp');
const image = sharp(await readFile(file));
const meta = await image.metadata();

const scale = vwArg ? meta.width / Number(vwArg) : 1;
const x = Math.round(Number(xArg ?? 100) * scale);
const y = Math.round(Number(yArg ?? 100) * scale);
const w = Math.round(Number(wArg ?? 120) * scale);
const h = Math.round(Number(hArg ?? 80) * scale);

const { data, info } = await image
  .extract({ left: x, top: y, width: w, height: h })
  .raw()
  .toBuffer({ resolveWithObject: true });

const channels = info.channels;
const count = info.width * info.height;
const sums = [0, 0, 0];
const squares = [0, 0, 0];

for (let i = 0; i < data.length; i += channels) {
  for (let c = 0; c < 3; c += 1) {
    const value = data[i + c] ?? 0;
    sums[c] += value;
    squares[c] += value * value;
  }
}

const means = sums.map((sum) => sum / count);
const stddevs = squares.map((sq, c) => Math.sqrt(Math.max(0, sq / count - means[c] ** 2)));
const hex = `#${means.map((m) => Math.round(m).toString(16).padStart(2, '0')).join('')}`;

console.log(`${basename(file)}: crop ${info.width}x${info.height} (scale ${scale.toFixed(2)})`);
console.log(`mean   ${hex}  rgb(${means.map((m) => m.toFixed(1)).join(', ')})`);
console.log(
  `stddev ${stddevs.map((s) => s.toFixed(2)).join(', ')}  ${
    stddevs[0] > 0.4 ? '<- grain present' : '<- flat'
  }`,
);
