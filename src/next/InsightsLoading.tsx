import InsightsNavigation from '../editorial/InsightsNavigation'

export default function InsightsLoading() {
  return <main className="bg-white px-4 pt-32 pb-24 text-neutral-900" aria-busy="true">
    <div className="mx-auto max-w-[1200px]">
      <div className="insights-navigation-row"><InsightsNavigation /></div>
      <p role="status" className="site-copy">Loading stories…</p>
    </div>
  </main>
}
