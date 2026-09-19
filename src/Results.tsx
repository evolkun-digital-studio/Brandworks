import photo9 from './Photo/Photo9.png'
import photo10 from './Photo/Photo10.png'
import photo11 from './Photo/Photo11.png'

const results = [
  { image: photo9, stat: '+48%', label: 'Business Growth' },
  { image: photo10, stat: '1.5M', label: 'Audience Reach' },
  { image: photo11, stat: '+25%', label: 'Client Inquiries' },
]

function Results() {
  return (
    <section className="mx-auto flex w-full max-w-[1280px] flex-col items-center px-4 py-20 text-center">
      <span className="site-kicker flex w-fit max-w-full items-center justify-center gap-1 text-center whitespace-nowrap text-neutral-500">
        Results & Impact
        <sup className="text-[10px]">&reg;</sup>
      </span>

      <h2 className="site-display mt-4 flex w-full max-w-[760px] flex-col items-center text-center uppercase">
        <span className="text-neutral-500">How Brands Perform</span>
        <span className="text-neutral-900">With Brandworks</span>
      </h2>

      <p className="site-copy mt-5 w-full max-w-[760px] text-center text-neutral-600">
        See how brands work with BRANDWORKS to build stronger identities
        <br className="hidden sm:block" />
        reach wider audiences and create lasting impact.
      </p>

      <div className="mt-14 grid w-full grid-cols-1 gap-6 opacity-100 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((result) => (
          <div
            key={result.label}
            style={{
              maxWidth: '413px',
              aspectRatio: '413 / 480',
              transform: 'rotate(0deg)',
              opacity: 1,
              borderRadius: '16px',
            }}
            className="relative mx-auto w-full overflow-hidden"
          >
            <img
              src={result.image}
              alt={result.label}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-transparent" />
            <div className="absolute bottom-6 left-6 text-left">
              <div className="text-[22px] leading-[1.2] font-medium tracking-[-0.02em] text-white">
                {result.stat}
              </div>
              <div className="mt-1 text-[15px] leading-[1.4] font-normal text-white/90">
                {result.label}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default Results
