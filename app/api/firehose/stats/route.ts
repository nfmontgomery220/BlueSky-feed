import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export const runtime = "nodejs"

export async function GET() {
  try {
    const stats = await sql`
      SELECT * FROM bluesky_feed.feed_stats
      ORDER BY last_updated DESC
      LIMIT 1
    `

    if (stats.length === 0) {
      return NextResponse.json({
        total_posts_received: 0,
        total_posts_indexed: 0,
        posts_with_images: 0,
        posts_with_video: 0,
        posts_filtered_out: 0,
      })
    }

    const result = stats[0]
    return NextResponse.json({
      ...result,
      total_posts_received: Number(result.total_posts_received) || 0,
      total_posts_indexed: Number(result.total_posts_indexed) || 0,
      posts_with_images: Number(result.posts_with_images) || 0,
      posts_with_video: Number(result.posts_with_video) || 0,
      posts_filtered_out: Number(result.posts_filtered_out) || 0,
    })
  } catch (error) {
    console.error("[v0] Error fetching stats:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
