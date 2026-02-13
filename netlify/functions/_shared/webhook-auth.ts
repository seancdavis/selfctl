export function validateWebhookApiKey(req: Request): boolean {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return false

  const [scheme, token] = authHeader.split(' ')
  if (scheme !== 'Bearer' || !token) return false

  const apiKey = process.env.HEALTH_SYNC_API_KEY
  if (!apiKey) return false

  return token === apiKey
}
