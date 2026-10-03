import { Link } from 'react-router-dom'

const services = [
  {
    id: '01',
    title: 'Founder Positioning',
    text: 'Define what the founder should be known for and build a clear public position around experience, expertise and point of view.',
  },
  {
    id: '02',
    title: 'Media Relations',
    text: 'Develop relevant stories and connect them with journalists, publications and platforms where the conversation genuinely belongs.',
  },
  {
    id: '03',
    title: 'Thought Leadership',
    text: 'Turn real business knowledge into commentary, interviews, opinion pieces and useful founder-led perspectives.',
  },
  {
    id: '04',
    title: 'Executive Visibility',
    text: 'Build visibility through carefully selected interviews, podcasts, panels, conferences and industry opportunities.',
  },
  {
    id: '05',
    title: 'Reputation Strategy',
    text: 'Create consistency between what people hear about the founder, what they find online and what the business stands for.',
  },
  {
    id: '06',
    title: 'Issues Communication',
    text: 'Prepare leadership teams for difficult conversations with clear messaging, responsibilities and response frameworks.',
  },
]

const process = [
  {
    number: '01',
    title: 'Understand the founder',
    text: 'We begin with the person, not the press release. Their experience, beliefs, expertise, ambitions and existing public footprint.',
  },
  {
    number: '02',
    title: 'Define the position',
    text: 'We identify the subjects the founder can credibly own and the ideas worth repeatedly associating with their name.',
  },
  {
    number: '03',
    title: 'Build the narrative',
    text: 'We turn that position into media angles, founder messaging, editorial themes and clear communication principles.',
  },
  {
    number: '04',
    title: 'Create visibility',
    text: 'We take the story into the right publications, conversations, events and platforms instead of chasing attention everywhere.',
  },
]

const faq = [
  {
    q: 'Is founder reputation the same as personal branding?',
    a: 'No. Personal branding often focuses on visibility and content output. Founder reputation is broader. It considers credibility, media presence, search results, public statements, leadership visibility and how all of those influence perception.',
  },
  {
    q: 'Do you guarantee press coverage?',
    a: 'No independent publication can be genuinely guaranteed. Our work focuses on developing stronger stories, identifying relevant media opportunities and presenting them professionally.',
  },
  {
    q: 'Do founders need to post every day?',
    a: 'No. A strong reputation does not require constant posting. The right combination of media, speaking, commentary and selective founder content is usually more valuable than high-volume activity.',
  },
  {
    q: 'Can you work with our existing marketing team?',
    a: 'Yes. The reputation programme can work alongside an internal communications team, marketing department or other specialist partners.',
  },
]

export default function PRFounderReputationPage() {
  return (
    <main className="overflow-hidden bg-white text-[#111]">

      {/* HERO */}
      <section className="px-5 pb-14 pt-28 md:px-10 md:pb-20 md:pt-36 lg:px-16">
        <div className="mx-auto max-w-[1440px]">

          <div className="mb-12 grid gap-10 lg:grid-cols-[1.4fr_.6fr] lg:items-end">

            <div>
              <p className="mb-7 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/40">
                PR & Founder Reputation
              </p>

              <h1 className="max-w-[930px] text-[clamp(44px,6vw,84px)] font-medium leading-[0.92] tracking-[-0.06em]">
                Build the reputation behind the business.
              </h1>
            </div>

            <div className="max-w-[440px] lg:justify-self-end">
              <p className="text-[16px] leading-[1.75] text-black/60">
                Strategic PR and founder positioning for leaders who want to be
                recognised for the right reasons, in the right places.
              </p>

              <Link
                to="/contact"
                className="mt-8 inline-flex items-center border-b border-black pb-1 text-[14px] font-semibold"
              >
                Start a conversation
                <span className="ml-3">↗</span>
              </Link>
            </div>

          </div>

          <div className="relative h-[55vh] min-h-[430px] overflow-hidden md:h-[70vh]">
            <img
              src="https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=2000&q=90"
              alt="Professional office environment"
              className="h-full w-full object-cover"
            />

            <div className="absolute bottom-0 left-0 bg-white p-5 md:p-7">
              <p className="max-w-[300px] text-[12px] leading-[1.55] text-black/55">
                Positioning · Media Relations · Thought Leadership · Reputation
              </p>
            </div>
          </div>

        </div>
      </section>


      {/* INTRO */}
      <section className="px-5 py-24 md:px-10 md:py-32 lg:px-16">
        <div className="mx-auto max-w-[1440px]">

          <div className="grid gap-12 lg:grid-cols-[.5fr_1.5fr]">

            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/40">
              What reputation means
            </p>

            <div>
              <h2 className="max-w-[920px] text-[clamp(34px,4.5vw,60px)] font-medium leading-[1] tracking-[-0.05em]">
                People form an opinion about a founder long before they ever meet them.
              </h2>

              <div className="mt-12 grid gap-8 border-t border-black/10 pt-8 md:grid-cols-2">

                <p className="text-[15px] leading-[1.8] text-black/55">
                  They see an interview. Read an article. Search their name.
                  Hear them speak. Notice how they respond when the company is
                  under pressure.
                </p>

                <p className="text-[15px] leading-[1.8] text-black/55">
                  Good reputation work makes those moments feel connected.
                  It gives the founder a clear position and gives the audience
                  a consistent reason to trust it.
                </p>

              </div>
            </div>

          </div>

        </div>
      </section>


      {/* IMAGE + MESSAGE */}
      <section className="px-5 pb-24 md:px-10 md:pb-32 lg:px-16">
        <div className="mx-auto grid max-w-[1440px] gap-8 lg:grid-cols-[1.05fr_.95fr]">

          <div className="min-h-[620px] overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1600&q=90"
              alt="Business leaders having a professional discussion"
              className="h-full w-full object-cover"
            />
          </div>

          <div className="flex flex-col justify-between bg-[#111] p-8 text-white md:p-12 lg:p-14">

            <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">
              Our point of view
            </p>

            <div>
              <h2 className="max-w-[560px] text-[clamp(34px,4vw,54px)] font-medium leading-[1] tracking-[-0.045em]">
                A founder does not need to be everywhere.
              </h2>

              <p className="mt-7 max-w-[480px] text-[15px] leading-[1.75] text-white/55">
                They need to be visible in the places that make sense for the
                business, speaking about subjects where they have something
                meaningful to contribute.
              </p>
            </div>

          </div>

        </div>
      </section>


      {/* SERVICES */}
      <section className="border-y border-black/10 bg-[#f5f5f2] px-5 py-24 md:px-10 md:py-32 lg:px-16">
        <div className="mx-auto max-w-[1440px]">

          <div className="mb-16 grid gap-10 lg:grid-cols-[.5fr_1.5fr]">

            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/40">
              What we do
            </p>

            <h2 className="max-w-[750px] text-[clamp(34px,4vw,54px)] font-medium leading-[1] tracking-[-0.045em]">
              One reputation.
              <br />
              Built across multiple places.
            </h2>

          </div>

          <div className="border-t border-black/15">

            {services.map((service) => (
              <div
                key={service.id}
                className="grid gap-5 border-b border-black/15 py-9 md:grid-cols-[80px_280px_1fr]"
              >
                <span className="text-[12px] text-black/30">
                  {service.id}
                </span>

                <h3 className="text-[20px] font-medium tracking-[-0.02em]">
                  {service.title}
                </h3>

                <p className="max-w-[610px] text-[14px] leading-[1.75] text-black/50">
                  {service.text}
                </p>
              </div>
            ))}

          </div>

        </div>
      </section>


      {/* MEDIA SECTION */}
      <section className="px-5 py-24 md:px-10 md:py-32 lg:px-16">
        <div className="mx-auto max-w-[1440px]">

          <div className="grid gap-16 lg:grid-cols-[.85fr_1.15fr]">

            <div className="flex flex-col justify-between">

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/40">
                  Media relations
                </p>

                <h2 className="mt-7 max-w-[550px] text-[clamp(34px,4vw,54px)] font-medium leading-[1] tracking-[-0.045em]">
                  Good PR starts before the pitch.
                </h2>
              </div>

              <div className="mt-16 max-w-[470px] lg:mt-0">
                <p className="text-[15px] leading-[1.8] text-black/55">
                  A journalist does not need another company announcement.
                  They need a reason their audience should care.
                </p>

                <p className="mt-5 text-[15px] leading-[1.8] text-black/55">
                  We help shape the underlying story first and then identify the
                  publications, journalists and formats where that story has a
                  natural place.
                </p>
              </div>

            </div>

            <div className="h-[700px] overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1600&q=90"
                alt="Professional business meeting"
                className="h-full w-full object-cover"
              />
            </div>

          </div>

        </div>
      </section>


      {/* QUOTE */}
      <section className="bg-[#ccff00] px-5 py-20 md:px-10 md:py-28 lg:px-16">
        <div className="mx-auto max-w-[1440px]">

          <p className="mb-12 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/45">
            Reputation principle
          </p>

          <blockquote className="max-w-[1180px] text-[clamp(34px,5vw,70px)] font-medium leading-[0.98] tracking-[-0.05em]">
            “Being known is not the same as being trusted.”
          </blockquote>

        </div>
      </section>


      {/* FOUNDER POSITIONING */}
      <section className="px-5 py-24 md:px-10 md:py-32 lg:px-16">
        <div className="mx-auto max-w-[1440px]">

          <div className="grid gap-14 lg:grid-cols-[.5fr_1.5fr]">

            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/40">
              Founder positioning
            </p>

            <div>
              <h2 className="max-w-[850px] text-[clamp(34px,4.2vw,58px)] font-medium leading-[1] tracking-[-0.05em]">
                Find the intersection between what you know and what the market needs to hear.
              </h2>

              <div className="mt-14 grid gap-6 md:grid-cols-3">

                <div className="border-t border-black/20 pt-6">
                  <span className="text-[11px] text-black/35">
                    01
                  </span>

                  <h3 className="mt-10 text-[20px] font-medium">
                    Expertise
                  </h3>

                  <p className="mt-4 text-[14px] leading-[1.7] text-black/50">
                    The experience and knowledge the founder can speak about
                    with genuine authority.
                  </p>
                </div>

                <div className="border-t border-black/20 pt-6">
                  <span className="text-[11px] text-black/35">
                    02
                  </span>

                  <h3 className="mt-10 text-[20px] font-medium">
                    Perspective
                  </h3>

                  <p className="mt-4 text-[14px] leading-[1.7] text-black/50">
                    The opinions and beliefs that make their contribution
                    recognisable rather than generic.
                  </p>
                </div>

                <div className="border-t border-black/20 pt-6">
                  <span className="text-[11px] text-black/35">
                    03
                  </span>

                  <h3 className="mt-10 text-[20px] font-medium">
                    Relevance
                  </h3>

                  <p className="mt-4 text-[14px] leading-[1.7] text-black/50">
                    The connection between that expertise, the audience and the
                    direction of the business.
                  </p>
                </div>

              </div>
            </div>

          </div>

        </div>
      </section>


      {/* PHOTO COLLAGE */}
      <section className="px-5 pb-24 md:px-10 md:pb-32 lg:px-16">
        <div className="mx-auto max-w-[1440px]">

          <div className="grid gap-4 md:grid-cols-[1.25fr_.75fr]">

            <div className="h-[650px] overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1600&q=90"
                alt="Leadership team discussing business"
                className="h-full w-full object-cover"
              />
            </div>

            <div className="grid gap-4">

              <div className="h-[316px] overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=90"
                  alt="Professional executive discussion"
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="flex h-[316px] flex-col justify-between bg-[#111] p-8 text-white">

                <span className="text-[11px] uppercase tracking-[0.16em] text-[#ccff00]">
                  Reputation
                </span>

                <p className="max-w-[350px] text-[24px] font-medium leading-[1.2] tracking-[-0.03em]">
                  Strong public perception is usually built quietly, over time.
                </p>

              </div>

            </div>

          </div>

        </div>
      </section>


      {/* PROCESS */}
      <section className="border-y border-black/10 bg-[#f5f5f2] px-5 py-24 md:px-10 md:py-32 lg:px-16">
        <div className="mx-auto max-w-[1440px]">

          <div className="grid gap-14 lg:grid-cols-[.5fr_1.5fr]">

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/40">
                How we work
              </p>
            </div>

            <div>

              <h2 className="mb-14 max-w-[760px] text-[clamp(34px,4vw,54px)] font-medium leading-[1] tracking-[-0.045em]">
                Position first.
                <br />
                Visibility second.
              </h2>

              {process.map((item) => (
                <div
                  key={item.number}
                  className="grid gap-6 border-t border-black/15 py-9 md:grid-cols-[80px_240px_1fr]"
                >
                  <span className="text-[11px] text-black/30">
                    {item.number}
                  </span>

                  <h3 className="text-[18px] font-semibold">
                    {item.title}
                  </h3>

                  <p className="max-w-[550px] text-[14px] leading-[1.75] text-black/50">
                    {item.text}
                  </p>
                </div>
              ))}

            </div>

          </div>

        </div>
      </section>


      {/* CASE STUDY */}
      <section className="bg-[#111] px-5 py-24 text-white md:px-10 md:py-32 lg:px-16">
        <div className="mx-auto max-w-[1440px]">

          <div className="grid gap-14 lg:grid-cols-[.85fr_1.15fr]">

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ccff00]">
                Illustrative engagement
              </p>

              <h2 className="mt-7 max-w-[550px] text-[clamp(34px,4vw,54px)] font-medium leading-[1] tracking-[-0.045em]">
                Giving an experienced founder a clearer public position.
              </h2>
            </div>

            <div className="border-t border-white/15">

              <div className="grid gap-5 border-b border-white/15 py-8 md:grid-cols-[140px_1fr]">
                <span className="text-[11px] uppercase tracking-[0.12em] text-white/35">
                  Situation
                </span>

                <p className="max-w-[650px] text-[14px] leading-[1.8] text-white/55">
                  A founder had spent years building a successful company but had
                  little public visibility beyond customers and industry contacts.
                </p>
              </div>

              <div className="grid gap-5 border-b border-white/15 py-8 md:grid-cols-[140px_1fr]">
                <span className="text-[11px] uppercase tracking-[0.12em] text-white/35">
                  Position
                </span>

                <p className="max-w-[650px] text-[14px] leading-[1.8] text-white/55">
                  We focused the public narrative around a specific operational
                  subject the founder had dealt with repeatedly across the category.
                </p>
              </div>

              <div className="grid gap-5 border-b border-white/15 py-8 md:grid-cols-[140px_1fr]">
                <span className="text-[11px] uppercase tracking-[0.12em] text-white/35">
                  Programme
                </span>

                <p className="max-w-[650px] text-[14px] leading-[1.8] text-white/55">
                  Media commentary, selective interviews, founder-led editorial
                  content and industry conversations were built around that position.
                </p>
              </div>

              <div className="grid gap-5 py-8 md:grid-cols-[140px_1fr]">
                <span className="text-[11px] uppercase tracking-[0.12em] text-white/35">
                  Direction
                </span>

                <p className="max-w-[650px] text-[14px] leading-[1.8] text-white/55">
                  The founder developed a clearer external identity that could
                  support future press, partnerships and speaking opportunities.
                </p>
              </div>

              <p className="mt-6 text-[10px] text-white/25">
                Fictional example used to demonstrate the structure of an engagement.
              </p>

            </div>

          </div>

        </div>
      </section>


      {/* REPUTATION */}
      <section className="px-5 py-24 md:px-10 md:py-32 lg:px-16">
        <div className="mx-auto max-w-[1440px]">

          <div className="grid gap-12 lg:grid-cols-2">

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/40">
                Reputation management
              </p>

              <h2 className="mt-7 max-w-[610px] text-[clamp(34px,4vw,54px)] font-medium leading-[1] tracking-[-0.045em]">
                The difficult moments should not be the first time you decide how to communicate.
              </h2>
            </div>

            <div className="lg:pt-16">

              <p className="max-w-[560px] text-[15px] leading-[1.8] text-black/55">
                We help teams establish communication principles before they
                need them — responsibilities, message approval, media response,
                stakeholder communication and leadership preparation.
              </p>

              <div className="mt-12 border-t border-black/15">

                {[
                  'Issue response framework',
                  'Founder media preparation',
                  'Internal message alignment',
                  'Stakeholder communication',
                  'Reputation monitoring',
                ].map((item, index) => (
                  <div
                    key={item}
                    className="flex items-center gap-6 border-b border-black/15 py-5"
                  >
                    <span className="text-[11px] text-black/30">
                      {String(index + 1).padStart(2, '0')}
                    </span>

                    <span className="text-[15px] font-medium">
                      {item}
                    </span>
                  </div>
                ))}

              </div>

            </div>

          </div>

        </div>
      </section>


      {/* FAQ */}
      <section className="border-t border-black/10 px-5 py-24 md:px-10 md:py-32 lg:px-16">
        <div className="mx-auto max-w-[1440px]">

          <div className="grid gap-14 lg:grid-cols-[.5fr_1.5fr]">

            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/40">
              Questions
            </p>

            <div>

              {faq.map((item, index) => (
                <details
                  key={item.q}
                  className="group border-t border-black/15"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-8 py-8">

                    <div className="flex gap-6">

                      <span className="hidden pt-1 text-[11px] text-black/30 sm:block">
                        {String(index + 1).padStart(2, '0')}
                      </span>

                      <h3 className="max-w-[700px] text-[19px] font-medium tracking-[-0.02em] md:text-[22px]">
                        {item.q}
                      </h3>

                    </div>

                    <span className="text-[24px] font-light transition-transform duration-200 group-open:rotate-45">
                      +
                    </span>

                  </summary>

                  <div className="pb-9 sm:pl-[48px]">
                    <p className="max-w-[680px] text-[14px] leading-[1.8] text-black/50">
                      {item.a}
                    </p>
                  </div>

                </details>
              ))}

              <div className="border-t border-black/15" />

            </div>

          </div>

        </div>
      </section>


      {/* CTA */}
      <section className="px-5 pb-8 md:px-10 md:pb-10 lg:px-16">
        <div className="mx-auto max-w-[1440px] bg-[#ccff00] px-7 py-16 md:px-12 md:py-20 lg:px-14 lg:py-24">

          <p className="mb-16 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/45">
            PR & Founder Reputation
          </p>

          <div className="grid gap-12 lg:grid-cols-[1.4fr_.6fr] lg:items-end">

            <h2 className="max-w-[900px] text-[clamp(40px,5vw,72px)] font-medium leading-[0.95] tracking-[-0.055em]">
              Build a public reputation as considered as the business behind it.
            </h2>

            <div className="lg:justify-self-end">

              <p className="max-w-[370px] text-[14px] leading-[1.7] text-black/60">
                Tell us where the business is going and what you want the people
                behind it to be known for.
              </p>

              <Link
                to="/contact"
                className="mt-8 inline-flex h-[54px] items-center bg-[#111] px-7 text-[14px] font-semibold text-white"
              >
                Talk to BrandWorks
                <span className="ml-5">↗</span>
              </Link>

            </div>

          </div>

        </div>
      </section>

    </main>
  )
}