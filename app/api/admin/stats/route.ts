import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.bfc_DATABASE_URL!)

export async function GET() {
  try {
    const currentStats = await sql`
      SELECT * FROM bluesky_feed.feed_stats 
      ORDER BY last_updated DESC 
      LIMIT 1
    `

    const postStats = await sql`
      SELECT 
        COUNT(*) as total_posts,
        COUNT(CASE WHEN has_images THEN 1 END) as posts_with_images,
        COUNT(CASE WHEN has_video THEN 1 END) as posts_with_video,
        COUNT(CASE WHEN has_external_link THEN 1 END) as posts_with_links,
        COUNT(DISTINCT author_did) as unique_authors,
        MIN(created_at) as oldest_post,
        MAX(created_at) as newest_post
      FROM bluesky_feed.posts
    `

    const historicalStats = await sql`
      SELECT * FROM bluesky_feed.feed_stats_history 
      ORDER BY recorded_at DESC 
      LIMIT 50
    `

    const recentPosts = await sql`
      SELECT 
        id, author_handle, text, created_at, has_images, has_video, 
        has_external_link, external_domain
      FROM bluesky_feed.posts 
      ORDER BY indexed_at DESC 
      LIMIT 10
    `

    const trafficMetrics = await sql`
      SELECT 
        DATE_TRUNC('hour', indexed_at) as hour,
        COUNT(*) as posts_count
      FROM bluesky_feed.posts
      WHERE indexed_at > NOW() - INTERVAL '24 hours'
      GROUP BY hour
      ORDER BY hour DESC
    `

    let retentionMetrics = null
    try {
      const tableCheck = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'bluesky_feed' 
          AND table_name = 'feed_stats_hourly'
        ) as hourly_exists,
        EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'bluesky_feed' 
          AND table_name = 'feed_stats_daily'
        ) as daily_exists
      `

      if (tableCheck[0]?.hourly_exists && tableCheck[0]?.daily_exists) {
        const metrics = await sql`
          SELECT 
            (SELECT COUNT(*) FROM bluesky_feed.posts) as active_posts,
            (SELECT COUNT(*) FROM bluesky_feed.feed_stats_hourly) as hourly_stats,
            (SELECT COUNT(*) FROM bluesky_feed.feed_stats_daily) as daily_stats,
            (SELECT MIN(indexed_at) FROM bluesky_feed.posts) as oldest_active_post,
            (SELECT MIN(hour) FROM bluesky_feed.feed_stats_hourly) as oldest_hourly_stat,
            (SELECT MIN(date) FROM bluesky_feed.feed_stats_daily) as oldest_daily_stat
        `
        retentionMetrics = metrics[0]
      }
    } catch (retentionError) {
      console.log("[v0] Retention tables not yet created, skipping retention metrics")
    }

    return NextResponse.json({
      currentStats: currentStats[0] || null,
      postStats: postStats[0] || null,
      historicalStats: historicalStats || [],
      recentPosts: recentPosts || [],
      trafficMetrics: trafficMetrics || [],
      retentionMetrics,
    })
  } catch (error) {
    console.error("[v0] Error fetching stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch statistics", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
