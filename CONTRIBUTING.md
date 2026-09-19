# Contributing

Two ways in: **add a listing**, or **improve the site**. Both are ordinary pull requests.

## The one question that matters

The directory is organised around a single question, *is there a vibecoded clone of X?*, so every
listing has to answer **what does it replace?**

```json
"replaces": [
  { "product": "Procreate", "kind": "clone", "note": "Pencil-first canvas in a tab." }
]
```

- `product` must exist in `data/products.json`. The build fails otherwise.
- `kind` is `clone`, `alternative` or `inspired-by`.
- `note` is one line on what you do differently. It is the most-read sentence you will write,
  because it appears next to your app on that product's page.

If your app genuinely has no incumbent, `"replaces": []` is allowed and files it as an original. Be
honest about it: reviewers would rather see an empty array than a stretched comparison.

## Adding a listing

```bash
npm install
npm run new "My App"     # creates data/apps/my-app.json
# edit the file
npm run validate         # same checks CI runs
git checkout -b add-my-app
git add data/apps/my-app.json
git commit -m "Add My App"
```

Then open a pull request. If you would rather not touch git, use the form linked from `/submit` and a
maintainer will turn it into a listing.

### Adding a product to the catalogue

If the thing you replace is not in `data/products.json`, add it in the same pull request:

```json
{
  "name": "Procreate",
  "slug": "procreate",
  "vendor": "Savage Interactive",
  "section": "Design",
  "homepage": "https://procreate.com",
  "summary": "The iPad painting app most digital illustrators start with.",
  "gap": "Brush feel and Apple Pencil latency are the entire product.",
  "aliases": ["ipad drawing", "digital painting"]
}
```

- `section` must be one of the categories in `src/lib/listing-schema.mjs`.
- `gap` is your one-line editorial answer to *what would a clone have to get right?* It appears on
  the product's page for everyone who comes after you, so make it a judgement, not a description.
- `aliases` are the words people type when searching. They are what makes "ipad drawing" find
  Procreate.

Adding a product is worth doing even when nothing replaces it yet: that page says "not yet", which
is a real answer and the best possible invitation for someone to build one.

### What gets accepted

- **It replaces something specific**: a product in the catalogue, named in `replaces`.
- **You can say what it does differently** in one line that is not marketing copy.
- **It runs.** A stranger can open the URL and use something.
- **You built it**, or you are the maker's teammate with their permission.
- **AI tooling shaped it**, not just autocomplete. Say which tools in `builtWith`.
- **One file per app**, named after the app (`data/apps/my-app.json`): lowercase, hyphens, max 48
  characters.

### What gets declined

- General-purpose tools with no incumbent to compare against.
- Landing pages with a waitlist and no product behind them.
- Affiliate farms, SEO doorway pages, scraped directories.
- The same app submitted twice under a different name.
- Anything you would not be happy to have a stranger review.

### House rules for a listing

- `replaces` names what a reader would search for, not the closest thing you could argue for.
- `url` must be the live product, not a marketing microsite, and must work without a login.
- `tagline` is one sentence, sentence case, no trailing full stop.
- `builtWith` is the tools **you actually used**, not the ones you like.
- Keep `description` to a couple of paragraphs. Say what surprised you; skip the mission statement.
- If the app is open source, set `pricing: "open-source"` and include `repo`.
- Do not edit someone else's listing to add yourself as a maker.

### Editing or removing a listing

Open a pull request against the file. Fixing a broken URL, a stale star count or an outdated status is
always welcome. Removals: one revert away, history stays in git.

## Improving the site

```
src/styles/global.css     the whole design system (tokens at the top)
src/config.ts             site metadata, monetisation switches, page size
src/lib/listing-schema.mjs  the listing schema, the shape of a submission
src/lib/products.mjs      the product canon: name/alias resolution, sections
data/products.json        the catalogue itself, hand-maintained
src/components/           ReplacementFinder, AppRow, AppCard, Header, Footer, AdSlot
src/pages/clone/          the "is there a clone of X?" pages
src/pages/                the rest of the routes
scripts/                  validate, scaffold, star refresh, OG image
```

Before opening a pull request:

```bash
npm run check      # types + Astro diagnostics, must be clean
npm run validate   # listings
npm run build      # must succeed
```

Please keep the house style:

- **No client-side framework.** Small, dependency-free scripts are welcome; a runtime is not.
- **Static by default.** Anything that needs a server must justify itself.
- **No third-party requests.** Fonts are self-hosted; no analytics, no CDN scripts, no trackers.
- **Accessible.** Semantic HTML, visible focus states, keyboard-operable, labelled controls.
- **Ads stay out of the codebase** unless they are opt-in, single-slot and tracking-free.

## Commit messages

Short imperative subject, then a body if the reason is not obvious: `Add Orbit Notes`,
`Fix broken icon fallback`, `Refresh star counts`.

## Code of conduct

Be decent. Discuss the work, not the person. Assume good faith, ask before rewriting someone's
contribution wholesale, and do not use the issue tracker to promote your own app outside the
submission flow. Maintainers will remove anything that makes the project unpleasant to work on.
