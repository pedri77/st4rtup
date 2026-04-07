#!/usr/bin/env node
// Generate sitemap.xml from blog/index.json + static URLs.
// Run before build: node scripts/generate-sitemap.mjs
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PUBLIC_DIR = path.resolve(__dirname, '..', 'public')

const STATIC_URLS = [
  ['/', '1.0', 'weekly'],
  ['/pricing', '0.9', 'monthly'],
  ['/demo', '0.8', 'monthly'],
  ['/blog', '0.9', 'daily'],
  ['/help', '0.6', 'monthly'],
  ['/changelog', '0.5', 'weekly'],
  ['/roi', '0.7', 'monthly'],
  ['/status', '0.4', 'daily'],
  ['/vs/hubspot', '0.7', 'monthly'],
  ['/vs/pipedrive', '0.7', 'monthly'],
  ['/vs/salesforce', '0.7', 'monthly'],
  ['/affiliates', '0.6', 'monthly'],
  ['/contact-sales', '0.5', 'monthly'],
  ['/privacy', '0.3', 'yearly'],
  ['/terms', '0.3', 'yearly'],
  ['/cookies', '0.3', 'yearly'],
]

const indexPath = path.join(PUBLIC_DIR, 'blog', 'index.json')
let articulos = []
if (fs.existsSync(indexPath)) {
  const data = JSON.parse(fs.readFileSync(indexPath, 'utf-8'))
  articulos = (data.articulos || []).filter(a => a.publicado)
}

const today = new Date().toISOString().split('T')[0]
const lines = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
]

for (const [p, prio, freq] of STATIC_URLS) {
  lines.push(`  <url><loc>https://st4rtup.com${p}</loc><changefreq>${freq}</changefreq><priority>${prio}</priority></url>`)
}

let blogCount = 0
for (const art of articulos) {
  if (art.fecha <= today) {
    lines.push(`  <url><loc>https://st4rtup.com/blog/${art.slug}</loc><lastmod>${art.fecha}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`)
    blogCount++
  }
}

lines.push('</urlset>')
fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), lines.join('\n'))
console.log(`✓ Sitemap: ${STATIC_URLS.length} static + ${blogCount} blog = ${STATIC_URLS.length + blogCount} URLs`)
