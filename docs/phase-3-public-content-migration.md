# Phase 3 public content migration

The public journal now uses MongoDB-backed CMS records as its authoritative source.

## Migration contract

- Published CMS records render on `/blog` and `/blog/[slug]` and take precedence over any old static record with the same slug.
- While migration is in progress, the old static journal is a server-only fallback when the CMS has no published records. Its existing article URLs remain available if their slugs have not yet been created in the CMS.
- The fallback can be disabled without deleting content by setting `PUBLIC_BLOG_LEGACY_FALLBACK=false`.
- Once the migrated CMS records have been verified, disable the fallback and keep the static source in the repository until the redirect and content audit is complete.
- Changing a CMS slug records the previous slug in `blog_redirects`. A previous URL permanently redirects only to a currently published destination.

The migration is intentionally reversible: disabling the flag changes routing behavior, while MongoDB and the legacy source remain intact.

