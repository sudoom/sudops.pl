# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Keep this file up to date as the project evolves.** When you add features, change structure, or learn something new about the codebase, update CLAUDE.md in the same commit — don't wait to be asked.

**If something isn't clear, ask — don't assume.** When a request, a draft, or the code leaves a decision open, ask the repo owner instead of guessing.

## Project Overview

Personal blog and portfolio site (sudops.pl) built on the **astro-erudite v2** template (Astro 7). Content is plain Markdown (`.md`) rendered by the Sätteri processor; styling is native CSS. There is no Tailwind, no UI framework, no React, and no MDX.

## Deployment

The site is hosted on **Cloudflare Pages**, connected directly to this repo. Every commit pushed to `main` triggers an automatic build and deploy. Results are live at **https://sudops.pl**. Every other pushed branch gets a preview at `https://<branch-name>.sudops-pl.pages.dev/`.

To build, commit, and deploy in one shot:
```
npm run build && git add <changed files> && git commit -m "your message" && git push origin main
```

Stage the files you changed by path — never `git add .` or `git add -A`. The working tree can hold untracked local files (e.g. a Hugo `themes/` checkout) that must not be committed.

You can verify the result at https://sudops.pl after the Cloudflare build completes. Cloudflare redirects URLs without a trailing slash (308); use `curl -L` or the `/`-ending URL when checking a page.

**Commit messages:** never add a Claude/AI attribution trailer (no `Co-Authored-By: Claude …`, no `🤖 Generated with…`). Keep messages plain and authored by the repo owner.

## Commands

- `npm run dev` — Start dev server on port 1234. Astro 7 runs it in the background and returns immediately — stop it with `npx astro dev stop` (logs: `npx astro dev logs`), or it keeps holding the port.
- `npm run build` — Type-check (`astro check`) then build
- `npm run preview` — Preview production build
- `npx biome format --write <files>` — Format the files you changed with Biome. Don't run `npm run format` on the whole repo: it rewrites upstream files (merge noise).

## Upstream template

This repo is a real git fork of [jktrn/astro-erudite](https://github.com/jktrn/astro-erudite) (shared history). To pull upstream changes:

```
git remote add upstream https://github.com/jktrn/astro-erudite.git   # once
git fetch upstream
git switch -c upstream-sync origin/main
git merge upstream/main
```

Before committing the merge:

- **`bun.lock`:** upstream ships bun's lockfile; this repo uses npm. Resolve its conflict with `git rm bun.lock`.
- **Lockfile:** run `npm install` and commit the updated `package-lock.json`. Cloudflare installs with `npm ci`, which fails when `package.json` and the lockfile disagree.
- **New demo content:** run `git diff --cached --name-status HEAD -- src/content`. Anything upstream added there is demo content — move it to `test-content/` (keeps the reference current) or delete it; otherwise it goes live on sudops.pl.
- **Conflicts in files we customized:** keep our version and re-apply the upstream change by hand if it matters. These upstream files carry sudops edits: `src/consts.ts`, `astro.config.ts`, `src/lib/expressive-code/config.ts`, `src/pages/index.astro`, `src/components/Footer.astro`, `src/styles/color.css` (palette tokens), `src/components/MetaHead.astro` (`theme-color`), `src/assets/logo.svg`, the `public/` favicons and `site.webmanifest`, `.gitignore`.
- Run `npm run build` before opening the PR.

Merge PRs that bring in upstream history with **"Create a merge commit"**, never squash. Squashing drops the upstream parent, and the next sync then conflicts everywhere. Keep upstream files (components, layouts, `src/lib`, `src/styles`) as close to upstream as possible; site-specific code lives in the files listed under "Site-specific files".

## Architecture

**Path alias:** `@/*` maps to `./src/*`

### Content System (`src/content/`)
- **Blog posts** (`blog/`): `.md` files. The loader glob is `**/[^_]*.md`: `.mdx` is not collected, and a leading `_` hides a file. Frontmatter: title, description, date, tags, authors (required, references `authors/`), image, draft, order.
- **Series** (subposts): a folder with `index.md` (the parent) and sibling `.md` subposts ordered by `order`. Every URL in a series renders the whole series as one scrolling page, and the address bar follows the article being read. Subpost heading IDs are prefixed with the subpost file name (`## References` in `phase0.md` → `#phase0-references`), so in-post anchor links must use the prefixed ID.
- **Authors** (`authors/`): `vd.md`. `socials` is a record; the keys `website` and `github` get icons, other keys get a generic link icon.
- **Projects** (`projects/`): name, description, link, tags, image, startDate, endDate.

Content schemas are defined in `src/content.config.ts`.

### Key Files
- `src/consts.ts` — `SITE`, `NAVIGATION` (sidebar links), `SOCIALS` (footer icons)
- `src/lib/content.ts` — content queries (`getPosts`, `getSubposts`, `getTags`)
- `src/lib/callout.ts`, `src/lib/expressive-code/`, `src/lib/heading-*.ts`, `src/lib/math.ts`, `src/lib/external-links.ts` — Sätteri plugins
- `src/lib/expressive-code/config.ts` — code block settings, including the custom RouterOS grammar (`src/grammars/routeros.tmLanguage.json`)
- `src/styles/` — native CSS design system (tokens in `fonts.css`, `color.css`, `shape.css`, `layout.css`)
- `astro.config.ts` — site URL, dev port, Sätteri processor and plugin list

### Site-specific files (not from upstream)
- `src/pages/index.astro` — homepage: intro, tech stack chips, latest 2 posts
- `src/components/Footer.astro` — upstream footer plus Privacy/Terms links
- `src/pages/privacy.astro`, `src/pages/terms.astro`
- `src/assets/logo.svg` (Great Wave mark), `src/assets/icons/linkedin.svg`, `src/assets/icons/tech/*.svg`
- `src/grammars/routeros.tmLanguage.json`
- Upstream files with sudops edits are listed under "Upstream template" — keep ours when they conflict.

### Styling
- Native CSS with custom properties. Components use scoped `<style>` blocks and custom element names (`<prose-content>`, `<entry-info>`, …) instead of utility classes.
- Use the tokens: spacing `--space-*`, type scale `--step-*`, radii `--radius-*`, colours `--foreground`, `--muted-foreground`, `--background`, `--muted`, `--border`.
- Palette: the colour tokens in `src/styles/color.css` hold the sudops "Ayvazovskyi" palette (Day `#f0f9ff` / Night deep sea blue `#0b1026`, teal `--primary`) instead of upstream's greys. Change colours there, not per component.
- Light/dark follows the system setting; the sidebar toggle overrides it via `data-theme` on `<html>`.

### Blog Structure

The blog is a homelab series. Posts use a parent/subpost pattern where topics with multiple parts get a parent `index.md` (overview + callout listing subposts) and individual subpost `.md` files with `order` frontmatter:

- `homelab-why/` — Standalone post (why this project)
- `homelab-design/` — Parent + subposts: `compute.md`, `network.md`, `storage.md`
- `homelab-bom/` — Parent + subposts: `pre-validation.md`, `post-sno.md`
- `homelab-network-impl/` — Parent + subposts: `phase0.md`, post-SNO *(future)*
- `homelab-validation/` — Parent + subposts: `hardware.md`, `sno.md`
- `homelab-day1/` — Standalone post (OKD 3-node cluster installation)
- `homelab-day2/` — Parent + subposts: `bootstrap.md`, `cert-manager.md`, `storage-network.md`, rook-ceph *(future)*

When converting raw drafts to Markdown:
- Strip social media drafts (LinkedIn/Slack/Reddit) from the end
- Callouts are directives: `:::note[Title]` … `:::` (title optional; `:::note{closed}` starts collapsed). Variants: `note`, `tip`, `warning`, `caution`, `important`. They render as "Note (Title)".
- Interactive pieces are custom elements with an inline `<script>` in the `.md` (see `<bom-chart>` in `homelab-bom/post-sno.md`). Always guard with `if (!customElements.get("name"))` — `define` throws if the name is already registered (e.g. if view transitions are ever enabled).
- Use ` ```routeros ` for MikroTik/RouterOS config blocks, `bash` for pure shell commands, plain ` ``` ` for terminal output with prompts
- Images go in the same directory as the post, referenced with `./filename.png`
- Use first person ("I"), never "we" — this is a personal blog
- **Post `date` is the publish date, not the narrative date.** When a draft goes live, set its `date` (and each subpost's) to the day it's published — current date, not when the work happened. Bump stale dates right before merging (see the `chore: update … post date` commits). Subpost sequence is held by the `order` field, so same-day dates across a batch are fine.
- Keep prose tight and conversational. Avoid textbook-style explanations — assume the reader has context. If something can be said in one sentence, don't use three.
- Prefer simple words over fancy ones (e.g. "leftovers" not "remnants", "locked down" not "walled garden", "can't be changed" not "immutable", "removes" not "eliminates")
- Summary diagrams (e.g. `hwvalidation.png`, `snovalidation.png`) go after the go/no-go table at the end of validation posts, before "What's next"

### Pages
- `/` — homepage
- `/blog` — all posts on one page (no pagination)
- `/blog/<post>` and `/blog/<post>/<subpost>` — posts and series
- `/projects` — project portfolio
- `/tags`, `/tags/<tag>` — tag index
- `/authors`, `/authors/vd` — built but not in the nav
- `/privacy`, `/terms` — linked from the footer

### Raw Blog Post Drafts

Raw/unformatted post drafts are stored in `posts/*.md` (gitignored). These need to be formatted (proper frontmatter, directives, etc.) and moved to `src/content/blog/` before they go live.

### Reference Content (`test-content/`)

`test-content/` holds upstream astro-erudite v2's demo content. **Always use it as a reference** when creating new content:
- `test-content/blog/introducing-v2/index.md` — every Markdown feature v2 supports (callouts, code blocks, math, custom elements)
- `test-content/blog/v1-posts/` — a series (parent `index.md` + subposts)
- `test-content/authors/`, `test-content/projects/` — frontmatter formats

### Formatting
Biome (`biome.json`, from upstream): double quotes, no semicolons, 2-space indent, 80 columns. It formats `.ts`, `.astro` and `.json`; Markdown is not formatted. Run it only on the files you changed (`npx biome format --write <files>`).

## Source material — homelab repo + vault

This blog documents a real homelab. When writing or updating a post, the canonical source material lives in two companion repos (read access whitelisted in `.claude/settings.local.json` — kept there, gitignored, so the local paths stay out of this public repo).

### Homelab GitOps repo — `/Users/vadzimdziadziulia-laptop/Projects/homelab` ([sudoom/homelab](https://github.com/sudoom/homelab))

- **`blog/*-draft.md`** — session working notes / draft posts written *as the work happened*. **These are the upstream raw material.** The `posts/*.md` raw drafts in THIS repo derive from them. When a relevant draft exists there, start from it rather than re-deriving the chronology.
- **Actual manifests / Helm values / `README.md` / `CLAUDE.md`** — **ground truth** for commands, version pins, file paths, sync-wave order. Verify technical claims against the real repo, not memory (e.g. OKD version, cert-manager version, Helm values, node IPs). The repo's own `CLAUDE.md` "Stack and tool versions" table is the version source of truth.
- **`bugs/*.md`** — drafted upstream issues; good material for "here's a bug I hit" post sections.

### Obsidian vault — `/Users/vadzimdziadziulia-laptop/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notatki`

- **`_memory/chats/homelab/`** — the **decision rationale / "why"** behind the homelab choices (NAS build, Ceph drive selection, network design, Syno→TrueNAS migration). Mine these for the narrative/why sections that the dry repo configs don't capture.
- **`Infrastructure/Homelab.md`** (operating state: IP/VLAN/rack) and **`wiki/domains/Homelab.md`** (concept/entity hub).

### Pipeline

```
homelab/blog/*-draft.md   →   sudops.pl/posts/*.md   →   sudops.pl/src/content/blog/*.md
(raw session chronology)      (gitignored raw draft)     (published, formatted Markdown)
vault/_memory/chats/homelab/  ──(the "why")──┘
```

### Guardrails

- **Don't publish secrets.** Drafts may reference tokens/keys/internal IPs the homelab `CLAUDE.md` "Blog notes" rule flags as not-for-commit. Reference them by name; never paste real credentials or kubeconfigs into a post.
- Keep the existing post conventions (first person, tight prose, `routeros` code fences, `:::` callouts).

## Ending a session ("call it")

On "call it", "wrap up", "end of session" or similar, run these before saying goodbye, then end with a one-paragraph ledger (commits, branch and push state, anything flagged). Report findings; fix only what the session itself changed, and ask before touching anything else.

1. **Build.** `npm run build` (runs `astro check`, then builds) must pass. A failure blocks the goodbye.
2. **Docs drift.** "Blog Structure" above must match `ls src/content/blog/` and each series' subposts, and "Key Files" / "Site-specific files" must still exist. Update this file in the same commit as the change that made it stale.
3. **Draft pipeline report.** List the homelab drafts that changed recently, and say which have material with no post in `posts/` or `src/content/blog/` yet. Report only — don't write posts unasked.
   ```
   git -C /Users/vadzimdziadziulia-laptop/Projects/homelab log --since="14 days ago" --name-only --format= -- 'blog/*-draft.md' | sort | uniq -c | sort -rn
   ```
4. **Hygiene.**
   - `git status --short`: list uncommitted and untracked files. Flag local leftovers (`themes/`, `.hugo_build.lock`, `.gitmodules` from the Hugo era) — never delete or stage them, and never `git add .`.
   - Secret scan of content changed on the branch or in the working tree:
     ```
     { git diff --name-only --diff-filter=d origin/main...HEAD -- src/content; git diff --name-only --diff-filter=d -- src/content; } | sort -u \
       | xargs grep -n -i -E 'BEGIN [A-Z ]*PRIVATE KEY|(api[_-]?key|token|password|secret)[[:space:]]*[:=][[:space:]]*[^[:space:]<]{8,}|client-certificate-data|client-key-data'
     ```
     Known false positive: the installer's placeholder `pullSecret: '{"auths":{"fake":…}}'` in `homelab-day1/index.md` and `homelab-validation/sno.md`.
   - Stale dates: new posts on a branch headed for `main` need today's `date` (see "Blog Structure"). List them with `git diff --name-only --diff-filter=A origin/main...HEAD -- src/content/blog | xargs grep -H -m1 '^date:'`. Until v2 merges, this also lists `homelab-bom`, `homelab-day2` and `homelab-design`: they were `index.mdx` on `main`, so the `.mdx` → `.md` conversion shows as an add. Those are existing posts and keep their dates.
   - Push state: `git status -sb | head -1`. Anything unpushed on `main` is not live yet.
