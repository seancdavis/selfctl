import type { Config, Context } from '@netlify/functions'
import { eq } from 'drizzle-orm'
import { db, schema } from './_shared/db.js'
import { json } from './_shared/response.js'
import {
  getValidToken,
  fetchActivity,
  metersToMiles,
  metersToFeet,
  calculatePace,
} from './_shared/strava.js'

const RUN_TYPES = ['Run', 'TrailRun', 'VirtualRun']

export default async (req: Request, context: Context) => {
  // GET — Strava subscription verification
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const mode = url.searchParams.get('hub.mode')
    const challenge = url.searchParams.get('hub.challenge')
    const verifyToken = url.searchParams.get('hub.verify_token')

    if (mode === 'subscribe' && verifyToken === process.env.STRAVA_VERIFY_TOKEN) {
      return json({ 'hub.challenge': challenge })
    }

    return new Response('Forbidden', { status: 403 })
  }

  // POST — Activity events
  if (req.method === 'POST') {
    try {
      const event = await req.json()

      // Only handle activity events
      if (event.object_type !== 'activity') {
        return json({ status: 'ignored' })
      }

      const activityId = event.object_id

      // Handle delete
      if (event.aspect_type === 'delete') {
        await db
          .delete(schema.runningActivities)
          .where(eq(schema.runningActivities.stravaActivityId, BigInt(activityId)))
        return json({ status: 'deleted' })
      }

      // Handle create/update — fetch full activity from Strava
      const accessToken = await getValidToken(db)
      const activity = await fetchActivity(accessToken, activityId)

      // Only process running activities
      if (!RUN_TYPES.includes(activity.type as string)) {
        return json({ status: 'skipped', reason: 'not a run' })
      }

      const distanceMiles = metersToMiles(activity.distance as number)
      const movingTimeSeconds = activity.moving_time as number
      const paceSecondsPerMile = calculatePace(distanceMiles, movingTimeSeconds)
      const elevationGainFeet =
        activity.total_elevation_gain != null
          ? metersToFeet(activity.total_elevation_gain as number)
          : null

      const values = {
        stravaActivityId: BigInt(activityId),
        name: activity.name as string,
        distanceMiles: String(distanceMiles),
        durationSeconds: activity.elapsed_time as number,
        movingTimeSeconds,
        paceSecondsPerMile,
        elevationGainFeet: elevationGainFeet != null ? String(elevationGainFeet) : null,
        activityDate: new Date(activity.start_date as string),
        stravaType: activity.type as string,
        updatedAt: new Date(),
      }

      await db
        .insert(schema.runningActivities)
        .values({ ...values, createdAt: new Date() })
        .onConflictDoUpdate({
          target: schema.runningActivities.stravaActivityId,
          set: values,
        })

      return json({ status: 'upserted' })
    } catch (err) {
      console.error('Strava webhook error:', err)
      // Always return 200 so Strava doesn't retry
      return json({ status: 'error' })
    }
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config: Config = {
  path: '/api/strava-webhook',
}
