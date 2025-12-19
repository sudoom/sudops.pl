import type { IconMap, SocialLink, Site } from '@/types'

export const SITE: Site = {
  title: 'sudops.pl',
  description:
    'personal technical portfolio and blog of Vadzim Dziadziulia (Sudoom).',
  href: 'https://sudops.pl',
  author: 'Vadzim Dziadziulia',
  locale: 'en-US',
  featuredPostCount: 2,
  postsPerPage: 3,
}

export const NAV_LINKS: SocialLink[] = [
  {
    href: '/blog',
    label: 'blog',
  },
  {
    href: '/projects',
    label: 'projects',
  },
  {
    href: '/tags',
    label: 'tags',
  },
]

export const SOCIAL_LINKS: SocialLink[] = [
  {
    href: 'https://github.com/sudoom',
    label: 'GitHub',
  },
  {
    href: 'https://www.linkedin.com/in/vadzim-dziadziulia-648933138/',
    label: 'LinkedIn',
  },
  {
    href: 'mailto:root@sudoom.pl',
    label: 'Email',
  },
]

export const ICON_MAP: IconMap = {
  Website: 'lucide:globe',
  GitHub: 'lucide:github',
  LinkedIn: 'lucide:linkedin',
  Twitter: 'lucide:twitter',
  Email: 'lucide:mail',
  RSS: 'lucide:rss',
}
