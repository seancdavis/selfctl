import type { Config } from '@netlify/functions'
import { db, schema } from './_shared/db.js'
import { json, error, methodNotAllowed } from './_shared/response.js'
import {
  getValidToken,
  metersToMiles,
  metersToFeet,
  calculatePace,
} from './_shared/strava.js'

const STRAVA_API_BASE = 'https://www.strava.com/api/v3'
const RUN_TYPES = ['Run', 'TrailRun', 'VirtualRun']
const PER_PAGE = 200

export default async (req: Request) => {
  if (req.method !== 'POST') {
    return methodNotAllowed()
  }

  const url = new URL(req.url)
  const key = url.searchParams.get('key')
  if (!key || key !== process.env.STRAVA_VERIFY_TOKEN) {
    return error('Unauthorized', 401)
  }
  const year = parseInt(url.searchParams.get('year') || String(new Date().getFullYear()), 10)
  const after = Math.floor(new Date(year, 0, 1).getTime() / 1000)
  const before = Math.floor(new Date(year + 1, 0, 1).getTime() / 1000)

  const accessToken = await getValidToken(db)

  let page = 1
  let imported = 0
  let skipped = 0

  while (true) {
    const response = await fetch(
      `${STRAVA_API_BASE}/athlete/activities?after=${after}&before=${before}&per_page=${PER_PAGE}&page=${page}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )

    if (!response.ok) {
      return error(`Strava API error: ${response.status}`, 502)
    }

    const activities: Record<string, unknown>[] = await response.json()
    if (activities.length === 0) break

    for (const activity of activities) {
      if (!RUN_TYPES.includes(activity.type as string)) {
        skipped++
        continue
      }

      const distanceMiles = metersToMiles(activity.distance as number)
      const movingTimeSeconds = activity.moving_time as number
      const paceSecondsPerMile = calculatePace(distanceMiles, movingTimeSeconds)
      const elevationGainFeet =
        activity.total_elevation_gain != null
          ? metersToFeet(activity.total_elevation_gain as number)
          : null

      const values = {
        stravaActivityId: BigInt(activity.id as number),
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

      imported++
    }

    if (activities.length < PER_PAGE) break
    page++
  }

  return json({ status: 'complete', year, imported, skipped })
}

export const config: Config = {
  path: '/api/strava-backfill',
}
