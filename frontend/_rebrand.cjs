// Temporary rebrand script - delete after use
const fs = require('fs');
const path = require('path');

function walk(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, results);
    else if (/\.(jsx?|json|html|css)$/.test(entry.name)) results.push(full);
  }
  return results;
}

// 1. T token replacements (only in files that have the old HSL tokens)
const hslMap = [
  ["'hsl(220,25%,6%)'",  "'#F8FAFC'"],
  ["'hsl(220,25%,10%)'", "'#FFFFFF'"],
  ["'hsl(220,20%,14%)'", "'#F1F5F9'"],
  ["'hsl(220,15%,20%)'", "'#E2E8F0'"],
  ["'hsl(220,15%,90%)'", "'#0F172A'"],
  ["'hsl(220,10%,55%)'", "'#64748B'"],
  ["'hsl(185,72%,48%)'", "'#06B6D4'"],
  ["'hsl(265,60%,58%)'", "'#6366F1'"],
  ["'hsl(0,72%,51%)'",   "'#EF4444'"],
  ["'hsl(142,71%,45%)'", "'#10B981'"],
  ["'hsl(38,92%,50%)'",  "'#F59E0B'"],
];

// 2. Branding replacements
const brandMap = [
  // Order matters - more specific first
  ["Riskitera Sales", "St4rtup CRM"],
  ["Riskitera S.L.U.", "St4rtup"],
  ["david@riskitera.com", "hello@st4rtup.app"],
  ["sales.riskitera.com", "app.st4rtup.app"],
  ["riskitera.com", "st4rtup.app"],
  ["riskitera-sales", "st4rtup"],
  ["Riskitera", "St4rtup"],
];

const srcFiles = walk(path.join(__dirname, 'src'));
const publicFiles = [
  path.join(__dirname, 'public', 'manifest.json'),
  path.join(__dirname, '..', 'frontend', 'index.html'),
].filter(f => { try { fs.statSync(f); return true; } catch { return false; } });
// Also try index.html at frontend root
const indexHtml = path.join(__dirname, 'index.html');
if (fs.existsSync(indexHtml) && !publicFiles.includes(indexHtml)) publicFiles.push(indexHtml);

const allFiles = [...srcFiles, ...publicFiles];
let tokenCount = 0;
let brandCount = 0;

for (const file of allFiles) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // HSL token replacements
  for (const [old, rep] of hslMap) {
    if (content.includes(old)) {
      content = content.split(old).join(rep);
      changed = true;
      tokenCount++;
    }
  }

  // Branding replacements
  for (const [old, rep] of brandMap) {
    if (content.includes(old)) {
      content = content.split(old).join(rep);
      changed = true;
      brandCount++;
    }
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
  }
}

console.log(`Token replacements: ${tokenCount} across files`);
console.log(`Brand replacements: ${brandCount} across files`);
console.log('Done!');
