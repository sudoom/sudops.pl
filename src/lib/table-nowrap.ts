import { defineHastPlugin } from "satteri"
import { plainText } from "./hast-text"

// Keeps a number together with its unit ("299.00 PLN", "~1,812 EUR") and
// short column headings ("Unit price") on one line. Text cells are left
// alone so the browser can still narrow them to fit a wide table.
const NUMBER = /^[~≈]?\d[\d.,]*(\s?[A-Za-z%€$]{1,4})?$/
const MAX_HEADING = 12

export const tableNowrap = defineHastPlugin({
  name: "table-nowrap",
  element: {
    filter: ["td", "th"],
    visit(node, ctx) {
      const text = plainText(node).trim()
      const heading = node.tagName === "th" && text.length <= MAX_HEADING
      if (text && (heading || NUMBER.test(text))) {
        ctx.setProperty(node, "dataNowrap", "")
      }
    },
  },
})
