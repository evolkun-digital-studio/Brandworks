# Phase 6 — Editorial operations and scaling

## Delivered

- Added review states: Draft, In review, Changes requested, and Approved.
- Enforced role boundaries server-side: sub-admins can edit and submit; admins approve, publish, schedule, archive, restore revisions, and restore backups.
- Added a scheduled publishing calendar at `/admin/calendar` using the existing server-authoritative scheduler.
- Added activity history at `/admin/activity` for content, review, publishing, archive, restore, and backup actions.
- Added revision comparison for the latest two saved revisions, alongside the existing rollback flow.
- Added JSON article/redirect backup export and admin-only restore with validation and activity logging.
- Added stored notification preferences for review changes, publish failures, and upcoming scheduled publishing.
- Preserved multi-author operation through separate admin/sub-admin accounts and actor attribution in activity history.

## Security and reliability boundaries

Publishing and schedule mutations are now admin-only in both the UI and API. Backups never include media binaries; GridFS remains the source of truth for media. Restore is additive/upserting and does not silently delete records.

The notification preferences are persistence only because no outbound email provider is configured. AI-assisted drafting remains a human-authored/disconnected state; no fabricated AI response or external credential was added. Coordinated releases and multilingual records remain future extensions rather than unsupported mock workflows.

## Verification

- `npm.cmd run typecheck` — passed.
- `npm.cmd run build` — passed; calendar, activity, review, comparison, backup, and preference routes appear in the route manifest.
- Focused Phase 6 tests — passed: 5 files, 40 tests.

No screenshot or browser visual review was performed in this phase; verification was code, type, build, and focused test based.

Stopped after Phase 6.
