import { neon } from "@neondatabase/serverless"

// Get the database URL from environment variables
// The environment variables are prefixed with bfc_ in this project
const getDatabaseUrl = () => {
  return process.env.bfc_DATABASE_URL || process.env.DATABASE_URL || ""
}

// Create a reusable SQL client
export const sql = neon(getDatabaseUrl())

// Helper function to check if database is connected
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await sql`SELECT 1`
    return true
  } catch (error) {
    console.error("[v0] Database connection error:", error)
    return false
  }
}
