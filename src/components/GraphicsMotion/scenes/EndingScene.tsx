function EndingScene() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center px-5 text-center md:px-12">
      <div className="mx-auto max-w-3xl">
        <h2 className="font-instrument text-[clamp(40px,6vw,80px)] leading-[0.95] font-normal tracking-[-0.03em] text-[#111]">
          Design. Motion. Code.
          <br />
          <em>One Creative System.</em>
        </h2>

        <p className="font-inter mt-8 max-w-[540px] mx-auto text-base leading-[1.6] text-neutral-600 md:text-lg">
          Graphics, motion, and code aren't separate disciplines—they're integrated expressions of a single creative vision. Every element reinforces the others.
        </p>

        <div className="font-inter mt-12 grid gap-4 text-sm text-neutral-600 sm:grid-cols-3">
          <div className="rounded-lg bg-neutral-50 p-6 transition-transform duration-500 hover:scale-105">
            <p className="font-medium text-[#111] text-lg">Design</p>
            <p className="mt-3 text-xs leading-relaxed">Visual identity and composition that guides user perception</p>
          </div>
          <div className="rounded-lg bg-neutral-50 p-6 transition-transform duration-500 hover:scale-105">
            <p className="font-medium text-[#111] text-lg">Motion</p>
            <p className="mt-3 text-xs leading-relaxed">Rhythm, pacing, and performance that carries emotion</p>
          </div>
          <div className="rounded-lg bg-neutral-50 p-6 transition-transform duration-500 hover:scale-105">
            <p className="font-medium text-[#111] text-lg">Code</p>
            <p className="mt-3 text-xs leading-relaxed">Technical implementation that brings interaction to life</p>
          </div>
        </div>

        <p className="font-inter mt-12 text-xs text-neutral-500 uppercase tracking-widest">
          The section releases naturally into the next experience
        </p>
      </div>
    </div>
  )
}

export default EndingScene
