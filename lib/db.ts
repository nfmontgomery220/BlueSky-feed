import "server-only"
import { neon } from "@neondatabase/serverless"

// Get the database URL from environment variables
// The environment variables are prefixed with bfc_ in this project
const getDatabaseUrl = () => {
  return process.env.bfc_DATABASE_URL || process.env.DATABASE_URL || ""
}

// Create a reusable SQL client with browser warning disabled
// This is safe because we've added "server-only" import to ensure this code never runs in the browser
export const sql = neon(getDatabaseUrl(), {
  fetchOptions: {
    cache: "no-store",
  },
})

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
