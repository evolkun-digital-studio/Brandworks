import { motion, useReducedMotion } from 'motion/react'
import type { CSSProperties, ReactNode } from 'react'

// The site's shared entrance easing — the same curve Capabilities.tsx
// uses, so every section lands with the same weight. Kept private so
// this module only ever exports components (fast refresh).
const EASE = [0.22, 1, 0.36, 1] as const

type FadeUpProps = {
  children: ReactNode
  delay?: number
  duration?: number
  y?: number
  className?: string
  style?: CSSProperties
  as?: 'div' | 'section' | 'span' | 'h2' | 'h3' | 'p'
  once?: boolean
}

/**
 * One element rising into place as it scrolls into view: opacity and
 * transform only, so nothing here can trigger layout.
 *
 * With `prefers-reduced-motion: reduce` the element renders in its
 * final state with no `initial`, no `whileInView` and no transform —
 * motion mounts no viewport observer at all, so there is nothing to
 * tear down beyond what motion already cleans up on unmount.
 */
export function FadeUp({
  children,
  delay = 0,
  duration = 0.7,
  y = 24,
  className,
  style,
  as = 'div',
  once = true,
}: FadeUpProps) {
  const reduce = useReducedMotion()
  // `motion[as]` is a union of element components, which TS can't
  // narrow into a single JSX signature; the cast picks one set of
  // props for typing only — the rendered tag is still `as`.
  const Tag = motion[as] as typeof motion.div

  if (reduce) {
    return (
      <Tag className={className} style={style}>
        {children}
      </Tag>
    )
  }

  return (
    <Tag
      className={className}
      style={style}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount: 0.2 }}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </Tag>
  )
}

export default FadeUp
