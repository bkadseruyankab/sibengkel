import sharp from 'sharp';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const ICONS_DIR = join(process.cwd(), 'public', 'icons');
const SVG_PATH = join(ICONS_DIR, 'icon.svg');

async function generateIcons() {
  // Ensure icons directory exists
  if (!existsSync(ICONS_DIR)) {
    mkdirSync(ICONS_DIR, { recursive: true });
  }

  // Check SVG exists
  if (!existsSync(SVG_PATH)) {
    console.error('❌ SVG icon not found at:', SVG_PATH);
    process.exit(1);
  }

  const svgBuffer = readFileSync(SVG_PATH);
  console.log('📦 Generating PWA icons from SVG...');

  for (const size of ICON_SIZES) {
    const outputPath = join(ICONS_DIR, `icon-${size}x${size}.png`);

    try {
      await sharp(svgBuffer)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toFile(outputPath);

      console.log(`  ✅ Generated: icon-${size}x${size}.png`);
    } catch (err) {
      console.error(`  ❌ Failed to generate icon-${size}x${size}.png:`, err);
    }
  }

  // Also generate Apple touch icon (180x180)
  const appleTouchIconPath = join(ICONS_DIR, 'apple-touch-icon.png');
  try {
    await sharp(svgBuffer)
      .resize(180, 180, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(appleTouchIconPath);
    console.log('  ✅ Generated: apple-touch-icon.png');
  } catch (err) {
    console.error('  ❌ Failed to generate apple-touch-icon.png:', err);
  }

  // Generate favicon (32x32)
  const faviconPath = join(process.cwd(), 'public', 'favicon.ico');
  try {
    await sharp(svgBuffer)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(faviconPath.replace('.ico', '-32x32.png'));
    console.log('  ✅ Generated: favicon-32x32.png');
  } catch (err) {
    console.error('  ❌ Failed to generate favicon:', err);
  }

  console.log('\n🎉 PWA icon generation complete!');
}

generateIcons().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
