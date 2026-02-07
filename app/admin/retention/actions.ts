"use server"

import { neon } from "@neondatabase/serverless"

export async function runRetentionJobAction() {
  try {
    const dbUrl = process.env.bfc_DATABASE_URL || process.env.DATABASE_URL
    if (!dbUrl) {
      return {
        success: false,
        error: "Database not configured",
        timestamp: new Date().toISOString(),
        hoursAggregated: 0,
        daysAggregated: 0,
        postsDeleted: 0,
        hourlyStatsDeleted: 0,
      }
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
      hourlyStatsDeleted: 0,
    }

    return summary
  } catch (error) {
    console.error("[v0] Error in retention job:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
      hoursAggregated: 0,
      daysAggregated: 0,
      postsDeleted: 0,
      hourlyStatsDeleted: 0,
    }
  }
}
