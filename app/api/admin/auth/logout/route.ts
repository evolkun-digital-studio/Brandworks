import { NextResponse } from 'next/server'
import { clearSessionCookie } from '../../../../../src/server/admin/http'

export async function POST() { return clearSessionCookie(NextResponse.json({ ok: true },{headers:{'Cache-Control':'no-store'}})) }
