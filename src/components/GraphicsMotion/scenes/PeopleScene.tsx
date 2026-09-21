interface Person {
  id: string
  title: string
  imageUrl: string
  type: 'candid'
}

interface Props {
  media: Person[]
}

function PeopleScene({ media }: Props) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center px-[5vw] py-[6vh] md:px-[7vw] md:py-[8vh]">
      {/* Evolving editorial composition with multiple overlapping images */}
      <div className="relative w-full" style={{ maxWidth: '1400px', aspectRatio: '16/10' }}>
        {/* Image 1: Designer working - left, slightly lower */}
        {media[0] && (
          <div
            data-photo="1"
            className="absolute rounded-lg overflow-hidden bg-neutral-200 shadow-lg"
            style={{
              width: 'clamp(220px, 42vw, 480px)',
              height: 'clamp(280px, 54vh, 620px)',
              left: 'clamp(2vw, 4vw, 60px)',
              top: 'clamp(2vh, 12vh, 100px)',
            }}
          >
            <img
              src={media[0].imageUrl}
              alt={media[0].title}
              className="w-full h-full object-cover"
              style={{ objectPosition: 'center 30%' }}
              loading="lazy"
            />
          </div>
        )}

        {/* Image 2: Monitor/screen - upper right, offset */}
        {media[1] && (
          <div
            data-photo="2"
            className="absolute rounded-lg overflow-hidden bg-neutral-200 shadow-lg"
            style={{
              width: 'clamp(180px, 35vw, 420px)',
              height: 'clamp(240px, 42vh, 500px)',
              right: 'clamp(2vw, 5vw, 80px)',
              top: 'clamp(1vh, 6vh, 50px)',
            }}
          >
            <img
              src={media[1].imageUrl}
              alt={media[1].title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}

        {/* Image 3: Team collaboration - lower center-right, overlaps slightly */}
        {media[2] && (
          <div
            data-photo="3"
            className="absolute rounded-lg overflow-hidden bg-neutral-200 shadow-lg"
            style={{
              width: 'clamp(200px, 38vw, 460px)',
              height: 'clamp(260px, 48vh, 580px)',
              right: 'clamp(8vw, 12vw, 140px)',
              bottom: 'clamp(1vh, 8vh, 60px)',
            }}
          >
            <img
              src={media[2].imageUrl}
              alt={media[2].title}
              className="w-full h-full object-cover"
              style={{ objectPosition: 'center 35%' }}
              loading="lazy"
            />
          </div>
        )}
      </div>

      {/* Heading and description - centered below with proper spacing */}
      <div className="mt-16 md:mt-20 mx-auto max-w-[90vw] text-center">
        <p className="font-inter text-[11px] font-medium tracking-[0.16em] text-neutral-500 uppercase md:text-xs">
          Creative Production
        </p>
        <h2
          id="graphics-motion-heading"
          className="font-instrument mt-6 text-[clamp(40px,7vw,76px)] leading-[0.94] font-normal tracking-[-0.03em] text-[#111]"
        >
          Made by People.
          <br />
          <em>Built to Move.</em>
        </h2>
        <p className="font-inter mt-8 mx-auto max-w-[660px] text-base leading-[1.65] text-neutral-600 md:text-lg">
          From concept to execution, our team brings ideas to life through graphic design, motion, code, and creative vision.
        </p>
      </div>
    </div>
  )
}

export default PeopleScene
