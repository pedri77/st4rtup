#!/usr/bin/env node
/**
 * Generate blog cover images (1200x624 webp) with gradient background + title text.
 * Usage: node scripts/generate-blog-covers.mjs
 * Or for specific articles: node scripts/generate-blog-covers.mjs ia-productividad-founders
 */

import sharp from 'sharp';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BLOG_DIR = join(__dirname, '..', 'frontend', 'public', 'blog');
const WIDTH = 1200;
const HEIGHT = 624;

// Color palettes per cluster
const PALETTES = {
  C1:  { from: '#1a1a2e', to: '#16213e', accent: '#e94560' },  // Ecosistema
  C2:  { from: '#0f3460', to: '#16213e', accent: '#53d769' },  // Financiacion
  C3:  { from: '#1b1b2f', to: '#162447', accent: '#e43f5a' },  // Crear & Lanzar
  C7:  { from: '#2d132c', to: '#1a1a2e', accent: '#fca311' },  // Fundadores
  C11: { from: '#1a1a2e', to: '#0d1b2a', accent: '#48cae4' },  // Legal
  C12: { from: '#0d1b2a', to: '#1b263b', accent: '#7209b7' },  // IA & Productividad
};

function wrapText(text, maxCharsPerLine = 28) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxCharsPerLine && current) {
      lines.push(current.trim());
      current = word;
    } else {
      current = current ? current + ' ' + word : word;
    }
  }
  if (current) lines.push(current.trim());
  return lines.slice(0, 4); // max 4 lines
}

async function generateCover(slug, titulo, cluster) {
  const palette = PALETTES[cluster] || PALETTES.C1;
  const lines = wrapText(titulo);
  const lineHeight = 52;
  const startY = Math.max(180, HEIGHT / 2 - (lines.length * lineHeight) / 2);

  const textElements = lines.map((line, i) =>
    `<text x="80" y="${startY + i * lineHeight}" font-family="Inter, system-ui, sans-serif" font-size="42" font-weight="700" fill="white">${escapeXml(line)}</text>`
  ).join('\n');

  const svg = `
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${palette.from}"/>
      <stop offset="100%" stop-color="${palette.to}"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <!-- Accent bar -->
  <rect x="80" y="${startY - 60}" width="60" height="4" rx="2" fill="${palette.accent}"/>
  <!-- Category label -->
  <text x="80" y="${startY - 30}" font-family="Inter, system-ui, sans-serif" font-size="16" font-weight="500" fill="${palette.accent}" text-transform="uppercase" letter-spacing="2">ST4RTUP.COM</text>
  <!-- Title -->
  ${textElements}
  <!-- Bottom decoration -->
  <rect x="80" y="${HEIGHT - 60}" width="120" height="3" rx="1.5" fill="${palette.accent}" opacity="0.5"/>
  <text x="220" y="${HEIGHT - 50}" font-family="Inter, system-ui, sans-serif" font-size="14" fill="rgba(255,255,255,0.5)">st4rtup.com/blog</text>
</svg>`;

  const outputPath = join(BLOG_DIR, `${slug}.webp`);

  await sharp(Buffer.from(svg))
    .resize(WIDTH, HEIGHT)
    .webp({ quality: 85 })
    .toFile(outputPath);

  console.log(`  ✓ ${slug}.webp (${cluster})`);
}

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function main() {
  const indexPath = join(BLOG_DIR, 'index.json');
  const data = JSON.parse(readFileSync(indexPath, 'utf-8'));
  const filterSlug = process.argv[2];

  console.log('Generating blog covers...\n');

  let count = 0;
  for (const art of data.articulos) {
    if (filterSlug && art.slug !== filterSlug) continue;

    const imgPath = join(BLOG_DIR, `${art.slug}.webp`);
    // Skip if image already exists (unless specific slug requested)
    if (!filterSlug && existsSync(imgPath)) continue;

    await generateCover(art.slug, art.titulo, art.cluster);
    count++;
  }

  console.log(`\nDone: ${count} covers generated.`);
}

main().catch(console.error);
