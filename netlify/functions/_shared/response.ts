export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function error(message: string, status = 400) {
  return json({ error: message }, status)
}

export function notFound(message = 'Not found') {
  return error(message, 404)
}

export function methodNotAllowed() {
  return error('Method not allowed', 405)
}
