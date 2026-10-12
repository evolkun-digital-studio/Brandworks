import styles from './avc.module.css'

const PRINCIPLES = [
  {
    number: '01',
    title: 'Understand Before Building',
    description:
      'You do not start with a service package. You first understand the business, users, workflow and problem.',
    icon: 'circles',
  },
  {
    number: '02',
    title: 'Solve, Do Not Decorate',
    description:
      'A beautiful digital product without business value is not enough. Every decision should support a purpose.',
    icon: 'starburst',
  },
  {
    number: '03',
    title: 'Build for the Next Stage',
    description:
      "The system should not only solve today's problem. It should prepare the business for its next stage of growth.",
    icon: 'arrow',
  },
  {
    number: '04',
    title: 'Work as a Partner',
    description:
      'You do not disappear after delivery. You remain involved in improvement, learning and evolution where appropriate.',
    icon: 'squares',
  },
] as const

function PrincipleIcon({ name }: { name: (typeof PRINCIPLES)[number]['icon'] }) {
  if (name === 'circles') {
    return (
      <svg
        width="44"
        height="44"
        viewBox="0 0 28 28"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="10.5" cy="14" r="7" />
        <circle cx="17.5" cy="14" r="7" />
      </svg>
    )
  }

  if (name === 'starburst') {
    return (
      <svg
        width="33"
        height="33"
        viewBox="0 0 28 28"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <line x1="14" y1="5" x2="14" y2="23" />
        <line x1="5" y1="14" x2="23" y2="14" />
        <line x1="7.6" y1="7.6" x2="20.4" y2="20.4" />
        <line x1="20.4" y1="7.6" x2="7.6" y2="20.4" />
        <line x1="10.5" y1="5.7" x2="17.5" y2="22.3" />
        <line x1="5.7" y1="10.5" x2="22.3" y2="17.5" />
        <line x1="17.5" y1="5.7" x2="10.5" y2="22.3" />
        <line x1="5.7" y1="17.5" x2="22.3" y2="10.5" />
      </svg>
    )
  }

  if (name === 'arrow') {
    return (
      <svg
        width="33"
        height="33"
        viewBox="0 0 28 28"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <line x1="7" y1="21" x2="20" y2="8" />
        <polyline points="10,8 20,8 20,18" />
      </svg>
    )
  }

  return (
    <svg
      width="33"
      height="33"
      viewBox="0 0 28 28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="5.5" y="9.5" width="13" height="13" rx="1.5" />
      <path d="M10.5 9.5V6a1.5 1.5 0 0 1 1.5-1.5h10A1.5 1.5 0 0 1 23.5 6v10a1.5 1.5 0 0 1-1.5 1.5h-4" />
    </svg>
  )
}

export default function BrandworksPhilosophy() {
  return (
    <section
      className={`${styles.section} home-section`}
      aria-labelledby="core-philosophy-title"
    >
      <div className={styles.inner}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <p className={styles.eyebrow}></p>
            <h2 id="core-philosophy-title" className={styles.title}>
              BrandWorks&apos; Core Philosophy
            </h2>
          </div>

          <p className={styles.intro}>
            Our philosophy is built around four principles that guide everything
            we create, from strategy to execution.
          </p>
        </header>

        <div className={styles.grid}>
          {PRINCIPLES.map((principle) => (
            <article className={styles.card} key={principle.title}>
              <div className={styles.iconWrap}>
                <PrincipleIcon name={principle.icon} />
              </div>

              <div className={styles.cardBody}>
                <h3 className={styles.cardTitle}>{principle.title}</h3>
                <p className={styles.cardDescription}>{principle.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
