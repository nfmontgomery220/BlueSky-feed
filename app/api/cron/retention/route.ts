import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.bfc_DATABASE_URL!)

// This cron job runs the data retention strategy
// Set up in Vercel: Cron Jobs -> Add cron job -> /api/cron/retention -> 0 2 * * * (daily at 2 AM)
export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    console.log("[v0] Starting data retention job")

    // Step 1: Aggregate posts older than 7 days to hourly stats
    console.log("[v0] Aggregating posts to hourly stats...")
    const hourlyResult = await sql`SELECT * FROM bluesky_feed.aggregate_to_hourly()`
    console.log(`[v0] Aggregated ${hourlyResult[0]?.hours_processed || 0} hours`)

    // Step 2: Aggregate hourly stats older than 30 days to daily stats
    console.log("[v0] Aggregating hourly to daily stats...")
    const dailyResult = await sql`SELECT * FROM bluesky_feed.aggregate_to_daily()`
    console.log(`[v0] Aggregated ${dailyResult[0]?.days_processed || 0} days`)

    // Step 3: Clean up old data
    console.log("[v0] Cleaning up old data...")
    const cleanupResult = await sql`SELECT * FROM bluesky_feed.cleanup_old_data()`
    const postsDeleted = cleanupResult[0]?.posts_deleted || 0
    const hourlyDeleted = cleanupResult[0]?.hourly_deleted || 0
    console.log(`[v0] Deleted ${postsDeleted} posts and ${hourlyDeleted} hourly stats`)

    // Step 4: Vacuum analyze to reclaim space
    console.log("[v0] Running VACUUM ANALYZE...")
    await sql`VACUUM ANALYZE bluesky_feed.posts`
    await sql`VACUUM ANALYZE bluesky_feed.feed_stats_hourly`

    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      hoursAggregated: hourlyResult[0]?.hours_processed || 0,
      daysAggregated: dailyResult[0]?.days_processed || 0,
      postsDeleted,
      hourlyStatsDeleted: hourlyDeleted,
    }

    console.log("[v0] Data retention job completed", summary)
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
