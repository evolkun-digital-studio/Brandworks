---
name: interactive-photo-archive
description: Build or refine premium React photography portfolio pages and fullscreen interactive photo-archive heroes with dense image grids, mouse-responsive 3D depth, drag-to-shift exploration, hover focus, and click-to-open photo/project behavior. Use for requests referencing Kavieng Creative, TasteSkill, 21st.dev, ThreeUI, React Three Fiber, Three.js, GSAP, cinematic photography grids, or non-generic editorial portfolio interactions.
---

# Interactive Photo Archive

Build photography-first portfolio experiences where the images are the interface. Prioritize interaction fidelity, dense composition, native scroll, and preserved photo-opening behavior over decorative UI.

## Required design sources

Use these sources deliberately; do not treat them as interchangeable component libraries.

1. **TasteSkill** — `https://www.tasteskill.dev/`
   - Treat TasteSkill v2 / `design-taste-frontend` as the primary design-quality and anti-slop rule set.
   - If the project can install skills, prefer:
     `npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"`
   - Read the brief first and infer page kind, audience, visual density, motion intensity, and layout family before coding.
   - Use its redesign/audit mindset for existing pages: preserve good structure, remove generic AI patterns, and keep one coherent visual system.
   - Do not introduce generic gradient blobs, excessive pills, oversized headings, glass cards, or decorative sections that compete with the photography.

2. **21st.dev** — `https://21st.dev/`
   - Browse it for implementation references, especially `Heroes`, `Galleries`, `Grids & Bento`, `Cursors`, `Scroll Areas`, `Shaders`, and `3D` interactions.
   - Reuse interaction or component ideas only when they support the requested visual behavior.
   - Adapt code to the existing project architecture and design system; never drop in a visually unrelated component unchanged.
   - Prefer small, composable patterns over importing a whole template.

3. **ThreeUI** — `https://threeui.com/browse?sort=recent`
   - Browse for contemporary Three.js / React Three Fiber motion, depth, hover, camera, shader, and plane interactions.
   - Use it as a source of WebGL interaction ideas, not as a visual theme.
   - Borrow only the minimum technical pattern needed: image plane, pointer rig, drag inertia, hover shader, camera damping, or depth response.
   - Avoid adding spectacle that makes photographs harder to view.

4. **Kavieng Creative reference** — `https://www.kaviengcreative.com/`
   - When the user asks for the Kavieng-style hero, closely match the interaction model and spatial composition: fullscreen visual archive, many photos, drag-to-shift exploration, restrained UI, hover selection, and open-project/photo behavior.
   - Do not copy proprietary source code, text, project names, or assets. Recreate the interaction and layout behavior with the user's own content and codebase.

When web access is available, inspect the current versions of these sites before implementation because their examples and components can change.

## Core hero specification

For a Kavieng-style photography hero, make the first viewport a fullscreen explorable image field rather than a conventional hero.

- Use `height: 100svh`, `width: 100%`, `overflow: hidden`, near-black background.
- Fill the viewport with roughly 18–30 photos in a dense irregular field.
- Keep gaps tight, typically 3–10 px perceived spacing.
- Let several images continue beyond viewport edges so the visible screen feels like a window into a larger archive.
- Keep text minimal: small brand/service label plus optional `Drag to shift` / `Scroll to continue` instruction.
- Remove or demote large marketing headings inside the hero.
- Do not use a conventional equal-column grid, card grid, masonry plugin, rounded-card UI, or centered CTA composition.

Use a larger virtual canvas on desktop, roughly 160–190vw by 140–170vh, but compute bounds from actual content and viewport rather than relying only on fixed values.

## 3D interaction architecture

Prefer actual WebGL depth for the desktop hero using:

- `three`
- `@react-three/fiber`
- `@react-three/drei`

Keep the rest of the page DOM/GSAP unless WebGL is clearly needed.

Recommended structure:

```text
PhotographyPage
  PhotographyHero
    PhotographyHeroCanvas
      HeroCameraRig
      HeroPhotoPlane[]
    HeroUI
    ExistingPhotoViewer / ExistingProjectViewer
  RemainingPhotographySections
```

Do not dump all WebGL code into the route component. Keep camera/pointer logic, photo planes, and interaction state separate.

## Mouse-responsive depth

Make the hero highly responsive to left/right/up/down pointer movement while remaining smooth and premium.

- Normalize pointer x/y to `[-1, 1]`.
- Apply non-linear edge amplification so movement grows near viewport edges.
- Move both camera and individual planes; do not rely on camera-only movement.
- Assign each image a restrained base Z depth, approximately `-0.5` to `0.55` scene units.
- Foreground images should respond more than background images.
- Use damping in `useFrame()`; never snap directly to pointer coordinates.
- Keep camera rotation very small. The 3D effect should come primarily from depth-separated translation.

Conceptual combination:

```text
final position = base position + drag offset + pointer offset + depth offset + optional scroll offset
```

Do not let GSAP and React Three Fiber write to the same transform property.

## Drag-to-shift behavior

Implement desktop drag exploration without hijacking native vertical page scroll.

- Cursor: `grab`; while dragging: `grabbing`.
- Support left/right and modest up/down shifting.
- Constrain drag to real canvas bounds so blank regions never appear.
- Add release inertia and smooth deceleration.
- Track pointer velocity separately from pointer position.
- Preserve current drag position when a photo opens and restore it when the viewer closes.

Distinguish click from drag. A movement threshold around 5–8 px is appropriate; below it, treat pointer up as a click/open action.

## Preserve photo opening

This is a hard requirement whenever the current page already opens photos or projects.

- Do not remove or replace the existing lightbox, modal, route viewer, project viewer, next/previous controls, Escape-to-close, or keyboard behavior unless the user explicitly requests a redesign.
- Connect each WebGL photo plane to the same open-photo/open-project action used by the DOM version.
- If practical, animate the clicked image forward and fade the surrounding archive before handing off to the existing viewer.
- On close, restore focus and the exact archive interaction state.
- Never let a drag accidentally open an image.

## Hover behavior

Every visible image must have a distinct focus state.

On hover:
- move the photo slightly toward the camera;
- scale by roughly `1.025–1.045`;
- slightly increase brightness/contrast;
- optionally apply a 1–2% UV zoom;
- reveal its small label or project name;
- dim surrounding photos to roughly `0.55–0.75` opacity without blurring them.

Use damped values in `useFrame()` instead of abrupt jumps. Keep local image tilt extremely subtle, around ±0.5–0.8 degrees maximum.

Do not add RGB split, liquid distortion, noisy glitches, bloom, SSAO, depth-of-field, or other effects unless the brief explicitly asks for them.

## Grid/composition rules

Treat layout as art direction, not random scattering.

- Mix portrait, landscape, square, and wide frames.
- Use multiple size classes rather than arbitrary one-off values everywhere.
- Keep enough overlap in visual rhythm that the screen feels full, but avoid literal image overlap unless requested.
- Make the intro copy occupy deliberate negative space rather than creating a large empty hero area.
- On desktop, expose many images at once. On mobile, reorganize into a dense readable 2-column editorial grid with occasional full-width images.

## GSAP and scroll

Use GSAP/ScrollTrigger for DOM reveal, section transitions, and below-hero parallax when it improves the page.

- Keep native vertical scrolling.
- Do not scroll-jack.
- Do not add card stacking unless the user specifically asks for it.
- Use subtle entrance animation only: short fade/rise, small stagger.
- If the hero responds to scroll, feed normalized scroll data into the WebGL scene and damp it rather than writing directly to mesh transforms with GSAP.

## Performance

A 20+ image WebGL hero must stay responsive.

- Use `dpr={[1, 1.5]}` or equivalent clamp.
- Prefer `powerPreference: 'high-performance'`.
- Preserve aspect ratios; never stretch photo textures.
- Use sensible texture resolutions and avoid uploading full-resolution source images to GPU unnecessarily.
- Preload only hero-critical images and lazy-load below-fold DOM images.
- Dispose textures/materials/geometries on unmount.
- Avoid expensive post-processing by default.

## Responsive and accessibility fallback

Desktop >= 1024px:
- full WebGL depth;
- pointer parallax;
- drag-to-shift;
- hover Z focus;
- click-to-open.

Tablet 768–1023px:
- reduced depth and motion;
- disable drag where touch gestures would conflict with page scroll;
- preserve tap-to-open.

Mobile < 768px:
- prefer DOM/CSS photo grid;
- preserve tap-to-open;
- no mouse-camera logic;
- no unnecessary WebGL cost.

Honor `prefers-reduced-motion` by disabling camera parallax, drag inertia, and depth motion while preserving static layout and open-photo functionality.

Keep semantic DOM or equivalent accessible representation for WebGL-rendered photos. Preserve meaningful alt text, keyboard navigation, focus restoration, and Escape behavior in the viewer.

## Existing-project workflow

When modifying an existing photography page:

1. Inspect the current component tree, data model, styles, viewer/open-photo behavior, and installed dependencies.
2. Preserve SEO metadata, routing, data sources, image IDs, and viewer state unless there is a clear defect.
3. Audit the current hero using TasteSkill principles before adding new UI.
4. Inspect current 21st.dev and ThreeUI examples for relevant interaction patterns only.
5. Implement the smallest architecture change that can achieve true spatial depth and drag behavior.
6. Tighten spacing and remove dead grid space before adding extra effects.
7. Add WebGL hero depth, pointer response, drag inertia, and hover focus.
8. Reconnect the existing open-photo/open-project action.
9. Test click-vs-drag thresholds, bounds, route unmount, reduced motion, responsive fallbacks, and keyboard viewer controls.
10. Remove unused experiments, placeholder code, and visually unrelated components before delivery.

## Anti-vibe-coded lock

Before shipping, verify all of these are true:

- Photography dominates the viewport.
- No generic centered SaaS hero remains.
- No oversized AI-style headline competes with the archive.
- No decorative glassmorphism, gradient blobs, random pills, or excessive rounded cards appear.
- 21st.dev or ThreeUI references have been adapted to the BrandWorks visual system rather than pasted in unchanged.
- Motion feels spatial and intentional, not like a demo reel of effects.
- Every image has a hover/focus response.
- Drag remains distinct from click.
- Existing photo opening still works.
- Mobile remains usable without WebGL.
- No blank canvas edges are exposed.
- The user notices the photography before noticing the technology.

## Preferred output

When asked to generate a coding prompt, write an implementation-ready prompt that names the files/components to modify, preserves existing behavior explicitly, and separates visual requirements from technical requirements.

When asked to implement code, inspect existing files first and modify the current architecture rather than replacing the project with a disconnected demo.
