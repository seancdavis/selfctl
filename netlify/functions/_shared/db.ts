import { getDatabase } from '@netlify/database'
import { drizzle as drizzleNeonHttp } from 'drizzle-orm/neon-http'
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres'
import * as schema from '../../../db/schema'

const database = getDatabase()

export const db =
  database.driver === 'serverless'
    ? drizzleNeonHttp(database.httpClient, { schema })
    : drizzlePg(database.pool, { schema })

export { schema }
