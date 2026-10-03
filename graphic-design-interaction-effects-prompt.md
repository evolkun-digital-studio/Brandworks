# Graphic Design Page Interaction Effects Prompt

Update the existing **Graphic Design service page** and recreate the same interaction language shown in the reference video I provided.

Do not redesign the whole page. Keep the current BrandWorks typography, spacing system, section structure, navigation, and overall visual identity.

I specifically want these 3 interaction ideas from the reference:

1. **Green background thread / flowing line**
2. **Image hover interaction**
3. **Cylindrical / curved scrolling gallery effect**

Use them naturally inside the Graphic Design page.

---

# 1. GREEN BACKGROUND THREAD EFFECT

Add a continuous animated **BrandWorks green thread / line** that moves through selected sections of the page.

Use BrandWorks accent green:

`#CCFF00`

The line should feel like a visual thread connecting the graphic design process and projects together.

It should:
- appear behind the content, never over important text
- move smoothly as the user scrolls
- curve organically instead of using straight geometric lines
- enter from one side of the viewport and flow into another section
- occasionally loop or bend around images
- feel editorial and art-directed
- remain subtle, not decorative clutter

The shape should resemble a smooth hand-drawn vector path or spline.

Preferred implementation:
- SVG path
- GSAP ScrollTrigger
- `stroke-dasharray`
- `stroke-dashoffset`
- optional MotionPathPlugin if already available

Animate the SVG stroke based on scroll progress so the line appears to be drawn as the user moves through the page.

Do not make the line glow.

Do not use gradients.

Do not make it look like an AI/neural-network graphic.

It should feel like a simple graphic-design gesture.

Example behavior:

```text
Hero
     \
      curved green line
             \
Featured Work
       ---- curve ----
                     \
Design Process
              loop
                   \
Selected Projects
```

The thread should work almost like a visual guide through the page.

On mobile, simplify the path and keep it mostly vertical so it does not interfere with text.

Respect `prefers-reduced-motion`.

---

# 2. IMAGE HOVER EFFECT

Upgrade the project images with a premium mouse-responsive hover interaction.

When the cursor moves over an image:

- image should slightly scale up
- image should subtly follow cursor position
- inner image movement should be different from the outer container
- create a slight parallax depth effect
- add a very small rotation depending on mouse position
- keep movement smooth using interpolation / easing
- image should return smoothly to its original position on mouse leave

Suggested limits:

```text
scale: 1 → 1.04
translateX: max ±8px
translateY: max ±8px
rotateX: max ±2deg
rotateY: max ±2deg
```

Do not make it exaggerated.

Additionally, on hover:

- reveal the project name
- category
- optional small arrow
- optional "View Project"

Keep text minimal.

The hover overlay should NOT be a dark generic rectangle.

Instead, use clean typography directly over the image or a subtle bottom gradient only if readability requires it.

Use `overflow-hidden` on the image container.

If using GSAP, use `gsap.quickTo()` or another optimized method for pointer movement.

Do not continuously call expensive React state updates on `mousemove`.

Disable the 3D hover effect on touch devices.

---

# 3. CYLINDRICAL SCROLLING GALLERY

Create a major **Selected Work / Graphic Design Archive** section where project images scroll in a curved cylindrical form.

This is the most important interaction.

Do NOT create a normal horizontal slider.

The images should feel like they are placed around the surface of a large invisible cylinder.

As the user scrolls vertically:

- the gallery moves horizontally / around the cylinder
- images near the center appear larger and flatter
- images near the left and right edges rotate away
- edge images appear slightly smaller
- perspective creates the illusion that the work wraps around a curved surface
- the currently centered project becomes dominant

Conceptually:

```text
          center image
              |
      [ ]   [IMAGE]   [ ]
    /                     \
 [ ]                       [ ]
```

Use CSS perspective + transforms or GSAP.

Possible transform logic:

```css
perspective: 1400px;
```

Each card can use values based on distance from viewport center:

```text
translateX
translateZ
rotateY
scale
opacity
```

For example:

Center:
```text
rotateY: 0deg
scale: 1
translateZ: 80px
```

Left:
```text
rotateY: 15deg → 35deg
scale: 0.92
```

Right:
```text
rotateY: -15deg → -35deg
scale: 0.92
```

Far edges:
```text
opacity: 0.65–0.8
scale: 0.86
```

Make this dynamic instead of manually assigning fixed transforms.

Calculate each item's position relative to the viewport center and derive its rotation/scale.

---

# SCROLL BEHAVIOR

The cylindrical gallery should use a pinned section.

Suggested structure:

```text
SECTION START

Selected Work
short intro

[ CYLINDRICAL PROJECT GALLERY ]

SECTION END
```

Use ScrollTrigger:

```js
pin: true
scrub: 1
```

Vertical scrolling should progress the gallery.

Keep it smooth with Lenis if Lenis is already being used globally.

Do not add another smooth-scroll library.

The section should not feel too long.

Suggested scroll distance:

```text
200vh–300vh
```

depending on number of projects.

---

# PROJECT CARDS

Use real existing Graphic Design projects/images from the project.

Each item should contain only:

```text
Project Name
Type / Category
Year
```

Example:

```text
Delhi-6
Packaging / Campaign
2026
```

or

```text
Softly
Brand Identity / Packaging
2026
```

Do not add long descriptions inside the gallery.

Keep cards visually image-first.

Use varied ratios where appropriate:

```text
4:5
3:4
16:10
1:1
```

but maintain visual balance.

---

# CENTER PROJECT INTERACTION

When a project enters the center of the cylindrical gallery:

- increase scale slightly
- bring it forward using `translateZ`
- increase opacity to 1
- reveal its title
- subtly dim neighboring projects

The active item title can appear below the gallery.

Example:

```text
04 / 08

DELHI-6
Campaign · Packaging
```

As another image enters center, update this text smoothly.

Use clip-path, opacity, or translate animation for the text transition.

---

# OPTIONAL CURSOR EFFECT

For desktop only, add a custom contextual cursor over project images.

Default:

```text
VIEW
```

On draggable / cylindrical area:

```text
EXPLORE
```

Keep it very small and minimal.

Use:

```text
background: #CCFF00
color: #111
```

Do not replace the cursor across the entire website.

Only activate it inside project media areas.

---

# INTEGRATE THE GREEN THREAD WITH THE GALLERY

The green thread should visually interact with the project section.

For example:

Before entering the cylindrical gallery, the green SVG line can curve toward it.

During the pinned gallery section, either:

- keep a portion of the thread fixed behind the images

or

- let the thread slowly change shape while the gallery rotates.

After leaving the gallery, the line should continue into the next section.

The green line should feel like a continuous visual system throughout the page rather than separate decorative assets.

---

# PERFORMANCE

This page must remain smooth.

Important:

- use `transform` and `opacity` for animation
- avoid animating `top`, `left`, `width`, `height`
- use `will-change` only where necessary
- clean up all ScrollTriggers when component unmounts
- use `gsap.context()`
- use `requestAnimationFrame` for custom cursor calculations
- lazy-load images below the fold
- avoid React re-renders during pointer movement
- use optimized image formats
- avoid huge uncompressed media

Target smooth 60fps behavior on normal laptops.

---

# MOBILE VERSION

Do not force the full desktop cylindrical effect onto mobile.

For mobile:

- convert the cylindrical section into a smooth horizontal swipe gallery
- retain a small perspective rotation
- allow native touch interaction
- no custom cursor
- no mouse-follow effect
- simplify the green thread
- reduce animation complexity

Example mobile card:

```text
85vw width
aspect-ratio: 4/5
```

Cards can slightly rotate based on distance from viewport center.

---

# VISUAL STYLE

The final result must remain consistent with BrandWorks.

Use:
- white / off-white background
- black typography
- BrandWorks green `#CCFF00`
- strong image-first layouts
- restrained lines
- editorial typography
- generous but controlled whitespace

Avoid:

- glassmorphism
- glowing effects
- neon gradients
- floating UI cards
- rounded SaaS boxes
- excessive pills
- generic dashboards
- AI-looking particle fields
- random 3D objects
- oversized text everywhere

It should feel like an actual creative agency portfolio.

---

# IMPORTANT

Do not copy the reference website literally.

Recreate the interaction principles:

**flowing thread + responsive image interaction + cylindrical project scrolling**

and adapt them specifically to the existing BrandWorks Graphic Design service page.

Do not remove existing sections or content unless necessary for the interaction.

Do not break:
- header
- footer
- routing
- responsiveness
- existing project modal / image opening behavior

If images currently open into a fullscreen/project view, preserve that functionality.

The final page should feel visually experimental but still clean, usable, premium, and recognizably BrandWorks.
