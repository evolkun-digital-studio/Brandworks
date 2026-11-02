import { Readable } from 'node:stream'
import { getMediaStream } from '../../../../src/server/media/service'
import { SVG_CONTENT_SECURITY_POLICY } from '../../../../src/server/media/svg'
import { errorResponse } from '../../../../src/server/http/errors'

export const runtime = 'nodejs'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const { asset, stream } = await getMediaStream(id)
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Disposition': `inline; filename="${asset.originalName.replace(/"/g, '')}"`,
        'Content-Length': String(asset.size),
        'Content-Type': asset.mimeType,
        'X-Content-Type-Options': 'nosniff',
        ...(asset.mimeType === 'image/svg+xml' ? { 'Content-Security-Policy': SVG_CONTENT_SECURITY_POLICY } : {}),
      },
    })
  } catch (error) {
    return errorResponse(error)
  }
}
