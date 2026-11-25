import type { CollectionEntry } from "astro:content"

const WORDS_PER_MINUTE = 220

const countWords = (markdown: string) =>
  markdown
    .replace(
      /^ {0,3}(`{3,}|~{3,}).*\n[\s\S]*?(?:^ {0,3}\1[`~]*[ \t]*$|(?![\s\S]))/gm,
      " ",
    )
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[:[\]]/g, " ")
    .split(/\s+/)
    .filter((token) => /[\p{L}\p{N}]/u.test(token)).length

export function readingTime(entries: CollectionEntry<"blog">[]): number {
  const words = entries.reduce(
    (sum, entry) => sum + countWords(entry.body ?? ""),
    0,
  )
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE))
}
