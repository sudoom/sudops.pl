# Migrate sudops.pl to astro-erudite v2 — design

Date: 2026-09-24
Branch: `erudite-v2` (from `origin/main` @ `92b643a`)

## Goal

Move sudops.pl from its customized astro-erudite v1.6.x fork (Astro 6, MDX, Tailwind, React, shadcn/ui) onto upstream astro-erudite v2 **as upstream ships it** — v2's look (sidebar, IBM Plex, v2 palette) and lean stack (Sätteri Markdown, plain `.md`, `:::` callouts, no Tailwind/React/MDX, Astro 7) — while keeping every post, image, and live URL.

Success means:

- The site builds and deploys on Cloudflare Pages from `main` exactly as today.
- Every URL live today still resolves.
- All 18 posts render with their callouts, code highlighting (including RouterOS), images, and the BOM chart.
- Future upstream updates can be pulled with `git merge upstream/main`.

## Decisions

| Topic | Decision |
|---|---|
| Target | Full v2: upstream design + stack, no restyling back to the v1 look |
| Approach | Real git merge of upstream (repos share root commit `f6dcc30`), then port customizations on top |
| Upstream commit | `upstream/main` @ `1ffdf62` (v2.0.1 + Astro 7 + fixes, 2026-07-27) |
| Package manager | npm (delete upstream `bun.lock`, regenerate `package-lock.json`) |
| Formatter | Biome (upstream's), replacing Prettier |
| Homepage | Port current homepage (intro, tech stack, latest posts) + `HeroSea` from unmerged `main-page` branch |
| BOM chart | `<bom-chart>` custom element (inline SVG doughnut, legend, hover tooltip, no deps) |
| Callouts | Map onto v2's five variants; `callout.ts` stays identical to upstream |
| Theme | v2 default: follows system light/dark (current site forces dark) |
| Merge to main | PR merged with **"Create a merge commit"** — never squash, or the upstream ancestry is lost |

## 1. Branch and base

1. `git remote add upstream https://github.com/jktrn/astro-erudite.git`, fetch.
2. On `erudite-v2`: `git merge 1ffdf62`, resolving conflicts by this rule:

| Path | Resolution |
|---|---|
| Template code: `src/components/**`, `src/layouts/**`, `src/lib/**`, `src/styles/**`, `src/pages/**` that exist upstream, `astro.config.ts`, `tsconfig.json`, `package.json`, `biome.json`, `src/content.config.ts`, `src/env.d.ts` | Upstream version |
| `public/static/**` (template assets: previews, logo, `1200x630.png`) | Upstream version; delete `twitter-card.png` and `logo.png` (unused template leftovers) |
| Our content: `src/content/blog/**`, `src/content/authors/vd.md`, `src/content/projects/production-grade-homelab.md`, `public/` favicons and `site.webmanifest`, `src/grammars/routeros.tmLanguage.json`, `src/pages/privacy.astro`, `src/pages/terms.astro`, `CLAUDE.md`, `docs/**` | Ours (ported in later commits) |
| Upstream demo content: `src/content/blog/introducing-v2/**`, `src/content/blog/v1-posts/**`, `src/content/authors/enscribe.md`, `src/content/projects/project-{a,b,c}.md`, `src/content/projects/placeholder.png` | Delete |
| v1-only code upstream removed: Tailwind components, `src/components/ui/**`, `src/components/react/**`, `src/lib/data-utils.ts`, `src/types.ts`, `src/styles/global.css`, `public/fonts/**` (Geist; v2 ships IBM Plex in `src/assets/fonts/`), `patches/**` | Delete |
| Our v1-only components: `BomPieChart.tsx`, `FeaturedProjects.astro` (unused), `TechStack.astro` (re-created in v2 style) | Delete |
| `bun.lock`, our v1 `package-lock.json` | Delete; regenerate `package-lock.json` with `npm install` |
| `README.md`, `LICENSE`, `.gitattributes` (never edited on our side) | Upstream version |
| `.gitignore` | Ours (superset of upstream's; adds `.claude/`, `.vscode/`, `posts/`) |
| `test-content/` (v1 reference posts that `CLAUDE.md` points to) | Replace with upstream's v2 demo content (`src/content/{blog,authors,projects}` → `test-content/`), so it stays a correct reference |

3. The merge commit is the first commit on the branch. Each porting step below is its own commit.

## 2. Content conversion

- `git mv` all 18 `src/content/blog/**/*.mdx` → `.md` (keeps history). Directory layout, `order`, `authors: ['vd']`, dates, and `./image.png` references are unchanged — v2's series reader uses the same parent `index.md` + sibling subpost layout.
- Remove all MDX `import` lines (18× `Callout`, 1× `BomPieChart`).
- Convert all 58 `<Callout title="X" variant="v">…</Callout>` to:

  ```markdown
  :::v[X]
  body (dedented)
  :::
  ```

  with this variant mapping:

  | v1 variant | Count | v2 variant |
  |---|---|---|
  | note | 13 | note |
  | warning | 14 | warning |
  | important | 9 | important |
  | tip | 4 | tip |
  | summary | 12 | note |
  | definition | 3 | note |
  | danger | 3 | caution |

  Done by script, then the full diff is reviewed by hand. v2 renders titled callouts as "Note (X)".
- BOM chart: replace `<BomPieChart client:load />` in `homelab-bom/post-sno.md` with `<bom-chart></bom-chart>` plus an inline `<script>` that defines it (guarded by `customElements.get`, since v2 re-runs body scripts on navigation). It renders an SVG doughnut with the same four slices and colours (Compute 14,180 PLN `#3266ad`, Network 3,964.90 `#c47a2a`, NICs 839.97 `#7c5cbf`, Storage 618 `#2a8a5a`), percentage labels, a legend ("name pct% — amount PLN"), and a hover tooltip, readable in both themes.
- Heading anchors: v2 namespaces subpost heading IDs (`#references` in `phase0.md` → `#phase0-references`). Update the one internal anchor link, `homelab-network-impl/phase0` line 97 (`](#references)`), to the ID that appears in the built HTML.
- Author `vd.md`: move `website`, `github`, `linkedin` into `socials: { website, github, linkedin }` (lowercase keys — v2's `AuthorCard` maps `website`/`github` to icons and shows a generic link icon for others); keep `name`, `avatar`, `mail`.
- Nothing else needs converting: no emoji shortcodes, no math, no `{…}` JSX expressions. `$VAR` and `<placeholder>` strings are all inside code, so they stay literal.

## 3. Pages and site pieces

- `src/consts.ts` in v2 shape:
  - `SITE`: title `sudops.pl`, current description, `locale: 'en-US'`, `dir: 'ltr'`, `defaultPageImage` and `defaultPostImage` both `/static/1200x630.png` (the OG image the site uses today).
  - `NAVIGATION`: Blog, Projects, Tags. `/authors` pages still build (upstream) but are not in the nav.
  - `SOCIALS`: GitHub, LinkedIn, Email (`mailto:root@sudoom.pl`), RSS. Add `src/assets/icons/linkedin.svg`.
- Sidebar logo: v2's `Sidebar.astro` inlines `src/assets/logo.svg` into every page, and both current SVG logos are 1–2.6 MB PNG wrappers, so neither can be used as-is. Replace `src/assets/logo.svg` with a small SVG that wraps the Great Wave mark (`public/favicon-96x96.png` scaled to 36 px — 2× the 18 px the sidebar renders — as base64). `Sidebar.astro` stays identical to upstream.
- Homepage `src/pages/index.astro`, v2 CSS conventions (scoped `<style>`, v2 spacing/type tokens, no Tailwind):
  1. Intro: "Vadzim Dziadziulia", "Navigator of Kubernetes Seas", current blurb.
  2. `src/components/HeroSea.astro` from `origin/main-page`, wrapper classes `overflow-hidden rounded-lg` replaced with scoped CSS.
  3. Tech stack chips (Kubernetes, OpenShift, Google Anthos, Terraform, Azure) with logos saved as SVG files under `src/assets/icons/tech/`.
  4. Latest 2 posts via v2's `BlogCard`, then a "See all posts →" link to `/blog`.
- Projects: v2's `/projects` page and `ProjectCard` unchanged; one entry (`production-grade-homelab.md`).
- Privacy and terms: same wording, rebuilt on v2's `Layout` + `MetaPage` + prose styling; Tailwind classes and `astro-icon` removed.
- Footer: v2's footer plus Privacy Policy and Terms links.
- Everything else as upstream ships it: blog index, post/series page, tags, 404, RSS, robots, sitemap (which drops subpost, tag, and author URLs; subposts carry a canonical link to their parent).

## 4. Config, docs, verification, rollout

### Config

- `astro.config.ts`: upstream's, plus `site: 'https://sudops.pl'`, `server: { port: 1234, host: true }`, `devToolbar: { enabled: false }`.
- `src/lib/expressive-code/config.ts`: add the RouterOS grammar to `shiki.langs` (`name: 'routeros'`, `scopeName: 'source.routeros'`).
- `package.json`: upstream's dependencies and scripts, installed with npm.

### Docs

Update `CLAUDE.md` for v2: stack, `.md` content, `:::variant[Title]` callouts and the variant list, series and heading-ID namespacing, custom elements instead of MDX components, Biome, how to pull upstream (`git fetch upstream && git merge upstream/main`, merge-commit PRs). Remove the MDX-only gotchas.

### Verification (before opening the PR)

1. `npm run build` passes.
2. URL parity: record the route list from a `main` build before starting; every route, plus `/rss.xml` and `/sitemap-index.xml`, exists in the new `dist/`.
3. Content check on `dist/`: 58 rendered callouts (`data-callout`), no leftover `<Callout` or literal `:::` text, RouterOS blocks highlighted (no unknown-language fallback in the build log).
4. Browser pass on the dev server: homepage (hero, chips, latest posts), scrolling a series (`/blog/homelab-design`) with the URL following along, BOM chart hover in light and dark, a RouterOS block, privacy and terms, phone width.
5. Push `erudite-v2`; Cloudflare Pages builds it automatically to **https://erudite-v2.sudops-pl.pages.dev/** — check it there.

### Rollout

Production is **https://sudops.pl**, deployed from `main`. PR `erudite-v2` → `main`, merged with "Create a merge commit". Production is unchanged until then.

## Out of scope

- Post dates (the migration is not a republish).
- Rewording or restructuring posts.
- Features beyond what v2 ships.
- The unrelated local changes on the working tree (`production-grade-homelab.md` edit, Hugo files).
