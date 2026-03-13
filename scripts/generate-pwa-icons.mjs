/**
 * Generates PWA icons (180x180 for iOS, 192x192, 512x512, maskable) into public/icons.
 * Run: node scripts/generate-pwa-icons.mjs
 * Requires: npm install -D sharp
 *
 * Theme color #16a34a (green) is used as background. Icon shows a house (HomeFinance).
 * Maskable icon has 80% safe zone.
 */
import sharp from "sharp";
import { mkdir, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public", "icons");

const THEME_GREEN = "rgb(22,163,74)";
const HOUSE_FILL = "#ffffff";
const DOOR_FILL = "#0a0a0a";

/** House shape in viewBox 0 0 100 100: roof triangle + body rect + door rect */
const HOUSE_SVG = `
  <g fill="${HOUSE_FILL}" stroke="${HOUSE_FILL}">
    <polygon points="50,12 90,48 10,48"/>
    <rect x="18" y="48" width="64" height="44" rx="2"/>
    <rect x="42" y="62" width="16" height="30" rx="1" fill="${DOOR_FILL}"/>
  </g>
`;

async function createIcon(size, filename, maskable = false) {
  const padding = maskable ? Math.round(size * 0.1) : 0;
  const inner = size - padding * 2;
  const bgRect =
    maskable
      ? `<rect width="${size}" height="${size}" fill="#0a0a0a"/>
  <rect x="${padding}" y="${padding}" width="${inner}" height="${inner}" rx="${Math.round(inner * 0.22)}" fill="${THEME_GREEN}"/>
  <g transform="translate(${padding},${padding}) scale(${inner / 100})">${HOUSE_SVG}</g>`
      : `<rect width="${size}" height="${size}" fill="${THEME_GREEN}"/>
  <g transform="scale(${size / 100})">${HOUSE_SVG}</g>`;

  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">${bgRect}</svg>`;
  const buf = await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toBuffer();
  const path = join(outDir, filename);
  await writeFile(path, buf);
  console.log("Written:", path);
}

/**
 * iOS splash screen sizes: [logicalWidth, logicalHeight, pixelRatio] -> image width x height
 * Generated image filename: splash-{width}x{height}.png
 */
const SPLASH_SIZES = [
  [390, 844, 3],   // 1170x2532 iPhone 14/13/12
  [430, 932, 3],   // 1290x2796 iPhone 14 Pro Max
  [414, 896, 3],   // 1242x2688 iPhone 11/Xr
  [375, 812, 3],   // 1125x2436 iPhone X/Xs
  [768, 1024, 2], // 1536x2048 iPad
  [834, 1194, 2], // 1668x2388 iPad Pro 11"
  [1024, 1366, 2], // 2048x2732 iPad Pro 12.9"
];

async function createSplash(logicalW, logicalH, pixelRatio) {
  const w = logicalW * pixelRatio;
  const h = logicalH * pixelRatio;
  const size = Math.min(w, h);
  const padding = Math.round(size * 0.1);
  const inner = size - padding * 2;
  const bgRect = `<rect width="${w}" height="${h}" fill="${THEME_GREEN}"/>
  <g transform="translate(${(w - inner) / 2},${(h - inner) / 2}) scale(${inner / 100})">${HOUSE_SVG}</g>`;
  const svg = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">${bgRect}</svg>`;
  const buf = await sharp(Buffer.from(svg)).resize(w, h).png().toBuffer();
  const filename = `splash-${w}x${h}.png`;
  const path = join(outDir, filename);
  await writeFile(path, buf);
  console.log("Written:", path);
  return { filename, w, h, logicalW, logicalH, pixelRatio };
}

async function main() {
  await mkdir(outDir, { recursive: true });
  await createIcon(180, "icon-180x180.png", false);
  await createIcon(192, "icon-192x192.png", false);
  await createIcon(512, "icon-512x512.png", false);
  await createIcon(512, "icon-maskable-512x512.png", true);
  for (const [lw, lh, pr] of SPLASH_SIZES) {
    await createSplash(lw, lh, pr);
  }
  console.log("PWA icons and iOS splash screens generated in public/icons");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
