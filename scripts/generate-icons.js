import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// SVG with high contrast, glowing dark tech badge
function createSvg(size, isMaskable = false) {
  const padding = isMaskable ? size * 0.15 : size * 0.08;
  const innerSize = size - padding * 2;
  const center = size / 2;

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#131A2A"/>
      <stop offset="100%" stop-color="#0B0E14"/>
    </linearGradient>
    <linearGradient id="primaryGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#A58FFF"/>
      <stop offset="50%" stop-color="#7C5CFC"/>
      <stop offset="100%" stop-color="#00F2FE"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="${size * 0.02}" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="${size}" height="${size}" fill="url(#bgGrad)" ${isMaskable ? '' : `rx="${size * 0.22}"`}/>
  
  <!-- Outer glowing rim -->
  <rect x="${padding}" y="${padding}" width="${innerSize}" height="${innerSize}" rx="${size * 0.16}" fill="none" stroke="#7C5CFC" stroke-opacity="0.3" stroke-width="${size * 0.015}"/>

  <!-- Icon Graphic: Camera / Magnifier / Diamond Antique Locator -->
  <g transform="translate(${center}, ${center})" filter="url(#glow)">
    <!-- Base Camera / Scanner Frame -->
    <path d="M ${-innerSize * 0.3} ${-innerSize * 0.15} 
             L ${-innerSize * 0.15} ${-innerSize * 0.3} 
             L ${innerSize * 0.15} ${-innerSize * 0.3} 
             L ${innerSize * 0.3} ${-innerSize * 0.15} 
             L ${innerSize * 0.3} ${innerSize * 0.25} 
             A ${innerSize * 0.08} ${innerSize * 0.08} 0 0 1 ${innerSize * 0.22} ${innerSize * 0.33}
             L ${-innerSize * 0.22} ${innerSize * 0.33}
             A ${innerSize * 0.08} ${innerSize * 0.08} 0 0 1 ${-innerSize * 0.3} ${innerSize * 0.25} Z" 
          fill="none" stroke="url(#primaryGrad)" stroke-width="${size * 0.035}" stroke-linejoin="round" stroke-linecap="round"/>
    
    <!-- Central Aperture / Lens -->
    <circle cx="0" cy="${innerSize * 0.05}" r="${innerSize * 0.16}" fill="#0B0E14" stroke="url(#primaryGrad)" stroke-width="${size * 0.035}"/>
    <circle cx="0" cy="${innerSize * 0.05}" r="${innerSize * 0.08}" fill="#00F2FE"/>

    <!-- Sparkle / AI Star top right -->
    <path d="M ${innerSize * 0.22} ${-innerSize * 0.22} 
             Q ${innerSize * 0.22} ${-innerSize * 0.14} ${innerSize * 0.3} ${-innerSize * 0.14} 
             Q ${innerSize * 0.22} ${-innerSize * 0.14} ${innerSize * 0.22} ${-innerSize * 0.06} 
             Q ${innerSize * 0.22} ${-innerSize * 0.14} ${innerSize * 0.14} ${-innerSize * 0.14} 
             Q ${innerSize * 0.22} ${-innerSize * 0.14} ${innerSize * 0.22} ${-innerSize * 0.22} Z"
          fill="#FFB020"/>
  </g>
</svg>`;
}

async function run() {
  console.log('Generating icons...');
  
  // 1. Icon SVG
  const svg192 = createSvg(192, false);
  const svg512 = createSvg(512, false);
  const svgMaskable = createSvg(512, true);
  const svg180 = createSvg(180, false);

  fs.writeFileSync(path.join(publicDir, 'icon.svg'), svg512);

  // 2. Render PNGs using sharp
  await sharp(Buffer.from(svg192)).png().toFile(path.join(publicDir, 'icon-192.png'));
  await sharp(Buffer.from(svg512)).png().toFile(path.join(publicDir, 'icon-512.png'));
  await sharp(Buffer.from(svgMaskable)).png().toFile(path.join(publicDir, 'icon-maskable-512.png'));
  await sharp(Buffer.from(svg180)).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));

  console.log('Icons generated successfully in /public!');
}

run().catch(console.error);
