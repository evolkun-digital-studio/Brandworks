const columns = [
  {
    title: 'Company',
    links: ['About', 'Services', 'Our Work', 'Industries'],
  },
  {
    title: 'Services',
    links: [
      'Brand Strategy',
      'Brand Identity',
      'Graphic Design',
      'Content Creation',
      'UI/UX Designing',
      'SMM',
      'SEO',
    ],
  },
  {
    title: 'Industries',
    links: [
      'Fashion & Lifestyle',
      'Real Estate',
      'Technology',
      'Hospitality',
      'Healthcare',
      'Automotive',
      'Food & Beverage',
      'E-commerce',
    ],
  },
]

const socialIcons = [
  {
    label: 'Instagram',
    path: 'M12 2c-2.72 0-3.06.01-4.12.06-1.06.05-1.79.22-2.43.47-.66.26-1.22.6-1.77 1.16a4.9 4.9 0 0 0-1.16 1.77c-.25.64-.42 1.37-.47 2.43C2 8.94 2 9.28 2 12s.01 3.06.06 4.12c.05 1.06.22 1.79.47 2.43.26.66.6 1.22 1.16 1.77a4.9 4.9 0 0 0 1.77 1.16c.64.25 1.37.42 2.43.47C8.94 22 9.28 22 12 22s3.06-.01 4.12-.06c1.06-.05 1.79-.22 2.43-.47a4.9 4.9 0 0 0 1.77-1.16 4.9 4.9 0 0 0 1.16-1.77c.25-.64.42-1.37.47-2.43.05-1.06.06-1.4.06-4.12s-.01-3.06-.06-4.12c-.05-1.06-.22-1.79-.47-2.43a4.9 4.9 0 0 0-1.16-1.77 4.9 4.9 0 0 0-1.77-1.16c-.64-.25-1.37-.42-2.43-.47C15.06 2.01 14.72 2 12 2m0 1.8c2.67 0 2.99.01 4.04.06.98.04 1.5.2 1.85.34.47.18.8.4 1.15.75s.57.68.75 1.15c.14.36.3.87.34 1.85.05 1.05.06 1.37.06 4.04s-.01 2.99-.06 4.04c-.04.98-.2 1.5-.34 1.85-.18.47-.4.8-.75 1.15s-.68.57-1.15.75c-.36.14-.87.3-1.85.34-1.05.05-1.37.06-4.04.06s-2.99-.01-4.04-.06c-.98-.04-1.5-.2-1.85-.34a3.1 3.1 0 0 1-1.15-.75 3.1 3.1 0 0 1-.75-1.15c-.14-.36-.3-.87-.34-1.85C3.81 15 3.8 14.67 3.8 12s.01-2.99.06-4.04c.04-.98.2-1.5.34-1.85.18-.47.4-.8.75-1.15s.68-.57 1.15-.75c.36-.14.87-.3 1.85-.34C8.99 3.81 9.33 3.8 12 3.8m0 3.06a5.14 5.14 0 1 0 0 10.28 5.14 5.14 0 0 0 0-10.28m0 8.48a3.34 3.34 0 1 1 0-6.68 3.34 3.34 0 0 1 0 6.68m6.54-8.68a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0',
  },
  {
    label: 'X',
    path: 'M18.9 3H21.7l-6.06 6.93L22.8 21h-5.58l-4.37-5.72L7.83 21H5.02l6.48-7.41L4.2 3h5.72l3.95 5.23zm-.98 16.2h1.5L7.14 4.7H5.53z',
  },
  {
    label: 'LinkedIn',
    path: 'M6.94 8.44H3.56V20.5h3.38zM5.25 3.1a1.96 1.96 0 1 0 0 3.92 1.96 1.96 0 0 0 0-3.92M20.44 20.5v-6.63c0-3.56-1.9-5.22-4.44-5.22-2.05 0-2.96 1.13-3.47 1.92V8.44H9.15c.05 1 0 12.06 0 12.06h3.38v-6.74c0-.36.03-.72.13-.98.29-.72.95-1.47 2.05-1.47 1.45 0 2.03 1.1 2.03 2.72v6.47z',
  },
  {
    label: 'TikTok',
    path: 'M14.5 2h2.9c.16 1.36.85 2.55 1.87 3.36 1.02.8 2.3 1.23 3.63 1.23v2.93a7.6 7.6 0 0 1-4.4-1.42v6.4c0 3.24-2.62 5.86-5.86 5.86A5.87 5.87 0 0 1 6.7 12.4c1.2-1.2 2.9-1.83 4.66-1.66v2.98a2.9 2.9 0 0 0-2.03.28 2.94 2.94 0 0 0-1.4 3.36 2.94 2.94 0 0 0 3.79 1.98 2.94 2.94 0 0 0 1.98-2.78z',
  },
]

function Footer() {
  return (
    <footer className="w-full bg-white pt-20">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-12 px-4 sm:flex-row sm:justify-between">
        {columns.map((column) => (
          <div key={column.title} className="flex flex-col gap-4">
            <h3 className="text-[16px] font-semibold text-neutral-900">
              {column.title}
            </h3>
            <ul className="flex flex-col gap-3">
              {column.links.map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="text-[14px] text-neutral-700 transition-colors hover:text-neutral-900"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
            {column.title === 'Company' && (
              <ul className="mt-1 flex flex-col gap-3">
                <li>
                  <span className="site-kicker text-neutral-400">
                    Resources
                  </span>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-[14px] text-neutral-700 transition-colors hover:text-neutral-900"
                  >
                    FAQs
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-[14px] text-neutral-700 transition-colors hover:text-neutral-900"
                  >
                    Contact
                  </a>
                </li>
              </ul>
            )}
          </div>
        ))}

        <div className="flex flex-col gap-4 sm:max-w-[280px]">
          <h3 className="text-[16px] font-semibold text-neutral-900">
            Subscribe
          </h3>
          <form
            onSubmit={(e) => e.preventDefault()}
            className="flex items-center justify-between gap-2 border-b border-neutral-300 pb-2"
          >
            <input
              type="email"
              placeholder="Enter your email address"
              className="w-full text-[14px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
            />
            <button
              type="submit"
              aria-label="Subscribe"
              className="shrink-0 text-neutral-900"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </form>

          <p className="text-[14px] leading-[1.5] text-neutral-500">
            By subscribing, you agree to our{' '}
            <a href="#" className="underline underline-offset-2">
              Privacy Policy
            </a>
            . You can unsubscribe at any time.
          </p>

          <h4 className="mt-2 text-[14px] text-neutral-900">
            Follow <span className="font-semibold">BRANDWORKS</span>:
          </h4>
          <div className="flex items-center gap-3">
            {socialIcons.map((icon) => (
              <a
                key={icon.label}
                href="#"
                aria-label={icon.label}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 text-neutral-700 transition-colors hover:border-neutral-900 hover:text-neutral-900"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path d={icon.path} />
                </svg>
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-16 w-full overflow-hidden">
        <span className="block w-full translate-y-[0.08em] text-center text-[10vw] leading-[0.8] font-black tracking-tight whitespace-nowrap text-neutral-900 uppercase sm:text-[9vw]">
          Brandworks
        </span>
      </div>

      <div className="mx-auto flex w-full max-w-[1280px] flex-col items-center gap-3 border-t border-neutral-200 px-4 py-6 text-center sm:flex-row sm:justify-between sm:text-left">
        <span className="flex items-center gap-1 text-[16px] font-semibold tracking-[-0.02em] text-neutral-900">
          BRANDWORKS
          <sup className="text-[10px]">&reg;</sup>
        </span>
        <span className="text-[14px] text-neutral-500">
          &copy; 2026 BRANDWORKS. All rights reserved.
        </span>
        <span className="flex items-center gap-2 text-[14px] text-neutral-500">
          <a href="#" className="hover:text-neutral-900">
            Privacy Policy
          </a>
          &middot;
          <a href="#" className="hover:text-neutral-900">
            Terms &amp; Conditions
          </a>
        </span>
      </div>
    </footer>
  )
}

export default Footer
