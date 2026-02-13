import { db } from './db'
import { approvedUsers } from '../../../db/schema'
import { eq } from 'drizzle-orm'

interface AuthResult {
  authenticated: boolean
  userId?: string
  email?: string
}

export async function requireAuth(req: Request): Promise<AuthResult> {
  const userId = req.headers.get('x-user-id')
  const email = req.headers.get('x-user-email')

  if (!userId || !email) {
    return { authenticated: false }
  }

  const [user] = await db
    .select()
    .from(approvedUsers)
    .where(eq(approvedUsers.email, email))
    .limit(1)

  if (!user) {
    return { authenticated: false }
  }

  return { authenticated: true, userId, email }
}

export async function isApprovedUser(email: string): Promise<boolean> {
  const [user] = await db
    .select()
    .from(approvedUsers)
    .where(eq(approvedUsers.email, email))
    .limit(1)

  return !!user
}
