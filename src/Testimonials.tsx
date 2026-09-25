type Testimonial = {
  quote: string
  name: string
  role: string
  initials: string
  avatarColor: string
}

const testimonials: Testimonial[] = [
  {
  quote:
    'The AI agents have taken a huge amount of repetitive work off our team, automating tasks that used to consume hours every day. Everything now feels noticeably faster, simpler, and far more organized, allowing our team to focus on higher-value work instead of manual processes.',
  name: 'Mikle John',
  role: 'Marketing Director',
  initials: 'MJ',
  avatarColor: '#2f8f4e',
},
  {
  quote:
    'The AI agents have taken a huge amount of repetitive work off our team, automating tasks that used to consume hours every day. Everything now feels noticeably faster, simpler, and far more organized, allowing our team to focus on higher-value work instead of manual processes.',
  name: 'Mikle John',
  role: 'Marketing Director',
  initials: 'MJ',
  avatarColor: '#2f8f4e',
},
  {
  quote:
    'The AI agents have taken a huge amount of repetitive work off our team, automating tasks that used to consume hours every day. Everything now feels noticeably faster, simpler, and far more organized, allowing our team to focus on higher-value work instead of manual processes.',
  name: 'Mikle John',
  role: 'Marketing Director',
  initials: 'MJ',
  avatarColor: '#2f8f4e',
}
]

function Testimonials() {
  return (
    <section className="mx-auto flex w-full max-w-[1280px] flex-col px-4 pb-16 pt-20 sm:px-6 sm:pb-20 sm:pt-24 md:px-8 lg:px-10 lg:pb-28 lg:pt-28 xl:px-0">
      <h2 className="site-heading text-neutral-900">
        What clients say.
      </h2>

      <p className="site-copy mt-4 max-w-[560px] text-neutral-600">
        Feedback from people we have worked with.
      </p>

      {testimonials.length > 0 && (
        <div className="mt-10 grid w-full grid-cols-1 gap-5 sm:mt-12 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {testimonials.map((item, index) => (
            <article
              key={`${item.name}-${index}`}
              className="flex min-h-[300px] flex-col justify-between rounded-[16px] bg-neutral-100 p-6 text-left sm:min-h-[330px] sm:p-7 lg:min-h-[360px] lg:p-8"
            >
              <blockquote className="text-[14px] font-normal leading-[1.65] text-neutral-700 sm:text-[15px]">
                “{item.quote}”
              </blockquote>

              <div className="mt-8 flex items-center gap-3">
                <span
                  style={{ backgroundColor: item.avatarColor }}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white sm:text-[13px]"
                  aria-hidden="true"
                >
                  {item.initials}
                </span>

                <div className="flex min-w-0 flex-col">
                  <span className="text-[14px] font-semibold leading-tight text-neutral-900">
                    {item.name}
                  </span>

                  <span className="mt-1 text-[12px] leading-tight text-neutral-500">
                    {item.role}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default Testimonials