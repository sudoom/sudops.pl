import path from "node:path"
import * as fontkit from "fontkit"
import sharp from "sharp"

// Share-image renderer. Text is converted to vector outlines with fontkit so
// the build does not depend on system fonts, then rasterised with sharp.
// fontkit can't instantiate the variable fonts' weight axis (woff2), so only
// the default weight is used; hierarchy comes from size and colour.

const WIDTH = 1200
const HEIGHT = 630
const PAD = 72

const COLOR = {
  background: "#0b1026",
  foreground: "#e2e8f0",
  muted: "#94a3b8",
  primary: "#4fd6be",
  rule: "#1e2a4a",
}

const fontsDir = path.join(process.cwd(), "src/assets/fonts")
const loadFont = (file: string) =>
  fontkit.openSync(path.join(fontsDir, file)) as fontkit.Font

let fonts: fontkit.Font[] | undefined
const getFonts = () =>
  (fonts ??= [
    loadFont("IBMPlexSans-VariableFont_wdth,wght.woff2"),
    loadFont("IBMPlexSans-LatinExt-VariableFont_wght.woff2"),
  ])

type PlacedGlyph = { d: string; x: number }
type Segment = { glyphs: PlacedGlyph[]; width: number }

// Lay out one word (no spaces) at size 1 (units of em). Characters are split
// into runs by the first font that has them; characters in neither font
// become a space so words do not fuse.
function layoutRun(text: string, font: fontkit.Font, x0: number) {
  const run = font.layout(text)
  const scale = 1 / font.unitsPerEm
  const glyphs: PlacedGlyph[] = []
  let x = x0
  run.glyphs.forEach((glyph, i) => {
    const d = glyph.path.toSVG()
    if (d) glyphs.push({ d, x: x + run.positions[i].xOffset * scale })
    x += run.positions[i].xAdvance * scale
  })
  return { glyphs, x }
}

function layoutText(text: string): Segment {
  const [main, fallback] = getFonts()
  const glyphs: PlacedGlyph[] = []
  let x = 0
  let run = ""
  let runFont = main
  const flush = () => {
    if (!run) return
    const laid = layoutRun(run, runFont, x)
    glyphs.push(...laid.glyphs)
    x = laid.x
    run = ""
  }
  for (const char of text) {
    const cp = char.codePointAt(0) as number
    const font = main.hasGlyphForCodePoint(cp)
      ? main
      : fallback.hasGlyphForCodePoint(cp)
        ? fallback
        : undefined
    const resolved = font ?? main
    const resolvedChar = font ? char : " "
    if (resolved !== runFont) {
      flush()
      runFont = resolved
    }
    run += resolvedChar
  }
  flush()
  return { glyphs, width: x }
}

const measureCache = new Map<string, Segment>()
function measure(text: string): Segment {
  let seg = measureCache.get(text)
  if (!seg) {
    seg = layoutText(text)
    measureCache.set(text, seg)
  }
  return seg
}

const widthOf = (text: string, size: number) => measure(text).width * size

type Wrapped = { lines: string[]; truncated: boolean }

function wrap(
  text: string,
  size: number,
  maxWidth: number,
  maxLines: number,
): Wrapped {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ""
  let i = 0
  for (; i < words.length; i++) {
    const candidate = current ? `${current} ${words[i]}` : words[i]
    if (!current || widthOf(candidate, size) <= maxWidth) {
      current = candidate
      continue
    }
    if (lines.length === maxLines - 1) break
    lines.push(current)
    current = words[i]
  }
  if (i < words.length) {
    // Out of lines: put the remaining words on the last line, then trim
    // words off the end until the line plus an ellipsis fits.
    const rest = words.slice(i).join(" ")
    let last = `${current} ${rest}`.split(" ")
    while (last.length > 1 && widthOf(`${last.join(" ")}…`, size) > maxWidth) {
      last.pop()
    }
    let joined = last.join(" ")
    while (joined.length > 1 && widthOf(`${joined}…`, size) > maxWidth) {
      joined = joined.slice(0, -1)
    }
    lines.push(`${joined.replace(/[\s.,;:]+$/, "")}…`)
    return { lines, truncated: true }
  }
  lines.push(current)
  return { lines, truncated: false }
}

// Emit a line of text as vector paths. y is the baseline.
function drawText(
  text: string,
  x: number,
  y: number,
  size: number,
  fill: string,
  anchor: "start" | "end" = "start",
) {
  const seg = measure(text)
  const left = anchor === "end" ? x - seg.width * size : x
  const s = size / 1000
  const paths = seg.glyphs
    .map(
      (g) =>
        `<path transform="translate(${(g.x * 1000).toFixed(2)} 0)" d="${g.d}"/>`,
    )
    .join("")
  return `<g transform="translate(${left.toFixed(2)} ${y.toFixed(2)}) scale(${s} ${-s})" fill="${fill}">${paths}</g>`
}

let logoDataUri: string | undefined
async function getLogo(size: number) {
  if (logoDataUri) return logoDataUri
  const px = size * 2
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}"><rect width="${px}" height="${px}" rx="${px * 0.22}" fill="#fff"/></svg>`,
  )
  const png = await sharp(
    path.join(process.cwd(), "public/apple-touch-icon.png"),
  )
    .extract({ left: 14, top: 14, width: 152, height: 152 })
    .resize(px, px)
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer()
  logoDataUri = `data:image/png;base64,${png.toString("base64")}`
  return logoDataUri
}

export type OgImageOptions = {
  title: string
  description: string
  /** Series name, shown above the title (subposts only). */
  series?: string
  /** Bottom-left line, e.g. "Jul 2, 2026 · 11 min read". */
  meta?: string
  tags?: string[]
  /** Site image: the title is the site name, so the brand is just the logo. */
  logoOnly?: boolean
}

export async function renderOgImage(opts: OgImageOptions): Promise<Buffer> {
  const { title, description, series, meta, tags = [], logoOnly } = opts
  const contentWidth = WIDTH - PAD * 2
  const out: string[] = []

  // Top row: logo + wordmark.
  const logoSize = 60
  out.push(
    `<image href="${await getLogo(logoSize)}" x="${PAD}" y="${PAD}" width="${logoSize}" height="${logoSize}"/>`,
  )
  if (!logoOnly) {
    const brandSize = 34
    // Centre the cap height on the logo's midline.
    const baseline = PAD + logoSize / 2 + (brandSize * 0.698) / 2
    out.push(
      drawText(
        "sudops.pl",
        PAD + logoSize + 22,
        baseline,
        brandSize,
        COLOR.foreground,
      ),
    )
  }

  // Bottom row bounds.
  const metaSize = 26
  const metaBaseline = HEIGHT - PAD
  const ruleY = metaBaseline - metaSize - 28

  // Content flows down from below the header.
  const contentTop = logoOnly ? 230 : PAD + logoSize + 32
  let y = contentTop

  if (series) {
    const size = 28
    const [line] = wrap(series, size, contentWidth, 1).lines
    y += size * 0.698
    out.push(drawText(line, PAD, y, size, COLOR.primary))
    y += 24
  }

  // Title: 72 if it fits two lines, then 60, otherwise 52 with up to 3 lines.
  let titleSize = 52
  let titleLines = wrap(title, titleSize, contentWidth, 3).lines
  for (const size of [72, 60]) {
    const w = wrap(title, size, contentWidth, 3)
    if (w.lines.length <= 2) {
      titleSize = size
      titleLines = w.lines
      break
    }
  }
  const titleLeading = titleSize * 1.14
  titleLines.forEach((line, i) => {
    const baseline = y + titleSize * 0.698 + i * titleLeading
    out.push(drawText(line, PAD, baseline, titleSize, COLOR.foreground))
  })
  y += titleSize * 0.698 + (titleLines.length - 1) * titleLeading
  y += titleSize * 0.275 + 26

  // Description: as many lines (max 3) as fit above the bottom rule.
  const descSize = 30
  const descLeading = descSize * 1.4
  const room = ruleY - 20 - y
  const descMax = Math.min(3, Math.max(1, Math.floor(room / descLeading)))
  const desc = wrap(description, descSize, contentWidth, descMax)
  desc.lines.forEach((line, i) => {
    const baseline = y + descSize * 0.698 + i * descLeading
    out.push(drawText(line, PAD, baseline, descSize, COLOR.muted))
  })

  // Bottom row: rule, then meta on the left and tags on the right.
  if (meta || tags.length) {
    out.push(
      `<rect x="${PAD}" y="${ruleY}" width="${contentWidth}" height="2" fill="${COLOR.rule}"/>`,
    )
  }
  let metaWidth = 0
  if (meta) {
    out.push(drawText(meta, PAD, metaBaseline, metaSize, COLOR.muted))
    metaWidth = widthOf(meta, metaSize)
  }
  if (tags.length) {
    const gap = 20
    const available = contentWidth - metaWidth - 48
    const shown: string[] = []
    let used = 0
    for (const tag of tags) {
      const label = `#${tag}`
      const w = widthOf(label, metaSize) + (shown.length ? gap : 0)
      if (used + w > available) break
      shown.push(label)
      used += w
    }
    let x = WIDTH - PAD
    for (const label of [...shown].reverse()) {
      out.push(drawText(label, x, metaBaseline, metaSize, COLOR.primary, "end"))
      x -= widthOf(label, metaSize) + gap
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
<defs>
<radialGradient id="glow" cx="1" cy="0" r="0.85" fx="1" fy="0">
<stop offset="0" stop-color="${COLOR.primary}" stop-opacity="0.22"/>
<stop offset="1" stop-color="${COLOR.primary}" stop-opacity="0"/>
</radialGradient>
</defs>
<rect width="${WIDTH}" height="${HEIGHT}" fill="${COLOR.background}"/>
<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)"/>
<rect x="0" y="0" width="8" height="${HEIGHT}" fill="${COLOR.primary}"/>
${out.join("\n")}
</svg>`

  return sharp(Buffer.from(svg)).png().toBuffer()
}
