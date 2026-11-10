import { defineHastPlugin } from "satteri"
import { plainText } from "./hast-text"

// Short table cells ("299.00 PLN", "Unit price") stay on one line, so a
// number never gets separated from its unit. Longer cells wrap as usual.
const MAX_LENGTH = 16

export const tableNowrap = defineHastPlugin({
  name: "table-nowrap",
  element: {
    filter: ["td", "th"],
    visit(node, ctx) {
      const length = plainText(node).trim().length
      if (length > 0 && length <= MAX_LENGTH) {
        ctx.setProperty(node, "dataNowrap", "")
      }
    },
  },
})
