import { NextResponse, type NextRequest } from 'next/server'
import { clearSessionCookie, crossSiteRejected, isCrossSiteWrite } from '../../../../../src/server/admin/http'

export async function POST(request: NextRequest) {
  if (isCrossSiteWrite(request)) return crossSiteRejected()
  return clearSessionCookie(NextResponse.json({ ok: true },{headers:{'Cache-Control':'no-store'}}))
}
