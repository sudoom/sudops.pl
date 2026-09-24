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
