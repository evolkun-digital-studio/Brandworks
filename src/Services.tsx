import photo1 from './Photo/Photo1.jpg'
import photo2 from './Photo/Photo2.jpg'
import photo3 from './Photo/Photo3.jpg'

const categories = [
  { image: photo1, label: 'Brand Strategy' },
  { image: photo2, label: 'Content & Creative' },
  { image: photo3, label: 'Social Media & Marketing' },
]

function Services() {
  return (
    <section className="flex flex-col items-center bg-white px-4 pt-6 pb-8 text-center sm:pt-8 sm:pb-10">
      <div className="flex items-center gap-2 text-neutral-500">
        <span className="site-kicker flex items-center justify-center">
          Services
        </span>
        <span
          aria-hidden="true"
          className="-translate-y-2 flex h-[14px] w-[14px] items-center justify-center rounded-[1000px] border-[1.5px] border-neutral-500 text-[7px] leading-none font-medium opacity-100"
        >
          S
        </span>
      </div>

      <h2 className="site-display mt-4 max-w-full text-neutral-900 uppercase">
        WHAT WE DO
      </h2>

      <p className="site-copy mt-5 w-[440px] max-w-full text-center text-neutral-600">
        Bringing strategy, creativity and execution together to build brands
        that grow.
      </p>

      <div className="mt-14 grid h-[576px] w-[1283px] max-w-full grid-cols-1 gap-[32px] opacity-100 sm:grid-cols-3">
        {categories.map((category) => (
          <div key={category.label} className="flex flex-col items-start text-left">
            {/* Rendered immediately below the Hero, still within (or
               very near) the first viewport on most screen sizes — so,
               unlike every other homepage image, this one is kept
               eager rather than lazy-loaded (Phase 10, Part 2): it's a
               plausible LCP candidate, and lazy-loading it risks
               delaying LCP rather than improving it. `decoding` is
               deliberately left unset here for the same reason (Part
               3: don't force async decoding on a possible LCP image). */}
            <img
              src={category.image}
              alt={category.label}
              loading="eager"
              className="h-[480px] w-[413px] max-w-full rounded-[8px] object-cover opacity-100"
            />
            <span className="mt-4 text-[18px] leading-[1.25] font-medium tracking-[-0.01em] text-neutral-900 uppercase">
              {category.label}
            </span>
          </div>
        ))}
      </div>

      <div className="site-kicker mt-10 flex w-[1283px] max-w-full flex-wrap items-center justify-center gap-2 text-center text-neutral-500">
        Discover the work behind the brands
        <span aria-hidden="true">&rarr;</span>
        <a
          href="#"
          className="text-neutral-900 underline underline-offset-4"
        >
          View all work
        </a>
      </div>
    </section>
  )
}

export default Services
