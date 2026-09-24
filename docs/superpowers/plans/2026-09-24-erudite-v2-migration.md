# astro-erudite v2 Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move sudops.pl from its customized astro-erudite v1.6.x fork onto upstream astro-erudite v2 (Astro 7, Sätteri Markdown, native CSS) through a real git merge, keeping every post, image, and live URL.

**Architecture:** Merge upstream commit `1ffdf62` into branch `erudite-v2`, taking upstream's version of all template code and keeping our content. Then port each customization in its own commit: site identity, post conversion (`.mdx` → `.md`, `<Callout>` → `:::` directives), the BOM chart as a custom element, and the homepage. A one-off verification script checks the built `dist/` against a baseline route list taken from the v1 site before anything changes.

**Tech Stack:** Astro 7, `@astrojs/markdown-satteri`, `satteri-expressive-code`, native CSS, Biome, npm, Node ≥ 22.12, Cloudflare Pages.

**Spec:** `docs/superpowers/specs/2026-09-24-erudite-v2-migration-design.md`

## Global Constraints

- Work only on branch `erudite-v2` in `/Users/vadzimdziadziulia-laptop/Projects/sudops.pl`. Never commit to or push `main`.
- Upstream commit: `1ffdf62bfd1c4dfc0fa770a0442b8545908689e7` from `https://github.com/jktrn/astro-erudite.git` (remote name `upstream`).
- Package manager: npm. No `bun.lock` in the tree.
- Stage explicit paths only — never `git add -A`, `git add .`, or `git commit -a`. The working tree holds unrelated changes that must stay uncommitted: modified `src/content/projects/production-grade-homelab.md`, untracked `.gitmodules`, `.hugo_build.lock`, `themes/`.
- Commit messages: plain, no `Co-Authored-By` or "Generated with" trailers (repo `CLAUDE.md` rule).
- Code style for new `.ts`/`.astro`: double quotes, no semicolons, 2-space indent (upstream Biome config).
- Don't change post dates, post wording, or upstream component files except where a task says so.
- Callout variant mapping: note→note, warning→warning, important→important, tip→tip, summary→note, definition→note, danger→caution.
- Production is https://sudops.pl (deploys from `main`). Pushing `erudite-v2` deploys a preview to https://erudite-v2.sudops-pl.pages.dev/.
- The final PR must be merged with **"Create a merge commit"**, never squash.

## Review Focus

1. **Deep link into a series:** opening `/blog/homelab-design/network` directly should land on the Network subpost, and scrolling should update the URL and title. Checked in Task 8's browser pass.
2. **Callout bodies that contain lists or code:** after dedenting, a callout holding a bullet list must render a real `<ul>`, not a paragraph starting with `- `. Pinned by the `callouts` check (Task 1 script, asserted in Task 4).
3. **BOM chart in dark mode and after navigating away and back:** tooltip and labels readable in both themes; no `customElements.define` error when the page is revisited. Checked in Task 8's browser pass.
4. **Phone width:** no horizontal scroll on the homepage (hero SVG, tech chips) or on a series page; the sidebar collapses to a top bar. Checked in Task 8.
5. **Light theme:** the dark HeroSea illustration, tech logos, and callout colours stay legible on a light background. Checked in Task 8.

---

### Task 1: Baseline routes and verification script

**Files:**
- Create: `scripts/v2-migration/baseline-routes.txt`
- Create: `scripts/v2-migration/verify.mjs`

**Interfaces:**
- Produces: `node scripts/v2-migration/verify.mjs` prints `PASS <group>` or `FAIL <group>` plus details for the groups `routes`, `callouts`, `leftovers`, `routeros`, `anchor`, `bom`, `home`, `identity`, and exits 1 if any group fails. Every later task runs it after `npm run build` and names the groups that must pass.

- [ ] **Step 1: Confirm the starting state**

Run:
```bash
cd /Users/vadzimdziadziulia-laptop/Projects/sudops.pl
git switch erudite-v2
git log --oneline -3
```
Expected: branch `erudite-v2`, top commits are the spec commits (`docs: …`), then `92b643a chore: remove Brevo newsletter integration (#13)`.

- [ ] **Step 2: Build the current v1 site**

Run: `npm run build`
Expected: ends with `[build] Complete!`.

- [ ] **Step 3: Record the baseline route list**

Run:
```bash
mkdir -p scripts/v2-migration
( cd dist && find . -name index.html | sed -e 's|^\.||' -e 's|/index\.html$||' -e 's|^$|/|' ; ls *.xml *.txt | sed 's|^|/|' ) | sort > scripts/v2-migration/baseline-routes.txt
cat scripts/v2-migration/baseline-routes.txt
```
Expected: about 40 lines, including `/`, `/blog`, `/blog/homelab-bom`, `/blog/homelab-network-impl/phase0`, `/privacy`, `/projects`, `/tags/okd`, `/terms`, `/robots.txt`, `/rss.xml`, `/sitemap-index.xml`. No `/blog/2`.

- [ ] **Step 4: Write the verification script**

Create `scripts/v2-migration/verify.mjs`:

```js
// One-off checks for the astro-erudite v2 migration. Run after `npm run build`:
//   node scripts/v2-migration/verify.mjs
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

const DIST = "dist"
const read = (path) => readFileSync(join(DIST, path), "utf8")
const page = (route) => read(join(route, "index.html"))

const routes = readFileSync("scripts/v2-migration/baseline-routes.txt", "utf8")
  .split("\n")
  .filter(Boolean)
// Every URL of a series renders the whole series, so checking only the
// top-level post URLs sees each post exactly once.
const parents = routes.filter((route) => /^\/blog\/[^/]+$/.test(route))
const VARIANTS = ["note", "tip", "warning", "caution", "important"]

const groups = {
  routes() {
    return routes
      .filter((route) => {
        const file = /\.(xml|txt)$/.test(route)
          ? route
          : join(route, "index.html")
        return !existsSync(join(DIST, file))
      })
      .map((route) => `missing ${route}`)
  },

  callouts() {
    const errors = []
    let total = 0
    for (const route of parents) {
      const html = page(route)
      for (const [, variant] of html.matchAll(/data-callout="([^"]+)"/g)) {
        total++
        if (!VARIANTS.includes(variant))
          errors.push(`${route}: unknown callout variant ${variant}`)
      }
      for (const chunk of html.split('data-callout="').slice(1)) {
        const body = chunk.slice(0, chunk.indexOf("</details>"))
        if (/<p>(- |\d+\. )/.test(body))
          errors.push(`${route}: a callout list rendered as plain text`)
      }
    }
    if (total !== 58) errors.push(`expected 58 callouts, found ${total}`)
    return errors
  },

  leftovers() {
    const errors = []
    const needles = [
      "&lt;Callout",
      "<Callout",
      "import Callout",
      ":::",
      "client:load",
      "BomPieChart",
    ]
    for (const route of parents) {
      const html = page(route)
      for (const needle of needles)
        if (html.includes(needle)) errors.push(`${route}: contains ${needle}`)
    }
    return errors
  },

  routeros() {
    const errors = []
    let blocks = 0
    for (const route of parents) {
      const chunks = page(route).split('data-language="routeros"').slice(1)
      for (const chunk of chunks) {
        blocks++
        const block = chunk.slice(0, chunk.indexOf("</pre>"))
        const colors = new Set(block.match(/--0:#[0-9a-fA-F]{3,8}/g))
        if (colors.size < 2)
          errors.push(`${route}: RouterOS block #${blocks} is not highlighted`)
      }
    }
    if (blocks !== 19) errors.push(`expected 19 RouterOS blocks, found ${blocks}`)
    return errors
  },

  anchor() {
    const html = page("/blog/homelab-network-impl")
    const errors = []
    if (!html.includes('id="phase0-references"'))
      errors.push("no heading with id phase0-references")
    if (!html.includes('href="#phase0-references"'))
      errors.push("no link to #phase0-references")
    if (html.includes('href="#references"'))
      errors.push("stale link to #references")
    return errors
  },

  bom() {
    const html = page("/blog/homelab-bom")
    const errors = []
    if (!html.includes("<bom-chart")) errors.push("no <bom-chart> element")
    if (!/customElements\.define\(\s*"bom-chart"/.test(html))
      errors.push("bom-chart is never defined")
    return errors
  },

  home() {
    const html = page("/")
    const errors = []
    const needles = [
      "Vadzim Dziadziulia",
      "Navigator of Kubernetes Seas",
      'aria-label="Navigator of Kubernetes Seas — animated hero illustration',
      "Kubernetes",
      "Openshift",
      "Google Anthos",
      "Terraform",
      "Azure",
      "See all posts",
    ]
    for (const needle of needles)
      if (!html.includes(needle)) errors.push(`homepage lacks ${needle}`)
    for (const needle of ["astro-erudite", "enscribe"])
      if (html.includes(needle)) errors.push(`homepage mentions ${needle}`)
    const cards = html.match(/<entry-info/g)?.length ?? 0
    if (cards !== 2) errors.push(`homepage shows ${cards} posts, expected 2`)
    return errors
  },

  identity() {
    const errors = []
    const home = page("/")
    if (!home.includes("<title>sudops.pl</title>"))
      errors.push("homepage <title> is not sudops.pl")
    for (const needle of ['href="/privacy"', 'href="/terms"', 'aria-label="LinkedIn"'])
      if (!home.includes(needle)) errors.push(`footer lacks ${needle}`)
    if (!read("robots.txt").includes("https://sudops.pl/sitemap-index.xml"))
      errors.push("robots.txt does not point at https://sudops.pl")
    if (!read("rss.xml").includes("<title>sudops.pl</title>"))
      errors.push("rss.xml title is not sudops.pl")
    const privacy = page("/privacy")
    if (!privacy.includes("Cloudflare") || privacy.includes("Brevo"))
      errors.push("privacy page content is wrong")
    if (!existsSync(join(DIST, "authors/vd/index.html")))
      errors.push("no /authors/vd page")
    else if (!page("/authors/vd").includes("https://github.com/sudoom"))
      errors.push("/authors/vd lacks the GitHub link")
    return errors
  },
}

let failed = false
for (const [name, run] of Object.entries(groups)) {
  let errors
  try {
    errors = run()
  } catch (error) {
    errors = [`crashed: ${error.message}`]
  }
  console.log(`${errors.length ? "FAIL" : "PASS"} ${name}`)
  for (const error of errors) console.log(`  - ${error}`)
  if (errors.length) failed = true
}
process.exit(failed ? 1 : 0)
```

- [ ] **Step 5: Run it against the v1 build**

Run: `node scripts/v2-migration/verify.mjs`
Expected: exit code 1. `PASS routes`; `FAIL callouts` (0 `data-callout`), `FAIL anchor`, `FAIL bom`, `FAIL home`. The other groups may pass or fail on v1; they are asserted in later tasks.

- [ ] **Step 6: Commit**

```bash
git add scripts/v2-migration/baseline-routes.txt scripts/v2-migration/verify.mjs
git commit -m "chore: add v2 migration baseline routes and verify script"
```

---

### Task 2: Merge upstream astro-erudite v2

**Files:**
- Merge: every template file from upstream `1ffdf62`
- Delete: v1-only files (exact list in Step 4)
- Replace: `test-content/` with upstream's v2 demo content
- Rewrite: `src/pages/privacy.astro`, `src/pages/terms.astro` (so the merge commit builds)
- Regenerate: `package-lock.json`

**Interfaces:**
- Consumes: `scripts/v2-migration/verify.mjs` (Task 1).
- Produces: upstream v2 tree with our content. `src/consts.ts` still has upstream values (fixed in Task 3). Posts are still `.mdx`, so v2's loader ignores them until Task 4.

- [ ] **Step 1: Add the upstream remote and fetch**

```bash
git remote add upstream https://github.com/jktrn/astro-erudite.git
git fetch upstream
git cat-file -t 1ffdf62bfd1c4dfc0fa770a0442b8545908689e7
```
Expected: last command prints `commit`.

- [ ] **Step 2: Start the merge (conflicts are expected)**

```bash
git merge --no-ff --no-commit 1ffdf62bfd1c4dfc0fa770a0442b8545908689e7 || true
```
Expected: `Automatic merge failed; fix conflicts…`, about 60 conflicted paths.

- [ ] **Step 3: Take upstream for every upstream path, then restore ours**

```bash
git checkout 1ffdf62bfd1c4dfc0fa770a0442b8545908689e7 -- .
git checkout HEAD -- .gitignore public/favicon.ico public/favicon.svg public/favicon-96x96.png public/apple-touch-icon.png public/web-app-manifest-192x192.png public/web-app-manifest-512x512.png public/site.webmanifest
```

- [ ] **Step 4: Replace test-content and delete v1-only and demo files**

```bash
git rm -r -q -f test-content
rm -rf test-content
mkdir -p test-content
git archive 1ffdf62bfd1c4dfc0fa770a0442b8545908689e7 src/content | tar -x -C test-content --strip-components=2
git add test-content
git rm -r -q -f --ignore-unmatch -- package-lock.json bun.lock components.json patches public/fonts public/static/logo.png public/static/twitter-card.png src/components/BomPieChart.tsx src/components/Breadcrumbs.astro src/components/Callout.astro src/components/Favicons.astro src/components/FeaturedProjects.astro src/components/Head.astro src/components/Header.astro src/components/Link.astro src/components/PageHead.astro src/components/PostHead.astro src/components/PostNavigation.astro src/components/react src/components/SubpostsHeader.astro src/components/SubpostsSidebar.astro src/components/TechStack.astro src/components/TOCHeader.astro src/components/TOCSidebar.astro src/components/ui src/env.d.ts src/lib/data-utils.ts "src/pages/blog/[...page].astro" src/styles/global.css src/types.ts src/content/blog/introducing-v2 src/content/blog/v1-posts src/content/blog/mobile-nav-and-subposts src/content/blog/rehype-patch src/content/blog/the-state-of-static-blogs src/content/authors/enscribe.md src/content/projects/project-a.md src/content/projects/project-b.md src/content/projects/project-c.md src/content/projects/placeholder.png
```

- [ ] **Step 5: Check the resolved tree**

```bash
echo "unmerged: $(git diff --name-only --diff-filter=U | wc -l)"
comm -23 <(git ls-files | sort -u) <(git ls-tree -r --name-only 1ffdf62bfd1c4dfc0fa770a0442b8545908689e7 | sort) | grep -vE '^src/content/blog/homelab-|^test-content/'
echo "homelab files: $(git ls-files 'src/content/blog/homelab-*' | wc -l)"
ls test-content
```
Expected:
- `unmerged: 0`.
- Files on our side only: `CLAUDE.md`, the spec and plan under `docs/superpowers/`, `scripts/v2-migration/baseline-routes.txt`, `scripts/v2-migration/verify.mjs`, `src/content/authors/vd.md`, `src/content/projects/production-grade-homelab.md`, `src/grammars/routeros.tmLanguage.json`, `src/pages/privacy.astro`, `src/pages/terms.astro`.
- `homelab files: 80`.
- `test-content` contains `authors blog projects`.

- [ ] **Step 6: Rewrite the privacy page for v2**

Overwrite `src/pages/privacy.astro` (same wording as today, v2 layout, no Tailwind):

```astro
---
import MetaPage from "@/components/MetaPage.astro"
import { SITE, SOCIALS } from "@/consts"
import Layout from "@/layouts/Layout.astro"

const contactEmail = SOCIALS.find(
  ({ label }) => label === "Email",
)!.href.replace("mailto:", "")
const lastUpdated = new Date().toLocaleDateString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
})
---

<Layout crumbs={[{ label: "Privacy Policy", href: "/privacy" }]}>
  <MetaPage slot="head" title="Privacy Policy" />
  <prose-content>
    <h1>Privacy Policy</h1>
    <p>Last updated: {lastUpdated}</p>

    <h2>Introduction</h2>
    <p>
      At {SITE.title}, I respect your privacy and am committed to protecting
      your personal data. This privacy policy explains how I collect, use, and
      safeguard your information when you visit this website.
    </p>

    <h2>Data Controller</h2>
    <p>
      <strong>{SITE.title}</strong><br />
      Email: <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
    </p>

    <h2>Information I Collect</h2>
    <h3>Hosting (Cloudflare Pages)</h3>
    <p>
      This website is hosted on <strong>Cloudflare Pages</strong>. Cloudflare
      may collect:
    </p>
    <ul>
      <li>IP address</li>
      <li>Browser information</li>
      <li>Pages visited</li>
    </ul>
    <p>
      For more information, review
      <a
        href="https://www.cloudflare.com/privacypolicy/"
        target="_blank"
        rel="noopener noreferrer">Cloudflare's Privacy Policy</a
      >.
    </p>

    <h2>Cookies</h2>
    <p>
      This website uses minimal cookies for essential functionality only (theme
      preference). No tracking cookies or third-party analytics are used.
    </p>

    <h2>Your Rights (GDPR)</h2>
    <p>
      Under the General Data Protection Regulation (GDPR), you have the
      following rights:
    </p>
    <ul>
      <li>
        <strong>Right to access:</strong> Request a copy of the personal data I
        hold about you
      </li>
      <li>
        <strong>Right to rectification:</strong> Request correction of inaccurate
        data
      </li>
      <li>
        <strong>Right to erasure:</strong> Request deletion of your personal data
      </li>
      <li>
        <strong>Right to restrict processing:</strong> Request limitation of how
        I process your data
      </li>
      <li>
        <strong>Right to data portability:</strong> Request your data in a
        structured format
      </li>
      <li>
        <strong>Right to object:</strong> Object to processing of your personal
        data
      </li>
      <li>
        <strong>Right to withdraw consent:</strong> Withdraw consent at any time
      </li>
    </ul>
    <p>
      To exercise any of these rights, contact me at
      <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
    </p>

    <h2>Data Security</h2>
    <p>
      I implement appropriate technical and organizational measures to protect
      your personal data against unauthorized access, alteration, disclosure, or
      destruction. However, no method of transmission over the Internet is 100%
      secure.
    </p>

    <h2>Third-Party Services</h2>
    <p>
      This website uses the following third-party services that may process
      your personal data:
    </p>
    <ul>
      <li>
        <strong>Cloudflare:</strong> Hosting and CDN —
        <a
          href="https://www.cloudflare.com/privacypolicy/"
          target="_blank"
          rel="noopener noreferrer">Privacy Policy</a
        >
      </li>
    </ul>

    <h2>Changes to This Policy</h2>
    <p>
      I may update this privacy policy from time to time. Changes will be posted
      on this page with an updated "Last updated" date.
    </p>

    <h2>Contact</h2>
    <p>
      If you have any questions about this privacy policy or wish to exercise
      your rights:
    </p>
    <p>
      <strong>Email:</strong>
      <a href={`mailto:${contactEmail}`}>{contactEmail}</a><br />
      I aim to respond to all inquiries within 30 days.
    </p>
  </prose-content>
</Layout>
```

- [ ] **Step 7: Rewrite the terms page for v2**

Overwrite `src/pages/terms.astro`:

```astro
---
import MetaPage from "@/components/MetaPage.astro"
import { SITE, SOCIALS } from "@/consts"
import Layout from "@/layouts/Layout.astro"

const contactEmail = SOCIALS.find(
  ({ label }) => label === "Email",
)!.href.replace("mailto:", "")
const lastUpdated = new Date().toLocaleDateString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
})
---

<Layout crumbs={[{ label: "Terms & Conditions", href: "/terms" }]}>
  <MetaPage slot="head" title="Terms & Conditions" />
  <prose-content>
    <h1>Terms &amp; Conditions</h1>
    <p>Last updated: {lastUpdated}</p>

    <h2>Acceptance of Terms</h2>
    <p>
      By accessing and using {SITE.title}, you accept and agree to be bound by
      these Terms &amp; Conditions. If you do not agree with any part of these
      terms, you must not use this website.
    </p>

    <h2>Use of Website</h2>
    <p>You may use this website for lawful purposes only. You agree not to:</p>
    <ul>
      <li>
        Use the website in any way that violates applicable laws or regulations
      </li>
      <li>Attempt to gain unauthorized access to any part of the website</li>
      <li>Transmit any malicious code, viruses, or harmful data</li>
      <li>Interfere with or disrupt the website's operation</li>
      <li>Use automated systems to scrape or collect data without permission</li>
    </ul>

    <h2>Intellectual Property</h2>
    <p>
      All content on this website, including but not limited to text, graphics,
      logos, images, and software, is the property of {SITE.title} or its content
      suppliers and is protected by copyright and other intellectual property
      laws.
    </p>
    <p>You may:</p>
    <ul>
      <li>Read and view content for personal, non-commercial use</li>
      <li>Share links to articles</li>
      <li>Quote brief excerpts with proper attribution</li>
    </ul>
    <p>You may not:</p>
    <ul>
      <li>Reproduce, distribute, or republish content without permission</li>
      <li>Use content for commercial purposes without authorization</li>
      <li>Remove copyright notices or attribution</li>
    </ul>

    <h2>Disclaimer of Warranties</h2>
    <p>
      The information on this website is provided "as is" without warranties of
      any kind, either express or implied. We do not warrant that:
    </p>
    <ul>
      <li>The website will be available at all times</li>
      <li>The information is accurate, complete, or current</li>
      <li>The website will be free from errors or viruses</li>
    </ul>

    <h2>Limitation of Liability</h2>
    <p>
      To the fullest extent permitted by law, {SITE.title} and its operators shall
      not be liable for any indirect, incidental, special, consequential, or
      punitive damages, or any loss of profits or revenues, whether incurred
      directly or indirectly, or any loss of data, use, goodwill, or other
      intangible losses resulting from your use of the website.
    </p>

    <h2>Third-Party Links</h2>
    <p>
      This website may contain links to third-party websites. We are not
      responsible for the content, privacy policies, or practices of these
      external sites. Your use of third-party websites is at your own risk.
    </p>

    <h2>Modifications</h2>
    <p>
      We reserve the right to modify these Terms &amp; Conditions at any time.
      Changes will be effective immediately upon posting on this page. Your
      continued use of the website after changes are posted constitutes
      acceptance of the modified terms.
    </p>

    <h2>Governing Law</h2>
    <p>
      These Terms &amp; Conditions are governed by and construed in accordance
      with applicable laws. Any disputes arising from these terms shall be
      subject to the exclusive jurisdiction of the appropriate courts.
    </p>

    <h2>Contact Information</h2>
    <p>
      If you have any questions about these Terms &amp; Conditions, please
      contact us:
    </p>
    <p>
      <strong>Email:</strong>
      <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
    </p>
  </prose-content>
</Layout>
```

- [ ] **Step 8: Install dependencies with npm**

```bash
rm -rf node_modules
npm install
```
Expected: creates `package-lock.json`, no errors. `ls bun.lock` fails (no such file).

- [ ] **Step 9: Build and verify**

Run: `npm run build && node scripts/v2-migration/verify.mjs`
Expected: `astro check` reports 0 errors and the build completes. Verify exits 1: `FAIL routes` lists only `/blog/homelab-*` and `/tags/*` routes, because posts are still `.mdx`, which v2 ignores. `/privacy`, `/terms`, `/projects`, `/`, `/rss.xml` and `/robots.txt` are not listed as missing.
If `astro check` reports errors inside `themes/`: those are the user's untracked Hugo files. Stop and report; don't delete them.

- [ ] **Step 10: Commit the merge**

```bash
git add src/pages/privacy.astro src/pages/terms.astro package-lock.json
git status --short | grep -vE '^(M |A |D |R )' 
git commit -m "Merge astro-erudite v2 (upstream 1ffdf62) into sudops.pl"
git log --oneline --graph -3
```
Expected: the `grep` shows only ` M src/content/projects/production-grade-homelab.md` and the untracked `?? .gitmodules`, `?? .hugo_build.lock`, `?? themes/`, which stay out of the commit. The graph shows a merge commit with two parents.

---

### Task 3: Site identity and config

**Files:**
- Modify: `src/consts.ts`, `astro.config.ts`, `src/components/Footer.astro`, `src/content/authors/vd.md`
- Create: `src/assets/icons/linkedin.svg`
- Replace: `src/assets/logo.svg`

**Interfaces:**
- Consumes: v2 `SocialIcons` (`links: { href, label, icon: SvgComponent }[]`), v2 `AuthorCard` (maps `socials` keys `website`, `github`, `twitter` to icons).
- Produces: `SITE`, `NAVIGATION`, `SOCIALS` exports with sudops values, used by every page.

- [ ] **Step 1: Run the identity check to see it fail**

Run: `npm run build && node scripts/v2-migration/verify.mjs`
Expected: `FAIL identity` (title is `astro-erudite`, no LinkedIn, robots points at vercel.app).

- [ ] **Step 2: Add the LinkedIn icon**

```bash
curl -fsS "https://api.iconify.design/simple-icons/linkedin.svg" -o src/assets/icons/linkedin.svg
head -c 120 src/assets/icons/linkedin.svg
```
Expected: starts with `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="currentColor"`.

- [ ] **Step 3: Replace `src/consts.ts`**

```ts
import type { SvgComponent } from "astro/types"
import Email from "@/assets/icons/email.svg"
import GitHub from "@/assets/icons/github.svg"
import LinkedIn from "@/assets/icons/linkedin.svg"
import RSS from "@/assets/icons/rss.svg"

export const SITE = {
  title: "sudops.pl",
  description:
    "personal technical portfolio and blog of Vadzim Dziadziulia (Sudoom).",
  locale: "en-US",
  dir: "ltr",
  defaultPageImage: "/static/1200x630.png",
  defaultPostImage: "/static/1200x630.png",
} as const

export const NAVIGATION = [
  { href: "/blog", label: "Blog" },
  { href: "/projects", label: "Projects" },
  { href: "/tags", label: "Tags" },
]

export const SOCIALS: { href: string; label: string; icon: SvgComponent }[] = [
  { href: "https://github.com/sudoom", label: "GitHub", icon: GitHub },
  {
    href: "https://www.linkedin.com/in/vadzim-dziadziulia-648933138/",
    label: "LinkedIn",
    icon: LinkedIn,
  },
  { href: "mailto:root@sudoom.pl", label: "Email", icon: Email },
  { href: "/rss.xml", label: "RSS", icon: RSS },
]
```

- [ ] **Step 4: Point `astro.config.ts` at sudops.pl**

In `astro.config.ts`, replace

```ts
  site: "https://astro-erudite.vercel.app",
```

with

```ts
  site: "https://sudops.pl",
  server: { port: 1234, host: true },
  devToolbar: { enabled: false },
```

- [ ] **Step 5: Add Privacy and Terms links to the footer**

Replace `src/components/Footer.astro` with:

```astro
---
import SocialIcons from "@/components/SocialIcons.astro"
import { SITE, SOCIALS } from "@/consts"
---

<footer>
  <p>
    &copy; {new Date().getFullYear()}
    {SITE.title} · <a href="/privacy">Privacy Policy</a> ·
    <a href="/terms">Terms</a>
  </p>
  <SocialIcons links={SOCIALS} />
</footer>

<style>
  footer {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-block: var(--space-xs) var(--page-offset-bottom);

    @media (width >= 40rem) {
      flex-direction: row;
      justify-content: space-between;
    }

    p {
      font-size: var(--step--1);
      color: var(--muted-foreground);
    }

    a {
      color: inherit;

      &:hover {
        color: var(--foreground);
      }
    }
  }
</style>
```

- [ ] **Step 6: Swap in the Great Wave logo**

```bash
sips -z 36 36 public/favicon-96x96.png --out /tmp/sudops-logo-36.png >/dev/null
node -e 'const fs = require("fs"); const b64 = fs.readFileSync("/tmp/sudops-logo-36.png").toString("base64"); fs.writeFileSync("src/assets/logo.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36"><image width="36" height="36" href="data:image/png;base64,${b64}"/></svg>\n`)'
wc -c src/assets/logo.svg
```
Expected: under 5000 bytes.

- [ ] **Step 7: Reshape the author file**

Replace `src/content/authors/vd.md` with:

```markdown
---
name: "Vadzim Dziadziulia"
avatar: "https://gravatar.com/avatar/f08d39f040e9e4d743551c55bebba895d6450ed85289300b6ab65f8cd6eea307?v=1766154377000&size=256"
mail: "root@sudoom.pl"
socials:
  website: "https://sudoom.pl"
  github: "https://github.com/sudoom"
  linkedin: "https://www.linkedin.com/in/vadzim-dziadziulia-648933138/"
---
```

- [ ] **Step 8: Build and verify**

Run: `npx biome format --write src/consts.ts astro.config.ts src/components/Footer.astro && npm run build && node scripts/v2-migration/verify.mjs`
Expected: `PASS identity`. `routes` still fails only on `/blog/homelab-*` and `/tags/*`.

- [ ] **Step 9: Commit**

```bash
git add src/consts.ts astro.config.ts src/components/Footer.astro src/assets/icons/linkedin.svg src/assets/logo.svg src/content/authors/vd.md
git commit -m "feat(v2): sudops site identity, footer links, logo, author socials"
```

---

### Task 4: Convert posts to Markdown

**Files:**
- Rename: all 18 `src/content/blog/**/*.mdx` → `.md`
- Create: `scripts/v2-migration/convert-posts.mjs`
- Modify: `src/content/blog/homelab-network-impl/phase0.md` (anchor link), `src/lib/expressive-code/config.ts` (RouterOS grammar)

**Interfaces:**
- Consumes: v2 `calloutDirective` (renders `:::variant[Title]` as `<details data-callout="variant">`), v2 `headingNamespace` (prefixes subpost heading IDs with the subpost file name).
- Produces: `homelab-bom/post-sno.md` contains the lines `<bom-chart>` / `</bom-chart>` where the React chart was. Task 5 defines the element.

- [ ] **Step 1: Rename the files, keeping history**

```bash
for f in $(git ls-files 'src/content/blog/*.mdx'); do git mv "$f" "${f%.mdx}.md"; done
git ls-files 'src/content/blog/*.mdx' | wc -l
git ls-files 'src/content/blog/*.md' | wc -l
```
Expected: `0`, then `18`.

- [ ] **Step 2: Build to see the unconverted posts fail**

Run: `npm run build && node scripts/v2-migration/verify.mjs`
Expected: builds, but `FAIL callouts` (0 found) and `FAIL leftovers` (pages contain `import Callout` and `<Callout` as text or raw HTML).

- [ ] **Step 3: Write the conversion script**

Create `scripts/v2-migration/convert-posts.mjs`:

```js
// One-off: convert v1 MDX constructs in the posts to v2 Markdown.
import { globSync, readFileSync, writeFileSync } from "node:fs"

const VARIANTS = {
  note: "note",
  warning: "warning",
  important: "important",
  tip: "tip",
  summary: "note",
  definition: "note",
  danger: "caution",
}
const OPEN = /^<Callout title="([^"]*)" variant="([a-z]+)">\s*$/
const CLOSE = /^<\/Callout>\s*$/
const IMPORT = /^import \w+ from '@\/components\/[^']+'\s*$/

let callouts = 0
let imports = 0
let charts = 0
for (const file of globSync("src/content/blog/**/*.md")) {
  const out = []
  let inside = false
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (IMPORT.test(line)) {
      imports++
      continue
    }
    if (line.trim() === "<BomPieChart client:load />") {
      out.push("<bom-chart>", "</bom-chart>")
      charts++
      continue
    }
    const open = OPEN.exec(line)
    if (open) {
      const variant = VARIANTS[open[2]]
      if (!variant) throw new Error(`${file}: unknown variant ${open[2]}`)
      out.push(`:::${variant}[${open[1]}]`)
      inside = true
      callouts++
      continue
    }
    if (inside && CLOSE.test(line)) {
      out.push(":::")
      inside = false
      continue
    }
    out.push(inside ? line.replace(/^ {1,2}/, "") : line)
  }
  if (inside) throw new Error(`${file}: unclosed <Callout>`)
  writeFileSync(file, out.join("\n"))
}
console.log(`callouts=${callouts} imports=${imports} charts=${charts}`)
```

- [ ] **Step 4: Run the conversion**

Run: `node scripts/v2-migration/convert-posts.mjs`
Expected: `callouts=58 imports=19 charts=1`.

- [ ] **Step 5: Review the diff by eye**

Run: `git diff --stat -- src/content/blog && git diff -- src/content/blog/homelab-design/compute.md | head -80`
Expected: 17 files changed. Every `<Callout …>` is now `:::variant[Title]` and closes with `:::`. Bodies lost their two-space indent, and lists inside callouts are still lists. The import lines are gone. Spot-check one file per series.

- [ ] **Step 6: Fix the one in-post anchor link**

In `src/content/blog/homelab-network-impl/phase0.md`, replace `[MikroTik VLAN videos](#references)` with `[MikroTik VLAN videos](#phase0-references)`.

Run: `grep -n "](#" src/content/blog/homelab-network-impl/phase0.md`
Expected: only `](#phase0-references)`.

- [ ] **Step 7: Register the RouterOS grammar**

In `src/lib/expressive-code/config.ts`, add below the existing imports:

```ts
import routerosGrammar from "../../grammars/routeros.tmLanguage.json"
```

and in `ecOptions`, directly after the `plugins: [pluginCollapsibleSections(), pluginLineNumbers()],` line, add:

```ts
  shiki: {
    langs: [
      { ...routerosGrammar, name: "routeros", scopeName: "source.routeros" },
    ],
  },
```

- [ ] **Step 8: Build and verify**

Run: `npx biome format --write src/lib/expressive-code/config.ts && npm run build 2>&1 | tee /tmp/v2-build.log | tail -5 && node scripts/v2-migration/verify.mjs; grep -ciE "routeros.*(not found|unknown)|(not found|unknown).*routeros" /tmp/v2-build.log`
Expected: build completes and `PASS` for `routes`, `callouts`, `leftovers`, `routeros`, `anchor`, `identity`. `bom` fails only on "bom-chart is never defined". `home` fails. The final grep prints `0`.

- [ ] **Step 9: Commit**

```bash
git add src/content/blog scripts/v2-migration/convert-posts.mjs src/lib/expressive-code/config.ts
git commit -m "feat(v2): convert posts to Markdown with ::: callouts, register RouterOS grammar"
```

---

### Task 5: BOM chart as a custom element

**Files:**
- Modify: `src/content/blog/homelab-bom/post-sno.md` (the `<bom-chart>` / `</bom-chart>` lines from Task 4)

**Interfaces:**
- Consumes: the `<bom-chart>`/`</bom-chart>` lines in `post-sno.md` (Task 4), the v2 CSS variables `--foreground`, `--background`, `--border` (these pass through shadow DOM).
- Produces: `<bom-chart>`, a self-contained element. It uses shadow DOM, so prose styles can't reach it.

- [ ] **Step 1: Confirm the check fails**

Run: `node scripts/v2-migration/verify.mjs`
Expected: `FAIL bom` with `bom-chart is never defined`.

- [ ] **Step 2: Add the element definition**

In `src/content/blog/homelab-bom/post-sno.md`, replace the two lines

```html
<bom-chart>
</bom-chart>
```

with (keep the blank line before `<script>`):

```html
<bom-chart>
</bom-chart>

<script>
  if (!customElements.get("bom-chart")) {
    customElements.define(
      "bom-chart",
      class extends HTMLElement {
        connectedCallback() {
          if (this.shadowRoot) return
          const data = [
            { name: "Compute (chassis + RAM)", value: 14180, color: "#3266ad" },
            { name: "Network infrastructure", value: 3964.9, color: "#c47a2a" },
            { name: "NICs", value: 839.97, color: "#7c5cbf" },
            { name: "Storage (boot SSDs)", value: 618, color: "#2a8a5a" },
          ]
          const total = data.reduce((sum, d) => sum + d.value, 0)
          const pct = (v) => Math.round((v / total) * 100)
          const pln = (v) =>
            v.toLocaleString("pl-PL", { maximumFractionDigits: 0 }) + " PLN"
          const [cx, cy, inner, outer] = [150, 150, 70, 120]
          const at = (r, a) => [cx + r * Math.sin(a), cy - r * Math.cos(a)]
          let start = 0
          const slices = data.map((d) => {
            const end = start + (d.value / total) * 2 * Math.PI
            const large = end - start > Math.PI ? 1 : 0
            const [x0, y0] = at(outer, start)
            const [x1, y1] = at(outer, end)
            const [x2, y2] = at(inner, end)
            const [x3, y3] = at(inner, start)
            const [lx, ly] = at(outer + 16, (start + end) / 2)
            start = end
            return (
              `<path d="M${x0} ${y0} A${outer} ${outer} 0 ${large} 1 ${x1} ${y1} ` +
              `L${x2} ${y2} A${inner} ${inner} 0 ${large} 0 ${x3} ${y3} Z" ` +
              `fill="${d.color}" data-tip="${d.name}: ${pln(d.value)} (${pct(d.value)}%)"></path>` +
              `<text x="${lx}" y="${ly}">${pct(d.value)}%</text>`
            )
          })
          const legend = data.map(
            (d) =>
              `<li><span style="background:${d.color}"></span>` +
              `${d.name} ${pct(d.value)}% — ${pln(d.value)}</li>`,
          )
          const root = this.attachShadow({ mode: "open" })
          root.innerHTML = `
            <style>
              :host { display: block; max-width: 500px; margin: 0 auto 1em; }
              figure { position: relative; margin: 0; }
              svg { display: block; width: 100%; max-width: 320px; height: auto; margin: 0 auto; }
              path { cursor: pointer; transition: opacity 0.15s; }
              path:hover { opacity: 0.8; }
              text { fill: var(--foreground, currentColor); font-size: 13px; text-anchor: middle; dominant-baseline: middle; }
              [role="tooltip"] { position: absolute; pointer-events: none; padding: 0.25em 0.5em; background: var(--background, Canvas); color: var(--foreground, CanvasText); border: 1px solid var(--border, GrayText); border-radius: 8px; font-size: 13px; white-space: nowrap; }
              ul { list-style: none; margin: 0.5em 0 0; padding: 0; font-size: 13px; }
              li { display: flex; align-items: center; gap: 0.5em; }
              li span { width: 0.75em; height: 0.75em; border-radius: 2px; flex-shrink: 0; }
            </style>
            <figure>
              <svg viewBox="0 0 300 300" role="img" aria-label="Homelab spend by category">${slices.join("")}</svg>
              <div role="tooltip" hidden></div>
              <ul>${legend.join("")}</ul>
            </figure>`
          const figure = root.querySelector("figure")
          const tip = root.querySelector('[role="tooltip"]')
          for (const path of root.querySelectorAll("path")) {
            path.addEventListener("pointermove", (event) => {
              const box = figure.getBoundingClientRect()
              tip.textContent = path.dataset.tip
              tip.style.left = `${event.clientX - box.left + 12}px`
              tip.style.top = `${event.clientY - box.top + 12}px`
              tip.hidden = false
            })
            path.addEventListener("pointerleave", () => {
              tip.hidden = true
            })
          }
        }
      },
    )
  }
</script>
```

- [ ] **Step 3: Build and verify**

Run: `npm run build && node scripts/v2-migration/verify.mjs`
Expected: `PASS bom`. Everything except `home` passes.

- [ ] **Step 4: Check the chart in a browser**

Run `npm run dev`, open http://localhost:1234/blog/homelab-bom/post-sno and check:
- A doughnut with four slices labelled 72%, 20%, 4% and 3%.
- A legend under it: "Compute (chassis + RAM) 72% — 14 180 PLN", and so on.
- Hovering a slice shows e.g. "NICs: 840 PLN (4%)".
- Labels and tooltip are readable after switching the theme with the sidebar toggle.
- No console errors after navigating to `/blog` and back.

Stop the dev server afterwards.

- [ ] **Step 5: Commit**

```bash
git add src/content/blog/homelab-bom/post-sno.md
git commit -m "feat(v2): BOM doughnut chart as a <bom-chart> custom element"
```

---

### Task 6: Homepage

**Files:**
- Create: `src/components/HeroSea.astro` (from branch `origin/main-page`), `src/assets/icons/tech/{kubernetes,openshift,google-cloud,terraform,azure}.svg`
- Replace: `src/pages/index.astro`

**Interfaces:**
- Consumes: v2 `BlogCard` (`post: CollectionEntry<"blog">`, renders its own `<li>`), `getPosts()` from `@/lib/content` (top-level posts, newest first), `MetaPage` (no `title` gives `<title>sudops.pl</title>`).
- Produces: nothing used by later tasks.

- [ ] **Step 1: Confirm the check fails**

Run: `node scripts/v2-migration/verify.mjs`
Expected: `FAIL home` (upstream's dictionary-entry homepage).

- [ ] **Step 2: Bring over HeroSea and drop its Tailwind classes**

```bash
git fetch origin main-page
git show origin/main-page:src/components/HeroSea.astro > src/components/HeroSea.astro
head -3 src/components/HeroSea.astro
```
Expected: line 1 is `<div class="hero-sea overflow-hidden rounded-lg">` and line 2 is `<style>`.

Change line 1 to `<div class="hero-sea">`. Then insert this as the new line 3, directly after `<style>`:

```css
.hero-sea{overflow:hidden;border-radius:var(--radius-lg);margin-block:var(--space-l)}
```

Leave the rest of the file alone. It's hand-minified SVG, so don't run a formatter on it.

- [ ] **Step 3: Download the tech logos**

```bash
mkdir -p src/assets/icons/tech
curl -fsS "https://api.iconify.design/logos/kubernetes.svg" -o src/assets/icons/tech/kubernetes.svg
curl -fsS "https://api.iconify.design/logos/openshift.svg" -o src/assets/icons/tech/openshift.svg
curl -fsS "https://api.iconify.design/logos/google-cloud.svg" -o src/assets/icons/tech/google-cloud.svg
curl -fsS "https://api.iconify.design/simple-icons/terraform.svg" -o src/assets/icons/tech/terraform.svg
curl -fsS "https://api.iconify.design/logos/microsoft-azure.svg" -o src/assets/icons/tech/azure.svg
head -c 60 src/assets/icons/tech/*.svg
```
Expected: each file starts with `<svg xmlns="http://www.w3.org/2000/svg"`.

- [ ] **Step 4: Replace `src/pages/index.astro`**

```astro
---
import Azure from "@/assets/icons/tech/azure.svg"
import GoogleCloud from "@/assets/icons/tech/google-cloud.svg"
import Kubernetes from "@/assets/icons/tech/kubernetes.svg"
import OpenShift from "@/assets/icons/tech/openshift.svg"
import Terraform from "@/assets/icons/tech/terraform.svg"
import BlogCard from "@/components/BlogCard.astro"
import HeroSea from "@/components/HeroSea.astro"
import MetaPage from "@/components/MetaPage.astro"
import Layout from "@/layouts/Layout.astro"
import { getPosts } from "@/lib/content"

const STACK = [
  { name: "Kubernetes", icon: Kubernetes },
  { name: "Openshift", icon: OpenShift },
  { name: "Google Anthos", icon: GoogleCloud },
  { name: "Terraform", icon: Terraform },
  { name: "Azure", icon: Azure },
]

const latest = (await getPosts()).slice(0, 2)
---

<Layout>
  <MetaPage slot="head" />
  <home-intro>
    <h1>Vadzim Dziadziulia</h1>
    <p data-tagline>Navigator of Kubernetes Seas</p>
    <p>
      Charting courses through bare-metal clusters, <strong
        >Kubernetes infrastructure</strong
      >, and everything beneath the waterline.
    </p>
  </home-intro>

  <HeroSea />

  <section>
    <h2>Tech Stack</h2>
    <ul data-stack>
      {STACK.map(({ name, icon: Icon }) => (
          <li>
            <Icon aria-hidden="true" />
            <span>{name}</span>
          </li>
        ))}
    </ul>
  </section>

  <section>
    <h2>Latest Posts</h2>
    <ul data-posts>
      {latest.map((post) => <BlogCard post={post} />)}
    </ul>
    <a href="/blog" data-more>See all posts &rarr;</a>
  </section>
</Layout>

<style>
  home-intro {
    display: block;

    @media (width >= 64rem) {
      margin-block-start: -0.2em;
    }

    h1 {
      font-size: var(--step-2);
      line-height: calc(var(--leading-offset) + 1em);
      font-weight: var(--font-weight-medium);
      color: var(--foreground);
    }

    [data-tagline] {
      margin-block-start: var(--space-3xs);
      font-size: var(--step-1);
      color: var(--muted-foreground);
    }

    p:last-child {
      margin-block-start: var(--space-xs);
      max-inline-size: var(--measure);
      font-size: var(--step-0);
      color: var(--muted-foreground);
    }
  }

  section + section {
    margin-block-start: var(--space-xl);
  }

  h2 {
    margin-block-end: var(--space-s);
    font-size: var(--step-1);
    font-weight: var(--font-weight-medium);
    color: var(--foreground);
  }

  [data-stack] {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);

    li {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2xs);
      padding: var(--space-3xs) var(--space-xs);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      background-color: color-mix(in oklab, var(--muted) 30%, transparent);
      font-size: var(--step--1);
      color: var(--foreground);

      svg {
        inline-size: 1.25rem;
        block-size: 1.25rem;
        flex-shrink: 0;
      }
    }
  }

  [data-posts] {
    display: flex;
    flex-direction: column;
    gap: var(--space-m);
  }

  [data-more] {
    display: inline-block;
    margin-block-start: var(--space-m);
    font-size: var(--step--1);
    color: var(--muted-foreground);

    &:hover {
      color: var(--foreground);
    }
  }
</style>
```

- [ ] **Step 5: Build and verify**

Run: `npx biome format --write src/pages/index.astro && npm run build && node scripts/v2-migration/verify.mjs`
Expected: all eight groups `PASS`, exit code 0.

- [ ] **Step 6: Check the homepage in a browser**

Run `npm run dev` and open http://localhost:1234/. Check in both themes and at desktop and phone widths (375 px):
- Intro, animated sea (waves move, boat bobs), five tech chips with coloured logos, two latest posts, and "See all posts →".
- No horizontal scrolling at 375 px.

Stop the dev server afterwards.

- [ ] **Step 7: Commit**

```bash
git add src/components/HeroSea.astro src/assets/icons/tech src/pages/index.astro
git commit -m "feat(v2): sudops homepage with HeroSea, tech stack, latest posts"
```

---

### Task 7: Update CLAUDE.md

**Files:**
- Replace: `CLAUDE.md`

**Interfaces:**
- Consumes: facts established in Tasks 2–6.
- Produces: project instructions that match the v2 codebase.

- [ ] **Step 1: Check for stale v1 references**

Run: `grep -nE "mdx|Tailwind|shadcn|React|Callout|Prettier|data-utils|postsPerPage|10 posts" CLAUDE.md`
Expected: many hits (v1 content).

- [ ] **Step 2: Replace `CLAUDE.md`**

Write this content:

````markdown
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Keep this file up to date as the project evolves.** When you add features, change structure, or learn something new about the codebase, update CLAUDE.md in the same commit — don't wait to be asked.

## Project Overview

Personal blog and portfolio site (sudops.pl) built on the **astro-erudite v2** template (Astro 7). Content is plain Markdown (`.md`) rendered by the Sätteri processor; styling is native CSS. There is no Tailwind, no UI framework, no React, and no MDX.

## Deployment

The site is hosted on **Cloudflare Pages**, connected directly to this repo. Every commit pushed to `main` triggers an automatic build and deploy. Results are live at **https://sudops.pl**. Every other pushed branch gets a preview at `https://<branch-name>.sudops-pl.pages.dev/`.

To build, commit, and deploy in one shot:
```
npm run build && git add . && git commit -m "your message" && git push origin main
```

You can verify the result at https://sudops.pl after the Cloudflare build completes.

**Commit messages:** never add a Claude/AI attribution trailer (no `Co-Authored-By: Claude …`, no `🤖 Generated with…`). Keep messages plain and authored by the repo owner.

## Commands

- `npm run dev` — Start dev server (port 1234)
- `npm run build` — Type-check (`astro check`) then build
- `npm run preview` — Preview production build
- `npm run format` — Format with Biome (`npm run format:check` only checks)

## Upstream template

This repo is a real git fork of [jktrn/astro-erudite](https://github.com/jktrn/astro-erudite) (shared history). To pull upstream changes:

```
git remote add upstream https://github.com/jktrn/astro-erudite.git   # once
git fetch upstream
git switch -c upstream-sync origin/main
git merge upstream/main
```

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
- `src/pages/index.astro` — homepage: intro, `HeroSea`, tech stack chips, latest 2 posts
- `src/components/HeroSea.astro` — animated SVG hero (hand-minified; don't reformat)
- `src/components/Footer.astro` — upstream footer plus Privacy/Terms links
- `src/pages/privacy.astro`, `src/pages/terms.astro`
- `src/assets/logo.svg` (Great Wave mark), `src/assets/icons/linkedin.svg`, `src/assets/icons/tech/*.svg`
- `src/grammars/routeros.tmLanguage.json`

### Styling
- Native CSS with custom properties. Components use scoped `<style>` blocks and custom element names (`<prose-content>`, `<entry-info>`, …) instead of utility classes.
- Use the tokens: spacing `--space-*`, type scale `--step-*`, radii `--radius-*`, colours `--foreground`, `--muted-foreground`, `--background`, `--muted`, `--border`.
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
- Interactive pieces are custom elements with an inline `<script>` in the `.md` (see `<bom-chart>` in `homelab-bom/post-sno.md`). Always guard with `if (!customElements.get("name"))`, because scripts re-run on navigation.
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
Biome (`biome.json`, from upstream): double quotes, no semicolons, 2-space indent, 80 columns. It formats `.ts`, `.astro` and `.json`; Markdown is not formatted.

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
````

- [ ] **Step 3: Check for stale references again**

Run: `grep -nE "\.mdx|Tailwind|shadcn|<Callout|Prettier|data-utils|postsPerPage|10 posts" CLAUDE.md`
Expected: only lines that mention these as things that are gone ("no Tailwind", "`.mdx` is not collected", "no MDX"). No instructions that tell you to use them.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for astro-erudite v2"
```

---

### Task 8: Final verification, preview deploy, PR

**Files:**
- Delete: `scripts/v2-migration/` (after the last run)

**Interfaces:**
- Consumes: everything above.
- Produces: branch `erudite-v2` on GitHub, a preview at https://erudite-v2.sudops-pl.pages.dev/, and an open PR into `main`.

- [ ] **Step 1: Full clean build and verify**

```bash
rm -rf dist .astro
npm run build && node scripts/v2-migration/verify.mjs
```
Expected: `astro check` 0 errors, build complete, all eight groups `PASS`.

- [ ] **Step 2: Browser pass (Review Focus)**

Run `npm run dev` and check at http://localhost:1234 in both light and dark theme:
1. Open `/blog/homelab-design/network` directly. It lands on the Network subpost. Scroll up and down: the address bar and tab title change between parent and subposts, and the table of contents shows the whole series.
2. `/blog/homelab-network-impl/phase0`: click "MikroTik VLAN videos" and confirm it jumps to References.
3. `/blog/homelab-network-impl`: a RouterOS block is colour-highlighted in both themes.
4. `/blog/homelab-design/compute`: callouts show as "Note (Chassis requirements)" and so on, with bullet lists inside.
5. `/blog/homelab-bom/post-sno`: the chart hover works, it's readable in dark mode, and the console is clean after navigating away and back.
6. At a 375 px width: `/`, `/blog/homelab-design` and `/privacy` have no horizontal scrolling, and the sidebar is a top bar.
7. `/privacy` and `/terms` render, and the footer links reach them.

Stop the dev server afterwards.

- [ ] **Step 3: Remove the migration scripts**

```bash
git rm -r -q scripts/v2-migration
git commit -m "chore: remove v2 migration scripts"
```

- [ ] **Step 4: Push the branch**

```bash
git push -u origin erudite-v2
```

- [ ] **Step 5: Check the Cloudflare preview**

Cloudflare builds the branch in a few minutes. Poll until it's live:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://erudite-v2.sudops-pl.pages.dev/
curl -s https://erudite-v2.sudops-pl.pages.dev/ | grep -o "<title>[^<]*</title>"
curl -s https://erudite-v2.sudops-pl.pages.dev/blog/homelab-bom/post-sno | grep -c "bom-chart"
```
Expected: `200`, `<title>sudops.pl</title>`, and a count of at least 1.
If the Cloudflare build fails:
- On the Node version: add a `.node-version` file containing `22`, commit, and push.
- On missing `@astrojs/check`/`typescript` (devDependencies skipped): report it to the user rather than changing Cloudflare settings.

- [ ] **Step 6: Open the PR**

```bash
gh pr create --base main --head erudite-v2 --title "Migrate to astro-erudite v2" --body "$(cat <<'EOF'
Moves sudops.pl onto upstream astro-erudite v2 (Astro 7, Sätteri Markdown, native CSS) via a real merge of upstream 1ffdf62.

**Merge this PR with "Create a merge commit" — not squash.** Squashing drops the upstream parent and breaks future `git merge upstream/main`.

- Posts converted from MDX to Markdown; 58 callouts now `:::` directives
- BOM chart rebuilt as a `<bom-chart>` custom element
- Homepage ported (intro, HeroSea, tech stack, latest posts); privacy/terms kept
- Every live URL still resolves (checked against a baseline route list)

Preview: https://erudite-v2.sudops-pl.pages.dev/
Spec: docs/superpowers/specs/2026-09-24-erudite-v2-migration-design.md
EOF
)"
```
Expected: prints the PR URL. Don't merge it; merging is the user's call.
