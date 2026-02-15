interface Logger {
  info: (message: string, data?: Record<string, unknown>) => void
  warn: (message: string, data?: Record<string, unknown>) => void
  error: (message: string, data?: Record<string, unknown>) => void
}

function formatMessage(scope: string, level: string, message: string, data?: Record<string, unknown>): string {
  const base = `[${scope}] ${level}: ${message}`
  return data ? `${base} ${JSON.stringify(data)}` : base
}

export function logger(scope: string): Logger {
  return {
    info: (message, data) => console.log(formatMessage(scope, 'info', message, data)),
    warn: (message, data) => console.warn(formatMessage(scope, 'warn', message, data)),
    error: (message, data) => console.error(formatMessage(scope, 'error', message, data)),
  }
}
