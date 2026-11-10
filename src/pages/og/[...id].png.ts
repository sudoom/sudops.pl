import { SITE } from "@/consts"
import { getPosts, getSubposts } from "@/lib/content"
import { renderOgImage, type OgImageOptions } from "@/lib/og-image"
import { readingTime } from "@/lib/reading-time"
import { formatDate, isSubpost } from "@/lib/utils"
import type { APIRoute, GetStaticPaths } from "astro"

export const getStaticPaths = (async () => {
  const posts = await getPosts()
  const series = await getSubposts()
  const entries = posts.flatMap((parent) => {
    const chain = [parent, ...(series.get(parent.id) ?? [])]
    return chain.map((post) => {
      const subpost = isSubpost(post.id)
      // Same reading time as the post header: a series parent counts the
      // whole series.
      const minutes = readingTime(subpost ? [post] : chain)
      const options: OgImageOptions = {
        title: post.data.title,
        description: post.data.description,
        series: subpost ? parent.data.title : undefined,
        meta: `${formatDate(post.data.date)} · ${minutes} min read`,
        tags: post.data.tags,
      }
      return { params: { id: post.id }, props: { options } }
    })
  })
  const site: OgImageOptions = {
    title: SITE.title,
    description: SITE.description,
    logoOnly: true,
  }
  return [...entries, { params: { id: "site" }, props: { options: site } }]
}) satisfies GetStaticPaths

export const GET: APIRoute = async ({ props }) => {
  const png = await renderOgImage(props.options as OgImageOptions)
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png" },
  })
}
