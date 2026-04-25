# Crashdump

A minimal dev blog: Markdown in `src/content/blog/`, static Astro build, and a home page with **recent dumps** plus a **file tree** (keyboard: `j` / `k`, `l` to open, `h` to go up or collapse a folder). `Escape` on a post returns to the list.

## URLs

- Each post is served at a path that mirrors the file path under `blog/`, without `.md` and with a trailing slash, e.g. `src/content/blog/notes/heap.md` → `/notes/heap/`.
- Folders in the tree UI match the folder layout on disk.

## Commands

- `npm run dev` — local dev server
- `npm run build` — static output in `dist/`
- `npm run preview` — serve `dist/`

## Deploy (Vercel)

1. Push the repo to GitHub/GitLab/Bitbucket.
2. [Import the project in Vercel](https://vercel.com/new).
3. **Framework Preset:** Astro (or set **Build Command** to `npm run build` and **Output Directory** to `dist`).
4. Add `site: "https://<your-project>.vercel.app"` to `astro.config.mjs` when you want correct canonical/absolute URLs.

## Frontmatter

Each post is a `.md` file with:

- `title` (string)
- `date` (ISO date string)
- `description` (optional)
- `draft: true` (optional) — draft posts are omitted from the build and the tree
