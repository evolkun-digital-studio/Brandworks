import type { NextRequest } from 'next/server'
import { withAdmin, requireAdminRole, readJsonObject, json } from '../../../../../../src/server/admin/http'
import { setSubAdminEnabled } from '../../../../../../src/server/admin/auth'
import { toPublicAdmin } from '../../../../../../src/server/admin/types'
import { badRequest } from '../../../../../../src/server/http/errors'

export async function PATCH(request: NextRequest, context: {params:Promise<{id:string}>}) {
  return withAdmin(request,async (actor)=>{
    requireAdminRole(actor); const body=await readJsonObject(request)
    if(typeof body.enabled!=='boolean') throw badRequest('`enabled` must be a boolean.')
    const {id}=await context.params
    return json({admin:toPublicAdmin(await setSubAdminEnabled(actor,id,body.enabled))})
  })
}
