import photo15 from './Photo/Photo15.png'
import { trackEvent } from './analytics/analytics'
import { AnalyticsEvents } from './analytics/events'

const industries = [
  {
    name: 'Real Estate',
    description:
      'We help real estate brands communicate their vision, value and unique offerings through clear strategy, compelling creative direction and digital experiences that inspire confidence and generate interest.',
    image: photo15,
  },
]

function Industries() {
  return (
    <section className="mx-auto flex w-full max-w-[1280px] flex-col px-4 py-20">
      <h2 className="site-display max-w-[900px] text-neutral-900 uppercase">
        Industries We Work With
      </h2>

      <p className="site-copy mt-4 max-w-[620px] text-neutral-600">
        Every industry has a different story. We help brands build clear,
        relevant and meaningful experiences across diverse sectors.
      </p>

      {industries.map((industry) => (
        <div
          key={industry.name}
          className="mt-14 grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16"
        >
          <div className="flex flex-col items-start text-left">
            <h3 className="text-[26px] leading-[1.2] font-semibold tracking-[-0.02em] text-neutral-900">
              {industry.name}
            </h3>
            <p className="site-copy mt-4 text-neutral-700">
              {industry.description}
            </p>
            <a
              href="#"
              onClick={() => trackEvent({ name: AnalyticsEvents.serviceCtaClick, params: { industry: industry.name } })}
              className="mt-6 text-[14px] font-medium text-neutral-900 underline underline-offset-4"
            >
              View Case Study
            </a>
          </div>

          <img
            src={industry.image}
            alt={industry.name}
            loading="lazy"
            decoding="async"
            className="aspect-[4/3] w-full rounded-[16px] object-cover"
          />
        </div>
      ))}
    </section>
  )
}

export default Industries
