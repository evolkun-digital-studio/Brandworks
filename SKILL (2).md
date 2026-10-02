---
name: social-media-service-page
description: 'Create or redesign a premium social-media agency/service page in an existing React frontend using a fixed three-section narrative inspired by Agence Foudre: (1) a media-led "WE MAKE THEM SOCIAL" work showcase, (2) a "REASONING TO BETTER: RESONATING." expertise section, and (3) a "WE WILL ALWAYS PREFER THIS ORDER." process section. Use for BrandWorks-style social-media pages, cinematic video/scroll transitions, Taste Skill-driven anti-slop redesigns, or requests to make social pages feel less AI/vibe-coded. Produce original, production-ready React/TypeScript with GSAP/ScrollTrigger and Motion where appropriate, responsive/reduced-motion behavior, and no generic landing-page patterns.'
---

# Social Media Service Page

Build the page around **three connected editorial sections**. Treat them as one continuous chapter, not interchangeable landing-page blocks.

Use Agence Foudre as a reference for narrative scroll, social-native behavior, media pacing, and transition feel. Do not clone its exact layout, assets, branding, copy, or animation values.

Internal design read:

> Editorial social-media portfolio with native social behavior, cinematic media transitions, controlled typography, and a clear progression from proof -> expertise -> process.

Do not print this design read unless asked.

# Non-negotiable order

Always preserve this order unless the user explicitly changes it:

1. **WE MAKE THEM SOCIAL**
2. **REASONING TO BETTER: RESONATING.**
3. **WE WILL ALWAYS PREFER THIS ORDER.**

A hero may appear before them and a CTA/footer after them. Do not insert generic feature sections between them.

# Reference hierarchy

Use references in this order:

1. Existing project architecture, tokens, components, fonts, assets, and working behavior.
2. This skill's three-section structure.
3. Installed Taste Skill / `design-taste-frontend` rules when available.
4. `https://www.agencefoudre.com/` for motion/pacing/social interaction behavior.
5. `https://21st.dev/` and `https://threeui.com/browse?sort=recent` only for isolated interaction or engineering ideas.

Never compose the page by copy-pasting unrelated UI-gallery blocks.

If Taste Skill is installed, use it as the anti-slop design constitution. This skill takes priority for section order and social-media-specific motion.

# Inspect before coding

Inspect the existing project first.

Identify:
- framework and routing;
- current social-media page;
- header/footer contracts;
- fonts and typography utilities;
- color/spacing tokens;
- media/CDN helpers;
- GSAP, `@gsap/react`, ScrollTrigger, Motion, Lenis, Barba, or other motion dependencies;
- current smooth-scroll owner;
- responsive breakpoints;
- project/case-study data.

Preserve working architecture. Do not replace routing, analytics, global scroll behavior, asset helpers, or page shell to make animation easier.

For redesigns, audit generic structure before adding new effects.

# Visual language

Respect project tokens first.

For the existing BrandWorks language, prefer:
- white/warm-white dominant canvas;
- near-black text;
- black only for deliberate high-contrast moments;
- lime `#CCFF00` as a controlled accent.

Avoid purple/blue AI gradients, glassmorphism, glow, gradient text, random blobs, and multi-accent palettes.

Typography must feel editorial, not SaaS:
- reuse the project's display sans;
- keep supporting copy compact;
- keep display headings controlled rather than huge;
- avoid mono for main content;
- avoid eyebrow labels above every heading;
- avoid fake subheadings and meaningless metadata.

Useful desktop scale:
- section title: about `44-64px`;
- project title: about `28-46px`;
- body: about `15-18px`;
- metadata: about `11-14px`.

Use project tokens and `clamp()`.

Prefer editorial rectangles/media crops. Do not wrap every image, text block, and action in a rounded card.

# Motion system

All three sections must share one coherent motion language.

Use:
- scroll-linked media movement;
- temporary sticky/pinned states;
- masked image/video reveals;
- controlled scale changes;
- subtle parallax;
- short-form/swipe-inspired handoffs;
- transitions where outgoing media creates the next scene.

Avoid:
- universal fade-up;
- repeated card stacking;
- elastic/bouncy text;
- novelty 3D;
- cursor followers without purpose;
- long scroll traps;
- several unrelated animation styles.

Media can move more than text. Body copy should remain calm.

# 01 - WE MAKE THEM SOCIAL

## Role

Show that the agency turns brands into social-native content through real work.

This is a **media showcase**, not a service-card section.

Use real project data when available:
- project/client name;
- one compact service line;
- portrait reel/video;
- campaign stills/feed assets;
- optional project link.

Never invent clients, results, testimonials, awards, or metrics.

## Composition

Prefer:
- one dominant campaign/reel in the active viewport;
- 1-3 secondary media fragments near the edges;
- compact metadata away from the visual center;
- high media density balanced by deliberate whitespace.

Do not use a standard four-card grid.

## Project scroll behavior

Prefer sticky/pinned project passages:

1. Give each project a deliberate scroll range.
2. Keep active media temporarily sticky or pinned.
3. Let incoming media move upward or laterally into the stage.
4. Move internal image/video at a slightly different rate for parallax.
5. Change title/service metadata only when the visual state changes.
6. Release each state before it feels trapped.

The result must feel like an editorial reveal, **not stacked cards**.

## Video rules

For decorative campaign video use `<video autoPlay muted loop playsInline>` with a sensible preload/poster strategy.

Never autoplay sound.

Use `object-fit: cover` without distorting the source.

Preferred reveal:
- frame begins slightly masked/cropped;
- frame opens toward its final crop;
- inner video scales about `1.04-1.08 -> 1`;
- inner media drifts slightly while the frame moves at another rate;
- text stays quieter than media.

Avoid aggressive zooms.

# Transition 01 -> 02

This is a signature transition.

Do not finish section 01 with empty whitespace and simply render the next heading.

Preferred choreography:

1. Reuse the final campaign image/video as the outgoing scene.
2. Pin only for the required duration.
3. Expand/crop/move the media toward a near-full-bleed state.
4. Reduce project metadata prominence.
5. Introduce **REASONING TO BETTER: RESONATING.** while outgoing media is still present.
6. Let the next canvas replace the media through scroll progress.
7. Release the pin once the new title is readable.

It should feel like a film edit between chapters.

# 02 - REASONING TO BETTER: RESONATING.

## Role

Explain the agency's three expertise pillars without three generic feature cards.

Use exactly three core pillars unless the user provides a different business model.

Strong default:

1. **Social strategy**
2. **Content creation**
3. **Community management**

Each pillar should have a precise title, compact list of real deliverables, and optional supporting media.

Suggested content vocabulary:

**Social strategy**
- audit;
- competitor benchmark;
- content pillars;
- channel direction;
- social art direction.

**Content creation**
- reels/short-form video;
- photography;
- interviews;
- studio content;
- platform-native edits.

**Community management**
- editorial calendar;
- publishing;
- stories;
- moderation;
- reporting/learnings.

Use the user's service language when available. Do not mechanically copy the reference site's wording.

## Layout

Choose one composition only:

**A. Sticky manifesto + moving expertise**
- heading sticky in a narrow column;
- three expertise rows move beside it;
- varying media proportions;
- whitespace/thin rules, not cards.

**B. Three-column editorial field**
- title has its own strong area;
- three expertise blocks share one field;
- asymmetrical media/copy placement;
- no enclosing card backgrounds.

**C. One pinned visual + changing expertise**
- one visual stage remains sticky;
- expertise copy progresses vertically;
- visual changes at defined thresholds;
- only use when strong media exists.

Do not combine all three.

## Motion

Keep section 02 calmer than section 01.

Use only subtle mask reveals, small translation, sticky state changes, restrained media changes, or progress-linked dividers.

Do not make every item fly in independently.

# Transition 02 -> 03

Shift from expressive media into structure/order.

Preferred choreography:

1. Reduce media movement near the end of section 02.
2. Let the final expertise state settle.
3. Introduce a rule/index/numeric marker.
4. Reveal **WE WILL ALWAYS PREFER THIS ORDER.** vertically and calmly.
5. Continue directly into the process without a decorative spacer.

The user should feel the narrative move from **what we do** to **how we do it**.

# 03 - WE WILL ALWAYS PREFER THIS ORDER

## Role

Show the agency's process as a clear numbered system, not cards.

Default sequence:

01 **Strategy**  
Analyze the brand, audience, objectives, and communication pillars.

02 **Art direction**  
Define the social visual language before production.

03 **Content creation**  
Produce photography, video, reels, edits, and campaign assets.

04 **Community management**  
Publish, schedule, moderate, and maintain account rhythm.

05 **Reporting & learnings**  
Review performance and feed learnings into the next cycle.

Adapt steps when the user supplies their own workflow.

## Layout

Prefer:
- large but controlled section heading;
- full-width ordered rows or strong left/right grid;
- index numbers as navigation rhythm;
- thin dividers;
- strong titles, short descriptions;
- one active process row at a time when scroll-linked.

Avoid five rounded cards, circle icons, rainbow steppers, timeline dots, and presentation-style arrows.

## Scroll behavior

A strong default is an ordered sticky sequence:
- keep heading or numeric rail sticky;
- let process rows pass through the viewport;
- activate rows at defined thresholds;
- animate a thin progress rule/index state;
- use small y/opacity differences only for hierarchy;
- avoid excessively pinning the whole section.

Section 03 should feel calmer and more exact than the media-rich section 01.

# GSAP responsibilities

Use GSAP + ScrollTrigger for:
- pinning;
- scrubbed media transforms;
- clip/mask transitions;
- project sequencing;
- cross-section choreography;
- scroll-progress state changes.

Use `useGSAP` when installed and scope selectors to the component/page root.

Keep transform ownership separate:
- outer row/section: scroll positioning;
- media frame: reveal/mask;
- image/video: inner scale/parallax;
- child UI: Motion hover/tap.

Never let GSAP and Motion animate the same transform property on the same DOM node.

Clean up timelines/triggers on unmount. Refresh after layout-changing assets/fonts when needed.

# Motion responsibilities

Use `motion/react` for:
- hover/tap feedback;
- local presence transitions;
- small UI state changes;
- project-link affordances.

Do not use Motion for primary scroll choreography if GSAP already owns it.

Avoid spring defaults for editorial section transitions unless the existing site uses them.

# Smooth scrolling

If Lenis, Locomotive Scroll, or another smooth-scroll system already exists, integrate with it.

Never instantiate a second scroll engine.

Do not add Barba route transitions unless the user explicitly requests route/page transitions.

# Mobile

Treat mobile as a separate composition.

On small screens:
- shorten/remove long pins;
- use one dominant media item per viewport in section 01;
- preserve portrait social media where appropriate;
- stack expertise blocks cleanly in section 02;
- keep numbered process order explicit in section 03;
- avoid accidental horizontal overflow;
- keep content reachable if animation fails.

Do not compress the desktop layout until it becomes tiny.

# Reduced motion

Respect `prefers-reduced-motion`:
- disable scrubbed parallax;
- remove non-essential pinning;
- replace complex masks with stable states;
- show poster/first frame where needed;
- never hide required content behind animation.

# Performance

Use optimized/lazy media, video posters, sensible preload behavior, CSS transforms/opacity, and cleanup.

Limit simultaneous autoplaying video. Do not render several 4K videos at once for decoration.

Pause or avoid offscreen video playback when practical.

# Hard anti-vibe-coded bans

Remove these unless the existing brand explicitly requires them:
- generic centered hero with two CTA buttons;
- equal icon-card service grids;
- bento dashboard layouts;
- glassmorphism;
- gradient text/blobs;
- `rounded-3xl` everywhere;
- pills/badges above every heading;
- fake metrics/testimonials/logos;
- generic abstract stock art;
- meaningless giant type;
- fade-up on every element;
- floating phones everywhere;
- novelty 3D;
- magnetic cursor effects on ordinary links;
- duplicated smooth scrolling;
- unused animation dependencies;
- generic copy such as "where creativity meets innovation" or "unlock your brand's potential".

# 21st.dev / ThreeUI policy

Allowed:
- study a reveal/mask interaction;
- adapt a small navigation behavior;
- learn an engineering pattern.

Not allowed:
- copy a full section and change text;
- mix incompatible component aesthetics;
- import novelty 3D without a narrative reason;
- let a library component dictate the visual system.

Rebuild borrowed ideas in the project's own typography, spacing, color, radius, and motion language.

# Taste Skill integration

If `design-taste-frontend` exists:

1. Read the brief before coding.
2. Infer page type, audience, mood, density, variance, and motion depth.
3. Audit the existing page before redesigning.
4. Use higher layout variance than a standard marketing page.
5. Run Taste Skill's anti-slop/pre-flight checks before completion.
6. Preserve this skill's exact three-section order.

For this page, target:
- **variance:** high but controlled;
- **motion:** medium-high for media, low for body copy;
- **density:** medium with deliberate bursts of high media density.

# Output rules

When implementing:
- return production-ready code, not pseudocode;
- reuse existing components/data helpers;
- keep TypeScript/imports valid;
- include required CSS/animation setup;
- do not leave TODOs for core interactions;
- do not rename unrelated routes/files;
- keep class naming consistent;
- ensure first load and route re-entry do not duplicate ScrollTriggers;
- do not add code comments unless requested.

If asked for a Claude Code/Codex prompt instead of code, convert this skill into a direct implementation brief and explicitly require the three-section order.

# Final pre-flight

Do not ship until every answer is yes:

- Is the order exactly **WE MAKE THEM SOCIAL -> REASONING TO BETTER: RESONATING. -> WE WILL ALWAYS PREFER THIS ORDER**?
- Does section 01 feel like social-native work rather than a portfolio card grid?
- Is 01 -> 02 a real media-led visual handoff?
- Does section 02 communicate exactly three expertise pillars clearly?
- Is 02 -> 03 a deliberate shift from expression to order?
- Does section 03 feel systematic rather than card-based?
- Is there one coherent motion language?
- Are GSAP/Motion responsibilities separated?
- Is existing smooth scrolling preserved?
- Is mobile intentionally recomposed?
- Is reduced motion supported?
- Are videos silent by default?
- Are fake proof/data absent?
- Are generic AI landing-page patterns absent?
- Does the page still read correctly with animation disabled?
- Does the result feel native to the surrounding website?

If any answer is no, revise before returning the implementation.
