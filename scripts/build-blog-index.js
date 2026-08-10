#!/usr/bin/env node
/**
 * Scans /posts for .md files, reads their frontmatter (title, date),
 * and writes posts/index.json — the file the site fetches to list posts.
 *
 * Run manually:   node scripts/build-blog-index.js
 * Run in CI:       see .github/workflows/build-blog-index.yml
 *
 * To publish a post: add a .md file to /posts with frontmatter like:
 *   ---
 *   title: My Post Title
 *   date: 2026-08-07
 *   ---
 *   Body in markdown...
 * then commit + push. The index regenerates automatically.
 */
const fs = require('fs');
const path = require('path');

const POSTS_DIR = path.join(__dirname, '..', 'posts');
const OUT_FILE = path.join(POSTS_DIR, 'index.json');

function parseFrontmatter(raw) {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  const meta = {};
  if (match) {
    match[1].split('\n').forEach(line => {
      const idx = line.indexOf(':');
      if (idx > -1) meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    });
  }
  return meta;
}

function main() {
  if (!fs.existsSync(POSTS_DIR)) {
    console.error('No posts/ directory found.');
    process.exit(1);
  }

  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));

  const posts = files.map(file => {
    const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
    const meta = parseFrontmatter(raw);
    return {
      file,
      title: meta.title || file.replace(/\.md$/, ''),
      date: meta.date || '',
    };
  }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  fs.writeFileSync(OUT_FILE, JSON.stringify(posts, null, 2) + '\n');
  console.log(`Wrote ${OUT_FILE} with ${posts.length} post(s).`);
}

main();
