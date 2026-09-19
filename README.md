# Vibecoded Directory

An open-source directory of apps that people actually shipped with AI coding tools, organised around
one question:

> **Is there a vibecoded clone of ___?**

Every listing declares what it stands in for: Photoshop, Procreate, Notion, Google Sheets. The
directory answers the question either way. Where something exists, you get the alternatives with a
line on what each does differently. Where nothing exists, you get an honest "not yet", what a clone
would have to get right, and an invitation to build it.

The listings **are** the project: one small JSON file per app in [`data/apps/`](data/apps). Add a
file, open a pull request, and the site rebuilds itself. No database, no admin panel, no CMS.

- **Stack:** Astro 5 (static output) + Zod, hand-written CSS, ~3 kB of client-side JavaScript
- **Design:** a printed catalogue: bone paper, ink, one vermilion accent, serif display, mono metadata
- **Licence:** MIT (code, listings and the product catalogue)

---

## Quick start

```bash
git clone https://github.com/vibecoded-apps/directory.git
cd directory
npm install
npm run dev          # http://localhost:4321
```

```bash
npm run build        # static site in dist/
npm run preview      # serve the build locally
npm run check        # TypeScript + Astro diagnostics
npm run validate     # validate every listing (same check CI runs)
```

Requires Node 22 or newer.

---

## The product catalogue

`data/products.json` is the curated list of established products a listing can claim to replace. It
is hand-maintained, and it is what stops the directory dissolving into a pile of tags: a listing can
only claim a product that is already in the catalogue.

Each entry generates a page at **`/clone/<slug>/`**:

| URL | Answers |
| --- | --- |
| `/clone/procreate/` | "Is there a vibecoded clone of Procreate?" → yes, with the alternatives |
| `/clone/adobe-photoshop/` | …or "not yet", with what a clone would have to get right |
| `/clones/` | The whole catalogue, replaced and unreplaced, filterable |

Pages exist for **unreplaced products too**. A page that says "not yet, and here is the bar" is a
real answer to a real search, and it is the page that recruits the person who builds it.

Adding a product is a two-line edit: append to `data/products.json`. The site picks it up, creates
the page, and starts counting.

## Adding a listing

Three ways, pick whichever suits you:

```bash
# 1. scaffold a file and edit it
npm run new my-app
npm run validate

# 2. let GitHub create the file for you (pre-filled from the template)
#    → /submit has a deep link that does exactly this

# 3. no git at all: /submit links to a GitHub issue form
```

A listing is a single file named after the URL slug:

```
data/apps/orbit-notes.json   →   /apps/orbit-notes/
```

### The schema

Defined once, in [`src/lib/listing-schema.mjs`](src/lib/listing-schema.mjs), and shared by the site,
the validator and the scaffolder. A pull request cannot merge a listing the site cannot render.

| Field | Required | Notes |
| --- | --- | --- |
| `name` | ✅ | 2 to 60 characters |
| `tagline` | ✅ | One sentence, no trailing full stop |
| `url` | ✅ | Live product page, `http(s)` only |
| `replaces` | ✅ | What it stands in for, see below |
| `category` | ✅ | Must be one of `CATEGORIES` |
| `builtWith` | ✅ | The AI tools actually used (1 to 6) |
| `maker` | ✅ | `name`, optional `handle` / `url` / `avatar` |
| `launchedAt` | ✅ | `YYYY-MM-DD`, not in the future |
| `description` | | Paragraphs separated by a blank line |
| `repo` | | Required when `pricing` is `open-source` |
| `icon`, `screenshots` | | Image URLs; a monogram tile is generated when absent |
| `tags`, `stack` | | Lowercase, hyphenated; max 5 tags |
| `pricing`, `status` | | `free`/`freemium`/`paid`/`open-source`, `live`/`beta`/`wip`/`archived` |
| `stars` | | Cached GitHub stars, refreshed weekly by a workflow |
| `featured` | | Editorial pick. Free, and separate from sponsorship |
| `sponsor` | | Paid placement: `{ tier, until, url?, label? }` |
| `placeholder` | | Marks seed data as a sample entry |

Rename a category or add a tool by editing the constants at the top of the schema file.

### `replaces`

```json
"replaces": [
  {
    "product": "Procreate",
    "kind": "clone",
    "note": "Same brush-first workflow, no layer limits."
  }
]
```

- **`product`**: must resolve to an entry in `data/products.json` (by name, slug or alias). The
  build fails otherwise, which is what keeps the vocabulary tight.
- **`kind`**: `clone` (a deliberate 1:1 rebuild), `alternative` (same job, another way) or
  `inspired-by` (borrows the idea without claiming to replace it). Optional, defaults to
  `alternative`.
- **`note`**: one line on what this one does differently. It is shown next to the listing on that
  product's page, so it is the single most-read sentence you will write. Keep it under 160
  characters and make it specific.

Up to three products per listing. `"replaces": []` is allowed and files the app as an original.

---

## How the site works

```
data/apps/*.json          one file per listing
data/products.json        the curated list of products they replace
        │
        ├─ src/lib/products.mjs      the canon: resolve names, aliases, slugs
        ├─ src/content.config.ts     Astro content collection (glob loader)
        ├─ src/lib/apps.ts           derived views: slugs, sorting, replacement counts
        ▼
   src/pages/*.astro          static HTML at build time
        ├─ /                     the question, inline in the H1, with live answers
        ├─ /clones/              every catalogued product, replaced and open
        ├─ /clone/<product>/     "Is there a vibecoded clone of X?"  ← the point
        ├─ /apps/<slug>/         detail page
        ├─ /categories/          sections index
        ├─ /category/<slug>/     one section
        ├─ /submit/ /about/ /sponsor/
        └─ /rss.xml              newest listings
```

### Search intent

The clone pages are built to be the answer, not to rank by accident:

- The **H1 is the literal question**: "Is there a vibecoded clone of Photoshop?"
- The **verdict line** is a single quotable sentence: "Yes: 3 apps in the directory stand in for it."
- **`FAQPage` structured data** carries the question, the answer, the bar for a clone, and the list
  of alternatives; `ItemList` and `BreadcrumbList` ride alongside.
- The **title** puts "vibecoded clone of X" first, with the answer in it.
- Every page links to its siblings and its section, so the catalogue interlinks itself.

Nothing here guarantees a ranking, but the page is unambiguous about what question it answers,
which is what those queries are looking for.

Search, filtering, sorting and "load more" run client-side against `data-*` attributes that are
already in the HTML, so every list is fully server-rendered, crawlable and usable without JavaScript.

### Tuning the paper

The page texture lives in `src/styles/global.css` as two fixed overlays above the page (not behind
it, or every component that paints its own surface would hide it and leave seams). Both use seamless
SVG noise, and three things about them are deliberate:

- The tiles are **forced opaque**: `feTurbulence` also randomises the alpha channel, so without the
  alpha row in `feColorMatrix` the texture arrives semi-transparent and its strength becomes
  unpredictable.
- Each tile is **contrast-boosted around mid-grey**, with `intercept = 0.5 - 0.5 * slope`. That pins
  mid-grey to mid-grey, which is what lets the texture ride on `soft-light`, because soft-light
  treats mid-grey as a no-op, so grain adds tooth without darkening the sheet. Multiply looked better
  at first, but pulled the paper from 247 to 226: grey, not papery. Dark mode uses `overlay` at about
  half strength, since texture there has to be added rather than subtracted.
- Each **filter region is pinned to the tile size**. This one is easy to miss and it caused a visible
  grid of squares. `<filter>` defaults to a region of `-10% / -10% / 120% / 120%`, and
  `stitchTiles='stitch'` stitches to that region, so a 500px tile stitched on a 600px period and the
  noise never met itself at the tile edge. `filterUnits='userSpaceOnUse'` with `x/y/width/height`
  equal to the tile makes the stitch period and the repeat period the same number.

To change how strong it is, edit `--grain-opacity` / `--mottle-opacity`. To change how coarse it is,
edit the `slope` values (and keep the `intercept` in step). After tuning, check the tone has not
drifted:

```bash
# in the browser, hide the content so only paper remains, then screenshot, then:
node scripts/sample-patch.mjs shot.png <viewportWidth> <x> <y> <w> <h>
```

It prints the patch's mean colour and per-channel standard deviation. Mean should stay within a few
levels of `--paper`, and a standard deviation above roughly 1.5 means grain is actually present.


```
scripts/
  validate-data.mjs    schema + house rules (+ --links to check URLs respond)
  new-app.mjs          scaffold a listing from data/listing.template.json
  refresh-stars.mjs    refresh cached GitHub stars (run weekly in CI)
  make-og.mjs          render public/og.png from the live data
```

---

## Monetisation, already wired but switched off

Both live in [`src/config.ts`](src/config.ts) and default to **off**. Nothing is rendered and nothing
is requested while they are off.

### Paid listings

```ts
export const SPONSORSHIP = { enabled: false, tiers: [ /* … */ ] };
```

Placements are stored in the listing itself:

```json
"sponsor": { "tier": "gold", "until": "2026-11-30", "label": "Sponsored" }
```

They are labelled on the row and on the detail page, they **expire on their own** (no stale sponsor
badge if nobody renews), and they are lifted into a separate Spotlight band so they never reorder the
organic index. `/sponsor` documents this and shows the tiers.

### Ad slots

```ts
export const ADS = { enabled: false, provider: null, slots: { homeInline: '', /* … */ } };
```

`src/components/AdSlot.astro` renders nothing at all while disabled. Each slot reserves its height, so
turning ads on causes no layout shift and no redesign. Drop your provider snippet into the marked
block in that component.

---

## Deploying

The included workflow (`.github/workflows/deploy.yml`) publishes `dist/` to GitHub Pages on every
push to `main`. Point the domain by editing `public/CNAME` and, if the domain changes, `site` in
`astro.config.mjs` (it feeds canonical URLs, the sitemap and RSS).

Any static host works: Netlify, Cloudflare Pages, S3, a folder on a VPS:

```bash
npm run build   # then serve dist/, that is the whole deployment
```

## Self-hosting a niche version

Fork it and change three things: `SITE` in `src/config.ts`, `public/CNAME`, and the `CATEGORIES`
constant in the schema. Then empty `data/apps/` and start adding your own. The name, colours and
typefaces are all tokens in `src/styles/global.css`.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). CI validates schema, types and links on every pull request.

## Licence

MIT, see [LICENSE](LICENSE). The listings are data, and are covered by the same licence.
