import type { Config, Context } from '@netlify/functions'
import { db, schema } from './_shared/db.js'
import { requireAuth } from './_shared/auth.js'
import { json, error } from './_shared/response.js'
import { eq } from 'drizzle-orm'

export default async (req: Request, context: Context) => {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  const auth = await requireAuth(req)
  if (!auth.authenticated) {
    return error('Unauthorized', 401)
  }

  const url = new URL(req.url)
  const pathSegments = url.pathname.split('/').filter(Boolean)
  const lastSegment = pathSegments[pathSegments.length - 1]

  // GET /api/strava-auth/callback — exchange code for tokens
  if (lastSegment === 'callback') {
    const code = url.searchParams.get('code')
    if (!code) {
      return error('Missing authorization code')
    }

    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return error(`Strava OAuth failed: ${err}`, 502)
    }

    const data = await response.json()

    // Upsert token by athlete ID
    await db
      .insert(schema.stravaTokens)
      .values({
        athleteId: data.athlete.id,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: data.expires_at,
      })
      .onConflictDoUpdate({
        target: schema.stravaTokens.athleteId,
        set: {
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: data.expires_at,
          updatedAt: new Date(),
        },
      })

    return json({
      status: 'connected',
      athlete: { id: data.athlete.id, name: `${data.athlete.firstname} ${data.athlete.lastname}` },
    })
  }

  // GET /api/strava-auth — redirect to Strava OAuth
  const redirectUri = `${url.origin}/api/strava-auth/callback`
  const stravaUrl = new URL('https://www.strava.com/oauth/authorize')
  stravaUrl.searchParams.set('client_id', process.env.STRAVA_CLIENT_ID!)
  stravaUrl.searchParams.set('redirect_uri', redirectUri)
  stravaUrl.searchParams.set('response_type', 'code')
  stravaUrl.searchParams.set('scope', 'activity:read_all')

  return Response.redirect(stravaUrl.toString(), 302)
}

export const config: Config = {
  path: ['/api/strava-auth', '/api/strava-auth/callback'],
}
