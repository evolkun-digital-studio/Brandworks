/**
 * Pure slug normalization — no Node/browser/React dependency beyond
 * built-in `String.prototype.normalize`, so no package was needed.
 *
 * This is generation/normalization ONLY. It does not check uniqueness
 * against the database or resolve collisions — that is a service-layer
 * concern (see repositories/blog.repository.ts's header comment and
 * the Phase 2 plan), since only the service layer knows what "already
 * taken" means and how to react to it.
 *
 * Deterministic: the same input always produces the same output.
 */

// Unicode combining diacritical marks (U+0300-U+036F) left behind after
// NFD-decomposing an accented character, e.g. "e" + U+0301 (combining
// acute accent) from "é". Written as an explicit \u range rather than
// literal characters to avoid any editor/encoding ambiguity.
const COMBINING_MARKS_PATTERN = /[\u0300-\u036f]/g

export function slugify(input: string): string {
  return input
    .normalize('NFD') // decompose accented characters, e.g. "é" -> "e" + combining acute accent
    .replace(COMBINING_MARKS_PATTERN, '') // strip the combining accent marks left behind
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // any run of punctuation/whitespace/symbols -> one hyphen
    .replace(/-+/g, '-') // collapse any repeats introduced above
    .replace(/^-+|-+$/g, '') // trim leading/trailing hyphens
}
