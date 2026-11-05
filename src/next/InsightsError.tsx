'use client'

import InsightsNavigation from '../editorial/InsightsNavigation'

export default function InsightsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="bg-white px-4 pt-32 pb-24 text-neutral-900">
    <div className="mx-auto max-w-[1200px]">
      <div className="insights-navigation-row"><InsightsNavigation /></div>
      <p role="alert" className="site-copy">We couldn’t load these stories. Please try again.</p>
      <button type="button" onClick={reset} className="mt-4 text-sm underline underline-offset-4">Try again</button>
    </div>
  </main>
}
