import Link from 'next/link'

export default function BlogArticleNotFound() {
  return (
    <main className="flex flex-col items-center gap-4 bg-white px-4 py-24 text-center">
      <p className="site-kicker text-neutral-500">BRANDWORKS / JOURNAL</p>
      <h1 className="site-heading text-neutral-900 uppercase">Story not found</h1>
      <p className="max-w-[420px] text-[15px] text-neutral-600">This story does not exist, or is no longer available.</p>
      <Link href="/blog" className="mt-2 flex h-[40px] items-center justify-center rounded-[4px] bg-neutral-900 px-6 py-2 text-[14px] font-medium text-white transition-opacity hover:opacity-90">Back to Blog</Link>
    </main>
  )
}
