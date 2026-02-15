import type { Config } from '@netlify/functions'
import { desc, gte } from 'drizzle-orm'
import { db, schema } from './_shared/db.js'
import { json, error, methodNotAllowed } from './_shared/response.js'
import { requireAuth } from './_shared/auth.js'

export default async (req: Request) => {
  if (req.method !== 'GET') {
    return methodNotAllowed()
  }

  const auth = await requireAuth(req)
  if (!auth.authenticated) {
    return error('Unauthorized', 401)
  }

  const url = new URL(req.url)
  const days = parseInt(url.searchParams.get('days') || '90', 10)

  let query = db
    .select()
    .from(schema.weightEntries)
    .$dynamic()

  if (days > 0) {
    const since = new Date()
    since.setDate(since.getDate() - days)
    query = query.where(gte(schema.weightEntries.recordedAt, since))
  }

  const entries = await query.orderBy(desc(schema.weightEntries.recordedAt))

  const data = entries.map((entry) => ({
    id: entry.id,
    neonUserId: entry.neonUserId,
    weight: Number(entry.weight),
    bodyFatPercentage: entry.bodyFatPercentage
      ? Number(entry.bodyFatPercentage)
      : null,
    muscleMass: entry.muscleMass ? Number(entry.muscleMass) : null,
    bmi: entry.bmi ? Number(entry.bmi) : null,
    recordedAt: entry.recordedAt,
    createdAt: entry.createdAt,
  }))

  return json(data)
}

export const config: Config = {
  path: '/api/health-weight',
}
