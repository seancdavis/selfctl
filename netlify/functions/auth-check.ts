import type { Config } from '@netlify/functions'
import { isApprovedUser } from './_shared/auth'

export default async (req: Request) => {
  if (req.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 })
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
