# Phase 4 — Media library and website management

## Delivered

- Added an admin-only media workspace at `/admin/media`.
- Added MongoDB GridFS storage for uploaded assets and a same-origin streaming route at `/api/media/:id`.
- Added upload validation for file size, MIME allowlist, and file signatures. Images capture intrinsic dimensions where the format exposes them.
- Added searchable, type-filtered asset listing with reusable URLs, alt text, captions, internal descriptions, and editorial usage counts.
- Added soft deletion so existing references are not broken by an archive action.
- Enabled Next Image AVIF/WebP delivery for responsive image consumers where the configured image runtime supports it.
- Added controlled website settings at `/admin/settings` for site metadata, contact email, footer tagline, navigation labels, and HTTPS social links.
- Wired those settings into public metadata, the existing header navigation, and the existing footer.

## Deliberate boundaries

The public homepage, service pages, work/project sections, testimonials, and other motion-led sections remain authored in code. They were not converted into generic CMS blocks, preserving their spatial behavior, animation, and interaction design.

Asset relationships are currently tracked through the existing blog cover/OG URL fields. The library calculates usage counts from those references, so assets can be reused immediately without a destructive schema migration. A future editor picker can promote that relationship to an explicit asset ID without changing the storage boundary.

The existing static filename-to-R2 media map remains compatible and untouched. New uploads use GridFS because the repository already has MongoDB connectivity but no R2 credentials, SDK, presigning flow, or server-side upload boundary.

## Verification

- `npm.cmd run typecheck` — passed.
- `npm.cmd run build` — passed; new admin and media routes are present in the route manifest.
- Focused UI/database tests — passed: 3 files, 12 tests.

The full repository suite still contains unrelated legacy/Vite and migration-drift failures documented during earlier phases; it was not used as the Phase 4 acceptance gate.
