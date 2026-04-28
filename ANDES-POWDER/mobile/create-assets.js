const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const assetsDir = path.join(__dirname, 'assets');
const logoPath = path.join(assetsDir, 'Logo_horizontal.png');

// Generate app icon (1024x1024)
async function generateIcon() {
  try {
    // Use the horizontal logo and resize to square
    await sharp(logoPath)
      .resize(1024, 1024, {
        fit: 'contain',
        background: { r: 26, g: 54, b: 93, alpha: 1 } // #1a365d
      })
      .png()
      .toFile(path.join(assetsDir, 'icon.png'));
    console.log('Created icon.png');
  } catch (error) {
    console.error('Error creating icon.png:', error);
  }
}

// Generate adaptive icon (1024x1024)
async function generateAdaptiveIcon() {
  try {
    // Create adaptive icon with transparent background
    await sharp(logoPath)
      .resize(1024, 1024, {
        fit: 'contain',
        background: { r: 26, g: 54, b: 93, alpha: 1 }
      })
      .png()
      .toFile(path.join(assetsDir, 'adaptive-icon.png'));
    console.log('Created adaptive-icon.png');
  } catch (error) {
    console.error('Error creating adaptive-icon.png:', error);
  }
}

// Generate splash screen (1284x2778)
async function generateSplash() {
  try {
    // Create splash screen with logo centered
    await sharp({
      create: {
        width: 1284,
        height: 2778,
        channels: 4,
        background: { r: 26, g: 54, b: 93, alpha: 1 }
      }
    })
    .composite([{
      input: logoPath,
      gravity: 'center'
    }])
    .png()
    .toFile(path.join(assetsDir, 'splash.png'));
    console.log('Created splash.png');
  } catch (error) {
    console.error('Error creating splash.png:', error);
  }
}

// Generate favicon (48x48)
async function generateFavicon() {
  try {
    await sharp(logoPath)
      .resize(48, 48, {
        fit: 'contain',
        background: { r: 26, g: 54, b: 93, alpha: 1 }
      })
      .png()
      .toFile(path.join(assetsDir, 'favicon.png'));
    console.log('Created favicon.png');
  } catch (error) {
    console.error('Error creating favicon.png:', error);
  }
}

async function generateAllAssets() {
  console.log('Generating app assets from Logo_horizontal.png...');
  await generateIcon();
  await generateAdaptiveIcon();
  await generateSplash();
  await generateFavicon();
  console.log('All assets generated successfully!');
}

generateAllAssets().catch(console.error);

