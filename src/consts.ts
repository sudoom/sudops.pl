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
