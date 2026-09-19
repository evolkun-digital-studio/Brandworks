function CTA() {
  return (
    <section className="mx-auto w-full max-w-[1280px] px-4 py-10">
      <div className="relative flex flex-col items-center overflow-hidden rounded-[32px] bg-[#1c1d21] px-6 py-24 text-center sm:py-28">
        {/* soft radial glow behind the mark */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/25 blur-[90px]"
        />

        <h2 className="site-display relative z-0 max-w-[780px] text-neutral-700/60 uppercase">
          Let&apos;s Build What&apos;s Next
        </h2>

        {/* glowing folded-paper mark */}
        <svg
          viewBox="0 0 64 80"
          className="pointer-events-none absolute top-1/2 left-1/2 z-10 h-[90px] w-[72px] -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_0_35px_rgba(255,255,255,0.85)] sm:h-[110px] sm:w-[88px]"
          aria-hidden="true"
        >
          <path d="M32 0 6 20v10l26-16z" fill="#f4f4f5" />
          <path d="M32 0v70L6 50V20z" fill="#ffffff" />
          <path d="M32 0v70l14-10V22z" fill="#d8d9dc" />
        </svg>

        <p className="site-copy relative z-0 mt-6 max-w-[600px] text-neutral-500">
          Whether you&apos;re launching something new, evolving an existing
          brand or looking to strengthen your digital presence, we bring the
          strategy, creativity and expertise to move your business forward.
        </p>

        <a
          href="#"
          className="site-ui relative z-20 mt-10 flex items-center gap-2 text-neutral-200 uppercase transition-colors hover:text-white"
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
