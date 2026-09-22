import type { ReactNode } from 'react'
import './SocialPhone.css'

/**
 * A generic phone shell. The frame is drawn in CSS rather than an image, so
 * the screen mask is derived from the same bezel variable as the frame and
 * can never drift out of line with it. Layers:
 *   3 frame   — bezel, edge highlight and camera island; ignores the pointer
 *   2 screen  — the rounded mask; clips whatever is inside
 *   1 content — `children`, rendered inside the screen
 */
function SocialPhone({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`social-phone ${className}`}>
      <div className="social-phone__screen">{children}</div>
      <div className="social-phone__frame" aria-hidden="true" />
    </div>
  )
}

export default SocialPhone
