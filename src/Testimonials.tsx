const testimonial = {
  quote:
    'The AI agents have taken a huge amount of repetitive work off our team, automating tasks that used to consume hours every day. Everything now feels noticeably faster, simpler, and far more organized, allowing our team to focus on higher-value work instead of manual processes.',
  name: 'Mikle John',
  role: 'Marketing Director',
  initials: 'MJ',
  avatarColor: '#2f8f4e',
}

const testimonials = [testimonial, testimonial, testimonial]

function Testimonials() {
  return (
    <section className="mx-auto flex w-full max-w-[1280px] flex-col px-4 py-20">
      <h2 className="site-heading text-neutral-900 uppercase">
        Testimonials
      </h2>

      <p className="site-copy mt-4 max-w-[560px] text-neutral-600">
        See how businesses are using intelligent automation to work smarter
        and scale faster.
      </p>

      <div className="mt-10 grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {testimonials.map((item, index) => (
          <div
            key={index}
            className="flex min-h-[360px] flex-col justify-between rounded-[16px] bg-neutral-100 p-8 text-left"
          >
            <p className="text-[15px] leading-[1.6] font-normal text-neutral-700">
              {item.quote}
            </p>

            <div className="mt-8 flex items-center gap-3">
              <span
                style={{ backgroundColor: item.avatarColor }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white"
              >
                {item.initials}
              </span>
              <div className="flex flex-col">
                <span className="text-[14px] leading-tight font-semibold text-neutral-900">
                  {item.name}
                </span>
                <span className="text-[12px] leading-tight text-neutral-500">
                  {item.role}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default Testimonials
