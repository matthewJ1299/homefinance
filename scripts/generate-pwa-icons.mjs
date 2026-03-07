/**
 * Generates PWA icons (192x192, 512x512, maskable) into public/icons.
 * Run: node scripts/generate-pwa-icons.mjs
 * Requires: npm install -D sharp
 *
 * Theme color #16a34a (green) is used as background. Maskable icon has 80% safe zone.
 */
import sharp from "sharp";
import { mkdir, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public", "icons");
async function createIcon(size, filename, maskable = false) {
  const padding = maskable ? Math.round(size * 0.1) : 0;
  const inner = size - padding * 2;
  const svg = maskable
    ? `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#0a0a0a"/>
  <rect x="${padding}" y="${padding}" width="${inner}" height="${inner}" rx="${Math.round(inner * 0.22)}" fill="rgb(22,163,74)"/>
</svg>`
    : `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="rgb(22,163,74)"/>
</svg>`;
  const buf = await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toBuffer();
  const path = join(outDir, filename);
  await writeFile(path, buf);
  console.log("Written:", path);
}

async function main() {
  await mkdir(outDir, { recursive: true });
  await createIcon(192, "icon-192x192.png", false);
  await createIcon(512, "icon-512x512.png", false);
  await createIcon(512, "icon-maskable-512x512.png", true);
  console.log("PWA icons generated in public/icons");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
