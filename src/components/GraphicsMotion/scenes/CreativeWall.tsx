interface CreativeWallAssets {
  team: string
  campaign: string
  video: string
  code: string
  typography: string
  detail: string
}

interface Props {
  wall: CreativeWallAssets
}

function CreativeWall({ wall }: Props) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center px-[5vw] py-[6vh] md:px-[7vw] md:py-[8vh]">
      <div className="w-full" style={{ maxWidth: 'min(88vw, 1400px)' }}>
        <div className="mb-8 md:mb-12">
          <p className="font-inter text-[11px] font-medium tracking-[0.16em] text-neutral-500 uppercase md:text-xs">
            Synthesis
          </p>
          <h3 className="font-instrument mt-3 text-[clamp(36px,5vw,52px)] leading-[0.95] font-normal tracking-[-0.03em] text-[#111]">
            The Creative System
          </h3>
        </div>

        {/* Full-width asymmetric composition — art-directed */}
        <div className="relative w-full overflow-hidden rounded-2xl bg-black" style={{ aspectRatio: '16/10' }}>
          {/* Team image - top left, controlled positioning */}
          <div className="absolute left-0 top-0 h-[55%] w-[35%] overflow-hidden">
            <img
              src={wall.team}
              alt="Team working"
              className="h-full w-full object-cover"
              style={{ objectPosition: 'center 35%' }}
              loading="lazy"
            />
          </div>

          {/* Campaign graphic - center, larger proportion */}
          <div className="absolute left-[35%] top-0 h-[70%] w-[35%] overflow-hidden">
            <img
              src={wall.campaign}
              alt="Campaign graphic"
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>

          {/* Video - right side, distinct proportion */}
          <div className="absolute right-0 top-0 h-[60%] w-[30%] overflow-hidden">
            <video
              src={wall.video}
              autoPlay
              muted
              loop
              playsInline
              className="h-full w-full object-cover"
              preload="metadata"
            />
          </div>

          {/* Design detail - bottom right corner */}
          <div className="absolute bottom-0 right-0 h-[40%] w-[28%] overflow-hidden border-l border-t border-white/15">
            <img
              src={wall.detail}
              alt="Design detail"
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>

          {/* Code snippet - bottom left, readable */}
          <div className="absolute bottom-0 left-0 h-[35%] w-[38%] overflow-hidden border-r border-t border-white/15 bg-black/50 p-5 font-mono text-[9px] text-white/65">
            <pre className="whitespace-pre-wrap break-words leading-[1.6] font-light">
              {wall.code}
            </pre>
          </div>

          {/* Typography overlay - centered, with breathing room */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-[8vw]">
            <p className="font-instrument text-center text-[clamp(40px,6vw,76px)] leading-[1.0] font-normal tracking-[-0.03em] text-white drop-shadow-2xl">
              {wall.typography.split('\n').map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </p>
          </div>
        </div>

        <div className="font-inter mt-8 mx-auto max-w-[800px] text-center text-sm text-neutral-600 leading-relaxed">
          <p>
            <strong className="text-neutral-900">Integrated system:</strong> Team, campaign, motion, code, and typography converge in asymmetric, layered composition—showing design, motion, and code aren't separate; they're one unified creative language.
          </p>
        </div>
      </div>
    </div>
  )
}

export default CreativeWall
