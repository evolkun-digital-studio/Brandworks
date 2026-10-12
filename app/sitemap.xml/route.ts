import { errorResponse } from '../../src/server/http/errors'
import { resolvePublicOrigin } from '../../src/server/config/env'
import { buildSitemapEntries, buildSitemapXml } from '../../src/server/seo/sitemap'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(){
  try{
    const xml=buildSitemapXml(await buildSitemapEntries(resolvePublicOrigin()))
    return new Response(xml,{status:200,headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=300'}})
  }catch(error){return errorResponse(error)}
}
