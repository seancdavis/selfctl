import type { Config, Context } from '@netlify/functions'
import { eq, desc } from 'drizzle-orm'
import { db, schema } from './_shared/db.js'
import { json, error, notFound, methodNotAllowed } from './_shared/response.js'
import { renderMarkdown } from './_shared/markdown.js'
import { requireAuth } from './_shared/auth.js'

export default async (req: Request, context: Context) => {
  const auth = await requireAuth(req)
  if (!auth.authenticated) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = context.params

  if (id) {
    const raceId = parseInt(id, 10)

    // GET /api/running-races/:id
    if (req.method === 'GET') {
      const [result] = await db
        .select({
          race: schema.races,
          linkedActivity: schema.runningActivities,
        })
        .from(schema.races)
        .leftJoin(
          schema.runningActivities,
          eq(schema.races.linkedActivityId, schema.runningActivities.id),
        )
        .where(eq(schema.races.id, raceId))
        .limit(1)

      if (!result) return notFound('Race not found')

      return json({
        ...result.race,
        distanceMiles: Number(result.race.distanceMiles),
        linkedActivity: result.linkedActivity
          ? {
              ...result.linkedActivity,
              stravaActivityId: String(result.linkedActivity.stravaActivityId),
              distanceMiles: Number(result.linkedActivity.distanceMiles),
              elevationGainFeet: result.linkedActivity.elevationGainFeet
                ? Number(result.linkedActivity.elevationGainFeet)
                : null,
            }
          : null,
      })
    }

    // PATCH /api/running-races/:id
    if (req.method === 'PATCH') {
      let body: {
        name?: string
        raceDate?: string
        distanceLabel?: string
        distanceMiles?: number
        goalTimeSeconds?: number | null
        actualTimeSeconds?: number | null
        linkedActivityId?: number | null
        notesMarkdown?: string | null
      }
      try {
        body = await req.json()
      } catch {
        return error('Invalid JSON body')
      }

      const [existing] = await db
        .select()
        .from(schema.races)
        .where(eq(schema.races.id, raceId))
        .limit(1)

      if (!existing) return notFound('Race not found')

      const updates: Record<string, unknown> = { updatedAt: new Date() }

      if (body.name !== undefined) updates.name = body.name
      if (body.raceDate !== undefined) updates.raceDate = body.raceDate
      if (body.distanceLabel !== undefined) updates.distanceLabel = body.distanceLabel
      if (body.distanceMiles !== undefined) updates.distanceMiles = String(body.distanceMiles)
      if (body.goalTimeSeconds !== undefined) updates.goalTimeSeconds = body.goalTimeSeconds
      if (body.actualTimeSeconds !== undefined) updates.actualTimeSeconds = body.actualTimeSeconds
      if (body.linkedActivityId !== undefined) updates.linkedActivityId = body.linkedActivityId
      if (body.notesMarkdown !== undefined) {
        updates.notesMarkdown = body.notesMarkdown
        updates.notesHtml = body.notesMarkdown
          ? await renderMarkdown(body.notesMarkdown)
          : null
      }

      const [updated] = await db
        .update(schema.races)
        .set(updates)
        .where(eq(schema.races.id, raceId))
        .returning()

      return json({
        ...updated,
        distanceMiles: Number(updated.distanceMiles),
      })
    }

    // DELETE /api/running-races/:id
    if (req.method === 'DELETE') {
      const [race] = await db
        .select()
        .from(schema.races)
        .where(eq(schema.races.id, raceId))
        .limit(1)

      if (!race) return notFound('Race not found')

      await db.delete(schema.races).where(eq(schema.races.id, raceId))
      return json({ success: true })
    }

    return methodNotAllowed()
  }

  // GET /api/running-races
  if (req.method === 'GET') {
    const results = await db
      .select({
        race: schema.races,
        linkedActivity: schema.runningActivities,
      })
      .from(schema.races)
      .leftJoin(
        schema.runningActivities,
        eq(schema.races.linkedActivityId, schema.runningActivities.id),
      )
      .orderBy(desc(schema.races.raceDate))

    return json(
      results.map((row) => ({
        ...row.race,
        distanceMiles: Number(row.race.distanceMiles),
        linkedActivity: row.linkedActivity
          ? {
              ...row.linkedActivity,
              stravaActivityId: String(row.linkedActivity.stravaActivityId),
              distanceMiles: Number(row.linkedActivity.distanceMiles),
              elevationGainFeet: row.linkedActivity.elevationGainFeet
                ? Number(row.linkedActivity.elevationGainFeet)
                : null,
            }
          : null,
      })),
    )
  }

  // POST /api/running-races
  if (req.method === 'POST') {
    let body: {
      name: string
      raceDate: string
      distanceLabel: string
      distanceMiles: number
      goalTimeSeconds?: number | null
      notesMarkdown?: string | null
    }
    try {
      body = await req.json()
    } catch {
      return error('Invalid JSON body')
    }

    if (!body.name || !body.raceDate || !body.distanceLabel || body.distanceMiles == null) {
      return error('name, raceDate, distanceLabel, and distanceMiles are required')
    }

    const notesHtml = body.notesMarkdown
      ? await renderMarkdown(body.notesMarkdown)
      : null

    const [race] = await db
      .insert(schema.races)
      .values({
        name: body.name,
        raceDate: body.raceDate,
        distanceLabel: body.distanceLabel,
        distanceMiles: String(body.distanceMiles),
        goalTimeSeconds: body.goalTimeSeconds ?? null,
        notesMarkdown: body.notesMarkdown || null,
        notesHtml,
      })
      .returning()

    return json(
      { ...race, distanceMiles: Number(race.distanceMiles) },
      201,
    )
  }

  return methodNotAllowed()
}

export const config: Config = {
  path: ['/api/running-races', '/api/running-races/:id'],
}
