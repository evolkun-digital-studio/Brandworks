# Prompt: Interactive "Physics Shapes" Footer (Hover Animation)

> Copy everything below the line and paste it into your AI coding tool (Claude / Cursor / Lovable / Bolt, etc.). Replace the values in `[brackets]` first. Delete this file after use.

---

Build a reusable **footer section** with an interactive physics animation, to be included on **every page** of my website. Deliver it as a self-contained component (`footer.html` + `footer.css` + `footer.js`, or a single React/Next.js `<Footer />` component if the project uses React: [HTML / React / Next.js / WordPress]).

## 1. Visual concept
- The footer is a full-width section, about **70–90vh tall** on desktop, with a very light background `[#F0F0F5]`.
- The bottom of the footer is filled with a **pile of hundreds of small geometric shapes** that settle under gravity, like a heap of colourful confetti/toys lying on the floor. The pile should cover roughly the bottom 40–50% of the footer.
- Shape types (mix them randomly, sizes 14–34px):
  - solid circles, outlined rings (thick stroke), pentagons, small squares/rectangles, triangles, bow-tie / hourglass shapes, plus (+) crosses, short capsules/pills.
- Colour mix (approx. ratio):
  - 45% soft greys `[#C9CCD6, #A8ACB8]`
  - 30% black `[#111111]`
  - 25% bright accents `[#FF2D55 red, #7B2CFF purple, #1E3BFF blue, #B6FF00 lime, #22E06B green]` → replace with brand colours if needed.
- Each shape has a random rotation and very slight flat shading (no heavy shadows) — clean, modern, playful.

## 2. Headline in the centre
- Large headline centred over the pile: **"[Let's build something great!]"** in two lines, font `[Inter / Satoshi / brand font]`, ~`clamp(48px, 7vw, 120px)`, weight 400–500, near-black.
- Small eyebrow text above it: **"[READY TO START YOUR NEXT PROJECT?]"** (uppercase, 11–12px, letter-spacing 0.08em).
- A small pill button below: **"[Contact us →]"** linking to `[/contact]`.
- Split the headline into **individual letter `<span>`s**. On mouse proximity, letters near the cursor get gently pushed/tilted (translate up to ±12px, rotate up to ±15°) and then spring back to place with an elastic ease (~0.6s). Keep the text readable and selectable for SEO (real text in the DOM, not canvas).

## 3. Mouse hover interaction (the main effect)
- Use a 2D physics engine — **Matter.js** (preferred, lightweight) — rendered on a `<canvas>` positioned behind the headline.
- The **mouse cursor acts as an invisible circular force body** (radius ~60–80px). When the cursor moves through the pile, shapes are **pushed away and scattered** like dragging a hand through a ball pit, then fall back down under gravity and re-settle.
- Fast mouse movement = stronger push (use cursor velocity to scale the force). Shapes can be flung up toward the headline and tumble back down.
- Optional: a soft, blurred **glassy/iridescent blob** follows the cursor with lerp smoothing (`opacity 0.35`, `backdrop-filter: blur`) to highlight the hover area.
- On touch devices: the same push effect on touchmove; on tap, a small radial burst at the touch point.
- Shapes must never leave the footer: add invisible static walls on left, right and bottom, and a soft ceiling at the top of the footer.

## 4. Physics settings (starting values)
- Gravity: `y = 1`
- Restitution (bounce): `0.3–0.5`
- Friction: `0.1`, frictionAir: `0.01`
- Body count: desktop **~250–350**, tablet ~150, mobile ~80 (scale by footer width).
- On load, shapes **drop in from the top** in a staggered rain (spawn over ~1.2s) when the footer first enters the viewport.

## 5. Performance & behaviour rules (must follow)
- Start the physics engine **only when the footer is in view** (IntersectionObserver); **pause** the runner when it scrolls out of view or the tab is hidden.
- Use `requestAnimationFrame`, `devicePixelRatio` capped at 2, and handle window resize (rebuild walls, keep bodies inside).
- Respect `prefers-reduced-motion`: show a static settled pile, no animation.
- Lazy-load Matter.js from a CDN (`matter-js@0.19.0`) only when the footer is near the viewport so it does not affect page speed / Core Web Vitals (LCP, CLS, INP).
- Canvas has `aria-hidden="true"` and `pointer-events: none` for clicks — links and the button above it must remain clickable.
- No layout shift: reserve the footer height with CSS.

## 6. Footer content (below or overlaid at the bottom)
Keep a normal, SEO-friendly footer bar under the animation area (or inside it, on top of the pile with a light background):
- Logo `[logo url]`, short tagline
- Link columns: `[Services, Company, Resources, Contact]`
- Email / phone / address `[details]`
- Social icons `[Instagram, LinkedIn, X, YouTube]`
- Copyright `© [Year] [Brand Name]. All rights reserved.` + Privacy / Terms links
- Use semantic `<footer>`, `<nav aria-label="Footer">`, and proper heading levels.

## 7. Responsive
- **Desktop (≥1024px):** full effect, headline large and centred.
- **Tablet (768–1023px):** fewer shapes, headline ~60px.
- **Mobile (<768px):** footer ~80vh, ~80 shapes, headline ~40px, link columns stack into 2 columns / accordion.

## 8. Integration
- Make it a single include so it appears on **every page** automatically (shared layout / template part / `footer.php` / `<Footer />` in the root layout).
- All configurable values (colours, shape count, text, links) at the top of the JS file in one `CONFIG` object.
- Comment the code clearly so I can tweak colours and counts later.

Deliver the complete working code, plus a short note on where to paste it in my project.
