# BRANDWORKS CMS Project Context Audit

**Audit date:** 2026-10-19  
**Scope:** `C:\Evo\brandwork\brandwork`  
**Mode:** Read-only source audit. The only new file is this report.

## 1. Executive summary

This repository is a hybrid Next.js/Vite migration rather than a single clean runtime:

- The current production build is **Next.js 16 App Router** with React 19 and TypeScript.
- A substantial older **Vite + React Router** implementation remains in the same source tree.
- The admin panel and its MongoDB-backed APIs are implemented in the Next tree and compile successfully.
- The active Next public blog pages do **not** consume the CMS API. They render a hard-coded editorial dataset from `src/editorial/data.ts`.
- An older API-backed public blog client exists under `src/blog/`, but it is not wired to the active Next public routes or to the current Vite `src/App.tsx` route table.
- Therefore, the CMS can create/edit/publish MongoDB posts, but those posts are not currently the source of truth for the public `/blog` experience.

The most important redesign constraint is to resolve that runtime split before adding features. A future implementation must choose one public blog source of truth and connect it to the existing admin/API contract or deliberately replace that contract.

## 2. What the website currently does

### Public website

The site is a creative/marketing studio website for BRANDWORKS. The active Next routes cover:

| Route | Current role | Evidence |
|---|---|---|
| `/` | Homepage with branded visual/marketing sections | `app/(public)/page.tsx`, `src/Home.tsx`, many `src/components/*` |
| `/about` | About/studio page | `app/(public)/about/*`, `src/legacy-pages/AboutPage/*` |
| `/services` | Services index | `app/(public)/services/*` |
| `/services/*` | Service pages for concept creation, graphic design, performance marketing, photography, PR/founder reputation, SEO, social club, social media, technology, and videography | `app/(public)/services/**` |
| `/work` | Work/projects page | `app/(public)/work/*` |
| `/blog` | Active Next editorial journal backed by static source data, not MongoDB | `app/(public)/blog/page.tsx`, `src/editorial/BlogIndex.tsx`, `src/editorial/data.ts` |
| `/blog/[slug]` | Active Next static editorial articles | `app/(public)/blog/[slug]/page.tsx`, `src/editorial/ArticlePage.tsx` |
| `/news` and `/news/[slug]` | Static editorial newsroom | `app/(public)/news/**`, `src/editorial/data.ts` |
| `/contact` | Contact page | `app/(public)/contact/*` |
| `/privacy-policy`, `/cookie-policy`, `/terms-of-use` | Legal pages | corresponding `app/(public)/*` routes |
| `/api/health` | MongoDB/application health endpoint | `app/api/health/route.ts` |

The site includes a public header, footer, preloader, smooth scrolling, animated/interactive sections, image/video-heavy service pages, analytics hooks, and responsive layouts.

### Active public blog versus legacy API blog

The distinction is critical:

1. `app/(public)/blog/page.tsx` renders `EditorialIndexClient`, which renders `src/editorial/BlogIndex.tsx` and reads `blogPosts` from `src/editorial/data.ts`.
2. `app/(public)/blog/[slug]/page.tsx` calls `getEditorialPost()` against that same static array and renders `EditorialArticleClient`.
3. The current Vite `src/App.tsx` also maps `/blog` and `/blog/:slug` to `EditorialIndexPage`/`EditorialArticlePage`.
4. The MongoDB API-backed client is under `src/blog/api/*` and `src/blog/pages/*`, but `BlogPage.tsx` and `BlogDetailPage.tsx` are not imported by either active route table.

This means the CMS API is present and test-covered in isolation, but CMS-created content is not reflected in the active public blog pages.

## 3. Technology and architecture

### Package and runtime

From `package.json`:

- Next.js `^16.4.0` with App Router conventions.
- React and React DOM `^19.2.8`.
- TypeScript `~6.0.2`, with `strict: false` in `tsconfig.json`.
- Tailwind CSS `^4.3.3`, `@tailwindcss/vite`, and `@tailwindcss/postcss`.
- MongoDB driver `^7.6.0`.
- Argon2 `^0.45.1` for password hashing.
- JSON Web Token `^9.0.3` for admin sessions.
- `react-markdown` and `remark-gfm` for Markdown rendering.
- GSAP, `@gsap/react`, Motion, Lenis, Three.js, and React Three Fiber for visual interaction/motion.
- `lucide-react` and `@iconify/react` are installed, although the inspected admin components mostly use inline SVG or text symbols.
- Vitest, Playwright, Pixelmatch, and Oxlint for testing/linting.

Scripts:

| Script | Actual command | Notes |
|---|---|---|
| `dev` | `next dev` | Current Next development runtime |
| `build` | `next build` | Current production build; passes in this audit |
| `start` | `next start` | Next production server |
| `typecheck` | `tsc --noEmit` | Passes in this audit |
| `lint` | `oxlint app src` | Exits successfully with many warnings |
| `test` | `vitest run` | Fails; see verification section |
| `test:parity` | `playwright test` | Browser parity suite is configured for both Vite and Next dev servers |
| `jobs:publish-due` | `tsx src/server/jobs/publish-due.ts` | External scheduled-publishing job |
| `dev:vite`, `build:vite`, `preview:vite` | Vite commands | Legacy/migration runtime remains available |

### Directory structure

| Directory | Responsibility |
|---|---|
| `app/` | Next App Router pages, layouts, API Route Handlers, `robots.txt`, and `sitemap.xml` |
| `src/admin/` | Admin React UI, auth context, admin API client, blog editor/list, settings, and users |
| `src/server/` | Server-only configuration, MongoDB client, repositories, domain services, validation, auth, SEO helpers, and publishing job logic |
| `src/blog/` | Older API-backed public blog client, Markdown renderer, metadata helpers, schema graph, and tests |
| `src/editorial/` | Active static editorial/blog/news experience and static data model |
| `src/next/` | Adapters that let existing React components use Next navigation and Next route entry points |
| `src/components/` | Public website components, header/footer, visual experiences, media, and sections |
| `src/legacy-pages/` | Older public page implementations and legal/consent code retained during migration |
| `src/routing/` | Router abstraction used by both the old Vite tree and the Next adapter |
| `public/` | Static logo, icon, poster, video, and asset files |
| `tests/parity/` | Playwright comparison/diagnostic tests for Vite and Next |
| `.next/`, `.vite/`, `scratch/` | Generated/build or local working directories; not application source |

### Next App Router and client/server boundaries

The Next tree uses the App Router. `app/layout.tsx` imports global CSS and mounts `NextNavigationProvider`. Public pages use `app/(public)/layout.tsx`, which mounts `src/next/PublicLayout.tsx` and therefore the public header, footer, analytics, smooth scroll, preloader, and consent provider.

Most visible public and admin UI is client-rendered because it reuses existing React components. Server-side behavior exists in:

- Next page metadata and static parameter generation.
- API Route Handlers under `app/api/**`.
- Server-only MongoDB repositories/services.
- Sitemap/robots generation.
- The standalone scheduled publishing job.

There are no `use server` server actions found. Mutations use HTTP Route Handlers and `fetch()` from client components.

### Navigation adapter

`src/next/NextNavigationProvider.tsx` adapts `next/link` and `next/navigation` to the project's custom `src/routing` interface. It stores route state in `sessionStorage` for login redirect state. Internal links in the adapted UI use `next/link` through this wrapper, and admin components continue importing from `src/routing`.

### Styling and design system

- Tailwind CSS v4 is loaded from `src/index.css` with `@import "tailwindcss"`.
- Global fonts/tokens are defined in `src/index.css`.
- Public brand typography uses self-hosted Grimblade for display/headings and Open Sans for body/UI copy.
- Public tokens include a 1440px page max width, fluid gutters, grid gaps, section spacing, ink/rule colors, and a lime accent `#cefd10`.
- Admin screens primarily use neutral Tailwind utility classes, white cards, 1px neutral borders, 4–16px corner radii, and dark neutral buttons.
- There is no separate admin design-system package or token file; admin styling is authored inline in component class names.

## 4. Admin panel audit

### Admin route map

| Route | Feature | Protection |
|---|---|---|
| `/admin/login` | Login form | Public entry point |
| `/admin` | Dashboard | `ProtectedAdminPage` |
| `/admin/blogs` | Blog list, filters, search, status actions, soft-delete/trash | `ProtectedAdminPage` |
| `/admin/blogs/new` | New blog editor | `ProtectedAdminPage` |
| `/admin/blogs/[id]/edit` | Existing blog editor | `ProtectedAdminPage` |
| `/admin/settings` | Current account username/password changes | `ProtectedAdminPage` |
| `/admin/users` | Admin/sub-admin management | `ProtectedAdminPage`; UI and API require `admin` role |

The older Vite route table in `src/admin/AdminRoutes.tsx` mirrors the same logical route set. The active Next entry points import the same UI components.

### Login and session handling

Implemented in:

- UI: `src/admin/pages/Login.tsx`.
- Session context: `src/admin/context/AdminAuthContext.tsx`.
- Client API: `src/admin/api/adminApi.ts`, `src/admin/api/client.ts`.
- Route Handlers: `app/api/admin/auth/login/route.ts`, `logout/route.ts`, and `me/route.ts`.
- Server auth: `src/server/admin/auth.ts`, `src/server/admin/http.ts`.

Flow:

1. The provider calls `GET /api/admin/auth/me` on mount.
2. Login posts username/password to `POST /api/admin/auth/login`.
3. Passwords are verified with Argon2; the server signs a JWT containing the admin ObjectId as `sub`.
4. The JWT is placed in an `httpOnly`, `sameSite=lax` cookie named `admin_session`.
5. The client never stores or reads the token; all admin requests use `credentials: 'include'`.
6. Every protected handler calls `withAdmin()`, verifies the JWT, reloads the active admin from MongoDB, and rejects disabled/deleted accounts.
7. Logout expires the cookie.

Session/security details:

- Default JWT expiry is `8h`, configurable via `JWT_EXPIRES_IN`.
- Cookie `maxAge` is fixed at 8 hours, regardless of a custom JWT expiry.
- Cookie `secure` is enabled when `NODE_ENV === 'production'`.
- Login attempts are limited in memory to 10 attempts per IP per 15 minutes per process.
- IP extraction trusts `x-forwarded-for`/`x-real-ip`; proxy trust is not configured in this repository.
- No explicit CSRF token mechanism was found.
- The older global API rate limiter mentioned in `src/server/jobs/README.md` is not present in the current tree.

### Roles and permissions

Roles are `admin` and `sub_admin`, defined in `src/server/admin/types.ts`.

| Capability | Admin | Sub-admin |
|---|---:|---:|
| Login/session | Yes | Yes |
| View dashboard/blogs/editor/settings | Yes | Yes |
| Create/edit/publish/schedule blogs | Yes | Yes, because these handlers require an authenticated admin but do not require `role === 'admin'` |
| Soft-delete blogs | Yes | No; backend rejects, UI hides the action |
| Restore deleted blogs | Yes | No |
| View deleted-blog data | Yes | No |
| List/create/disable/delete admin accounts | Yes | No |
| Change own username/password | Yes | Yes |
| Modify primary admin account through user management | No | No |

`isPrimary` prevents modification/deletion of the primary admin through sub-admin management operations.

### Dashboard

`src/admin/pages/Dashboard.tsx` is intentionally minimal. It includes:

- Signed-in username and role.
- Link card to Blogs.
- Backend-driven Scheduled Posts count from `GET /api/admin/blogs/scheduled-count`.
- Settings link.
- Admins link for admins only.

There is no general traffic analytics dashboard, content performance dashboard, media widget, user activity feed, or editorial KPI system.

### Blog list

`src/admin/pages/blogs/BlogList.tsx` implements:

- All/Draft/Published/Unpublished filters.
- Scheduled filter.
- Deleted/trash view for admins.
- Debounced title search.
- Server pagination for normal views, 10 rows per page.
- Client-side filtering of deleted posts after fetching up to 100 records; this is not server-paginated.
- Inline publish/unpublish.
- Edit link.
- Admin-only soft-delete and restore.
- Status and schedule badges.
- Localized published/updated/scheduled dates.
- Loading, empty, and request-error states.

Known limitation: search, status, page, and trash state are local component state rather than fully URL-synchronized state. The Scheduled view has a dedicated deep-link query parameter because the dashboard links to it.

### Settings

`src/admin/pages/Settings.tsx` implements:

- Change login ID after re-entering current password.
- Change password after re-entering current password and confirming the new password.
- Client/server validation and form-level success/error messages.

Password policy is at least 10 characters, maximum 128, containing at least one letter and one number. The server hashes new passwords with Argon2id.

### User management

`src/admin/pages/Users.tsx` implements:

- List all admin accounts.
- Create sub-admin with login ID and temporary password.
- Enable/disable sub-admin.
- Delete sub-admin after browser confirmation.
- Display role, enabled state, primary marker, and last login.

It does not implement invitations, password reset, audit log, permission granularity beyond the two roles, MFA, or account recovery.

### Admin UI/UX findings

Current visual structure:

- Max-width content shell of approximately 1100px.
- 72px white header with BRANDWORKS wordmark, Admin badge, username/role, logout.
- Horizontal nav for Dashboard, Blogs, Settings, and admin-only Admins.
- White content cards on `bg-neutral-50`.
- Open Sans body/UI, Grimblade global headings.
- Labeled inputs and textareas, rounded borders, dark primary buttons, neutral secondary buttons.
- Responsive single-column-to-two-column forms and horizontally scrollable tables.

Strengths:

- Native labels are present for most fields.
- `aria-label`, `aria-expanded`, `aria-pressed`, `role="alert"`, and `role="status"` are used in several interactive components.
- Status is conveyed with both color and text.
- Loading and mutation states change button labels and disable duplicate submissions.
- The editor warns before browser unload and confirms in-app back navigation when dirty.
- The editor uses collapsible sections to control a very large form.

Risks/limitations:

- Most controls use `focus:outline-none` with only a border-color change; a strong visible keyboard focus ring is not consistently provided.
- Validation is primarily submit-time/form-level. There are no field-level error messages, error-to-field links, or focus management to the first invalid field.
- Admin nav is a horizontal row with no mobile menu or overflow strategy.
- Tables intentionally use `overflow-x-auto` and a 720px/560px minimum width, which is functional but not an ideal mobile information architecture.
- Some compact reorder/remove controls are 20–32px, below the recommended 44px touch target.
- Browser `window.confirm()` is used for destructive actions; it is functional but not branded or easily extensible.
- There is no explicit `aria-busy` on async regions, no toast system, no undo interaction, and no persistent “last saved” state.
- The active public header’s mobile `Menu` button has no click handler or menu implementation in `src/components/Header/Header.tsx`.

## 5. Deep Blog CMS audit

### Blog editor field matrix

Evidence is primarily `src/admin/pages/blogs/BlogEditor.tsx`, its editor components, `src/server/admin/blog.ts`, and `src/server/admin/blog-validation.ts`.

| Field/capability | Status | Evidence and behavior |
|---|---|---|
| Title | Implemented | Required text, max 200; live slug suggestion on create |
| Slug | Implemented | Optional input; generated from title if blank; normalized to lowercase hyphen form server-side; unique DB index |
| Description/excerpt | Implemented | Required, max 500; used as fallback description |
| Rich text editor | Missing | There is no WYSIWYG editor or block editor |
| Markdown support | Implemented | Textarea with Write/Preview tabs using `react-markdown` + `remark-gfm` |
| Featured image | Partial | Required HTTP(S) URL and preview; no upload or media picker |
| Image alt text | Implemented | Required text; stored and returned publicly |
| Image title | Implemented | Optional stored field |
| Image caption | Implemented | Optional stored field and rendered by the legacy API-backed article page |
| Image description | Implemented | Optional stored field; used by legacy schema generation |
| Categories | Implemented | Free-text category, max 200; no taxonomy table or management UI |
| Tags | Implemented | Chip input, max 20, max 100 per tag, case-insensitive dedupe |
| Author | Partial | Automatically set to current admin username; `authorId` is stored server-side, but no author picker/profile system exists |
| Publish date | Partial | Create form can provide an initial date; edit form cannot directly edit it |
| Updated date | Implemented | Server updates `updatedAt` on create/edit/status/schedule/delete/restore; not manually editable |
| Drafts | Implemented | New posts start as `draft`; list/status actions support drafts |
| Unpublished state | Implemented | Status enum includes `unpublished`; public service excludes it |
| Scheduled posts | Implemented with operational dependency | Future `scheduledAt`, schedule/update/cancel actions, dashboard count, list view, and external job |
| Autosave | Missing | No background save; only explicit Save/Publish/Schedule actions |
| Unsaved-change warning | Partial | `beforeunload` and editor Back confirmation; top-level navigation is not comprehensively intercepted |
| Live content preview | Partial | Markdown preview, cover/OG image previews, search-result mockup; no full public-page preview |
| Revision history | Missing | No revision collection, version fields, diff, or restore-by-version |
| Content blocks | Partial | Markdown supports headings/lists/quotes/tables/code; backend accepts `callouts`, but editor has no callout UI and public mapper omits callouts |
| FAQ editor | Implemented | Add/remove/reorder question/answer pairs, max 20; legacy renderer and legacy schema support complete entries |
| Table of contents | Partial | Analyzer derives H2–H4 TOC and legacy article page renders it; no stored TOC and active static Next CMS path does not use it |
| Related articles | Partial | Legacy API article page fetches up to three latest API posts; active static editorial page derives static related articles; no CMS relationship field or editorial selection |
| AI summary | Partial | Manual field only; no AI generation or provider integration |
| Key takeaways | Implemented | Manual reorderable list, max 20; legacy renderer shows it |
| Entity fields | Implemented as editorial data | Main entity, About, Mentioned Entities; no authoritative entity URLs or knowledge graph integration |
| AI/GEO context | Implemented as editorial data | Target country/language/audience, content type, content intent; no automated AI workflow |
| Expert quote | Implemented | Manual quote/person/organization/role; legacy article renderer shows it |
| Custom meta tags | Partial | Backend/editor storage exists; public API intentionally omits them and no active renderer applies them |

### Editor workflow

1. Create mode starts with an empty in-memory `FormState`.
2. Title auto-suggests a slug until the admin manually touches the slug.
3. The editor validates required fields and URL formats before mutation.
4. A debounced copy of the form is analyzed roughly 400ms after changes.
5. Save creates a draft or updates an existing document.
6. Create redirects to `/admin/blogs/[id]/edit` after save.
7. Publish/unpublish first persists pending edits, then calls the status endpoint.
8. Schedule first persists pending edits, then sends an explicit ISO timestamp.
9. The backend is authoritative for status, dates, uniqueness, and role checks.

There is no autosave, collaborative editing, locking, revision history, preview URL/token, or media upload workflow.

### Content storage model

MongoDB is accessed through `src/server/db/client.ts`. The driver creates one reusable `MongoClient` promise on `globalThis` per warm process and calls `ensureDatabaseIndexes()` when obtaining the database.

Collections:

- `admins`
- `blogs`

The database name is selected by `MongoClient.db()` from the configured MongoDB URI/default connection behavior; there is no separate database-name environment variable in this code.

Indexes created by `src/server/db/indexes.ts`:

- `admins.username` unique ascending.
- `blogs.slug` unique ascending.
- `blogs.status` ascending + `blogs.publishedAt` descending.

There are no dedicated indexes for `deletedAt`, `scheduledAt`, category, tags, or title search. Search uses a case-insensitive regex on title.

### Blog document fields

The fuller admin shape is defined in `src/server/admin/blog-types.ts`; public mapping is in `src/server/types/blog.ts`.

| Field | Type | Required/default behavior |
|---|---|---|
| `_id` | MongoDB `ObjectId` | Generated on create |
| `title` | string | Required, max 200 |
| `slug` | string | Required after normalization, max 200, unique |
| `excerpt` | string | Required, max 500 |
| `content` | string | Required Markdown, max 100,000 characters |
| `coverImage` | string URL | Required HTTP(S) URL |
| `coverImageAlt` | string | Required, max 300 |
| `coverImageTitle` | string/null | Optional, max 200 |
| `coverImageCaption` | string/null | Optional, max 500 |
| `coverImageDescription` | string/null | Optional, max 1,000 |
| `authorName` | string | Current admin username at create time |
| `authorId` | `ObjectId` | Current admin id; admin shape only |
| `status` | `draft \| published \| unpublished` | New documents start as `draft` |
| `publishedAt` | Date/null | Null until publication unless create supplied a date |
| `scheduledAt` | Date/null | Future schedule only; cleared after publish/unschedule/status change |
| `createdAt` | Date | Generated on create |
| `updatedAt` | Date | Updated on every repository mutation |
| `deletedAt` | Date/null | Soft-delete marker |
| `seoTitle` | string/null | Optional, max 200 |
| `seoDescription` | string/null | Optional, max 300 |
| `category` | string/null | Optional, free text |
| `tags` | string[] | Optional; max 20, max 100 each, case-insensitive dedupe |
| `aiSummary` | string/null | Optional manual summary, max 300 |
| `keyTakeaways` | string[] | Optional; max 20, max 300 each |
| `aiContext` | object/null | Target country/language/audience/content type/intent |
| `entitySeo` | object/null | Main entity plus about/mentioned entity strings |
| `faq` | `{question, answer}[]` | Optional; max 20, question max 300, answer max 2,000 |
| `expertQuote` | object/null | Quote, person, organization required when populated; optional role |
| `callouts` | unknown[] | Accepted/returned in admin model; no editor UI and excluded from public mapper |
| `focusKeyword` | string/null | Internal editor field, max 200 |
| `secondaryKeywords` | string[] | Internal editor field, max 30, max 200 each |
| `canonicalUrl` | string/null | Optional HTTP(S) URL |
| `robotsIndex` | boolean | Defaults to true in create/mapping |
| `ogTitle` | string/null | Optional, max 200 |
| `ogDescription` | string/null | Optional, max 500 |
| `ogImage` | string/null | Optional HTTP(S) URL |
| `twitterCard` | enum/null | `summary`, `summary_large_image`, or `player` |
| `breadcrumbEnabled` | boolean | Defaults to true |
| `customMetaTags` | `{name, content}[]` | Max 20; name max 100/content max 1,000 |

The MongoDB layer has no migration files or MongoDB schema validator. Defaults are applied on create and in response mappers; pre-existing documents can still be structurally incomplete.

### CRUD, publication, and deletion

- Create: `POST /api/admin/blogs`; creates a draft with defaults and current admin attribution.
- Read admin detail: `GET /api/admin/blogs/[id]`; deleted documents are visible only to admins.
- Update: `PUT /api/admin/blogs/[id]`; patches editable fields and always updates `updatedAt`.
- List: `GET /api/admin/blogs`; filters status, scheduled, title search, page/limit, and admin-only includeDeleted.
- Publish/unpublish: `PATCH /api/admin/blogs/[id]/status`; publishing sets `publishedAt` if it is still null and clears `scheduledAt`.
- Schedule: `PATCH /api/admin/blogs/[id]/schedule`; accepts a future explicit ISO timestamp, forces draft state, and stores `scheduledAt`.
- Unschedule: `PATCH /api/admin/blogs/[id]/unschedule`; clears `scheduledAt`.
- Delete: `DELETE /api/admin/blogs/[id]`; admin-only soft delete.
- Restore: `PATCH /api/admin/blogs/[id]/restore`; admin-only restore; may clear an expired schedule.

Public visibility requires all of:

- `status === 'published'`.
- `publishedAt <= now`.
- `deletedAt === null`.

The public API returns only mapped public fields and sets `Cache-Control: public, max-age=60`.

### Slug behavior

`src/server/admin/blog.ts` normalizes Unicode, lowercases, strips accents, converts non-alphanumeric runs to hyphens, trims hyphens, validates the final shape, and checks uniqueness before insert/update. The unique MongoDB index is the final protection against races.

There is no old-slug redirect table. Changing a published slug can break existing links; the editor warns about this, but the backend does not create a redirect.

### Sanitization and serialization

- Blog content is stored as raw Markdown text.
- The server validates length and structured fields but does not run a general HTML sanitizer.
- The legacy `react-markdown` renderer enables `remark-gfm` but not `rehype-raw`, so raw HTML is not intentionally executed/rendered through that path.
- The active Next static editorial renderer does not render CMS content at all.
- JSON-LD serialization escapes `<` before embedding.
- Custom meta tag data is stored as plain `{name, content}` values and is not currently emitted by the active public page.

## 6. API inventory

### Public and health endpoints

| Method | Route | Behavior |
|---|---|---|
| `GET` | `/api/blogs` | Published MongoDB blog list with page/limit; default 1/9, max limit 30 |
| `GET` | `/api/blogs/[slug]` | Published MongoDB blog detail by normalized slug |
| `GET` | `/api/health` | Reports server, MongoDB connection, environment, commit marker, uptime, timestamp |

### Admin endpoints

| Method | Route | Behavior |
|---|---|---|
| `POST` | `/api/admin/auth/login` | Login, Argon2 verification, JWT cookie, rate limit |
| `POST` | `/api/admin/auth/logout` | Clear session cookie |
| `GET` | `/api/admin/auth/me` | Current active admin |
| `GET/POST` | `/api/admin/blogs` | List/create blogs |
| `GET/PUT/DELETE` | `/api/admin/blogs/[id]` | Read/update/soft-delete blog |
| `PATCH` | `/api/admin/blogs/[id]/status` | Publish/unpublish |
| `PATCH` | `/api/admin/blogs/[id]/schedule` | Create/update future schedule |
| `PATCH` | `/api/admin/blogs/[id]/unschedule` | Cancel schedule |
| `PATCH` | `/api/admin/blogs/[id]/restore` | Restore soft-deleted blog |
| `GET` | `/api/admin/blogs/scheduled-count` | Count future scheduled drafts |
| `GET/POST` | `/api/admin/users` | Admin-only list/create sub-admin |
| `DELETE` | `/api/admin/users/[id]` | Admin-only delete sub-admin |
| `PATCH` | `/api/admin/users/[id]/status` | Admin-only enable/disable sub-admin |
| `PUT` | `/api/admin/profile/username` | Change current username |
| `PUT` | `/api/admin/profile/password` | Change current password |

All known domain errors are converted to JSON `{ error }` with 400/401/403/404/409; unexpected errors become a generic 500 response without leaking details. Admin JSON responses use `Cache-Control: no-store`.

## 7. Media and storage audit

There is no CMS media-management route, media collection, upload route, multipart handler, signed upload URL, or file input in the admin blog editor.

Current media behavior:

- The blog editor stores image URLs, not uploaded files.
- `.env.example` contains `VITE_MEDIA_BASE_URL` for the older public asset helper.
- `next.config.ts` allows Next image remote patterns for the public R2 hostname under `/Photography/**`.
- Much of the public site still uses raw `<img>` elements and external media/video URLs.
- The CMS has no relationship between a blog document and an asset record; the relationship is simply a URL string.
- There is no orphan cleanup, transform pipeline, file validation by MIME/size, alt-text enforcement at upload time, or media reuse library.

## 8. SEO, GEO, and AEO audit

### Technical SEO that exists in the active Next path

- Root metadata in `app/layout.tsx`, including `metadataBase`, site title, description, favicon, Open Graph website defaults, and Twitter summary defaults.
- Per-route metadata via `src/next/routeMetadata.ts` for many marketing/legal pages.
- Active static blog index metadata in `app/(public)/blog/page.tsx`.
- Active blog article `generateMetadata()` with title, excerpt description, canonical, article Open Graph, and large-image Twitter card.
- Active static blog article JSON-LD from `src/editorial/seo.ts`.
- Static article parameters from `src/editorial/data.ts` via `generateStaticParams()`.
- Root `robots.txt` Route Handler disallowing `/admin` and `/api/admin`.
- Dynamic XML sitemap Route Handler with static `/` and `/blog` plus eligible published MongoDB posts.
- Breadcrumb UI in the legacy API-backed article page and an editor-controlled `breadcrumbEnabled` field for that path.
- Internal links in header/footer/editorial components and related-article/service links.
- Responsive image aspect ratios, eager/prioritized leading images, lazy loading in many lower-page regions, skeleton states, and `font-display: swap`.

### SEO implemented only in the legacy API-backed blog path

`src/blog/pages/BlogPage.tsx`, `src/blog/pages/BlogDetailPage.tsx`, and `src/blog/lib/schema.ts` implement a richer CMS-aware SEO design:

- Dynamic title and meta description from CMS fields.
- Canonical URL with CMS override.
- `robotsIndex` handling.
- Open Graph title/description/image/type/time/author.
- Twitter card/title/description/image.
- JSON-LD graph containing Organization, Person, ImageObject, WebPage, BlogPosting/Article, BreadcrumbList, and valid FAQPage.
- Visible summary, key takeaways, FAQ, expert quote, breadcrumb, and table of contents.
- Per-page metadata cleanup to prevent stale tags during client navigation.
- Paginated API blog list with self-canonical query URLs.

These features are real source code, but they are not active in the current Next `/blog` route.

### Sitemap and robots behavior

`src/server/seo/sitemap.ts` includes:

- `/`
- `/blog`
- Published, non-deleted MongoDB blogs with `robotsIndex !== false`.

If a blog has a cross-origin `canonicalUrl`, it is omitted from the sitemap. Same-origin canonical URLs are used verbatim. Sitemap response cache is 300 seconds. `robots.txt` cache is 3600 seconds.

Important mismatch: the active static editorial blog articles are not explicitly added to the sitemap. They will only appear if matching MongoDB documents also exist and satisfy the sitemap query.

### Structured data

Active Next static editorial article schema is a simple `BlogPosting` or `NewsArticle` with headline, description, image, dates, category, Organization author, publisher, and canonical `mainEntityOfPage`.

The CMS-aware legacy schema is more complete and conditionally includes FAQPage only when the visible FAQ entries are complete. It deliberately does not invent `sameAs`, Speakable, HowTo, Product, Review, or VideoObject data.

There is no automatic schema generation in the active Next public CMS route because the CMS fields are not read there.

### GEO/AEO functionality

Implemented editorial inputs and heuristics:

- `aiSummary` manual field.
- `keyTakeaways` manual field.
- AI context fields: target country, target language, target audience, content type, content intent.
- Entity SEO fields: main entity, about, mentioned entities.
- FAQ editor.
- Expert quote editor.
- Question-heading heuristic in `src/lib/markdownMetrics.ts`.
- Content Health scores labeled SEO, AEO, and GEO in `src/admin/pages/blogs/components/AnalysisPanel.tsx`.
- Word count, reading time, headings, links, images, paragraphs, readability, TOC count, heading-jump warnings, and schema-readiness checks.

Not implemented:

- No AI model/API generation.
- No automated citation extraction or source verification.
- No author profile/entity pages.
- No authoritative entity IDs or `sameAs` URLs.
- No active answer-first block rendering in the Next CMS path.
- No automated content rewrite or factuality checker.
- No schema generation from the CMS in the active public Next article path.

The analyzer explicitly describes itself as internal editorial guidance, not a Google score. That distinction should be preserved.

### Redirects and indexing risks

- No redirect map or old-slug redirect handler was found.
- Admin routes rely on robots disallow rather than explicit `noindex` metadata on the admin layout/pages.
- The static editorial `/blog` content and MongoDB sitemap/API content can diverge.
- CMS fields such as `canonicalUrl`, `robotsIndex`, `ogTitle`, `ogDescription`, and `ogImage` are ignored by the active Next public blog.
- The root `metadataBase` is hard-coded to `https://brandworks.me`, while sitemap/robots use `PUBLIC_ORIGIN`/`FRONTEND_ORIGIN`; deployment must keep those origins aligned.
- No rel-prev/next pagination metadata exists in the active Next editorial route. The older API client uses self-canonical pagination but does not emit rel-prev/next.

## 9. Caching, rendering, and deployment behavior

### Rendering status from the successful Next build

The inspected `next build` completed successfully. Its route summary classified:

- Most marketing/legal pages as static.
- `/blog` as dynamic because it calls `connection()`, although the content source is still static editorial data rendered through a client component.
- `/blog/[slug]` as SSG for the static editorial slugs from `generateStaticParams()`.
- Admin list/edit pages with dynamic behavior where `connection()` is used or client auth/data loading applies.
- API, sitemap, and robots handlers as dynamic/route handlers.

### Cache controls

- Public blog API: `public, max-age=60`.
- Admin JSON API: `no-store`.
- Sitemap: `public, max-age=300`.
- Robots: `public, max-age=3600`.
- No application-level `unstable_cache`, tag invalidation, revalidation hook, or CDN purge integration was found.

### Scheduled publishing

The server intentionally does not start an interval. `src/server/jobs/publish-due.ts` is an explicitly invoked process. It atomically changes matching drafts from scheduled to published and copies `scheduledAt` to `publishedAt`.

The repository documents the need for a hosting-provider cron, but no cron configuration is present. Without an external invocation of `npm run jobs:publish-due`, scheduled posts remain drafts.

### Deployment/configuration files

- `next.config.ts` configures remote image patterns only.
- `postcss.config.mjs` configures Tailwind/PostCSS.
- `vite.config.ts` contains legacy Vite test/build configuration and maps Vite env values to `NEXT_PUBLIC_*` only for Vite’s define step.
- `playwright.config.ts` starts both a Vite server and a Next server for parity testing.
- `.env.example` documents Vite-prefixed public variables but does not provide a complete server-side example for `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PUBLIC_ORIGIN`, or `FRONTEND_ORIGIN`.
- The README still describes a separate `../backend/` Express/MongoDB deployment, but no `backend/` directory exists in this workspace. That documentation is stale relative to the current Next server implementation.

Environment variable names found, without values:

**Server-only/current Next:** `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PUBLIC_ORIGIN`, `FRONTEND_ORIGIN`, `NODE_ENV`, `GITHUB_SHA`, `VERCEL_GIT_COMMIT_SHA`.

**Public/legacy Vite:** `VITE_API_BASE_URL`, `VITE_MEDIA_BASE_URL`, `VITE_EVOLKUN_URL`, `VITE_GA_MEASUREMENT_ID`, `VITE_CLARITY_PROJECT_ID`, `VITE_GTM_CONTAINER_ID`, `VITE_META_PIXEL_ID`, `VITE_GSC_VERIFICATION`.

**Analytics code reads:** `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_CLARITY_PROJECT_ID`, `NEXT_PUBLIC_GTM_CONTAINER_ID`, `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_GSC_VERIFICATION`.

This naming split is a deployment risk: the example file documents `VITE_*`, while the analytics runtime reads `NEXT_PUBLIC_*` outside the Vite define shim.

## 10. Verification results

Commands run without modifying application source:

| Check | Result |
|---|---|
| `npm run typecheck` | Pass |
| `npm run build` | Pass; Next 16.4.0 compiled and generated 57 static pages/routes successfully |
| `npm run lint` | Exit success, but many warnings including unused variables, React effect patterns, immutability warnings, and fast-refresh warnings |
| `npm test -- --run` | Fail: 13 test files failed, 34 passed; 33 failed tests out of 270 |

Main failure categories from the Vitest run:

- Legacy tests reference missing files such as `src/Services.tsx`, `src/Hero.tsx`, and `backend/src/services/sitemap.service.ts`.
- Analytics tests expect Vite env injection but the Vitest/Next environment reads `NEXT_PUBLIC_*` values differently.
- App tests render components without the custom router context expected by the migrated application.
- Media configuration tests expect runtime Vite env stubbing that is not reflected in the current module configuration.
- The Playwright parity file was picked up by Vitest and reports a Playwright test-registration error.

These failures indicate test-suite migration drift, not a type/build failure in the current Next production tree.

## 11. Incomplete, broken, or missing functionality

### Highest priority

1. **CMS-to-public-blog integration is missing in the active runtime.** Admin changes are stored in MongoDB but `/blog` and `/blog/[slug]` use `src/editorial/data.ts`.
2. **The sitemap/API and active public pages can describe different content sets.** MongoDB posts can appear in the sitemap/API while not rendering in the active Next blog.
3. **The README and environment documentation describe the old Vite/separate-backend architecture.** This can cause incorrect deployment setup.
4. **Scheduled publishing depends on an unconfigured external cron.** The UI can schedule successfully, but publication will not occur without the job.
5. **CMS SEO fields are ignored by the active Next article route.** Canonical, robots, OG, Twitter, FAQ, summary, takeaways, author, and updated date fields are only honored by the legacy API-backed renderer.

### CMS/editor gaps

- No media library or upload pipeline.
- No WYSIWYG/block editor.
- No autosave.
- No revision history or rollback.
- No author management/profile pages.
- No managed categories/tags/taxonomy.
- No callout editor despite a backend `callouts` field.
- No relation model for related articles.
- No preview URL or draft preview mode.
- No workflow approval/review state distinct from draft.
- No scheduled-post retry/monitoring UI or job health status.
- No permanent delete/retention policy for soft-deleted posts.

### Technical/security risks

- In-memory rate limiting is per process and cannot protect a multi-instance deployment.
- Forwarded IP headers are accepted without a documented trusted-proxy boundary.
- No explicit CSRF token was found for cookie-authenticated mutations.
- JWT expiry and cookie expiry can diverge when `JWT_EXPIRES_IN` is customized.
- No database migrations/schema validation are present.
- Title search is regex-based and lacks a title index/full-text index.
- No slug redirect history exists.
- Cross-origin canonical URLs are accepted by blog validation and can be emitted by the legacy client, while sitemap intentionally omits them.
- Content is not sanitized server-side as a general Markdown/HTML policy; safety relies on the renderer configuration.
- The active Next route and legacy Vite route can diverge behaviorally because they share some components but not the same data source.

### UI/UX/accessibility gaps

- Inconsistent visible focus treatment.
- Form-level rather than field-level validation.
- No accessible error summary focus/field links.
- Small touch targets for some reorder/remove controls.
- Horizontal admin nav lacks a mobile menu.
- Admin tables require horizontal scrolling on narrow screens.
- No dedicated asynchronous region/status announcements beyond individual alert/status messages.
- The public mobile Menu control is currently inert.

## 12. What should be preserved in a redesign

Preserve these working contracts unless there is a deliberate migration plan:

### Backend and data contracts

- MongoDB collection names `admins` and `blogs`.
- The public/admin field distinction in `src/server/types/blog.ts` and `src/server/admin/blog-types.ts`.
- Argon2id password hashing and server-only JWT signing material.
- `httpOnly`, `sameSite=lax` session cookie behavior and client-side token isolation.
- Admin role enforcement in both UI and backend.
- Unique slug index and server-side normalization/validation.
- Soft-delete plus admin-only restore behavior.
- Published visibility rule: published, not deleted, and publication time not in the future.
- Explicit ISO scheduling contract and atomic scheduled publishing job.
- Generic error responses that do not expose secrets/internal error details.
- Public API response mappers that do not leak admin IDs, status, delete markers, or internal keyword fields.

### Editorial/CMS features

- Markdown + GFM support if Markdown remains the authoring format.
- Required image alt text.
- Cover/OG previews and character counts.
- Debounced Content Health analysis as editorial guidance, not a fake search-engine score.
- FAQ, key takeaways, summary, expert quote, entity, and AI-context fields if the redesign continues the GEO/AEO direction.
- Explicit robots/canonical controls, but only after they are connected to the active public renderer.
- Schedule timezone explanation and server-authoritative future-date validation.
- Soft-delete messaging that explains recovery rather than implying destructive deletion.

### Public UX and visual system

- Self-hosted brand fonts and global typography tokens.
- Fluid public gutters, max-width, spacing rhythm, and responsive grid primitives.
- Reduced-motion handling for large visual/scroll experiences.
- Aspect-ratio reservation and skeleton states for async media.
- Descriptive content-image alt text and decorative-image `alt=""` behavior where appropriate.
- Editorial hierarchy, breadcrumbs, summary/takeaways, FAQ, and related-content patterns from the API-backed article implementation, once wired to the active source.

## 13. Recommended future implementation order

This is an audit conclusion, not an instruction to change code now.

1. Decide whether Next MongoDB content or static editorial content is the canonical public blog source.
2. If MongoDB is canonical, migrate the active Next blog index/article pages to server/API-backed data and connect CMS metadata/schema fields to `generateMetadata()` and page JSON-LD.
3. Add a safe draft-preview mechanism before changing editor workflow.
4. Make sitemap, canonical, robots, structured data, and public route generation use the same data source.
5. Update README/env/deployment documentation to the current Next architecture and document the required server variables.
6. Add the missing operational contract for scheduled publishing: configured cron, health/last-run visibility, failure logging, and retry policy.
7. Separate or remove legacy Vite-only code/tests after parity is no longer required; update test discovery so Vitest does not execute Playwright specs.
8. Add media storage/upload only after deciding the asset provider, URL policy, transformations, retention, and relationships.
9. Improve editor accessibility and responsive navigation before a visual redesign: focus rings, field-level errors, error summary focus, larger touch targets, mobile admin navigation, and accessible async status.
10. Add revisions, author profiles, taxonomy, redirects, and richer content blocks only after the public data path is unified.

## 14. Key source-file index

### Runtime and routes

- `package.json`
- `next.config.ts`
- `tsconfig.json`
- `app/layout.tsx`
- `app/(public)/layout.tsx`
- `app/admin/layout.tsx`
- `src/next/NextNavigationProvider.tsx`
- `src/next/PublicLayout.tsx`

### Admin UI

- `src/admin/pages/Login.tsx`
- `src/admin/pages/Dashboard.tsx`
- `src/admin/pages/blogs/BlogList.tsx`
- `src/admin/pages/blogs/BlogEditor.tsx`
- `src/admin/pages/blogs/components/AnalysisPanel.tsx`
- `src/admin/pages/blogs/components/FaqEditor.tsx`
- `src/admin/pages/blogs/components/CustomMetaTagsEditor.tsx`
- `src/admin/pages/Settings.tsx`
- `src/admin/pages/Users.tsx`
- `src/admin/components/AdminShell.tsx`
- `src/admin/components/RequireAdminAuth.tsx`
- `src/admin/context/AdminAuthContext.tsx`

### Server/auth/database

- `src/server/config/env.ts`
- `src/server/db/client.ts`
- `src/server/db/indexes.ts`
- `src/server/admin/auth.ts`
- `src/server/admin/http.ts`
- `src/server/admin/blog.ts`
- `src/server/admin/blog-validation.ts`
- `src/server/admin/blog-types.ts`
- `src/server/repositories/admin.repository.ts`
- `src/server/repositories/admin-blog.repository.ts`
- `src/server/repositories/blog.repository.ts`
- `src/server/repositories/blog-jobs.ts`
- `src/server/services/public-blog.service.ts`
- `src/server/types/blog.ts`

### API and SEO

- `app/api/admin/**`
- `app/api/blogs/**`
- `app/api/health/route.ts`
- `app/sitemap.xml/route.ts`
- `app/robots.txt/route.ts`
- `src/server/seo/sitemap.ts`
- `src/server/seo/robots.ts`
- `src/blog/lib/schema.ts`
- `src/editorial/seo.ts`

### Active versus legacy public blog

- Active Next: `app/(public)/blog/**`, `src/next/EditorialIndexClient.tsx`, `src/next/EditorialArticleClient.tsx`, `src/editorial/**`.
- Legacy API-backed: `src/blog/api/**`, `src/blog/pages/BlogPage.tsx`, `src/blog/pages/BlogDetailPage.tsx`, `src/blog/components/ArticleMarkdown.tsx`.

## Final assessment

The project has a substantial, thoughtfully validated admin/CMS foundation: authentication, roles, MongoDB repositories, status transitions, scheduling, SEO/GEO/AEO authoring fields, Markdown preview, structured FAQ data, and public API mappers all exist. The main architectural defect is not absence of CMS capability; it is that the active public Next blog is still static and bypasses that capability. Any redesign that assumes the admin panel already drives the visible public blog would be incorrect until that integration is completed.
