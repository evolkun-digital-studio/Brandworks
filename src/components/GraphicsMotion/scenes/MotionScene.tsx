interface Motion {
  id: string
  title: string
  videoUrl: string
  type: 'video'
}

interface Props {
  motion: Motion
}

function MotionScene({ motion }: Props) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center px-[5vw] py-[6vh] md:px-[7vw] md:py-[8vh]">
      <div className="w-full" style={{ maxWidth: 'min(88vw, 1400px)' }}>
        <div className="mb-8 md:mb-12">
          <p className="font-inter text-[11px] font-medium tracking-[0.16em] text-neutral-500 uppercase md:text-xs">
            Phase 02 — Motion Design
          </p>
          <h3 className="font-instrument mt-3 text-[clamp(36px,5vw,52px)] leading-[0.95] font-normal tracking-[-0.03em] text-[#111]">
            Graphic Becomes Motion
          </h3>
        </div>

        <div className="grid gap-10 md:gap-12 md:grid-cols-[1.8fr_1fr]">
          {/* Video — dominant focal point */}
          <div className="overflow-hidden rounded-xl bg-black">
            <video
              src={motion.videoUrl}
              autoPlay
              muted
              loop
              playsInline
              className="aspect-video w-full object-cover"
              preload="metadata"
            />
          </div>

          {/* Context — supporting */}
          <div className="flex flex-col justify-center space-y-6">
            <div className="space-y-4">
              <p className="font-inter text-sm font-medium tracking-wider text-neutral-500 uppercase">
                Principles at Work
              </p>
              <div className="space-y-4 font-inter text-base text-neutral-700">
                <div className="flex gap-3">
                  <span className="h-2 w-2 rounded-full bg-neutral-400 flex-shrink-0 mt-1" />
                  <span>Rhythm and pacing carry the emotional arc</span>
                </div>
                <div className="flex gap-3">
                  <span className="h-2 w-2 rounded-full bg-neutral-400 flex-shrink-0 mt-1" />
                  <span>Performance reinforces the core concept</span>
                </div>
                <div className="flex gap-3">
                  <span className="h-2 w-2 rounded-full bg-neutral-400 flex-shrink-0 mt-1" />
                  <span>Sound and timing amplify emotion</span>
                </div>
              </div>
            </div>
            <div className="border-t border-neutral-300 pt-4">
              <p className="font-inter text-sm leading-[1.7] text-neutral-600">
                Every transition, keyframe, and effect serves the story. Motion isn't decoration—it's the primary communication.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MotionScene
