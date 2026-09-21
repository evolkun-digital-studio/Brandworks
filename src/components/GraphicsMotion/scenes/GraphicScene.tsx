interface Graphic {
  id: string
  title: string
  imageUrl: string
  type: 'static'
}

interface Props {
  graphic: Graphic
}

function GraphicScene({ graphic }: Props) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center px-[5vw] py-[6vh] md:px-[7vw] md:py-[8vh]">
      <div className="w-full" style={{ maxWidth: 'min(88vw, 1300px)' }}>
        <div className="mb-8 md:mb-12">
          <p className="font-inter text-[11px] font-medium tracking-[0.16em] text-neutral-500 uppercase md:text-xs">
            Phase 01 — Graphic Design
          </p>
          <h3 className="font-instrument mt-3 text-[clamp(36px,5vw,52px)] leading-[0.95] font-normal tracking-[-0.03em] text-[#111]">
            Static Design
          </h3>
        </div>

        <div className="grid gap-10 md:gap-12 md:grid-cols-[1.6fr_1fr]">
          {/* Static graphic — dominant */}
          <div className="overflow-hidden rounded-xl bg-neutral-200">
            <img
              src={graphic.imageUrl}
              alt="Static graphic composition"
              className="aspect-square w-full object-cover"
              loading="lazy"
            />
          </div>

          {/* Text composition — supporting */}
          <div className="flex flex-col justify-center space-y-6">
            <div className="space-y-4">
              <p className="font-inter text-sm font-medium tracking-wider text-neutral-500 uppercase">
                Then it comes alive
              </p>
              <ul className="font-inter space-y-3 text-base text-neutral-700 leading-relaxed">
                <li className="flex gap-3">
                  <span className="flex-shrink-0">→</span>
                  <span>Typography shifts</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0">→</span>
                  <span>Image crops move</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0">→</span>
                  <span>Lines extend</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0">→</span>
                  <span>Graphic elements escape</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0">→</span>
                  <span>Shapes transform</span>
                </li>
              </ul>
            </div>
            <div className="border-t border-neutral-300 pt-4">
              <p className="font-inter text-sm leading-[1.7] text-neutral-600">
                The same composition, now animated. Lines extend beyond their frame, elements break free, and static design becomes motion.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GraphicScene
