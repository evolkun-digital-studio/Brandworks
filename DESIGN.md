---
version: alpha
name: BrandWorks
scope: Marketing site; Concept Creation route direction
colors:
  ink: '#343c2b'
  canvas: '#fafaf7'
  workbench: '#f0f0e9'
  reference: '#eeeee7'
  note: '#f6ed91'
  accent: '#b33e14'
  call-to-action: '#d5fa76'
typography:
  display:
    fontFamily: 'Google Sans Flex, ui-sans-serif, system-ui, sans-serif'
  body:
    fontFamily: 'Open Sans, ui-sans-serif, system-ui, sans-serif'
  annotation:
    fontFamily: 'ui-monospace, monospace'
rounded:
  canvas: '3px'
  button: '9999px'
spacing:
  page-max: '1440px'
  section-mobile: '64px'
  section-desktop: '96px'
components:
  selector: 'Rounded text buttons; dark olive selected state; aria-pressed'
  workbench: 'A bounded reference collage with a three-stage narrative'
  campaign-preview: 'Three original applications of one clearly labelled fictional concept'
  disclosure: 'Thin dividers, native buttons or details, visible expansion state'
---

# BrandWorks design context

## Overview

This file records the Concept Creation redesign. It does not prescribe a redesign of other service routes or the admin application. Existing runtime tokens in `src/index.css` remain canonical for the shared brand, typography, gutters and breakpoints.

The marketing site helps prospective clients understand the studio's services and start a project. The page uses English; no new market or locale assumptions are introduced.

### Creative North Star

A concept writer's physical workbench: reference prints, a pencilled connection, a note worth keeping, then applications of the idea. The signature is showing the thought developing rather than using oversized headlines to describe creativity.

The illustrative juice brand, daylight, connects an ordinary orange with the human desire for a brighter day. It is explicitly a studio exploration, never a client case study or a performance claim.

### Restraint and anti-references

Keep display text between 26–44px, body text around 15px, and captions compact. Avoid oversized slogans, decorative statistic panels, generic feature-card grids, unrequested autoplay carousels and pinned scroll sequences. Preserve actual readable copy and native page scrolling.

## Colors

Shared brand values come from `src/index.css`. The route-local colors above are implemented as Tailwind utilities in `src/legacy-pages/services/Conceptcreationpage.tsx`. Olive text and neutral surfaces make the photography and pale-yellow note carry the composition; burnt orange is reserved for annotations and focus. Lime appears in the closing invitation. These are hand-authored utilities, not generated theme outputs.

## Typography

Use the existing Google Sans Flex display font through `--section-title-font` and Open Sans through `font-secondary`. Local `--font-primary` resolves semantic headings to the shared display face. Monospace is reserved for genuine process numbering. Avoid decorative studio stamps, section kickers and self-referential labels; the user considers these AI watermarks. No additional fonts or external font requests.

## Layout

Use the shared 1440px maximum and desktop hero gutter. On phones use a 20px gutter, rising to 32px at the small breakpoint. Two-column editorial compositions collapse into a single reading sequence. Campaign mockups preserve the same idea at every width; reserve their geometry before images load. Avoid viewport-height sections for explanatory content.

## Elevation & Depth

Subtle print shadows distinguish reference photos and paper notes. Keep text sections flat. Mockup shadows represent physical campaign objects, not general UI cards.

## Shapes

Reference photographs have nearly square corners. Selectors and the primary action use rounded pills. Campaign cans, billboard frames and phone frames have object-specific geometry.

## Components

The workbench selector exposes three stages with `aria-pressed`, a controlled description and a live update. Campaign format buttons expose the same selected-state pattern. Use real buttons for state changes and links for navigation. Route the project invitation to `/start-project`; the services breadcrumb returns to `/services`.

Process disclosures expose `aria-expanded`, associate buttons with their panels, and permit closing the current panel. FAQs use native `details` and `summary`. Every interactive element has a visible focus outline, hover feedback and a readable label. Selections have shape/text treatment as well as color.

## Motion

Use Motion for deliberate, user-triggered changes in the workbench. GSAP reveals content once on entry. Reduced motion disables workbench movement and scroll reveals, with all content immediately visible. Motion must not be needed to discover or understand the page. No looping visual noise or scroll pinning. At the user’s request, both the concept stages and campaign formats rotate every 2.5 seconds while visible. Campaigns use a 700ms crossfade; the concept board retains its 650ms print movement. Keep a pause/resume control, reset the interval after manual selection, stop background-tab advancement, and disable automatic rotation under reduced motion. Stack the three previews in one grid cell to reserve a constant height.

## Imagery

Three locally served WebP photos were sourced from Unsplash; credits and direct source links appear at the bottom of the route. Campaign layouts are original HTML/Tailwind compositions. See `public/images/concept-creation/SOURCES.md` for exact provenance. No runtime dependency on third-party image hosting.

## Verification

Check desktop and narrow phone layouts, every workbench stage, every campaign format, process/FAQ disclosures, keyboard focus, image failures and reduced motion. Run TypeScript, the changed-file linter and the production build when available. Keep unrelated user changes intact.
