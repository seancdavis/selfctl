import { execSync } from 'child_process'
import readline from 'readline'

const environments = {
  staging: {
    envVar: 'NETLIFY_STAGING_DATABASE_URL',
    label: 'STAGING (deploy preview)',
    confirm: { prompt: 'Type "yes" to confirm: ', expected: 'yes' },
  },
  production: {
    envVar: 'NETLIFY_PRODUCTION_DATABASE_URL',
    label: 'PRODUCTION',
    confirm: { prompt: 'Type the project name to confirm: ', expected: 'personal-dashboard' },
  },
}

const env = process.argv[2]
const config = environments[env]

if (!config) {
  console.error(`Usage: node scripts/migrate.js <${Object.keys(environments).join('|')}>`)
  process.exit(1)
}

const databaseUrl = process.env[config.envVar]
if (!databaseUrl) {
  console.error(`Error: ${config.envVar} is not set.`)
  process.exit(1)
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

console.log(`\n⚠️  ${config.label} DATABASE MIGRATION\n`)
console.log(`This will run migrations against the ${config.label} database.\n`)

rl.question(config.confirm.prompt, (answer) => {
  if (answer === config.confirm.expected) {
    console.log(`\nRunning ${env} migration...\n`)
    execSync('drizzle-kit migrate', {
      stdio: 'inherit',
      env: { ...process.env, NETLIFY_DATABASE_URL: databaseUrl },
    })
  } else {
    console.log('\nMigration cancelled.')
  }
  rl.close()
})
