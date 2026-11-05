# BRANDWORKS

## Insights CMS (Next.js)

The current Next.js routes `/blog`, `/blog/[slug]`, `/news`, and `/news/[slug]`
read the existing MongoDB `blogs` collection. In `/admin/blogs`, choose
**Content Type → Journal or Newsroom** under **Document → Organize**. Existing
records without a content type remain Journal articles. Categories, images,
author, publication date, Markdown/rich text, and SEO fields use the same editor,
authentication, media library, and database as before.

Only published, non-deleted records with a publication date at or before now
are public. Drafts and unpublished records return 404 on their detail routes.
Saving, publishing, unpublishing, restoring, or deleting content invalidates
both section routes and the sitemap. Public API responses use `no-store`;
server pages retain the existing 60-second revalidation policy. Scheduled
publishing still uses the existing `jobs:publish-due` worker.

Migrate the original static stories into this CMS before deploying these routes:

```sh
npm run cms:migrate-editorial -- --dry-run
npm run cms:migrate-editorial
```

The migration loads `.env.local`, reuses `MONGODB_URI`, and only inserts missing
slugs. Existing articles (including drafts and deleted records) are preserved.
It can be repeated safely. Legacy photo filenames that referenced missing R2
objects resolve to the same original Unsplash photo IDs. For untouched records
imported before that correction, run `npm run cms:migrate-editorial -- --repair-image-urls`;
edited records are excluded from this optional repair. Public pages never fall
back to the static migration source.

The Vite preview also reads the public CMS APIs; the older Vite/Express setup
notes below remain for that workflow.

The BRANDWORKS marketing site and blog: a React 19 + TypeScript + Vite
single-page app (this directory) backed by a separate Node.js/Express/MongoDB
API in [`../backend/`](../backend/README.md). Client-rendered throughout — there is
no SSR/SSG (see [`../backend/README.md`](../backend/README.md)'s deployment section
and this project's Phase 13 SEO audit for why that's a deliberate,
documented trade-off rather than an oversight).

Production deployment (GitHub Actions → cPanel) is documented in the
[repository README](../README.md#production-deployment).

## Public routes

| Route | Purpose |
| --- | --- |
| `/` | Homepage |
| `/blog` | Blog listing (paginated) |
| `/blog/:slug` | A single published article |
| `/admin/*` | The CMS — authenticated, never indexed, lazy-loaded as its own bundle chunk |
| anything else | A `noindex`'d not-found page (`src/NotFound.tsx`) |

## Setup

```bash
npm install
cp .env.example .env   # adjust values if needed — see below
npm run dev
```

The backend (separate process, separate `.env`) must also be running — see
[`../backend/README.md`](../backend/README.md).

## Scripts

```bash
npm run dev      # vite dev server
npm run build      # tsc -b && vite build
npm run typecheck  # tsc -b
npm test           # vitest run
npm run lint       # oxlint
npm run media:seed # Media Manager: create indexes, import current images
npm run media:check-storage # Media Manager: test the R2/S3 connection
```

## Environment variables

See `.env.example` for the full list with inline explanations. The two that
matter for production deployment:

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | This frontend's only way of reaching the backend API (read in one place, `src/config/api.ts`). Point it at the backend's real origin in production (e.g. `https://api.example.com`) — the deploy pipeline sets it from the `VITE_API_URL` GitHub secret, and a production build never falls back to localhost. **Never** exposed to the public as a canonical/sitemap/OG URL; those always use this site's *own* origin (`window.location.origin`), never the API's. |
| `VITE_GA_MEASUREMENT_ID`, `VITE_CLARITY_PROJECT_ID`, `VITE_GTM_CONTAINER_ID`, `VITE_META_PIXEL_ID`, `VITE_GSC_VERIFICATION` | Optional measurement/verification providers (Phase 12) — every one is disabled unless explicitly set; none are required for the site to work. |

All `VITE_*` values are bundled into the public client build and are never
secret — see `.env.example` for what's safe to put there (identifiers only,
never API keys or OAuth secrets).

## How to replace images

You can change the main photos on the homepage yourself, without a developer.

**Before you start:** you need an **Administrator** account. Sub-admins can't
change website images.

1. Sign in at `/admin` and choose **Media Manager** in the left-hand menu.
2. Pick the part of the website along the top:
   - **Hero**: the top of the homepage. **Main hero image** is the big photo
     behind the opening film. **Photography grid** is the set of photos shown
     when a visitor clicks "Photography" there; add at least 3 to replace the
     built-in set.
   - **Photography**: the row of four photos further down the homepage.
   - **Photography page**: every photo on the Photography service page. Each
     card shows the current photo and where it appears (photo wall, 3D sphere,
     and so on). **Replace** swaps it everywhere it's used; **Remove** brings
     back the original. Try to keep the same shape (upright, wide or square).
3. **To replace an image**, click **Replace** (or **Upload** if the spot is
   empty). Drag your photo into the box, or click the box to choose a file.
   - Use a **JPG, PNG or WebP**, no bigger than **10 MB**. SVG files aren't accepted.
   - Recommended sizes: **Hero 2400 × 1350 px** (a wide 16:9 photo).
     **Photography: at least 1600 px** on the longest side. Smaller photos still
     upload, but you'll see a warning because they may look blurry on big screens.
4. **Click the most important part of the photo**, such as a face or a product.
   The website crops photos to fit different screens, and this spot always stays
   in view.
5. **Fill in the alt text.** It's required. Write one short sentence describing
   what's in the photo, for example "Model in a red jacket against a red wall".
   Screen readers read it aloud, and it helps Google too.
6. Click **Upload and publish**. A progress bar shows the upload. When it
   finishes, the photo is already live, so refresh the homepage to see it.

**Photography gallery.** Click **Add images** to add one or more photos. The
homepage shows the **first four**, in order: a tall portrait, a wide landscape,
then two smaller photos on the right. Drag the cards, or use the ← → buttons,
to change the order. Photos after the fourth are kept but not shown.

**Other actions on each image:**

- **Edit alt text** changes the description or the focal point without
  uploading again.
- **Restore previous**, or **Versions**, brings back one of the last three
  photos used in that spot. Older ones are deleted automatically.
- **Remove** (Hero) puts back the website's original built-in photo. You can
  still restore yours later from **Versions**.
- **Delete** (a gallery photo) removes it, with its earlier versions, for good.

You don't need to resize or convert anything. The website turns every upload
into small, fast-loading WebP files in several sizes.

<details>
<summary>For developers</summary>

- Sections and slots are configured in `src/config/siteMediaSections.ts`. Add
  an entry there, then read it with `getSiteMedia('<id>')`
  (`src/server/site-media/public.ts`) in a server component.
- Uploads go to `app/api/admin/media/upload/route.ts`, which runs `sharp`
  (`src/server/site-media/pipeline.ts`). Files are written through the storage
  adapter in `src/server/storage` (`STORAGE_PROVIDER`, R2 by default; see
  `.env.example`) as `media/<section>/<slot>/<uuid>-<width>.webp`.
- Records live in the MongoDB `site_media` collection. Run
  `npm run media:seed` once per environment: it creates the indexes and
  imports today's images as each empty slot's first version.
- **Connecting Cloudflare R2.** In the Cloudflare dashboard, open **R2**:
  1. Pick the bucket (the site's existing public bucket is served from
     `pub-4a67635800e64547a1a4fd524f7a2783.r2.dev`) and copy its **name** →
     `R2_BUCKET`. Under **Settings › Public access**, copy the public URL
     (r2.dev or a custom domain) → `R2_PUBLIC_URL`.
  2. Copy the **Account ID** from the R2 overview page → `R2_ACCOUNT_ID`.
  3. **Manage R2 API tokens › Create API token**: permission **Object Read &
     Write**, limited to that bucket. Copy the **Access Key ID** →
     `R2_ACCESS_KEY_ID` and **Secret Access Key** → `R2_SECRET_ACCESS_KEY`. The
     secret is shown only once.
  4. Put those five values and `STORAGE_PROVIDER=r2` in `.env.local` (and in
     the hosting environment for production), then run
     `npm run media:check-storage`. It uploads, reads back and deletes a tiny
     test file. Restart the dev server afterwards.
- Saves call `revalidateTag('media-<section>', { expire: 0 })`. The
  `media-hero` and `media-photography` tags are read through `unstable_cache`.

</details>

## Architecture notes

- **Backend is a separate deployable** (`../backend/`) — its own `package.json`,
  its own `.env`, its own README. It owns MongoDB access, admin auth, and the
  public blog/SEO API.
- **`/sitemap.xml` and `/robots.txt`** are generated by the backend but must
  be reachable at this frontend's own public origin in production — see
  [`../backend/README.md`](../backend/README.md#production-deployment). On the
  cPanel deployment the pipeline adds a redirect for those two paths to
  `public/.htaccess` at build time.
- **`public/.htaccess`** is the Apache configuration for production: the
  React Router refresh fallback, cache headers, and the redirect above.
- **SEO**: per-page metadata (title/description/canonical/robots/OG/Twitter)
  and JSON-LD are applied client-side via `src/blog/lib/documentHead.ts`,
  cleaned up on every route change so nothing from one page leaks into the
  next. See the project's phase reports (Phase 8, 9, 13) for the full
  history and the known limitations of doing this without SSR.
- **Analytics** (Phase 12): a small provider-agnostic abstraction under
  `src/analytics/` — GA4, Microsoft Clarity, GTM, and Meta Pixel are all
  implemented but inert unless their env var is set, and none ever run on
  `/admin/*`.
