import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'

const sql = neon(process.env.bfc_DATABASE_URL || process.env.DATABASE_URL)

async function runMigration() {
  try {
    console.log('Running migration 004: Add analysis fields...')
    
    const migrationSQL = readFileSync('./scripts/004_add_analysis_fields.sql', 'utf-8')
    
    await sql(migrationSQL)
    
    console.log('✓ Migration 004 completed successfully!')
  } catch (error) {
    console.error('✗ Migration 004 failed:', error)
    process.exit(1)
  }
}

runMigration()
