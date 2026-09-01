# Pick Smarter — Website

A lightweight static site (HTML / CSS / vanilla JS, no build step, no framework) that renders weekly College Football and NFL Pick'em recommendations from CSV files. See [`data/README.md`](data/README.md) for the full weekly-update workflow — that's the doc you'll actually reach for most weeks.

## Project structure

```
index.html                 Home
college/index.html         College Football Pick'em dashboard
nfl/index.html              NFL Pick'em dashboard
learn/                      Strategy hub — index + 7 articles
methodology/index.html      How Win %, Public %, Leverage, and the Pick are calculated
track-record/index.html     Past Picks / Track Record
about/index.html            About
404.html

css/                        base.css (tokens/reset), layout.css, components.css, dashboard.css
js/
  csv.js                    Dependency-free CSV parser
  data-loader.js            Fetches + validates a weekly CSV; fails loudly on bad data
  dashboard.js               Shared renderer for /college/ and /nfl/ (and the homepage preview)
  track-record.js            Renderer for /track-record/
  nav.js                     Mobile nav + accordion toggle behavior
  newsletter.js               Newsletter signup — posts directly to Kit via fetch()

assets/
  brand/                     Logo files (copied from Media/), generated favicons
  teams/logos/                Empty — add team logo PNGs here (see below)
  teams/placeholder.svg       Shown automatically when a team logo file is missing

data/
  college-current.csv, nfl-current.csv   This week's live data
  README.md                              Full CSV schema + weekly update steps
  archive/college/, archive/nfl/          Past weeks (manifest.json + one CSV per week)

scripts/
  dev-server.js               Zero-dependency local static server (Node core only)
  validate-data.js            CLI version of the same data validation the site does in-browser
```

## Running it locally

Opening `index.html` directly (`file://`) won't work — the browser blocks `fetch()` of local CSV files under `file://`, so the dashboards would never load their data. Run the included server instead (needs only Node.js, no `npm install`):

```
node scripts/dev-server.js
```

Then open http://localhost:8080/. Pass a port as an argument to use a different one: `node scripts/dev-server.js 3000`.

## Updating this week's data

See [`data/README.md`](data/README.md) — replace `data/college-current.csv` or `data/nfl-current.csv` and reload. No HTML or JS changes needed. Run `node scripts/validate-data.js` first if you want to catch a bad export before publishing.

## Adding a team logo

Drop a PNG into `assets/teams/logos/` named after the team's slug (lowercase, spaces → underscores, e.g. `boston_college.png`). If you're working from the Excel model, use the `Logo Key` column in the `TEAM MAP` tab — it already matches this naming convention. Any team without a logo file automatically falls back to a generic shield icon; nothing breaks.

## Adding a Learn article

1. Create a new folder under `learn/`, e.g. `learn/your-new-topic/`, containing an `index.html`.
2. Copy the structure of an existing article (e.g. `learn/what-is-leverage/index.html`) — same header/footer, `<title>`/meta description/canonical/OG tags updated, and an `<article class="prose">` block for the content.
3. Add a card linking to it on `learn/index.html`, and add the URL to `sitemap.xml`.

## Archiving a finished week

See "Archiving a finished week" in [`data/README.md`](data/README.md). In short: copy the week's CSV into `data/archive/<sport>/`, add `winner` / `pick_result` columns, and register it in that folder's `manifest.json`. Archived weeks are never edited after the fact.

## Email signup (Kit)

The newsletter forms on `index.html`, `college/index.html`, and `nfl/index.html` are live — they post directly to Kit's public `/forms/{id}/subscriptions` endpoint via `fetch()` in `js/newsletter.js`, no backend involved. The College/NFL form IDs are hardcoded as `KIT_FORM_IDS` at the top of that file. "Both" isn't a real Kit list — it submits to both form IDs in parallel.

To change which Kit forms these route to, update `KIT_FORM_IDS` in `js/newsletter.js`. No HTML changes needed elsewhere.

## Deploying

This is a plain static site — any static host works (Netlify, Cloudflare Pages, GitHub Pages, Vercel static, S3 + CloudFront, etc.). There's no build command; just deploy the repository root as-is. A few things to do once you have a real domain:

- Update the `<link rel="canonical">` and `og:url`-equivalent tags if you want fully-qualified URLs (currently root-relative).
- Fill in real absolute URLs in `sitemap.xml` (currently placeholders).
- Point `robots.txt`'s `Sitemap:` line at the final domain if you make it absolute.

Because every article and page lives at `/path/index.html`, clean URLs (`/learn/what-is-leverage/` with no `.html`) work automatically on any host that serves directory `index.html` files by default — which covers the hosts listed above out of the box.
