# Testimonial Section Design QA

- Source visual truth: `C:\Users\assas\OneDrive\Pictures\Screenshots\Screenshot 2026-10-20 124425.png`
- Browser-rendered implementation: `C:\Users\assas\Downloads\BW2.0\Brandworks\artifacts\design-qa\testimonials\desktop-full.png`
- Matched card-region capture: `C:\Users\assas\Downloads\BW2.0\Brandworks\artifacts\design-qa\testimonials\desktop-card-region.png`
- Combined comparison: `C:\Users\assas\Downloads\BW2.0\Brandworks\artifacts\design-qa\testimonials\reference-comparison.png`
- Mobile evidence: `C:\Users\assas\Downloads\BW2.0\Brandworks\artifacts\design-qa\testimonials\mobile.png`
- Viewport: 1772 × 1000 CSS px for the full section; 1772 × 683 CSS px for the normalized card-region comparison; 390 × 844 CSS px for mobile.
- Pixel density: deviceScaleFactor 1. Source and normalized implementation crop are both 1772 × 683 physical pixels, so no density conversion was required.
- State: default, reduced-motion final state. Mobile horizontal scroll was also exercised.

## Full-view comparison evidence

The final desktop capture preserves the reference's four equal cards, centered 1500px container, 10px gutters, soft lime surface, 20px radii, upper quote block, 295px bottom image frame, and lower-left white identity panel. Browser geometry measured each card at 368 × 550px at the target viewport, the image at 308 × 295px, and the identity panel at 215 × 118px.

The reference crop does not include its section heading. The implementation intentionally includes the requested BrandWorks heading and supporting line above the card row with the specified 60px content gap.

## Required fidelity surfaces

- Fonts and typography: Existing BrandWorks Grimblade is retained for the centered heading and Open Sans for testimonial copy and metadata. Size, weight, line height, and wrapping follow the supplied brief. The source card type is slightly more geometric, but using the established BrandWorks body family is an intentional product constraint.
- Spacing and layout rhythm: Passed. Four 550px cards, 10px gutters, 30px desktop insets, bottom-aligned 295px imagery, and overlapping panels match the source composition. Section padding and heading gaps stay within the written contract.
- Colors and visual tokens: Passed. White field, subtle gray dotted texture, `#D4FFA6` card surface, black copy, gray attribution, and white panels match the specified palette.
- Image quality and asset fidelity: Passed with intentional content substitution. Existing high-resolution BrandWorks editorial portraits are used instead of the reference's unverified people. Images remain sharp, independently cropped, and optimized through Next.js Image.
- Copy and content: Passed for development state. The repository contains no verified four-client testimonial set, so every card is explicitly labelled as development-only placeholder content rather than presenting fictional endorsements.

## Focused comparison evidence

The card region was captured at the source's native 1772 × 683 dimensions and combined side by side in `artifacts/design-qa/testimonials/reference-comparison.png`. Native browser measurements verify the small details that are harder to judge in the combined overview: 10px gutters, 295px image height, 70% identity-panel width, and approximately 115px panel height.

## Interaction and responsive evidence

- Desktop hover leaves the card and identity panel fixed while moving/scaling only the photo.
- Entrance animation uses the requested 35px rise, 0.98 scale, 0.7s duration, and 0.1s stagger.
- Reduced motion renders the final visible state and disables image hover movement.
- Mobile renders a 332 × 510px primary card at 390px viewport width, exposes the following card, uses mandatory inline snap, hides the scrollbar, and successfully scrolls horizontally.
- The browser capture reported no page errors from this section.

## Comparison history

1. Initial pass: reduced-motion hydration could leave cards at opacity 0; placeholder metadata made panels 140px tall; dotted texture rendered behind the section background.
2. Fixes: explicitly animated reduced-motion content to `visible`, shortened the development label to restore a two-line 118px panel, and moved the texture into the visible stacking context below the content.
3. Final evidence: four visible 368 × 550px cards, 10px gaps, 308 × 295px photos, 215 × 118px panels, working mobile snap, and zero section page errors.

## Findings

No actionable P0, P1, or P2 visual mismatches remain.

## Follow-up polish

- P3: Replace the four development-only records and editorial stand-in portraits when approved testimonial copy, names, roles, companies, and client photographs are supplied.

final result: passed
