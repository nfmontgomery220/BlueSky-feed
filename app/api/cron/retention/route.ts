import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const dbUrl = process.env.bfc_DATABASE_URL || process.env.DATABASE_URL
    if (!dbUrl) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }
    const sql = neon(dbUrl)

    // Step 1: Aggregate posts older than 7 days to hourly stats
    // (this also deletes the aggregated posts)
    const hourlyResult = await sql`SELECT * FROM bluesky_feed.aggregate_to_hourly()`
    const hoursAggregated = hourlyResult[0]?.aggregated_count || 0
    const postsDeleted = hourlyResult[0]?.deleted_count || 0

    // Step 2: Aggregate hourly stats older than 30 days to daily stats
    // (this also deletes the aggregated hourly stats)
    const dailyResult = await sql`SELECT * FROM bluesky_feed.aggregate_to_daily()`
    const daysAggregated = dailyResult[0]?.aggregated_count || 0

    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      hoursAggregated,
      daysAggregated,
      postsDeleted,
    }

    return NextResponse.json(summary)
  } catch (error) {
    console.error("[v0] Error in retention job:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
