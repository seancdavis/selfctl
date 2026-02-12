import { execSync } from 'child_process'
import readline from 'readline'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

console.log('\n⚠️  PRODUCTION DATABASE MIGRATION\n')
console.log('This will run migrations against the PRODUCTION database.')
console.log('Make sure you are on the main branch and have pulled latest.\n')

rl.question('Type the project name to confirm: ', (answer) => {
  if (answer === 'personal-dashboard') {
    console.log('\nRunning production migration...\n')
    execSync('netlify exec drizzle-kit migrate', { stdio: 'inherit' })
  } else {
    console.log('\nMigration cancelled.')
  }
  rl.close()
})
