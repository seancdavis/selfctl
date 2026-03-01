import { eq } from 'drizzle-orm'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import type * as schemaTypes from '../../../db/schema'
import { stravaTokens } from '../../../db/schema'

type DB = NeonHttpDatabase<typeof schemaTypes>

const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token'
const STRAVA_API_BASE = 'https://www.strava.com/api/v3'

export function metersToMiles(meters: number): number {
  return Math.round((meters / 1609.344) * 100) / 100
}

export function metersToFeet(meters: number): number {
  return Math.round(meters * 3.28084 * 10) / 10
}

export function calculatePace(distanceMiles: number, movingTimeSeconds: number): number {
  if (distanceMiles === 0) return 0
  return Math.round(movingTimeSeconds / distanceMiles)
}

export async function getValidToken(db: DB): Promise<string> {
  const [token] = await db.select().from(stravaTokens).limit(1)

  if (!token) {
    throw new Error('No Strava token found. Complete OAuth flow first.')
  }

  const now = Math.floor(Date.now() / 1000)
  if (token.expiresAt > now + 60) {
    return token.accessToken
  }

  // Refresh the token
  const response = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: token.refreshToken,
    }),
  })

  if (!response.ok) {
    throw new Error(`Strava token refresh failed: ${response.status}`)
  }

  const data = await response.json()

  await db
    .update(stravaTokens)
    .set({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_at,
      updatedAt: new Date(),
    })
    .where(eq(stravaTokens.id, token.id))

  return data.access_token
}

export async function fetchActivity(
  accessToken: string,
  activityId: number | string,
): Promise<Record<string, unknown>> {
  const response = await fetch(`${STRAVA_API_BASE}/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new Error(`Strava API error: ${response.status}`)
  }

  return response.json()
}
