import type { Config, Context } from '@netlify/functions'
import { desc, gte, sql, eq } from 'drizzle-orm'
import { db, schema } from './_shared/db.js'
import { json, error, notFound, methodNotAllowed } from './_shared/response.js'
import { requireAuth } from './_shared/auth.js'

export default async (req: Request, context: Context) => {
  if (req.method !== 'GET') {
    return methodNotAllowed()
  }

  const auth = await requireAuth(req)
  if (!auth.authenticated) {
    return error('Unauthorized', 401)
  }

  const url = new URL(req.url)
  const pathSegments = url.pathname.split('/').filter(Boolean)
  const lastSegment = pathSegments[pathSegments.length - 1]

  // GET /api/running-activities/stats
  if (lastSegment === 'stats') {
    const year = parseInt(url.searchParams.get('year') || String(new Date().getFullYear()), 10)
    const yearStart = new Date(year, 0, 1)
    const yearEnd = new Date(year + 1, 0, 1)

    const allActivities = await db
      .select()
      .from(schema.runningActivities)
      .orderBy(desc(schema.runningActivities.activityDate))

    const yearActivities = allActivities.filter((a) => {
      const d = new Date(a.activityDate)
      return d >= yearStart && d < yearEnd
    })

    const totalMiles = allActivities.reduce((sum, a) => sum + Number(a.distanceMiles), 0)
    const totalRuns = allActivities.length
    const avgPace =
      totalRuns > 0
        ? Math.round(allActivities.reduce((sum, a) => sum + a.paceSecondsPerMile, 0) / totalRuns)
        : 0
    const avgDistance = totalRuns > 0 ? Math.round((totalMiles / totalRuns) * 100) / 100 : 0
    const longestRun =
      allActivities.length > 0
        ? Math.max(...allActivities.map((a) => Number(a.distanceMiles)))
        : 0

    const yearMiles = yearActivities.reduce((sum, a) => sum + Number(a.distanceMiles), 0)

    return json({
      totalMiles: Math.round(totalMiles * 100) / 100,
      totalRuns,
      avgPace,
      avgDistance,
      longestRun: Math.round(longestRun * 100) / 100,
      yearMiles: Math.round(yearMiles * 100) / 100,
      yearGoal: 500,
    })
  }

  // GET /api/running-activities/:id
  const { id } = context.params
  if (id) {
    const activityId = parseInt(id, 10)
    const [activity] = await db
      .select()
      .from(schema.runningActivities)
      .where(eq(schema.runningActivities.id, activityId))
      .limit(1)

    if (!activity) return notFound('Activity not found')

    return json({
      ...activity,
      stravaActivityId: String(activity.stravaActivityId),
      distanceMiles: Number(activity.distanceMiles),
      elevationGainFeet: activity.elevationGainFeet ? Number(activity.elevationGainFeet) : null,
    })
  }

  // GET /api/running-activities?days=90
  const days = parseInt(url.searchParams.get('days') || '90', 10)

  let query = db
    .select()
    .from(schema.runningActivities)
    .$dynamic()

  if (days > 0) {
    const since = new Date()
    since.setDate(since.getDate() - days)
    query = query.where(gte(schema.runningActivities.activityDate, since))
  }

  const activities = await query.orderBy(desc(schema.runningActivities.activityDate))

  const data = activities.map((a) => ({
    ...a,
    stravaActivityId: String(a.stravaActivityId),
    distanceMiles: Number(a.distanceMiles),
    elevationGainFeet: a.elevationGainFeet ? Number(a.elevationGainFeet) : null,
  }))

  return json(data)
}

export const config: Config = {
  path: ['/api/running-activities', '/api/running-activities/stats', '/api/running-activities/:id'],
}
