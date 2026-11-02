import { describe, expect, it } from 'vitest'
import { urlLabel } from './siteScan'

const HOME = 'https://chaico.in/'

describe('urlLabel', () => {
  it('calls the homepage "Homepage", however it is written', () => {
    for (const url of ['https://chaico.in/', 'https://chaico.in', 'https://www.chaico.in/', 'http://chaico.in/', 'https://chaico.in/?_gl=1*abc#top', '/']) {
      expect(urlLabel(url, HOME), url).toBe('Homepage')
    }
    expect(urlLabel('https://chaico.in/en/', 'https://chaico.in/en')).toBe('Homepage')
  })

  it('shows only the path for pages on the same site', () => {
    expect(urlLabel('https://chaico.in/about', HOME)).toBe('/about')
    expect(urlLabel('https://www.chaico.in/services/seo/', HOME)).toBe('/services/seo/')
    expect(urlLabel('/about', HOME)).toBe('/about')
  })

  it('drops the query string and fragment', () => {
    expect(urlLabel('https://chaico.in/about?utm_source=x&id=1#team', HOME)).toBe('/about')
    expect(urlLabel('https://other.com/a?x=1#y', HOME)).toBe('other.com/a')
  })

  it('shows host and path for anything else', () => {
    expect(urlLabel('https://other.com/about', HOME)).toBe('other.com/about')
    expect(urlLabel('https://other.com/', HOME)).toBe('other.com')
    expect(urlLabel('https://blog.chaico.in/post', HOME)).toBe('blog.chaico.in/post')
    expect(urlLabel('https://chaico.in/about')).toBe('chaico.in/about')
    expect(urlLabel('https://chaico.in/')).toBe('chaico.in')
  })

  it('shows a Hindi path readably', () => {
    expect(urlLabel(`https://chaico.in/${encodeURI('संपर्क')}`, HOME)).toBe('/संपर्क')
  })

  it('returns anything it cannot read as it is', () => {
    expect(urlLabel('javascript:alert(1)', HOME)).toBe('javascript:alert(1)')
    expect(urlLabel('not a url')).toBe('not a url')
  })
})
