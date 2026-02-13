import type { Config } from '@netlify/functions'
import { eq, and, inArray } from 'drizzle-orm'
import { db, schema } from './_shared/db.js'
import { json, error, methodNotAllowed } from './_shared/response.js'
import { validateWebhookApiKey } from './_shared/webhook-auth.js'

const DEFAULT_HEIGHT_INCHES = 70
const NEON_USER_ID = 'default'

interface HealthMetric {
  name: string
  units: string
  data: Array<{
    date: string
    qty: number
  }>
}

interface HealthPayload {
  data?: {
    metrics?: HealthMetric[]
  }
}

function calculateBmi(weightLbs: number, heightInches: number): number {
  return (weightLbs / (heightInches * heightInches)) * 703
}

export default async (req: Request) => {
  if (req.method !== 'POST') {
    return methodNotAllowed()
  }

  if (!validateWebhookApiKey(req)) {
    return error('Unauthorized', 401)
  }

  let payload: HealthPayload
  try {
    payload = await req.json()
  } catch {
    return error('Invalid JSON body')
  }

  const metrics = payload?.data?.metrics
  if (!metrics || !Array.isArray(metrics)) {
    return error('No metrics found in payload')
  }

  // Extract relevant metrics
  const weightMetric = metrics.find((m) => m.name === 'weight_body_mass')
  const bodyFatMetric = metrics.find((m) => m.name === 'body_fat_percentage')
  const leanBodyMassMetric = metrics.find((m) => m.name === 'lean_body_mass')

  if (!weightMetric?.data?.length) {
    return json({ message: 'No weight data to process', inserted: 0, updated: 0 })
  }

  // Get height for BMI calculation
  let heightInches = DEFAULT_HEIGHT_INCHES
  const [profile] = await db
    .select()
    .from(schema.userProfiles)
    .where(eq(schema.userProfiles.neonUserId, NEON_USER_ID))
    .limit(1)

  if (profile?.heightInches) {
    heightInches = Number(profile.heightInches)
  }

  // Group all metrics by date
  const dateMap = new Map<
    string,
    { weight?: number; bodyFatPercentage?: number; muscleMass?: number }
  >()

  for (const entry of weightMetric.data) {
    const dateKey = entry.date.split(' ')[0]
    if (!dateMap.has(dateKey)) {
      dateMap.set(dateKey, {})
    }
    dateMap.get(dateKey)!.weight = entry.qty
  }

  if (bodyFatMetric?.data) {
    for (const entry of bodyFatMetric.data) {
      const dateKey = entry.date.split(' ')[0]
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {})
      }
      dateMap.get(dateKey)!.bodyFatPercentage = entry.qty
    }
  }

  if (leanBodyMassMetric?.data) {
    for (const entry of leanBodyMassMetric.data) {
      const dateKey = entry.date.split(' ')[0]
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {})
      }
      dateMap.get(dateKey)!.muscleMass = entry.qty
    }
  }

  // Build recordedAt dates for dedup lookup
  const dates = Array.from(dateMap.keys())
  const recordedAtDates = dates.map((d) => new Date(d + 'T00:00:00.000Z'))

  // Check for existing entries on these dates
  const existingEntries = await db
    .select()
    .from(schema.weightEntries)
    .where(
      and(
        eq(schema.weightEntries.neonUserId, NEON_USER_ID),
        inArray(schema.weightEntries.recordedAt, recordedAtDates),
      ),
    )

  const existingByDate = new Map<string, (typeof existingEntries)[0]>()
  for (const entry of existingEntries) {
    const dateKey = entry.recordedAt.toISOString().split('T')[0]
    existingByDate.set(dateKey, entry)
  }

  let inserted = 0
  let updated = 0

  for (const [dateKey, data] of dateMap) {
    if (!data.weight) continue

    const bmi = calculateBmi(data.weight, heightInches)
    const recordedAt = new Date(dateKey + 'T00:00:00.000Z')

    const existing = existingByDate.get(dateKey)
    if (existing) {
      await db
        .update(schema.weightEntries)
        .set({
          weight: String(data.weight),
          bodyFatPercentage: data.bodyFatPercentage
            ? String(data.bodyFatPercentage)
            : null,
          muscleMass: data.muscleMass ? String(data.muscleMass) : null,
          bmi: String(Math.round(bmi * 10) / 10),
        })
        .where(eq(schema.weightEntries.id, existing.id))
      updated++
    } else {
      await db.insert(schema.weightEntries).values({
        neonUserId: NEON_USER_ID,
        weight: String(data.weight),
        bodyFatPercentage: data.bodyFatPercentage
          ? String(data.bodyFatPercentage)
          : null,
        muscleMass: data.muscleMass ? String(data.muscleMass) : null,
        bmi: String(Math.round(bmi * 10) / 10),
        recordedAt,
      })
      inserted++
    }
  }

  return json({ message: 'Health data synced', inserted, updated })
}

export const config: Config = {
  path: '/api/health-sync',
}
