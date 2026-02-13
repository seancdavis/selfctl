import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@netlify/neon'
import * as schema from '../../../db/schema'

const sql = neon()
export const db = drizzle(sql, { schema })

export { schema }
