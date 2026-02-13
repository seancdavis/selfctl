import type { Config, Context } from '@netlify/functions'
import { eq } from 'drizzle-orm'
import { getStore } from '@netlify/blobs'
import { db, schema } from './_shared/db.js'
import { json, error, methodNotAllowed } from './_shared/response.js'
import { requireAuth } from './_shared/auth.js'

export default async (req: Request, context: Context) => {
  const auth = await requireAuth(req)
  if (!auth.authenticated) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (req.method !== 'POST') {
    return methodNotAllowed()
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return error('Invalid form data')
  }

  const file = formData.get('file') as File | null
  const noteId = formData.get('noteId') as string | null

  if (!file) {
    return error('file is required')
  }

  if (!noteId) {
    return error('noteId is required')
  }

  const noteIdNum = parseInt(noteId, 10)

  // Verify the note exists
  const [note] = await db
    .select()
    .from(schema.notes)
    .where(eq(schema.notes.id, noteIdNum))
    .limit(1)

  if (!note) {
    return error('Note not found', 404)
  }

  // Generate a unique blob key
  const timestamp = Date.now()
  const blobKey = `${noteId}/${timestamp}-${file.name}`

  // Store file in Netlify Blobs
  const store = getStore('attachments')
  const buffer = await file.arrayBuffer()
  await store.set(blobKey, new Uint8Array(buffer), {
    metadata: {
      filename: file.name,
      mimeType: file.type,
    },
  })

  // Create attachment record in database
  const [attachment] = await db
    .insert(schema.attachments)
    .values({
      noteId: noteIdNum,
      filename: file.name,
      blobKey,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
    })
    .returning()

  return json(attachment, 201)
}

export const config: Config = {
  path: '/api/goals-upload',
}
