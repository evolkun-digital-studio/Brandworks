import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { withAdmin, requireAdminRole } from '../../../../../src/server/admin/http'
import { removeSubAdmin } from '../../../../../src/server/admin/auth'

export async function DELETE(request: NextRequest, context: {params:Promise<{id:string}>}) {
  return withAdmin(request,async (actor)=>{
    requireAdminRole(actor); const {id}=await context.params; await removeSubAdmin(actor,id)
    return new NextResponse(null,{status:204})
  })
}
