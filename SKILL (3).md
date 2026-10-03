---
name: layered-scroll-stack
description: Improve an existing website section that uses scroll-driven stacked divs, cards, images, or videos so each item comes to the foreground one-by-one with a polished layered transition like the supplied reference. Use when editing an existing React/Next/Vite/Tailwind page with a sticky or pinned scroll sequence, especially when the current animation feels abrupt, floaty, unsynchronized, over-animated, or "vibe coded." Read the user's existing files first, preserve the page structure and visual identity, then refine the interaction in-place. Also handle the small Apple-style emoji/sticker detail from the reference without redrawing the emoji.
---

# Layered Scroll Stack

Refine the user's existing section. Do not build a disconnected demo unless the user explicitly asks for one.

## 1. Inspect before editing

Before changing code:

1. Read the page/component file the user names or selects.
2. Read its directly imported CSS/module/style file, local data file, and any child component that controls this section.
3. Read `package.json` to identify the animation libraries already installed.
4. Search the project for existing `ScrollTrigger`, `useScroll`, `Lenis`, sticky containers, card arrays, and scroll utilities before adding another system.
5. If a reference video/image is attached, inspect it first and translate the visible behavior into motion rules.

Never guess the current DOM structure when the actual files are available.

## 2. Preserve the existing design

Treat the user's current page as production work.

- Keep the existing copy, media, colors, typography, spacing language, and responsive structure unless a change is required for the interaction.
- Reuse the current data arrays and components where practical.
- Do not replace the whole page with a new concept.
- Do not add decorative gradients, glass cards, badges, floating blobs, huge headings, random labels, or extra marketing copy.
- Avoid "AI portfolio" styling and unnecessary micro-animation.
- Keep code changes localized to the section and its supporting styles/data.

## 3. Reproduce the reference motion correctly

The reference is a **scroll-driven layered card stack**, not a collection of independent fade-ins.

Build one shared stage where the media cards overlap throughout the transition.

### Desktop behavior

Use a pinned/sticky viewport-height section where appropriate:

- Left content remains visually stable.
- Center media is a stacked stage.
- Right-side service/category content changes in sync with the foreground media.
- Scrolling advances the stack by one item at a time.

For each transition from card `i` to card `i + 1`:

1. Keep both cards visible during the handoff.
2. Bring the incoming card from a small horizontal offset into the main foreground position.
3. Push the outgoing card to the opposite side/back layer.
4. Reduce the outgoing card scale slightly instead of shrinking it dramatically.
5. Use a very small rotation only if it improves the stacked-paper feel.
6. Change `z-index` at the correct moment so the incoming card clearly becomes the front card.
7. Do not fade cards to zero during the normal handoff.
8. Do not allow empty space between cards during the transition.

Use restrained ranges as a starting point, then tune to the existing layout:

- foreground scale: `1`
- back-card scale: about `0.94-0.98`
- horizontal depth offset: about `6-14%` of the card/stage width
- rotation: usually `0-2.5deg`
- opacity for background cards: usually `0.72-1`; avoid ghost-like transparency

The movement should read as **front -> back / next -> front**, not **slide out -> pause -> slide in**.

## 4. Use one master scroll timeline

Prefer a single master timeline for the section so the card stack, active text, tags, and indicator always stay synchronized.

If GSAP + ScrollTrigger already exists, prefer it for this interaction.

Recommended characteristics:

- one `ScrollTrigger` for the complete section
- `scrub` with light smoothing rather than long delayed easing
- pin only the section that needs to stay in view
- labels or equal progress segments for each card state
- `invalidateOnRefresh: true`
- `anticipatePin` only when it fixes a visible pin jump
- animate transforms and opacity; avoid layout properties during scroll

Do not create one separate ScrollTrigger per card unless there is a concrete technical reason.

If Lenis already exists, integrate with the existing Lenis instance. Do not initialize a second smooth-scroll instance inside the section.

If GSAP is not installed, first check whether the project already uses Motion/Framer Motion or another suitable scroll library. Prefer the existing stack. Add a new dependency only when the current stack cannot reproduce the interaction reliably.

## 5. Make the sequence feel deliberate

The animation should have clear visual states.

For `N` cards, divide the scroll distance into `N - 1` handoffs. Each handoff should have:

- a settled state
- an overlap phase
- a clear foreground swap
- another settled state

Avoid constant floating motion after a card reaches its active position.

Do not overuse spring physics. This reference feels controlled and editorial, not bouncy.

For scrubbed GSAP timelines, let scroll position control the movement. Use easing sparingly because heavy easing fights scrub behavior.

## 6. Synchronize the right-side content

The active heading/category and its tags must change during the same master transition that changes the center card.

For inactive rows:

- lower opacity/contrast
- preserve layout so the column does not jump

For the active row:

- restore full contrast
- reveal its tags/details with a short vertical movement and opacity change
- avoid large scaling or bouncing

Do not animate the right column on a different scroll calculation from the media stack.

## 7. Apple-style emoji / sticker detail

Recreate the small emoji treatment as a restrained UI accent, not as a new illustration.

- Use Unicode emoji inside a small rounded sticker/pill/card.
- Use a system emoji font stack such as:
  `"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`.
- Keep the sticker small and slightly offset from the text, similar to the reference.
- A subtle rotation of roughly `-4deg` to `4deg` is acceptable.
- Do not draw emoji manually with CSS/SVG.
- Do not download random Apple emoji PNGs from the web.
- On Apple devices, the Unicode emoji will render with Apple's native emoji style. On other operating systems it will use that platform's emoji renderer.
- If the user requires the exact same Apple emoji artwork on every platform, use only an emoji image asset they provide or are licensed to use.

If the user's existing page already has an emoji/sticker, improve and reuse it instead of adding a duplicate.

## 8. Responsive behavior

Do not force the desktop pinned composition onto small screens.

Desktop/tablet:
- preserve the layered stage when there is enough width
- keep side content synchronized

Mobile:
- reduce the horizontal card offsets and rotation
- shorten excessive pinned scroll distance
- keep cards readable and inside the viewport
- allow the content columns to stack if the existing design already does so
- avoid trapping the user in a very long pinned section

Use `gsap.matchMedia()` or the project's existing responsive mechanism when appropriate.

## 9. Performance rules

Prioritize smooth scrolling.

- Animate `transform` and `opacity` rather than `top`, `left`, `width`, or `height`.
- Use `will-change: transform` only on elements that actually animate.
- Keep media dimensions stable to prevent layout shifts.
- Avoid blur filters during continuous scroll unless extremely subtle and proven smooth.
- Avoid multiple resize/scroll listeners when ScrollTrigger or the current animation library already manages them.
- Clean up timelines/listeners on unmount.
- Refresh ScrollTrigger after late-loading media only when needed.

## 10. Accessibility

Respect `prefers-reduced-motion`.

For reduced motion:
- remove pinning if it becomes uncomfortable
- show a simple static/stacked layout or short opacity swap
- keep all content accessible and in DOM order

Do not make essential text readable only during animation.

## 11. Implementation quality

When editing React/Next/Vite code:

- keep refs deterministic
- avoid querying the entire document when component refs can scope selectors
- clean up GSAP contexts/timelines on unmount
- do not introduce hydration-sensitive browser logic during server render
- preserve TypeScript types
- reuse existing classes and utility conventions
- avoid filler comments and explanatory comments that do not help maintenance

Do not hide broken behavior with arbitrary timeouts.

## 12. Validate after editing

After making the change:

1. Run the project's existing typecheck/build command.
2. Run lint if a usable lint script exists.
3. Fix errors caused by the edit.
4. Re-check the section for duplicate ScrollTriggers, duplicate Lenis initialization, overflow clipping, and mobile horizontal scroll.
5. Confirm the first and last cards settle cleanly.
6. Confirm scrolling backward reverses the sequence correctly.
7. Confirm the active right-side content always matches the foreground card.

## 13. Output behavior

When the user asks the coding agent to modify the project, make the actual file edits when tools are available.

At the end, report briefly:

- which files were changed
- what interaction was improved
- whether the build/typecheck passed

Do not respond with a generic tutorial when the user's project files are available.
