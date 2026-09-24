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
