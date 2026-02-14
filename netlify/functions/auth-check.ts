import type { Config } from '@netlify/functions'
import { isApprovedUser } from './_shared/auth'

export default async (req: Request) => {
  if (req.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 })
  }

  // Dev bypass: return a mock user when BYPASS_AUTH is set server-side
  if (process.env.BYPASS_AUTH === 'true') {
    return Response.json({
      approved: true,
      bypass: true,
      user: { id: 'dev', email: 'dev@localhost', name: 'Dev User' },
    })
  }

  const email = req.headers.get('x-user-email')

  if (!email) {
    return Response.json({ approved: false })
  }

  const approved = await isApprovedUser(email)
  return Response.json({ approved })
}

export const config: Config = {
  path: '/api/auth-check',
}
