import photo4 from './Photo/Photo4.png'
import photo5 from './Photo/Photo5.png'
import photo6 from './Photo/Photo6.png'
import photo7 from './Photo/Photo7.png'
import photo8 from './Photo/Photo8.png'

const projects = [
  { image: photo4, label: 'Aerolink', index: '01/06', fixedWidth: 629 },
  { image: photo5, label: 'Riaaj Vintage', index: '02/06', fixedWidth: 629 },
  { image: photo6, label: 'Mr.Rework', index: '03/06', wide: true, fixedWidth: 1282 },
  { image: photo7, label: 'Delhi-6', index: '04/06', fixedWidth: 629 },
  { image: photo8, label: 'Nexa Solutions', index: '05/06', fixedWidth: 629 },
]

function Work() {
  return (
    <section className="flex flex-col items-center bg-white px-4 pt-16 pb-20 text-center sm:pt-20 sm:pb-28">
      <div className="flex items-center gap-2 text-neutral-500">
        <span className="site-kicker whitespace-nowrap">
          Featured Work
        </span>
        <span
          aria-hidden="true"
          className="-translate-y-2 flex h-[14px] w-[14px] items-center justify-center rounded-[1000px] border-[1.5px] border-neutral-500 text-[7px] leading-none font-medium opacity-100"
        >
          W
        </span>
      </div>

      <h2 className="site-display mt-4 max-w-full text-neutral-900 uppercase">
        Work with impact
      </h2>

      <p className="site-copy mt-5 w-[540px] max-w-full text-center text-neutral-600">
        A selection of projects created to build stronger brands, meaningful
        experiences and measurable results.
      </p>

      <div className="mt-14 grid w-[1282px] max-w-full grid-cols-1 gap-[24px] opacity-100 sm:grid-cols-2">
        {projects.map((project) => (
          <div
            key={project.label}
            style={project.fixedWidth ? { width: `${project.fixedWidth}px` } : undefined}
            className={`relative h-[580px] max-w-full overflow-hidden rounded-[8px] ${
              project.fixedWidth ? '' : 'w-full'
            } ${project.wide ? 'sm:col-span-2' : ''}`}
          >
            <img
              src={project.image}
              alt={project.label}
              loading="lazy"
              decoding="async"
              className="h-full w-full rounded-[8px] object-cover opacity-100"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent" />
            <span className="absolute top-4 right-4 text-sm font-medium tracking-wide text-white">
              {project.index}
            </span>
            <span className="absolute bottom-4 left-4 text-[20px] font-semibold tracking-[-0.02em] text-white uppercase">
              {project.label}
            </span>
          </div>
        ))}
      </div>

      <div className="site-kicker mt-10 flex w-[1282px] max-w-full flex-wrap items-center justify-center gap-2 text-center text-neutral-500">
        Browse our latest projects
        <span aria-hidden="true">&rarr;</span>
        <a
          href="#"
          className="font-semibold text-neutral-900 underline underline-offset-4"
        >
          View all work
        </a>
      </div>
    </section>
  )
}

export default Work
