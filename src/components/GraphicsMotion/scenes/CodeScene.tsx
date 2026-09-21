interface CodeItem {
  id: string
  language: 'javascript' | 'typescript'
  snippet: string
}

interface OutputItem {
  id: string
  title: string
  imageUrl?: string
  videoUrl?: string
  type: 'image' | 'video'
}

interface Props {
  code: CodeItem[]
  output: OutputItem[]
}

function CodeScene({ code, output }: Props) {
  const codeExample = code[0]
  const outputs = output

  return (
    <div className="flex h-full w-full flex-col items-center justify-center px-[5vw] py-[6vh] md:px-[7vw] md:py-[8vh]">
      <div className="w-full" style={{ maxWidth: 'min(88vw, 1400px)' }}>
        <div className="mb-8 md:mb-12">
          <p className="font-inter text-[11px] font-medium tracking-[0.16em] text-neutral-500 uppercase md:text-xs">
            Phase 03 — Code + Results
          </p>
          <h3 className="font-instrument mt-3 text-[clamp(36px,5vw,52px)] leading-[0.95] font-normal tracking-[-0.03em] text-[#111]">
            Code Drives Results
          </h3>
        </div>

        {/* Editorial split: 65% code, 35% output */}
        <div className="grid gap-10 md:gap-12 md:grid-cols-[1fr_0.9fr]">
          {/* Code Editor */}
          <div className="flex flex-col space-y-4">
            <div className="rounded-xl bg-neutral-900 p-6 font-mono text-neutral-100 overflow-hidden">
              <div className="text-neutral-400 text-xs mb-4 font-medium">
                {codeExample.language === 'typescript' ? '// React Component with GSAP' : '// GSAP Animation'}
              </div>
              <pre className="text-xs leading-[1.8] whitespace-pre-wrap break-words text-neutral-300">
                <code>{codeExample.snippet}</code>
              </pre>
            </div>
            <p className="font-inter text-sm leading-[1.6] text-neutral-600">
              As each line executes, the corresponding visual responds in real time.
            </p>
          </div>

          {/* Results */}
          <div className="flex flex-col gap-4">
            {outputs.map((item) => (
              <div key={item.id} className="flex flex-col overflow-hidden rounded-xl bg-neutral-200">
                <div className="aspect-video w-full bg-neutral-300">
                  {item.type === 'image' && item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  )}
                  {item.type === 'video' && item.videoUrl && (
                    <video
                      src={item.videoUrl}
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="h-full w-full object-cover"
                      preload="metadata"
                    />
                  )}
                </div>
                <div className="bg-white px-4 py-3">
                  <p className="font-inter text-xs font-medium text-neutral-600">{item.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="font-inter mt-8 rounded-xl bg-neutral-100 p-6 text-sm text-neutral-700 border border-neutral-200">
          <p className="leading-relaxed">
            <strong className="text-neutral-900">Editorial composition:</strong> Code and visual output presented together show the direct relationship between technical implementation and creative outcome. The work isn't abstract—it's executable and purposeful.
          </p>
        </div>
      </div>
    </div>
  )
}

export default CodeScene
