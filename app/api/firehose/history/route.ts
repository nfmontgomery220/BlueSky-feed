export const runtime = "nodejs"

import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

const sql = neon(process.env.bfc_DATABASE_URL!)

export async function GET() {
  try {
    // Get historical stats from the last 24 hours, grouped by hour
    const history = await sql`
      SELECT 
        DATE_TRUNC('hour', recorded_at) as hour,
        MAX(total_posts_received) as total_posts_received,
        MAX(total_posts_indexed) as total_posts_indexed,
        MAX(posts_with_images) as posts_with_images,
        MAX(posts_with_video) as posts_with_video,
        MAX(posts_filtered_out) as posts_filtered_out
      FROM bluesky_feed.feed_stats_history
      WHERE recorded_at >= NOW() - INTERVAL '24 hours'
      GROUP BY hour
      ORDER BY hour ASC
    `

    return NextResponse.json({ history })
  } catch (error) {
    console.error("[v0] Error fetching history:", error)
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 })
  }
}
