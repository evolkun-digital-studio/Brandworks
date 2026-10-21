# BrandWorks Admin Premium Redesign

## Purpose

Upgrade the BrandWorks admin panel from a dark, utilitarian CMS into a calm, premium content studio for editorial operations.

The redesign should feel precise, confident, and quiet. It should use the visual discipline of Apple-style product interfaces and the workflow clarity of premium SaaS products such as Linear, Vercel, Notion, and Stripe without copying any one product.

The key principle is hierarchy over decoration:

- Open Sans handles working UI text, navigation, forms, metadata, and controls.
- Grimblade is reserved for BrandWorks identity and selected display moments.
- Lucide remains the primary icon library for consistent, lightweight interface icons.
- Lime is a functional accent for status, selection, and important signals—not a blanket neon color.
- Dark mode uses layered graphite surfaces instead of pure black panels.
- Motion is short, interruptible, and useful: feedback should begin on press and respect reduced-motion preferences.

## Current foundation

Already available in the project:

- Next.js 16 and React 19
- Open Sans font files
- Grimblade font files
- `lucide-react`
- `sonner`
- `motion`
- Existing admin shell, themes, navigation, forms, cards, modals, and page routes

Phase 1 has already established the shared studio foundation:

- Graphite is the default admin theme.
- Shared admin surfaces now use Open Sans and theme-aware materials.
- Sonner has a richer themed toast treatment.
- Form success/error messages use semantic icons and theme-aware surfaces.
- Sidebar, topbar, cards, modals, media, calendar, and activity surfaces now share the same visual language.

Current implementation status:

- Phase 1 shared foundation: implemented.
- Phase 2 Overview visual hierarchy: implemented.
- Phase 3 Articles visual hierarchy and filter treatment: implemented.
- Phase 4–9 shared visual rollout across Media, SEO, Calendar, Activity, Settings, and Team: implemented.
- Phase 2 Overview interaction slice: implemented with destination-linked metrics, an explicit refresh action, and a publishing-system health summary.
- Phase 3 Articles workflow slice: implemented with a clearer library-view summary, live result count, reset filters, bulk feedback, and action toasts.
- Phase 4 Media workflow slice: implemented with upload, metadata, archive, copy, clear filter states, drag-and-drop validation, and error feedback.
- Phase 5 SEO workspace slice: implemented with attention-first audit filtering, health context, audit timestamps, redirect counts, empty states, and redirect feedback.
- Phase 6 Calendar agenda slice: implemented with publishing summary, today/overdue hierarchy, semantic review badges, and responsive agenda treatment.
- Phase 7 Activity slice: implemented with grouped dates, activity summaries, event filtering, clear-filter states, per-day counts, and semantic icons.
- Phase 8 Settings safety slice: implemented with grouped security sections, icon-led hierarchy, dirty-state saves, restore confirmation, and feedback.
- Phase 9 Team slice: implemented with team summary metrics, icon-led provisioning, role/status hierarchy, protected-account cues, responsive rows, and account action feedback.
- Phase 10 final quality pass: implemented with keyboard drawer focus containment, theme-safe danger controls, and reduced-motion/transparency hardening.

## Design system

### Typography

| Role | Typeface | Guidance |
| --- | --- | --- |
| Brand mark / display accent | Grimblade | Use sparingly for identity and hero moments. |
| Page titles | Open Sans | 30–38px, 700 weight, tight tracking, short line length. |
| Section titles | Open Sans | 16–20px, 650–700 weight. |
| Body and descriptions | Open Sans | 13–15px, 400–500 weight, 1.5–1.65 line height. |
| Labels and metadata | Open Sans | 11–12px, 600–700 weight, slight positive tracking. |
| Numeric metrics | Open Sans | 28–42px, 600–700 weight, tabular numerals where useful. |

Do not use Grimblade for dense UI, tables, forms, or long copy. Avoid six-line headings, excessive uppercase labels, and low-contrast gray text.

### Color and materials

- Canvas: deep graphite rather than absolute black.
- Primary surface: slightly lighter graphite with clear separation from the canvas.
- Elevated surface: opaque enough for reliable contrast, with subtle blur only where content remains visible underneath.
- Primary text: near-white.
- Secondary text: cool muted gray with at least AA contrast.
- Accent: BrandWorks lime for active state, success emphasis, and selected controls.
- Warning and danger: reserved for real risk or required attention.
- Borders: low-contrast separators; use spacing and grouping before adding rules.

Avoid stacking multiple translucent surfaces. Large surfaces should be visually heavier than chips and controls.

### Shape and spacing

- Base spacing unit: 4px.
- Common content gap: 16–24px.
- Page section gap: 32–48px.
- Interactive minimum: 44px height where practical.
- Standard radius: 12–16px.
- Modal radius: 18–22px.
- Use one primary CTA per view and one clear secondary path.

### Iconography

Use Lucide icons consistently at 15–18px for navigation and controls, 20–24px for empty states and feature summaries.

- Icons support labels; they do not replace labels when the action is ambiguous.
- Icon-only buttons require an accessible label and visible tooltip/title.
- Use one stroke weight family throughout the admin panel.
- Do not use emoji as interface icons.
- Avoid decorative icon repetition inside every card.

### Toast and feedback policy

Use Sonner for short-lived confirmation of completed background actions:

- Save completed
- Article published or scheduled
- Media uploaded or archived
- Backup downloaded or restored
- Settings updated

Use persistent inline messages for validation, authentication failures, destructive warnings, and problems requiring user action.

Every toast should answer what happened and, when useful, what the user can do next. Destructive actions should offer undo where the data model supports it.

## Phase plan

### Phase 1 — Shared shell and studio foundation

Status: Complete.

Scope:

- Sidebar navigation and section grouping
- Responsive mobile navigation
- Topbar and workspace context
- Theme persistence and default graphite theme
- Typography tokens
- Color/material tokens
- Button, icon-button, input, select, textarea, badge, surface, and modal primitives
- Sonner toast styling and feedback conventions
- Focus states, reduced motion, reduced transparency, and high contrast support

Acceptance criteria:

- All authenticated pages feel like one product.
- Navigation is clear in expanded, collapsed, and mobile states.
- Active state is recognizable without relying only on color.
- Text remains readable across all available themes.
- Keyboard focus is visible everywhere.
- No page depends on hard-coded white surfaces that break dark themes.

### Phase 2 — Overview / command center

Goal: Make Overview the calm starting point for daily editorial work.

Changes:

- Replace generic metric cards with a restrained metric rail.
- Give each metric a clear label, value, trend/context, and destination.
- Make “Create article” the primary action.
- Surface scheduled publishing, review readiness, and recent activity as operational priorities.
- Add a compact workspace health summary with clear status language.
- Keep the first viewport useful without requiring a chart-heavy dashboard.
- Use loading skeletons that match final layout geometry.

Interaction details:

- Metric cards are clickable only when they lead to a useful filtered view.
- Status changes use inline feedback plus Sonner confirmation.
- Quick actions should respond on pointer-down with subtle scale/contrast feedback.

Acceptance criteria:

- A user can understand what needs attention within five seconds.
- Primary and secondary actions are visually distinct.
- Empty and loading states explain the next useful action.

### Phase 3 — Articles

Goal: Make article management fast, scannable, and editorially confident.

Changes:

- Redesign the article list around title, status, author, updated date, and publishing destination.
- Add a clear filter bar for status, scheduled state, search, and sort.
- Improve bulk selection and bulk action affordances.
- Use status badges with text and icon support, not color alone.
- Separate “draft”, “in review”, “scheduled”, “published”, and “archived” states clearly.
- Improve empty search results with reset-filter actions.
- Make the article editor header sticky with save state and publishing actions grouped logically.

Editor direction:

- Keep writing canvas visually quiet.
- Move secondary metadata into grouped inspector sections.
- Make the preview and analysis relationship obvious.
- Use collapsible sections for advanced fields without hiding essential state.
- Add unsaved-change status and recovery messaging.

Acceptance criteria:

- Users can find and filter an article without scanning a dense table.
- Publishing state is readable at a glance.
- Save, preview, schedule, and publish actions are predictable and reversible where possible.

### Phase 4 — Media

Goal: Make approved assets easy to find, understand, and reuse.

Changes:

- Create a stronger media toolbar with search, type filter, sort, and upload action.
- Use a flexible asset grid with consistent aspect-ratio previews.
- Give missing alt text a visible but non-alarming attention state.
- Improve card metadata hierarchy: filename, type/size, alt text, and actions.
- Replace dense modal editing with a focused asset detail drawer or modal.
- Support clearer upload progress, success, and failure feedback.
- Keep destructive archive/delete actions visually separated.

Interaction details:

- Preview opens from the asset card and preserves the user’s place in the grid.
- Copy URL confirms completion through Sonner.
- Upload dropzone provides keyboard and drag feedback without relying on color alone.

Acceptance criteria:

- Users can identify an asset from its preview and metadata.
- Missing accessibility metadata is obvious.
- Upload and edit states never leave the user unsure whether work completed.

### Phase 5 — SEO workspace

Goal: Turn SEO from a technical report into a prioritized action workspace.

Changes:

- Introduce a top summary for overall health, pages reviewed, and urgent findings.
- Group findings into critical, recommended, and informational states.
- Make each finding actionable with a destination or clear explanation.
- Improve score presentation so numbers do not replace meaning.
- Separate analytics connection health from editorial SEO findings.
- Redesign redirects as a readable source → destination list with safer delete behavior.

Acceptance criteria:

- A user can identify the highest-priority SEO issue immediately.
- Every warning explains why it matters and how to resolve it.
- Connection states clearly distinguish configured, missing, and unavailable.

### Phase 6 — Calendar

Goal: Make upcoming publishing feel like a reliable editorial schedule.

Changes:

- Add a calendar view switch: timeline/list first, month view where data density supports it.
- Use date groups with stronger temporal hierarchy.
- Distinguish scheduled, overdue, unscheduled, and published states.
- Make article rows open the relevant editor or preview.
- Keep refresh and date navigation in a stable toolbar.
- Add empty states that point to article creation or scheduling.

Motion and interaction:

- Date navigation uses short, interruptible transitions.
- Drag-and-drop scheduling, if introduced later, must track 1:1, preserve velocity, and support cancel/revert.
- Reduced motion uses cross-fades and static state changes.

Acceptance criteria:

- Users can answer what is publishing next, when, and in what state.
- Calendar density remains readable on laptop and mobile widths.

### Phase 7 — Activity

Goal: Provide trustworthy operational history without turning the page into a log dump.

Changes:

- Redesign events as a timeline with grouped dates.
- Give each event a clear actor, action, target, and timestamp.
- Use semantic icons for publish, edit, schedule, authentication, media, and settings events.
- Add filters for event type and actor when the dataset supports them.
- Add a clear empty state and loading state.

Acceptance criteria:

- A user can understand who changed what and when.
- Important events remain visually distinct without loud colors.

### Phase 8 — Settings

Goal: Make configuration safer and easier to scan.

Changes:

- Group settings into Account, Website, Notifications, and Backup sections.
- Add section descriptions explaining scope and impact.
- Keep save actions local to each group where possible.
- Replace ambiguous “Save” labels with specific actions such as “Save website settings”.
- Add dirty state and success feedback.
- Make backup restore a clearly destructive/high-impact operation with confirmation and result summary.
- Keep password changes visually separate from public website settings.

Acceptance criteria:

- Users understand which settings affect their account versus the public site.
- Permission restrictions are explained next to the disabled action.
- Restore and destructive actions cannot be triggered accidentally.

### Phase 9 — Team

Goal: Make access management feel safe and professional.

Changes:

- Replace the dense table with a responsive account list/table hybrid.
- Give each account an avatar/initials, role, status, and last activity.
- Make primary account protection obvious.
- Use confirmation for deletion and clear status for enable/disable actions.
- Improve create-sub-admin flow with password guidance and completion feedback.
- Add role descriptions if more roles are introduced later.

Acceptance criteria:

- It is immediately clear who has access and whether they are active.
- Account deletion is explicit and difficult to trigger accidentally.
- Mobile layouts do not require horizontal scrolling for the main action.

### Phase 10 — Final quality pass

Scope:

- Keyboard-only navigation audit
- Screen-reader labels and landmarks
- Contrast checks across all themes
- Reduced-motion and reduced-transparency testing
- Responsive testing at 375px, 768px, 1024px, and 1440px
- Empty, loading, error, success, and permission-denied states for every section
- Toast timing and inline feedback review
- Visual regression screenshots for all primary routes
- Bundle and performance review for motion and icon usage

Definition of done:

- Every page shares the same type, spacing, surface, icon, and feedback language.
- No important state is communicated by color alone.
- The interface is usable with keyboard, touch, and pointer input.
- Dark mode feels intentional rather than inverted.
- All page actions have clear completion or failure feedback.
- The admin panel feels premium because it is clear, responsive, and trustworthy—not because it is visually busy.

## Suggested implementation order

1. Finish shared token cleanup and remove remaining hard-coded light-only admin surfaces.
2. Complete Overview and Articles because they form the daily workflow.
3. Complete Media and SEO because they depend on shared filtering, status, and surface patterns.
4. Complete Calendar and Activity using the same timeline primitives.
5. Complete Settings and Team with the mature feedback and confirmation system.
6. Run the final accessibility, responsive, and visual regression pass.

