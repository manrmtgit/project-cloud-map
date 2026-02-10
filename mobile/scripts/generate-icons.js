import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sizes required for Android and iOS
const sizes = {
  // Android
  'android/ldpi': 36,
  'android/mdpi': 48,
  'android/hdpi': 72,
  'android/xhdpi': 96,
  'android/xxhdpi': 144,
  'android/xxxhdpi': 192,
  // iOS
  'ios/icon-20': 20,
  'ios/icon-20@2x': 40,
  'ios/icon-20@3x': 60,
  'ios/icon-29': 29,
  'ios/icon-29@2x': 58,
  'ios/icon-29@3x': 87,
  'ios/icon-40': 40,
  'ios/icon-40@2x': 80,
  'ios/icon-40@3x': 120,
  'ios/icon-60@2x': 120,
  'ios/icon-60@3x': 180,
  'ios/icon-76': 76,
  'ios/icon-76@2x': 152,
  'ios/icon-83.5@2x': 167,
  'ios/icon-1024': 1024,
  // Web/PWA
  'pwa/icon-72': 72,
  'pwa/icon-96': 96,
  'pwa/icon-128': 128,
  'pwa/icon-144': 144,
  'pwa/icon-152': 152,
  'pwa/icon-192': 192,
  'pwa/icon-384': 384,
  'pwa/icon-512': 512
};

const inputSvg = path.join(__dirname, '../public/icon.svg');
const inputPng = path.join(__dirname, '../public/icon-source.png');
const outputDir = path.join(__dirname, '../resources/icons');

// Android mipmap directories for Capacitor
const androidResDir = path.join(__dirname, '../android/app/src/main/res');
const androidMipmapSizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192
};

async function generateIcons() {
  // Determine source file (prefer PNG if available)
  const sourceFile = fs.existsSync(inputPng) ? inputPng : inputSvg;
  console.log(`Using source: ${path.basename(sourceFile)}`);

  // Create output directories
  ['android', 'ios', 'pwa'].forEach(dir => {
    const dirPath = path.join(outputDir, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });

  console.log('Generating icons...');

  for (const [name, size] of Object.entries(sizes)) {
    const outputPath = path.join(outputDir, `${name}.png`);

    try {
      await sharp(sourceFile)
        .resize(size, size)
        .png()
        .toFile(outputPath);

      console.log(`✓ Generated ${name}.png (${size}x${size})`);
    } catch (error) {
      console.error(`✗ Failed to generate ${name}.png:`, error.message);
    }
  }

  // Copy to Android mipmap directories (for Capacitor app icon)
  if (fs.existsSync(androidResDir)) {
    console.log('\nCopying to Android mipmap directories...');
    for (const [mipmapDir, size] of Object.entries(androidMipmapSizes)) {
      const targetDir = path.join(androidResDir, mipmapDir);
      if (fs.existsSync(targetDir)) {
        const iconPath = path.join(targetDir, 'ic_launcher.png');
        const roundPath = path.join(targetDir, 'ic_launcher_round.png');
        const foregroundPath = path.join(targetDir, 'ic_launcher_foreground.png');
        try {
          await sharp(sourceFile).resize(size, size).png().toFile(iconPath);
          await sharp(sourceFile).resize(size, size).png().toFile(roundPath);
          await sharp(sourceFile).resize(size, size).png().toFile(foregroundPath);
          console.log(`✓ Android ${mipmapDir} (${size}x${size})`);
        } catch (error) {
          console.error(`✗ Failed ${mipmapDir}:`, error.message);
        }
      }
    }
  }

  // Also generate favicon
  const faviconPath = path.join(__dirname, '../public/favicon.png');
  try {
    await sharp(sourceFile)
      .resize(32, 32)
      .png()
      .toFile(faviconPath);
    console.log('✓ Generated favicon.png (32x32)');
  } catch (error) {
    console.error('✗ Failed to generate favicon.png:', error.message);
  }

  // Generate large icon for public
  const publicIconPath = path.join(__dirname, '../public/icon-512.png');
  try {
    await sharp(sourceFile)
      .resize(512, 512)
      .png()
      .toFile(publicIconPath);
    console.log('✓ Generated icon-512.png (512x512)');
  } catch (error) {
    console.error('✗ Failed to generate icon-512.png:', error.message);
  }

  console.log('\nDone! Icons generated in resources/icons/');
}

generateIcons().catch(console.error);
