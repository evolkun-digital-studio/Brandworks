interface Screen {
  id: string
  title: string
  imageUrl: string
  type: 'workspace'
}

interface Props {
  screenImage: Screen
}

function ScreenTransition({ screenImage }: Props) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center px-[5vw] py-[8vh] md:px-[7vw]">
      <div className="relative w-full" style={{ maxWidth: 'min(88vw, 1400px)', aspectRatio: '16/9' }}>
        <div className="relative h-full w-full overflow-hidden rounded-2xl bg-neutral-200 shadow-2xl">
          <img
            src={screenImage.imageUrl}
            alt="Studio workspace with monitor"
            className="h-full w-full object-cover"
            style={{ objectPosition: 'center 40%' }}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30" />
        </div>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-end p-[6vh] text-center">
          <p className="font-instrument text-[clamp(36px,5vw,56px)] leading-[0.95] font-normal tracking-[-0.03em] text-white drop-shadow-xl">
            Enter the Screen
          </p>
          <p className="font-inter mt-4 max-w-[520px] text-sm leading-[1.6] text-white/85 drop-shadow-lg md:text-base">
            From person creating to work in motion
          </p>
        </div>
      </div>
    </div>
  )
}

export default ScreenTransition
