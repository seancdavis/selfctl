export function validateApiKey(req: Request, envVarName: string): boolean {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return false

  const [scheme, token] = authHeader.split(' ')
  if (scheme !== 'Bearer' || !token) return false

  const apiKey = process.env[envVarName]
  if (!apiKey) return false

  return token === apiKey
}

export function validateWebhookApiKey(req: Request): boolean {
  return validateApiKey(req, 'HEALTH_SYNC_API_KEY')
}
