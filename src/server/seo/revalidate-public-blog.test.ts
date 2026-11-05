import { expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
import { revalidatePath } from 'next/cache'
import { revalidatePublicBlogContent } from './revalidate-public-blog'

it('invalidates both sections, detail routes and the sitemap after a CMS change', () => {
  revalidatePublicBlogContent()
  for (const path of ['/blog', '/news', '/sitemap.xml']) expect(revalidatePath).toHaveBeenCalledWith(path)
  for (const path of ['/blog/[slug]', '/news/[slug]']) expect(revalidatePath).toHaveBeenCalledWith(path, 'page')
})
