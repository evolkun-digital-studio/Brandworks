import { describe, expect, it } from 'vitest'
import { validateStructuredBlogFields } from './blog-validation'

describe('admin blog structured-field validation',()=>{
  it('normalizes optional strings and case-insensitive tags',()=>{
    expect(validateStructuredBlogFields({category:'  Editorial  ',tags:['SEO','seo',' Brand ']})).toEqual({category:'Editorial',tags:['SEO','Brand']})
  })
  it('rejects malformed URLs and nested structures as 400 API errors',()=>{
    expect(()=>validateStructuredBlogFields({canonicalUrl:'javascript:alert(1)'})).toThrow(expect.objectContaining({status:400,message:'Canonical URL must be a valid URL.'}))
    expect(()=>validateStructuredBlogFields({faq:[{question:'Q'}]})).toThrow(expect.objectContaining({status:400,message:'Each FAQ item requires an answer.'}))
  })
  it('normalizes empty optional AI/SEO objects to null and validates booleans',()=>{
    expect(validateStructuredBlogFields({aiContext:{},entitySeo:{},robotsIndex:false})).toEqual({aiContext:null,entitySeo:null,robotsIndex:false})
    expect(()=>validateStructuredBlogFields({robotsIndex:'false'})).toThrow(expect.objectContaining({status:400}))
  })
})
