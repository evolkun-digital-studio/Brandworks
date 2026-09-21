import { motion } from 'motion/react'
import type { HTMLMotionProps } from 'motion/react'
import type { ReactNode } from 'react'

// The editorial section vocabulary: one container, one label style, one
// heading style, one description style. The type and spacing live in
// index.css (`.section-*`, in `@layer components`); these components only
// attach the class, so a section reads as structure rather than a wall of
// utilities. The text primitives are motion elements and pass every
// motion prop through, so a section decides its own entrance.

const cx = (...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(' ')

export function SectionContainer({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('section-container', className)}>{children}</div>
}

/** P2 — the small uppercase line that names a section. */
export function SectionLabel({ className, ...props }: HTMLMotionProps<'p'>) {
  return <motion.p className={cx('section-label', className)} {...props} />
}

/** H2 — a section's statement. */
export function SectionHeading({ className, ...props }: HTMLMotionProps<'h2'>) {
  return <motion.h2 className={cx('section-heading', className)} {...props} />
}

/** P1 — the supporting paragraph under a section heading. */
export function SectionDescription({ className, ...props }: HTMLMotionProps<'p'>) {
  return <motion.p className={cx('section-description', className)} {...props} />
}
