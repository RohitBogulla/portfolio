# Personal site

Static site. Deployed via GitHub Pages,
with a GitHub Action that keeps the blog index in sync automatically.

## Structure

```
index.html                     the whole site (single page, tab-switched panes)
css/style.css                   styles + design tokens (colors, type, spacing)
js/app.js                        tab switching, theme toggle, blog + project rendering
posts/*.md                        blog posts (markdown + frontmatter)
posts/index.json                 auto-generated list of posts — don't hand-edit
projects/*.json                   project cards (one file per project)
projects/index.json               auto-generated combined list — don't hand-edit
assets/projects/                  project card images
scripts/build-blog-index.js          regenerates posts/index.json from /posts
scripts/build-projects-index.js       regenerates projects/index.json from /projects
.github/workflows/build-and-deploy.yml   runs both scripts on every push, deploys to Pages
```

## Publishing a new post

1. Copy `posts/_template.md.txt`, rename it to end in `.md`
   (e.g. `2026-08-07-first-post.md`).
2. Edit the frontmatter (`title`, `date`) and write the body in markdown.
3. Commit and push to `main`.

That's it — the GitHub Action regenerates `posts/index.json` and redeploys.
Nothing else to touch.

## Adding a new project

1. Copy `projects/_template.json.txt`, rename it to end in `.json`
   (e.g. `my-project.json`), and delete the two `//` comment lines at the
   bottom — plain JSON doesn't allow comments.
2. Fill in the fields. `image` is optional — omit it for a plain card with
   no photo. If you're using one, drop the file in `assets/projects/`.
3. Commit and push to `main`.

The GitHub Action regenerates `projects/index.json` and redeploys — no
HTML to touch, no matter how many projects you add.

## First-time setup

1. Push this repo to GitHub.
2. In the repo's **Settings → Pages**, set the source to **GitHub Actions**.
3. Replace the placeholder details in `index.html`:
   - email / GitHub / LinkedIn links in the sidebar and Contact pane
   - the avatar image (swap the `.avatar-fallback` div for a real `<img>`)
   - `assets/rohit-bogulla-resume.pdf` — drop your actual resume PDF there
4. Push again — the site is live at `https://<username>.github.io/<repo>/`.

## Running locally

Any static file server works, e.g.:

```
python3 -m http.server 8000
```

(Opening `index.html` directly via `file://` won't work — the blog fetches
`posts/index.json`, which browsers block over `file://`.)

To regenerate the blog index by hand:

```
node scripts/build-blog-index.js
```
