'use client'

import { NavLink } from '../routing'
import './InsightsNavigation.css'

/** The routing adapter uses Next.js Link and the current pathname in Next. */
export default function InsightsNavigation() {
  return (
    <nav aria-label="Journal and Newsroom" className="insights-navigation">
      <NavLink to="/blog" end>Journal</NavLink>
      <NavLink to="/news" end>Newsroom</NavLink>
    </nav>
  )
}
