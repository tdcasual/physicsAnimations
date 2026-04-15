import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const svgBuffer = fs.readFileSync(
  path.join(__dirname, '../public/pwa-icon.svg')
);

const sizes = [
  { name: 'pwa-192x192', size: 192 },
  { name: 'pwa-512x512', size: 512 },
  { name: 'apple-touch-icon', size: 180 },
  { name: 'favicon', size: 32 },
];

async function generateIcons() {
  for (const { name, size } of sizes) {
    const outputPath = path.join(__dirname, `../public/${name}.png`);
    
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    
    console.log(`✓ Generated ${name}.png (${size}x${size})`);
  }
  
  // Generate maskable icon (with padding for safe area)
  const maskableSize = 512;
  const padding = Math.round(maskableSize * 0.1); // 10% padding
  const innerSize = maskableSize - (padding * 2);
  
  await sharp(svgBuffer)
    .resize(innerSize, innerSize)
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: { r: 26, g: 26, b: 26, alpha: 1 } // #1a1a1a
    })
    .png()
    .toFile(path.join(__dirname, '../public/pwa-512x512-maskable.png'));
  
  console.log('✓ Generated pwa-512x512-maskable.png (with safe area)');
  console.log('\nAll PWA icons generated successfully!');
}

generateIcons().catch(console.error);
