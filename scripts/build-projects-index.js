#!/usr/bin/env node
/**
 * Scans /projects for .json files, validates + reads each one, and writes
 * projects/index.json — a single array the site fetches to render project cards.
 *
 * Run manually:  node scripts/build-projects-index.js
 * Run in CI:      see .github/workflows/build-and-deploy.yml
 *
 * To add a project: copy projects/_template.json.txt, rename it to end in
 * .json, fill in the fields, drop an optional image in assets/projects/,
 * then commit + push. The index regenerates automatically.
 */
const fs = require('fs');
const path = require('path');

const PROJECTS_DIR = path.join(__dirname, '..', 'projects');
const OUT_FILE = path.join(PROJECTS_DIR, 'index.json');

function main() {
  if (!fs.existsSync(PROJECTS_DIR)) {
    console.error('No projects/ directory found.');
    process.exit(1);
  }

  const files = fs.readdirSync(PROJECTS_DIR).filter(f => f.endsWith('.json') && f !== 'index.json');

  const projects = files.map(file => {
    const raw = fs.readFileSync(path.join(PROJECTS_DIR, file), 'utf8');
    let data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      console.error(`Skipping ${file}: invalid JSON (${err.message})`);
      return null;
    }
    if (!data.title) {
      console.error(`Skipping ${file}: missing "title"`);
      return null;
    }
    return {
      title: data.title,
      date: data.date || '',
      period: data.period || '',
      status: data.status || '',
      image: data.image || '',
      description: data.description || '',
      stack: Array.isArray(data.stack) ? data.stack : [],
      links: Array.isArray(data.links) ? data.links : [],
    };
  }).filter(Boolean)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  fs.writeFileSync(OUT_FILE, JSON.stringify(projects, null, 2) + '\n');
  console.log(`Wrote ${OUT_FILE} with ${projects.length} project(s).`);
}

main();
