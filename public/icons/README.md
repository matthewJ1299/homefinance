# PWA icons

Required for "Add to Home Screen" / install as app:

- `icon-192x192.png` (192x192 px)
- `icon-512x512.png` (512x512 px)
- `icon-maskable-512x512.png` (512x512 px, with safe zone for maskable icons)

Generate placeholder icons (theme-colored) with:

```bash
npm run generate-pwa-icons
```

To use your own icon: replace these files with your artwork. For maskable icons, keep important content within the center 80% so system UI does not crop it. You can use [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator) or [RealFaviconGenerator](https://realfavicongenerator.net/) to produce all sizes from a single image.
