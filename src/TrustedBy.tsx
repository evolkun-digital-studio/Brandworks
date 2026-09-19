const clients = [
  'Riaaj Vintage',
  'Mr.Rework',
  'Form Studio',
  'Dehli 6',
  'Aerolinkcarrier',
  'Evolkun',
  'Workifyhub',
  'Urban Fold',
]

function TrustedBy() {
  return (
    <section className="mx-auto w-full max-w-[1280px] bg-white px-4 py-20">
      <span className="site-kicker text-neutral-900">
        Trusted by
      </span>

      <div className="mt-6 grid grid-cols-2 gap-[32px] opacity-100 sm:grid-cols-4">
        {clients.map((client) => (
          <div
            key={client}
            className="flex h-[160px] w-[302px] max-w-full items-center justify-center rounded-[8px] bg-neutral-200 px-4 text-center opacity-100"
          >
            <span
              style={{
                fontFamily: "'DEMO Picktea', 'Playfair Display', Georgia, serif",
              }}
              className="flex max-w-full items-center justify-center whitespace-nowrap text-[16px] leading-[1.25] font-normal tracking-[0.02em] text-neutral-900 uppercase"
            >
              {client}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-16 flex flex-col items-center text-center">
        <p className="w-[780px] max-w-full text-center text-[26px] leading-[1.35] font-normal tracking-[-0.02em] sm:text-[28px]">
          <span className="text-neutral-900">
            From shaping brand identities to creating meaningful digital
            experiences{' '}
          </span>
          <span className="text-neutral-400">
            we bring strategy creativity and execution together to help
            brands grow with clarity and purpose.
          </span>
        </p>

        <div className="mt-8 flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-800 text-xs font-semibold text-white"
          >
            JM
          </span>
          <div className="text-left">
            <div className="whitespace-nowrap text-[14px] leading-none font-semibold text-neutral-900">
              Jack Mea
            </div>
            <div className="mt-1 whitespace-nowrap text-[12px] leading-none font-normal text-neutral-500">
              CEO of Brandworks
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default TrustedBy
