import type { NextRequest } from 'next/server'
import { withAdmin, requireAdminRole, readJsonObject, json } from '../../../../src/server/admin/http'
import { createSubAdmin, listUsers } from '../../../../src/server/admin/auth'
import { toPublicAdmin } from '../../../../src/server/admin/types'
import { badRequest } from '../../../../src/server/http/errors'

export async function GET(request: NextRequest) {
  return withAdmin(request,async (actor)=>{ requireAdminRole(actor); return json({admins:(await listUsers(actor)).map(toPublicAdmin)}) })
}
export async function POST(request: NextRequest) {
  return withAdmin(request,async (actor)=>{
    requireAdminRole(actor); const body=await readJsonObject(request)
    if(typeof body.username!=='string'||typeof body.password!=='string') throw badRequest('Username and password are required.')
    return json({admin:toPublicAdmin(await createSubAdmin(actor,body.username,body.password))},201)
  })
}
