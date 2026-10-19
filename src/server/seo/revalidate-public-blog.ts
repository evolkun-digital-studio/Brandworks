import 'server-only'

import { revalidatePath } from 'next/cache'

/** Revalidates the CMS-backed journal and its discovery surface together. */
export function revalidatePublicBlogContent(): void {
  revalidatePath('/blog')
  revalidatePath('/blog/[slug]', 'page')
  revalidatePath('/sitemap.xml')
}

