# BRANDWORKS CONTENT STUDIO
## PREMIUM MINIMAL CMS — PHASED REBUILD

### Your Role

Act as a Principal Product Designer, Apple Human Interface Design Specialist, Senior Full-Stack Engineer, UX Researcher, and Creative Director.

You are responsible for transforming my existing BRANDWORKS website dashboard into an exceptionally crafted content management platform.

This is not a new project.

**You must improve my existing codebase, retain existing functionality, and implement changes in controlled phases.**

My previous AI-generated dashboard looked generic, visually weak, and lacking in useful functionality.

I do not want another ordinary admin dashboard.

I want an original, minimal, sophisticated publishing workspace with exceptional layout design, typography, interactions, and production-quality functionality.

---

# PART A — PROJECT CONTEXT

Repository:

https://github.com/evolkun-digital-studio/Brandworks/tree/new-site

Before implementation:

1. Read `CMS_PROJECT_CONTEXT.md`.
2. Inspect the existing code and identify changes made since that audit.
3. Examine current admin components, CSS, APIs, schemas and routing.
4. Read any repository-level `AGENTS.md` instructions.
5. Identify which functionality is already implemented.
6. Establish existing test/build behavior before editing.

Current stack:

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- MongoDB
- Motion
- GSAP
- Lucide React
- Existing custom authentication system

Preserve all working server and database functionality.

## Existing implementation

The dashboard currently uses basic navigation cards, a scheduled count and an informational note.

This layout must be completely replaced.

The project already has:

- Admin authentication
- Admin/sub-admin roles
- Blog CRUD
- Markdown editing
- Blog publishing/unpublishing
- Scheduled post functionality
- SEO fields
- FAQ fields
- AI summary
- Key takeaways
- Entity SEO
- Basic content analysis
- Account settings
- User management

Do not discard these features.

## Known architecture issue

The active Next.js public blog currently uses static editorial data rather than the MongoDB-backed CMS.

This issue must be fixed in a later phase.

Do not claim that CMS-created articles are already visible on the public site.

---

# PART B — APPLE DESIGN PRINCIPLES

You MUST read and understand:

https://github.com/emilkowalski/skills/blob/main/skills/apple-design/SKILL.md

Apply Apple's eight design foundations.

### 1. Purpose

Every visible component must serve a real user goal.

Don't add widgets simply to fill empty space.

### 2. Agency

Keep the user in control.

Provide reversible operations, understandable status feedback, and predictable workflows.

### 3. Responsibility

Protect content, account access, privacy, and user trust.

Never fake system statuses, analytics, SEO results, or publishing success.

### 4. Familiarity

Use recognizable navigation, interaction patterns, terminology and controls.

Keep similar elements consistent.

### 5. Flexibility

Adapt the interface to desktop, tablet, mobile, accessibility preferences and different editorial workflows.

### 6. Simplicity

Simplicity is not merely minimalism.

Minimize unnecessary work and visual noise while preserving discoverability.

Show the primary action first and place advanced functionality in appropriate secondary surfaces.

### 7. Craft

Pay attention to every detail:

- Typography
- Alignment
- Spacing
- Proportions
- Contrast
- Interaction states
- Motion behavior
- Loading states
- Accessibility
- Content hierarchy

Nothing should appear random.

### 8. Delight

Delight comes from making the experience effortless, predictable and beautiful.

Do not use decorative effects as a substitute for good design.

---

# PART C — BRAND TYPOGRAPHY

This project uses two fonts.

**DO NOT CHANGE THEM.**

### Grimblade

Use for:

- Selected major page headings
- Carefully chosen editorial display typography
- Brand-focused visual identity

Grimblade must not be used for dense UI content.

### Open Sans

Use for:

- Navigation
- Buttons
- Labels
- Forms
- Tables
- Cards
- Article management
- Body content
- Metadata
- Dashboard metrics where legibility matters

Reuse existing font variables from `src/index.css`:

- `--font-primary` for Grimblade
- `--font-secondary` for Open Sans

Preserve the existing self-hosted Grimblade font.

Do not install SF Pro, Inter, Poppins, or any other replacement font.

### Typography hierarchy

Establish a coherent scale.

Avoid extremely large headings.

Avoid tiny unreadable text.

Use deliberate font weights, optical adjustments, letter spacing and line height.

Grimblade should establish brand personality.

Open Sans should establish precision and readability.

---

# PART D — VISUAL DESIGN DIRECTION

## Identity

Design a **premium minimal editorial operating system**.

The interface should feel:

- Calm
- Intelligent
- Purposeful
- Timeless
- Beautifully composed
- Professional
- Responsive
- Original

Think about the level of refinement found in Apple productivity applications, Linear, Raycast and sophisticated editorial tools.

Do not directly copy their appearance.

## Color

Preserve the BRANDWORKS identity.

Starting palette:

- Main background: #F7F7F5
- Surfaces: #FFFFFF
- Primary text: #171717
- Secondary text: #6B6B6B
- Subtle separators: #E8E8E6
- BRANDWORKS lime accent: #CEFD10

Use the lime accent sparingly.

Do not overuse color, gradients or shadows.

## Layout

Create a balanced composition using:

- A clear navigation system
- Generous but purposeful whitespace
- Precise grid alignment
- Asymmetric editorial compositions
- Strong typography
- Subtle visual separation
- Compact information density where useful

Not everything needs a card.

Prefer clean rows, whitespace and subtle separators instead of excessive containers.

## Absolutely avoid

- Four identical cards in a row
- Generic SaaS dashboard templates
- Excessive border radii
- Huge white rectangles
- Oversized welcome messages
- Emoji decorations
- Decorative section numbering
- Unnecessary gradients
- Random glass effects
- Fake analytics
- Inert buttons
- Unnecessary animations
- Overcomplicated sidebars
- Excessive uppercase labels
- UI that looks AI-generated

---

# PART E — PHASED DEVELOPMENT

**This project must be implemented one phase at a time.**

Complete each phase, visually verify it, report the actual changes, and STOP before starting the next phase.

Do not implement all phases in one run.

Read the full roadmap now, but execute only the authorized phase.

## PHASE 0 — BASELINE AUDIT & DESIGN DIRECTION

Inspect the existing application and document:

- Actual component structure
- Existing API capabilities
- Current dashboard shortcomings
- Existing admin design tokens
- Existing interactions
- Responsive limitations
- Current font usage
- Existing functionality that must remain intact

Explore three meaningfully different dashboard compositions.

Evaluate them based on:

- Editorial hierarchy
- Layout originality
- Functional usefulness
- Typography
- Information density
- Simplicity
- Adaptability

Select the best direction.

Do not choose a design simply because it looks familiar.

Produce a short design rationale and continue immediately into Phase 1.

---

# PHASE 1 — REGENERATE THE COMPLETE DASHBOARD

**THIS IS THE FIRST IMPLEMENTATION PHASE.**

Do not retain the current dashboard composition.

Redesign it from the ground up.

## 1. Application shell

Refine the admin navigation to match the new design.

Use:

- Minimal left sidebar
- Clear active navigation
- Consistent top toolbar
- Compact profile/account controls
- Accessible mobile navigation
- Smooth collapsible navigation where useful

Do not add working-looking navigation links for features that do not exist.

## 2. Dashboard header

Create a beautifully balanced page header.

Recommended direction:

Small context label where appropriate.

Grimblade heading:

**Overview**

Supporting description in Open Sans.

Primary action:

**Create article**

Do not use large generic greeting paragraphs.

## 3. Publishing metrics

Display actual database-backed metrics:

- Total articles
- Published articles
- Draft articles
- Scheduled articles

Use a flat, typographic metric strip.

Do not place every number inside a giant card.

Use appropriate font sizes and separators.

All values must come from real backend data.

Consider introducing a small, protected dashboard summary endpoint if the existing APIs are inefficient for this purpose.

## 4. Continue working

This should become the primary dashboard section.

Show recently created or edited articles.

Include:

- Article title
- Editorial status
- Updated time
- Author where useful
- Quick edit action

Make the list visually elegant.

Prefer article rows with refined hierarchy rather than bulky cards.

## 5. Publishing queue

Create a compact upcoming-publications section.

Display:

- Scheduled article title
- Publication date/time
- Current state
- Action to edit

Use real scheduling data.

If the scheduled publishing worker is not configured, show an accurate operational warning instead of implying that publication is guaranteed.

## 6. Needs attention

Create actionable editorial diagnostics where underlying data supports them.

Examples:

- Drafts requiring completion
- Articles missing important metadata
- Missing cover image ALT text
- Incomplete publishing information
- Scheduling warnings

Do not generate meaningless warnings.

Use verifiable rules.

## 7. Quick actions

Provide easy access to:

- New article
- All articles
- Drafts
- Scheduled posts

Do not create large navigation tiles for each action.

Use compact, recognizable action controls.

## 8. Dashboard layout

Recommended composition:

Desktop:

- Left navigation rail
- Top context toolbar
- Heading and primary action
- Horizontal publishing metrics strip
- Wide recent-articles area
- Narrow publishing queue
- Compact editorial attention section

Primary content should receive more width than secondary information.

Use approximately 65/35 proportions where appropriate.

Make the layout feel like a designed editorial product, not a standard analytics template.

Tablet:

- Restructure secondary panels
- Keep important actions visible

Mobile:

- Single-column hierarchy
- Compact metrics
- Functional mobile navigation
- Readable article rows
- Proper touch targets

## 9. Dashboard motion

Follow the Apple Design skill.

Apply:

- Immediate visual feedback
- Critically damped spring motion
- No bounce for normal controls
- Spatially consistent overlays
- Interruptible sidebar/panel movement
- Smooth state changes
- Reduced-motion support

Use the existing Motion library.

Do not add GSAP animations to ordinary dashboard components unless there is a clear functional requirement.

No theatrical page reveals.

No excessive staggered animations.

## 10. Data and API integration

Reuse existing:

- `listBlogPosts()`
- `getScheduledCount()`
- Admin authentication context

If a new dashboard endpoint is justified:

- Implement server-side aggregation
- Enforce existing authorization
- Avoid unnecessary full-collection reads
- Validate and type all responses
- Handle failures safely
- Avoid leaking private data
- Write relevant tests

Never hardcode counts.

## 11. Dashboard QA

Run the existing build and typecheck.

Test actual navigation and API behavior.

Inspect the UI at:

- 1440px
- 1024px
- 768px
- 390px

Use browser screenshots if available.

Refine the result until:

- Typography feels intentional
- Sections align precisely
- White space is balanced
- The layout feels meaningfully different
- Interactive controls work
- Metrics are accurate
- Mobile behavior is strong

**PHASE 1 DELIVERABLE: A fully implemented, working, visually redesigned dashboard.**

Stop after Phase 1.

Do not begin Phase 2 automatically.

---

# PHASE 2 — PREMIUM ARTICLE LIBRARY & EDITOR

Only begin when instructed: "Start Phase 2".

Redesign article management and editing.

## Article library

Build a sophisticated content-management experience with:

- Advanced search and filtering
- Status-based views
- Article previews/thumbnails
- Bulk actions with proper authorization
- Useful sort options
- Pagination
- Reusable saved filters where justified
- Improved scheduled-content visibility
- Consistent contextual actions
- Keyboard accessibility

## Editor

Create a refined editorial writing workspace.

Features to introduce carefully:

- Distraction-free writing mode
- Rich editing interface
- Markdown compatibility
- Autosave
- Save-state feedback
- Revision history
- Restore previous versions
- Keyboard shortcuts
- Content outline
- Table of contents
- SEO inspector
- FAQ editing
- Key takeaways
- AI summary
- Entity information
- Better field validation
- Unsaved-change protection
- Draft preview

Preserve existing Markdown documents.

If a rich-text engine is introduced, design a safe migration or compatibility strategy first.

Do not corrupt existing article content.

Separate writing from advanced metadata settings.

End with a verified implementation and stop.

---

# PHASE 3 — PUBLISHING ENGINE & PUBLIC WEBSITE INTEGRATION

Only begin when instructed: "Start Phase 3".

Fix the disconnect between MongoDB CMS content and the active Next.js public blog.

Make CMS articles the authoritative content source through an explicit, reversible migration plan.

Requirements:

- Public `/blog` reads CMS content
- Dynamic article pages use published MongoDB data
- Correct 404 behavior
- Server-rendered SEO metadata
- Conditional structured data
- Reliable sitemap generation
- Proper caching and invalidation
- Draft preview security
- Scheduling worker integration
- Scheduled job health/status
- Redirect history for changed slugs
- Noindex/canonical behavior
- Public content sanitization

Preserve valid existing static editorial content through a documented migration strategy.

Do not silently remove published content or break existing URLs.

End with functional publishing verification and stop.

---

# PHASE 4 — MEDIA LIBRARY & WEBSITE MANAGEMENT

Only begin when instructed: "Start Phase 4".

Build:

- Media upload manager
- Reusable image library
- Image metadata
- ALT text
- Captions
- WebP/AVIF transformations where supported
- Responsive images
- Media search and filtering
- Asset reuse tracking
- Storage validation and upload security
- Content relationships

Evaluate the existing media infrastructure before choosing the storage provider.

Introduce website content management for appropriate existing pages:

- Homepage content
- Service pages
- Work/projects
- Testimonials
- Global navigation
- Footer content
- Contact details
- Site-wide metadata and branding settings

Do not convert highly animated public sections to generic CMS blocks.

Preserve their creative interactions and layout.

Create controlled editable fields for content that truly benefits from CMS management.

End with verification and stop.

---

# PHASE 5 — ADVANCED SEO, AEO, GEO & ANALYTICS

Only begin when instructed: "Start Phase 5".

Build a professional search-optimization workspace.

## Technical SEO

- Meta title and description previews
- Canonical controls
- Robots controls
- Redirect manager
- Schema validation
- Sitemap monitoring
- Broken internal link checker
- Broken image detection
- Internal linking recommendations
- Content metadata completeness
- Core Web Vitals reporting when real data is available

## AEO & GEO

- AI summary
- Key takeaways
- FAQs
- Entity information
- Content citations and references
- Answer-first content structures
- Content organization guidance
- Human-reviewed AI suggestions where configured

These features should improve content quality and structure.

Do not present AEO/GEO scores as Google's ranking scores.

Do not inject unsupported schema into every article.

## Indexing

Implement compliant sitemap and discovery workflows.

Do not use Google's restricted Indexing API as a generic instant-indexing service for normal blogs.

## Analytics

Integrate where credentials and permissions are available:

- Google Search Console
- Google Analytics 4
- Search impressions
- Organic clicks
- CTR
- Average search position
- Article-level performance
- Performance trends
- Search queries
- Top-performing content

Display only actual retrieved data.

Never fabricate analytics.

End with verification and stop.

---

# PHASE 6 — EDITORIAL OPERATIONS & SCALING

Only begin when instructed: "Start Phase 6".

Build and improve:

- Editorial calendar
- Review and approval states
- Granular permissions
- Activity history
- Revision comparisons
- Reliable scheduled publishing
- Content archiving
- Backup and restore operations
- Multi-author management
- Operational error reporting
- Notification preferences
- Optional coordinated content releases
- AI-assisted content drafting with human approval
- Future multilingual content support

Add automated tests for authorization, scheduling, rollback, and sensitive operations.

Complete a security and performance review.

Stop after verification.

---

# PART F — ENGINEERING RULES

Across every phase:

- Preserve the existing authentication model unless a verified security fix requires a change.
- Preserve MongoDB content.
- Use TypeScript types for all new data contracts.
- Follow current Next.js conventions.
- Prefer reusable components.
- Avoid unnecessary packages.
- Avoid uncontrolled global CSS changes.
- Keep public-site behavior stable.
- Maintain proper error handling.
- Never expose secrets.
- Do not invent successful operations.
- Do not add mock analytics to production.
- Avoid database-breaking migrations.
- Respect role permissions in both client and server.
- Test responsive and keyboard behavior.
- Respect reduced-motion preferences.

Use real implementations rather than mock-only interfaces.

If an integration cannot be activated without credentials, create an honest disconnected state and document the necessary setup.

---

# PART G — PHASE COMPLETION FORMAT

At the end of every phase, report:

1. What was redesigned or implemented
2. Why the new design is better
3. Files created and changed
4. Existing functionality preserved
5. New working functionality
6. Actual tests performed and results
7. Screenshots or visual review findings, if available
8. Remaining limitations
9. Next recommended phase

Do not report visual verification unless the UI was actually inspected.

Do not call a feature complete if it only has a frontend placeholder.

Do not silently begin the next phase.

---

# START EXECUTION

Begin with the baseline audit and **Phase 1: Complete Dashboard Regeneration**.

The first deliverable must be an actual premium, functional dashboard built within my existing project.

**Minimal does not mean empty. Premium does not mean decorative. Apple-level design means every detail makes the experience simpler, clearer, more trustworthy and more enjoyable.**

Build a dashboard that feels like a carefully designed product, not a generic AI-generated template.

Stop after Phase 1 and provide the result for review.