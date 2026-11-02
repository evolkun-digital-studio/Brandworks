const ACTIVE_CONTENT = /<\s*(?:script|foreignObject|iframe|embed|object)\b|<!ENTITY\b|\son[a-z]+\s*=|javascript\s*:|data\s*:\s*text\/html/i

/**
 * Uploaded SVGs must really be SVG and carry no scriptable content. The media
 * route also serves them under a sandboxing CSP, so this is the second of two
 * layers: an <img> never runs SVG scripts, but opening the file directly could.
 */
export function isSafeSvg(buffer: Buffer): boolean {
  const text = buffer.toString('utf8').replace(/^﻿/, '').trimStart()
  // Design tools commonly write an XML prolog, comments and a DOCTYPE before the root element.
  const withoutProlog = text.replace(/^(?:<\?xml[^>]*\?>\s*|<!--[\s\S]*?-->\s*|<!DOCTYPE[^>[]*>\s*)+/i, '')
  return /^<svg[\s>]/i.test(withoutProlog) && !ACTIVE_CONTENT.test(text)
}

/** Sent with every SVG response: no scripts, no network, no same-origin access. */
export const SVG_CONTENT_SECURITY_POLICY = "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox"
