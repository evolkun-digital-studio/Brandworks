import { describe, expect, it } from 'vitest'
import { isSafeSvg } from './svg'

const check = (text: string) => isSafeSvg(Buffer.from(text))

describe('isSafeSvg', () => {
  it('accepts ordinary SVGs, including what design tools write before the root', () => {
    expect(check('<svg xmlns="http://www.w3.org/2000/svg"><circle r="1"/></svg>')).toBe(true)
    expect(check('<?xml version="1.0"?>\n<!-- Made in a tool -->\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n<svg width="1"></svg>')).toBe(true)
  })

  it.each([
    ['script', '<svg><script>alert(1)</script></svg>'],
    ['event handler', '<svg onload="alert(1)"></svg>'],
    ['javascript link', '<svg><a href="javascript:alert(1)"></a></svg>'],
    ['embedded HTML', '<svg><foreignObject><div></div></foreignObject></svg>'],
    ['entity definition', '<!DOCTYPE svg [<!ENTITY x "y">]><svg>&x;</svg>'],
  ])('rejects %s', (_label, text) => {
    expect(check(text)).toBe(false)
  })

  it('rejects files that are not SVG at all', () => {
    expect(check('<html><body></body></html>')).toBe(false)
    expect(check('plain text')).toBe(false)
  })
})
