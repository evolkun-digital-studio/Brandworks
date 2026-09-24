function CTA() {
  return (
    <section className="mx-auto w-full max-w-[1280px] px-4 py-10">
      <div className="relative flex flex-col items-center overflow-hidden rounded-[32px] bg-[#1c1d21] px-6 py-24 text-center sm:py-28">
        {/* broad, faint atmospheric glow behind the copy */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 h-[320px] w-[min(760px,90%)] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-white/[0.07] blur-[110px]"
        />

        <h2 className="site-display relative max-w-[780px] text-neutral-100">
          Let&apos;s Build What&apos;s Next
        </h2>

        <p className="site-copy relative mt-7 max-w-[600px] text-neutral-500">
          Whether you&apos;re launching something new, evolving an existing
          brand or looking to strengthen your digital presence, we bring the
          strategy, creativity and expertise to move your business forward.
        </p>

        <a
          href="#"
          className="site-ui relative mt-10 flex items-center gap-2 text-neutral-200 uppercase transition-colors hover:text-white"
        >
          Start a conversation
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <line x1="7" y1="17" x2="17" y2="7" />
            <polyline points="7 7 17 7 17 17" />
          </svg>
        </a>
      </div>
    </section>
  )
}

export default CTA
