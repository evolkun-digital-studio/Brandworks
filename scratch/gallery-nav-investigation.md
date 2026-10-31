# Project gallery navigation investigation

- Symptom: in the project overlay, advancing works but the previous-photo control can remain unavailable or fail to return to the prior image.
- Contract: after selecting an image with either gallery arrow, the opposite arrow must be immediately available when another image exists.
- Evidence: `OverlayGallery` used the `scroll` callback as the only way to update `active`, while `goTo` started a smooth scroll without updating it. The previous control's enabled state and destination both depend on `active`.
- Hypothesis: during a smooth scroll, `active` can still be the old index when the previous control is evaluated or clicked.
- Fix: set the clamped target index synchronously in `goTo`, then start the scroll. Navigation availability is based on that state rather than a live ref measurement.
