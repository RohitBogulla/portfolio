// ===========================================================
// Tab navigation
// ===========================================================
const tabs = document.querySelectorAll('nav.tabs button');
const panes = document.querySelectorAll('.pane');
const sidebarAvatar = document.getElementById('sidebarAvatar');

function activateTab(name, opts = {}) {
  tabs.forEach(t => t.setAttribute('aria-selected', String(t.dataset.tab === name)));
  panes.forEach(p => p.classList.toggle('active', p.id === `pane-${name}`));
  // Sidebar avatar only shows once you've left the home pane —
  // the big photo on Home already covers that.
  sidebarAvatar.style.display = name === 'home' ? 'none' : '';
  if (!opts.silent) {
    history.replaceState(null, '', `#${name}`);
  }
}

tabs.forEach(t => t.addEventListener('click', () => activateTab(t.dataset.tab)));

// Deep-link on load (e.g. #blog)
const initial = (location.hash || '#home').slice(1);
if ([...tabs].some(t => t.dataset.tab === initial)) {
  activateTab(initial, { silent: true });
} else {
  activateTab('home', { silent: true });
}

// ===========================================================
// Theme toggle (persisted)
// ===========================================================
const root = document.documentElement;
const themeToggle = document.getElementById('themeToggle');
const themeLabel = document.getElementById('themeLabel');

function applyTheme(theme) {
  root.setAttribute('data-theme', theme);
  themeLabel.textContent = theme === 'dark' ? 'dark mode' : 'light mode';
  localStorage.setItem('theme', theme);
}

const savedTheme = localStorage.getItem('theme') ||
  (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
applyTheme(savedTheme);

themeToggle.addEventListener('click', () => {
  applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
});

// ===========================================================
// Status bar clock
// ===========================================================
const clockSeg = document.getElementById('clockSeg');
function tickClock() {
  const now = new Date();
  clockSeg.textContent = `local time ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}
tickClock();
setInterval(tickClock, 15000);

// ===========================================================
// Blog: reads posts/index.json (auto-generated — see scripts/build-blog-index.js)
// then fetches + renders the chosen post's markdown.
// To publish: drop a .md file with frontmatter into /posts and push.
// The GitHub Action regenerates index.json for you.
// ===========================================================
const postList = document.getElementById('postList');
const emptyNote = document.getElementById('emptyNote');
const blogListView = document.getElementById('blogListView');
const blogPostView = document.getElementById('blogPostView');
const postMeta = document.getElementById('postMeta');
const postBody = document.getElementById('postBody');
const backToList = document.getElementById('backToList');

backToList.addEventListener('click', () => {
  blogPostView.hidden = true;
  blogListView.hidden = false;
});

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

async function loadPost(file) {
  try {
    const res = await fetch(`posts/${file}`);
    const raw = await res.text();
    const { meta, body } = splitFrontmatter(raw);
    postMeta.textContent = `${formatDate(meta.date)}${meta.date ? ' · ' : ''}${meta.title || file}`;
    postBody.innerHTML = window.marked ? marked.parse(body) : `<pre>${body}</pre>`;
    blogListView.hidden = true;
    blogPostView.hidden = false;
  } catch (err) {
    postBody.innerHTML = `<p>Couldn't load this post.</p>`;
    blogListView.hidden = true;
    blogPostView.hidden = false;
  }
}

// Minimal frontmatter parser: expects
// ---
// title: My Post
// date: 2026-08-07
// ---
// body markdown...
function splitFrontmatter(raw) {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };
  const meta = {};
  match[1].split('\n').forEach(line => {
    const idx = line.indexOf(':');
    if (idx > -1) meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  });
  return { meta, body: match[2] };
}

async function loadPostList() {
  try {
    const res = await fetch('posts/index.json');
    if (!res.ok) throw new Error('no index');
    const posts = await res.json();
    if (!posts.length) {
      emptyNote.hidden = false;
      return;
    }
    posts
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .forEach(post => {
        const row = document.createElement('button');
        row.className = 'post-row';
        row.innerHTML = `<span class="post-title">${post.title}</span><span class="post-date">${formatDate(post.date)}</span>`;
        row.addEventListener('click', () => loadPost(post.file));
        postList.appendChild(row);
      });
  } catch (err) {
    emptyNote.hidden = false;
  }
}

loadPostList();

// ===========================================================
// Projects: reads projects/index.json (auto-generated — see
// scripts/build-projects-index.js). To add a project: copy
// projects/_template.json.txt, rename to end in .json, fill it in,
// push. The GitHub Action regenerates the index for you.
// ===========================================================
const projectGrid = document.getElementById('projectGrid');
const projectsEmptyNote = document.getElementById('projectsEmptyNote');

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderProjectCard(p) {
  const card = document.createElement('article');
  card.className = 'project-card';
  card.tabIndex = 0;

  const imageHtml = p.image
    ? `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.title)}" loading="lazy">`
    : `<span class="no-image-mark">no preview</span>`;

  const statusHtml = p.status ? `<span class="status-tag">● ${escapeHtml(p.status)}</span>` : '';
  const periodHtml = p.period ? `<p class="period">${escapeHtml(p.period)}</p>` : '';

  const stackHtml = p.stack.length
    ? `<ul class="stack-list">${p.stack.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>`
    : '';

  const linksHtml = p.links.length
    ? `<div class="links">${p.links.map(l => `<a href="${escapeHtml(l.url)}" target="_blank" rel="noopener">${escapeHtml(l.label)} →</a>`).join('')}</div>`
    : '';

  card.innerHTML = `
    <div class="project-image">${imageHtml}</div>
    <div class="project-body">
      <div class="project-head">
        <h3>${escapeHtml(p.title)}</h3>
        ${statusHtml}
      </div>
      ${periodHtml}
      <p class="desc">${escapeHtml(p.description)}</p>
      ${stackHtml}
      ${linksHtml}
    </div>
  `;
  return card;
}

async function loadProjects() {
  try {
    const res = await fetch('projects/index.json');
    if (!res.ok) throw new Error('no index');
    const projects = await res.json();
    if (!projects.length) {
      projectsEmptyNote.hidden = false;
      return;
    }
    projects.forEach(p => projectGrid.appendChild(renderProjectCard(p)));
  } catch (err) {
    projectsEmptyNote.hidden = false;
  }
}

loadProjects();

async function visitorCount() {
  const namespace = "honeywalnutshrimp";
  const key = "visits";
  const url = `https://rohit.com`

  if (!sessionStorage.getItem("has_visited")) {
    
    fetch(`${url}{namespace}/${key}`)
      .then(res => res.json())
      .then(data => {
        document.getElementById("visitor-count").innerText = data.value;
        sessionStorage.setItem("has_visited", "true");
      });
      
  } else {
    
    fetch(`${url}{namespace}/${key}`)
      .then(res => res.json())
      .then(data => {
        document.getElementById("visitor-count").innerText = data.value;
      });
  }
}

document.addEventListener("DOMContentLoaded", visitorCount);