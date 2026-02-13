import type { Config, Context } from '@netlify/functions'
import { eq } from 'drizzle-orm'
import { getStore } from '@netlify/blobs'
import { db, schema } from './_shared/db.js'
import { json, error, notFound, methodNotAllowed } from './_shared/response.js'
import { requireAuth } from './_shared/auth.js'

export default async (req: Request, context: Context) => {
  const auth = await requireAuth(req)
  if (!auth.authenticated) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = context.params
  const url = new URL(req.url)

  // GET /api/goals-attachments/blob/* - serve file from Netlify Blobs
  if (url.pathname.startsWith('/api/goals-attachments/blob/')) {
    if (req.method !== 'GET') return methodNotAllowed()

    const blobKey = url.pathname.replace('/api/goals-attachments/blob/', '')

    if (!blobKey) {
      return error('Blob key is required')
    }

    const store = getStore('attachments')

    try {
      const blobData = await store.get(blobKey, { type: 'arrayBuffer' })

      if (!blobData) {
        return notFound('File not found')
      }

      const metadata = await store.getMetadata(blobKey)
      const mimeType = metadata?.metadata?.mimeType || 'application/octet-stream'
      const filename = metadata?.metadata?.filename || 'download'

      return new Response(blobData, {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'Content-Disposition': `inline; filename="${filename}"`,
        },
      })
    } catch {
      return notFound('File not found')
    }
  }

  // DELETE /api/goals-attachments/:id
  if (id) {
    if (req.method !== 'DELETE') return methodNotAllowed()

    const attachmentId = parseInt(id, 10)

    const [attachment] = await db
      .select()
      .from(schema.attachments)
      .where(eq(schema.attachments.id, attachmentId))
      .limit(1)

    if (!attachment) return notFound('Attachment not found')

    // Remove from Netlify Blobs
    const store = getStore('attachments')
    try {
      await store.delete(attachment.blobKey)
    } catch {
      // Blob may already be deleted, continue with db cleanup
    }

    // Remove from database
    await db
      .delete(schema.attachments)
      .where(eq(schema.attachments.id, attachmentId))

    return json({ success: true })
  }

  return methodNotAllowed()
}

export const config: Config = {
  path: ['/api/goals-attachments/:id', '/api/goals-attachments/blob/*'],
}
