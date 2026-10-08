import { resolvePublicOrigin } from '../../src/server/config/env'
import { buildRobotsTxt } from '../../src/server/seo/robots'
import { errorResponse } from '../../src/server/http/errors'

export const dynamic='force-dynamic'

export async function GET(){
  try{return new Response(buildRobotsTxt(resolvePublicOrigin()),{status:200,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'public, max-age=3600'}})}
  catch(error){return errorResponse(error)}
}
