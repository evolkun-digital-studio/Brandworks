# Performance Marketing page: retired sections

**Status:** recorded 2026-11-06 · **Page:** `/services/performance-marketing`
(`src/legacy-pages/services/PerformanceMarketingPage.tsx`)

## Decision

The page ships the trimmed layout introduced in commit `de6ad02`
("performance marketing", 2026-11-05). That commit commented out sections 04,
06, 07, 08, 09, 10, 11, 12, 13, 14, 15, 16, 18, 19, 20 and 23 and adjusted
the page CSS to suit. Commits after it (`a47c82f` mobile responsive, `b728fe2`
sitemap/robots) kept that layout, so it is treated as the approved design.

Retired interactive widgets:

| Widget | Section | Component |
|---|---|---|
| Creative combination lab (hook / visual / offer / audience) | 06 Creative performance | `CreativeLab` |
| Before / after landing-page comparison | 09 Landing page optimization | `LandingComparison` |
| FAQ disclosures (`<details name="pm-faq">`) | 23 FAQs | `faqs` |

The JSX, components and copy are still in the file, commented out, so a
section can come back without rewriting it. Nothing on the page, in its
metadata or in its structured data publishes the retired FAQ copy.

## Consequences

- **Service index.** All 16 offerings in "What we manage" are still listed.
  Each one links only when its explaining section is rendered
  (`RENDERED_SECTION_IDS`). Right now every target is a retired section, so
  every offering renders as plain, non-interactive text instead of a dead
  `#pm-section-NN` link.
- **Tests.** The two tests that exercised the retired widgets were replaced
  in `PerformanceMarketingPage.test.tsx`. The new tests check that:
  - the retired widgets leave no orphaned controls or copy;
  - the live performance-system stages render in order;
  - `RENDERED_SECTION_IDS` matches the DOM;
  - every service-index link really navigates to and focuses its section;
  - offerings with no rendered section are listed as accessible text.

## Restoring a section

1. Uncomment the section in `PerformanceMarketingPage.tsx`.
2. Add its id (`pm-section-NN`, or its custom `id`) to `RENDERED_SECTION_IDS`.
   The offerings that point at it become links again on their own.
3. If it is section 06, 09 or 23, restore the matching widget test
   (see git history of `PerformanceMarketingPage.test.tsx` before this change).

The DOM-match test fails if step 1 or step 2 is done without the other.
