import { badRequest } from '../http/errors'

function obj(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value) }
function text(value: unknown, label: string, max: number) {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') throw badRequest(`${label} must be text.`)
  const result=value.trim()
  if(result.length>max) throw badRequest(`${label} must be at most ${max} characters.`)
  return result||null
}
function url(value: unknown,label:string){
  const result=text(value,label,10000);if(result===null)return null
  try{if(['http:','https:'].includes(new URL(result).protocol))return result}catch{/* invalid */}
  throw badRequest(`${label} must be a valid URL.`)
}
function strings(value:unknown,label:string,maxItems:number,maxLength:number,caseInsensitive=false){
  if(value===undefined)return []
  if(!Array.isArray(value))throw badRequest(`${label} must be a list.`)
  const result:string[]=[];const seen=new Set<string>()
  for(const raw of value){if(typeof raw!=='string')throw badRequest(`Each ${label} entry must be text.`);const item=raw.trim();if(!item)continue;if(item.length>maxLength)throw badRequest(`Each ${label} entry must be at most ${maxLength} characters.`);const key=caseInsensitive?item.toLowerCase():item;if(!seen.has(key)){seen.add(key);result.push(item)}}
  if(result.length>maxItems)throw badRequest(`${label} must have at most ${maxItems} entries.`)
  return result
}
function bool(value:unknown,label:string){if(typeof value!=='boolean')throw badRequest(`${label} must be true or false.`);return value}

/** Same structured-field allowlist and validations as the Express blog service. */
export function validateStructuredBlogFields(input:Record<string,unknown>):Record<string,unknown>{
  const patch:Record<string,unknown>={}
  const optionalStrings:Array<[string,string,number]>=[['coverImageTitle','Cover image title',200],['coverImageCaption','Cover image caption',500],['coverImageDescription','Cover image description',1000],['category','Category',200],['aiSummary','AI summary',300],['focusKeyword','Focus keyword',200],['ogTitle','Open Graph title',200],['ogDescription','Open Graph description',500]]
  for(const [key,label,max]of optionalStrings)if(input[key]!==undefined)patch[key]=text(input[key],label,max)
  if(input.tags!==undefined)patch.tags=strings(input.tags,'Tag',20,100,true)
  if(input.keyTakeaways!==undefined)patch.keyTakeaways=strings(input.keyTakeaways,'Key takeaway',20,300)
  if(input.secondaryKeywords!==undefined)patch.secondaryKeywords=strings(input.secondaryKeywords,'Secondary keyword',30,200,true)
  if(input.canonicalUrl!==undefined)patch.canonicalUrl=url(input.canonicalUrl,'Canonical URL')
  if(input.ogImage!==undefined)patch.ogImage=url(input.ogImage,'Open Graph image')
  if(input.robotsIndex!==undefined)patch.robotsIndex=bool(input.robotsIndex,'Robots index')
  if(input.breadcrumbEnabled!==undefined)patch.breadcrumbEnabled=bool(input.breadcrumbEnabled,'Breadcrumb enabled')
  if(input.twitterCard!==undefined){const value=input.twitterCard;if(value!==null&&(typeof value!=='string'||!['summary','summary_large_image','player'].includes(value)))throw badRequest('Twitter card must be one of: summary, summary_large_image, player.');patch.twitterCard=value??null}
  if(input.aiContext!==undefined){
    if(input.aiContext===null)patch.aiContext=null
    else{if(!obj(input.aiContext))throw badRequest('AI context must be an object.');const context:Record<string,string|null>={};for(const [key,label]of [['targetCountry','Target country'],['targetLanguage','Target language'],['targetAudience','Target audience'],['contentType','Content type'],['contentIntent','Content intent']]as const)context[key]=text(input.aiContext[key],label,100);patch.aiContext=Object.values(context).every(v=>v===null)?null:context}
  }
  if(input.entitySeo!==undefined){
    if(input.entitySeo===null)patch.entitySeo=null
    else{if(!obj(input.entitySeo))throw badRequest('Entity SEO must be an object.');const mainEntity=text(input.entitySeo.mainEntity,'Main entity',200);const about=strings(input.entitySeo.about,'About',20,200);const mentionedEntities=strings(input.entitySeo.mentionedEntities,'Mentioned entity',30,200);patch.entitySeo=mainEntity===null&&!about.length&&!mentionedEntities.length?null:{mainEntity,about,mentionedEntities}}
  }
  if(input.faq!==undefined){
    if(!Array.isArray(input.faq))throw badRequest('FAQ must be a list.');if(input.faq.length>20)throw badRequest('FAQ must have at most 20 items.')
    patch.faq=input.faq.map(raw=>{if(!obj(raw))throw badRequest('Each FAQ item must be an object.');const question=typeof raw.question==='string'?raw.question.trim():'';const answer=typeof raw.answer==='string'?raw.answer.trim():'';if(!question)throw badRequest('Each FAQ item requires a question.');if(question.length>300)throw badRequest('Each FAQ question must be at most 300 characters.');if(!answer)throw badRequest('Each FAQ item requires an answer.');if(answer.length>2000)throw badRequest('Each FAQ answer must be at most 2000 characters.');return{question,answer}})
  }
  if(input.expertQuote!==undefined){
    if(input.expertQuote===null)patch.expertQuote=null
    else{if(!obj(input.expertQuote))throw badRequest('Expert quote must be an object.');const quote=typeof input.expertQuote.quote==='string'?input.expertQuote.quote.trim():'';const personName=typeof input.expertQuote.personName==='string'?input.expertQuote.personName.trim():'';const organization=typeof input.expertQuote.organization==='string'?input.expertQuote.organization.trim():'';if(!quote&&!personName&&!organization)patch.expertQuote=null;else{if(!quote)throw badRequest('Expert quote text is required.');if(quote.length>2000)throw badRequest('Expert quote must be at most 2000 characters.');if(!personName)throw badRequest('Expert quote person name is required.');if(personName.length>200)throw badRequest('Expert quote person name must be at most 200 characters.');if(!organization)throw badRequest('Expert quote organization is required.');if(organization.length>200)throw badRequest('Expert quote organization must be at most 200 characters.');patch.expertQuote={quote,personName,organization,role:text(input.expertQuote.role,'Expert quote role',200)}}}
  }
  if(input.callouts!==undefined){
    if(!Array.isArray(input.callouts))throw badRequest('Callouts must be a list.');if(input.callouts.length>20)throw badRequest('Callouts must have at most 20 items.')
    patch.callouts=input.callouts.map(raw=>{if(!obj(raw))throw badRequest('Each callout must be an object.');if(typeof raw.id!=='string'||!raw.id.trim())throw badRequest('Each callout requires an id.');if(typeof raw.type!=='string'||!['important','warning','tip','note'].includes(raw.type))throw badRequest('Callout type must be one of: important, warning, tip, note.');const title=typeof raw.title==='string'?raw.title.trim():'';const content=typeof raw.content==='string'?raw.content.trim():'';if(!title)throw badRequest('Each callout requires a title.');if(title.length>200)throw badRequest('Each callout title must be at most 200 characters.');if(!content)throw badRequest('Each callout requires content.');if(content.length>2000)throw badRequest('Each callout content must be at most 2000 characters.');return{id:raw.id.trim(),type:raw.type,title,content}})
  }
  if(input.customMetaTags!==undefined){
    if(!Array.isArray(input.customMetaTags))throw badRequest('Custom meta tags must be a list.');if(input.customMetaTags.length>20)throw badRequest('Custom meta tags must have at most 20 items.')
    patch.customMetaTags=input.customMetaTags.map(raw=>{if(!obj(raw))throw badRequest('Each custom meta tag must be an object.');const name=typeof raw.name==='string'?raw.name.trim():'';const content=typeof raw.content==='string'?raw.content.trim():'';if(!name)throw badRequest('Each custom meta tag requires a name.');if(name.length>100)throw badRequest('Each custom meta tag name must be at most 100 characters.');if(!content)throw badRequest('Each custom meta tag requires content.');if(content.length>1000)throw badRequest('Each custom meta tag content must be at most 1000 characters.');return{name,content}})
  }
  return patch
}
