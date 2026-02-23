import { execSync } from 'child_process'
import readline from 'readline'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

console.log('\n⚠️  STAGING DATABASE MIGRATION\n')
console.log('This will run migrations against the STAGING (deploy preview) database.')
console.log('This uses the Neon branch database for deploy previews.\n')

rl.question('Type "yes" to confirm: ', (answer) => {
  if (answer === 'yes') {
    console.log('\nRunning staging migration...\n')
    execSync('netlify dev:exec drizzle-kit migrate', { stdio: 'inherit' })
  } else {
    console.log('\nMigration cancelled.')
  }
  rl.close()
})
