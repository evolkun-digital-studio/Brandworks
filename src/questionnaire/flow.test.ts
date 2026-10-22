import { describe, expect, it } from 'vitest'
import { STEPS, buildPath, estimatedLength, summarize, validateStep, type Answers } from './flow'

const opening: Answers = { brandName: 'Chai & Co.', workType: 'restaurant-cafe-food-brand', operation: 'offline-business-moving-online' }

describe('buildPath', () => {
  it('shows only the opening questions until the project stage is chosen', () => {
    expect(buildPath({})).toEqual(['brandName', 'workType', 'operation', 'projectStage'])
  })

  it('starting from scratch runs through the AI greet, USP and the full brief', () => {
    const path = buildPath({ ...opening, projectStage: 'scratch' })
    expect(path.slice(4, 7)).toEqual(['websiteType', 'usp', 'uspReply'])
    expect(path).toContain('sections')
    expect(path.at(-1)).toBe('contact')
  })

  it('a small-changes redesign ends on the polite exit, with no contact step', () => {
    const path = buildPath({ ...opening, projectStage: 'redesign', redesignType: 'small-changes' })
    expect(path.slice(-2)).toEqual(['redesignType', 'redesignExit'])
    expect(path).not.toContain('contact')
  })

  it('a complete or major redesign asks for the current URL, continues to Q2 and ends at contact', () => {
    for (const redesignType of ['complete', 'major-upgrade']) {
      const path = buildPath({ ...opening, projectStage: 'redesign', redesignType })
      expect(path.slice(4, 7)).toEqual(['redesignType', 'redesignUrl', 'redesignWhy'])
      expect(path.at(-1)).toBe('contact')
    }
  })

  it('the small-changes exit never asks for the URL', () => {
    expect(buildPath({ ...opening, projectStage: 'redesign', redesignType: 'small-changes' })).not.toContain('redesignUrl')
  })

  it('the add-features branch starts with the current URL', () => {
    const path = buildPath({ ...opening, projectStage: 'features' })
    expect(path[4]).toBe('currentUrl')
    expect(path).toContain('featuresCritical')
  })

  it('every step in every path is defined', () => {
    for (const projectStage of ['scratch', 'redesign', 'features']) {
      for (const id of buildPath({ ...opening, projectStage, redesignType: 'complete' })) expect(STEPS[id]).toBeDefined()
    }
  })

  it('does not count the AI interstitial as a question', () => {
    const answers = { ...opening, projectStage: 'scratch' }
    expect(estimatedLength(answers)).toBe(buildPath(answers).length - 1)
  })
})

describe('validateStep', () => {
  it('requires the describe field when "Other" is chosen', () => {
    expect(validateStep(STEPS.workType, { workType: 'other' })).toMatch(/describe/i)
    expect(validateStep(STEPS.workType, { workType: 'other', workTypeOther: 'Pottery studio' })).toBeNull()
  })

  it('caps "pick up to 2" questions', () => {
    expect(validateStep(STEPS.priorities, { priorities: ['speed', 'premium-quality', 'leads-conversions'] })).toMatch(/up to 2/)
    expect(validateStep(STEPS.priorities, { priorities: ['speed'] })).toBeNull()
  })

  it('rejects unknown option values', () => {
    expect(validateStep(STEPS.operation, { operation: 'nope' })).not.toBeNull()
  })

  it('checks the website URL and the contact email', () => {
    expect(validateStep(STEPS.currentUrl, { currentUrl: 'not a url' })).not.toBeNull()
    expect(validateStep(STEPS.currentUrl, { currentUrl: 'brandworks.me' })).toBeNull()
    expect(validateStep(STEPS.contact, { contactName: 'Asha', contactEmail: 'asha@' })).toMatch(/email/i)
    expect(validateStep(STEPS.contact, { contactName: 'Asha', contactEmail: 'asha@chai.co' })).toBeNull()
  })

  it('the redesign URL is optional but must be a web address when given', () => {
    expect(STEPS.redesignUrl).toMatchObject({ kind: 'text', inputType: 'url', optional: true })
    expect(validateStep(STEPS.redesignUrl, {})).toBeNull()
    expect(validateStep(STEPS.redesignUrl, { redesignUrl: 'not a url' })).not.toBeNull()
    expect(validateStep(STEPS.redesignUrl, { redesignUrl: 'chaico.in' })).toBeNull()
  })

  it('lets optional free-text questions be skipped', () => {
    expect(validateStep(STEPS.usp, {})).toBeNull()
    expect(validateStep(STEPS.featuresWanted, {})).not.toBeNull()
  })
})

describe('summarize', () => {
  it('uses the labels the customer saw, in path order, and drops answers from other branches', () => {
    const rows = summarize({
      ...opening,
      projectStage: 'scratch',
      websiteType: 'not-sure',
      websiteTypeSuggested: 'booking',
      priorities: ['speed', 'smooth-user-experience'],
      redesignWhy: ['poor-mobile-experience'],
    })
    expect(rows[0]).toMatchObject({ id: 'brandName', answer: 'Chai & Co.' })
    expect(rows.find((r) => r.id === 'websiteType')?.answer).toBe('Not sure yet (AI suggested: Booking website)')
    expect(rows.find((r) => r.id === 'priorities')?.answer).toBe('Speed, Smooth user experience')
    expect(rows.some((r) => r.id === 'redesignWhy')).toBe(false)
  })
})
