# Blog

A minimal Astro blog: posts are Markdown files in `src/content/blog/`, deployed to GitHub Pages by GitHub Actions on every push to `main`.

## Run it locally

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # production build into dist/
```

## Go live

1. Edit `src/consts.ts` (site title, description, links) and set `site` in `astro.config.mjs` to your final URL.
2. Create a GitHub repo and push this folder to `main`.
   - Easiest URL: name the repo `<your-user>.github.io`, so the blog lives at the root of that domain.
3. In the repo: **Settings → Pages → Source: GitHub Actions**.
4. Push. The `Deploy blog to GitHub Pages` workflow builds and publishes it.

### Custom domain (recommended)

1. Buy a domain (any registrar; Cloudflare Registrar sells at cost).
2. In **Settings → Pages → Custom domain**, enter it and follow the DNS instructions.
3. Add a file `public/CNAME` containing just the domain, and update `site` in `astro.config.mjs`.

Note: if you instead deploy as a project site (`<user>.github.io/<repo>`), set `base: '/<repo>'` in `astro.config.mjs` and prefix the media paths in posts accordingly. A root domain avoids that.

## Writing a post

Create `src/content/blog/<slug>.md`:

```markdown
---
title: 'Post title'
description: 'One sentence for the index, RSS and search results.'
pubDate: 2026-10-10
tags: ['go', 'kafka']
draft: true
---

Post body in Markdown.
```

- `draft: true` keeps it off the site; switch to `false` to publish.
- Images and videos go in `public/blog/<slug>/` and are referenced as `/blog/<slug>/file.png`.
- Videos: `<video src="/blog/<slug>/clip.mp4" autoplay loop muted playsinline></video>`

## Cross-posting

When you cross-post to dev.to or Hashnode, set the **canonical URL** to the post on your own domain, so search engines credit your site.

## What's included

- Post index, post pages, RSS (`/rss.xml`), sitemap
- Light and dark theme following the reader's system setting
- Canonical and Open Graph tags on every page
