/**
 * Icon Generator for Spolecne Nalezy APK
 * Generates Android icons from SVG source
 * Run: node generate-icons.js
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Icon configuration
const ICON_CONFIG = {
  // PWA Icons (for manifest.json)
  'icon-192.png': { size: 192, purpose: 'any' },
  'icon-512.png': { size: 512, purpose: 'any' },
  'icon-maskable-512.png': { size: 512, purpose: 'maskable' },
  
  // Android Adaptive Icons
  'android/icon-48x48.png': { size: 48 },
  'android/icon-72x72.png': { size: 72 },
  'android/icon-96x96.png': { size: 96 },
  'android/icon-144x144.png': { size: 144 },
  'android/icon-192x192.png': { size: 192 },
  'android/icon-512x512.png': { size: 512 },
};

const PUBLIC_DIR = path.join(__dirname, 'public');
const ANDROID_DIR = path.join(__dirname, 'android');

async function generateIcons() {
  console.log('Generating icons for Spolecne Nalezy APK...\n');
  
  // Ensure directories exist
  if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  }
  if (!fs.existsSync(ANDROID_DIR)) {
    fs.mkdirSync(ANDROID_DIR, { recursive: true });
  }
  
  // SVG source path
  const svgPath = path.join(PUBLIC_DIR, 'icon.svg');
  
  if (!fs.existsSync(svgPath)) {
    console.error('ERROR: icon.svg not found in public directory');
    console.error('Please create icon.svg in:', PUBLIC_DIR);
    process.exit(1);
  }
  
  console.log('Source SVG:', svgPath);
  
  // Read SVG
  const svgContent = fs.readFileSync(svgPath, 'utf8');
  
  // Generate each icon
  for (const [outputPath, config] of Object.entries(ICON_CONFIG)) {
    const fullPath = path.join(PUBLIC_DIR, outputPath);
    const dir = path.dirname(fullPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    try {
      console.log(`Generating: ${outputPath} (${config.size}x${config.size})...`);
      
      await sharp(Buffer.from(svgContent))
        .resize(config.size, config.size)
        .png({ quality: 100, density: 300 })
        .toFile(fullPath);
      
      console.log(`  ✓ Created: ${fullPath}`);
    } catch (error) {
      console.error(`  ✗ Failed: ${outputPath}`);
      console.error(`    Error: ${error.message}`);
    }
  }
  
  // Also generate for android directory
  console.log('\nGenerating Android directory icons...');
  const androidIcons = [
    { name: 'ic_launcher.png', size: 512 },
    { name: 'ic_launcher_round.png', size: 512 },
  ];
  
  for (const icon of androidIcons) {
    const outputPath = path.join(ANDROID_DIR, icon.name);
    try {
      console.log(`Generating: ${icon.name} (${icon.size}x${icon.size})...`);
      await sharp(Buffer.from(svgContent))
        .resize(icon.size, icon.size)
        .png({ quality: 100 })
        .toFile(outputPath);
      console.log(`  ✓ Created: ${outputPath}`);
    } catch (error) {
      console.error(`  ✗ Failed: ${icon.name}`);
      console.error(`    Error: ${error.message}`);
    }
  }
  
  console.log('\n✅ Icon generation complete!');
  console.log('\nGenerated files:');
  console.log('  Public (PWA):');
  Object.keys(ICON_CONFIG).filter(k => !k.startsWith('android/')).forEach(k => {
    console.log(`    - public/${k}`);
  });
  console.log('  Android:');
  androidIcons.forEach(icon => {
    console.log(`    - android/${icon.name}`);
  });
}

// Update manifest.json with icon paths
function updateManifests() {
  console.log('\nUpdating manifest files...');
  
  // Update public/manifest.json
  const webManifestPath = path.join(PUBLIC_DIR, 'manifest.json');
  if (fs.existsSync(webManifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(webManifestPath, 'utf8'));
    const hasIcons = manifest.icons && manifest.icons.length > 0;
    
    if (!hasIcons) {
      manifest.icons = [
        {
          "src": "/icon-192.png",
          "sizes": "192x192",
          "type": "image/png",
          "purpose": "any"
        },
        {
          "src": "/icon-512.png",
          "sizes": "512x512",
          "type": "image/png",
          "purpose": "any"
        },
        {
          "src": "/icon-maskable-512.png",
          "sizes": "512x512",
          "type": "image/png",
          "purpose": "maskable"
        }
      ];
      fs.writeFileSync(webManifestPath, JSON.stringify(manifest, null, 2) + '\n');
      console.log('  ✓ Updated public/manifest.json');
    }
  }
  
  // Update twa-manifest.json
  const twaManifestPath = path.join(__dirname, 'twa-manifest.json');
  if (fs.existsSync(twaManifestPath)) {
    const twaManifest = JSON.parse(fs.readFileSync(twaManifestPath, 'utf8'));
    
    // Update icon paths to local
    if (twaManifest.iconUrl && twaManifest.iconUrl.includes('http')) {
      twaManifest.iconUrl = '/icon-512.png';
    }
    if (twaManifest.maskableIconUrl && twaManifest.maskableIconUrl.includes('http')) {
      twaManifest.maskableIconUrl = '/icon-maskable-512.png';
    }
    
    // Add icon directory configuration for Bubblewrap
    twaManifest.iconUrl = '/icon-512.png';
    twaManifest.maskableIconUrl = '/icon-maskable-512.png';
    
    fs.writeFileSync(twaManifestPath, JSON.stringify(twaManifest, null, 2) + '\n');
    console.log('  ✓ Updated twa-manifest.json');
  }
}

// Run
(async () => {
  try {
    await generateIcons();
    updateManifests();
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
})();
