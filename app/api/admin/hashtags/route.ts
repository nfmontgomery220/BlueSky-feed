import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

const sql = neon(process.env.bfc_DATABASE_URL!)

export async function GET() {
  try {
    // Get hashtag statistics
    const stats = await sql`
      SELECT * FROM bluesky_feed.hashtag_stats 
      WHERE hashtag IN ('budgetbuilder', 'votingpublic')
      ORDER BY total_posts DESC
    `

    // Get recent posts with tracked hashtags
    const recentPosts = await sql`
      SELECT 
        id,
        text,
        author_handle,
        hashtags,
        indexed_at,
        has_images,
        has_video,
        has_external_link
      FROM bluesky_feed.posts
      WHERE hashtags && ARRAY['budgetbuilder', 'votingpublic']
      ORDER BY indexed_at DESC
      LIMIT 50
    `

    // Get hourly trends for last 7 days
    const trends = await sql`
      SELECT 
        hashtag,
        DATE_TRUNC('hour', indexed_at) as hour,
        COUNT(*) as posts_count,
        COUNT(DISTINCT author_did) as unique_authors
      FROM bluesky_feed.posts, unnest(hashtags) as hashtag
      WHERE hashtag IN ('budgetbuilder', 'votingpublic')
        AND indexed_at > NOW() - INTERVAL '7 days'
      GROUP BY hashtag, DATE_TRUNC('hour', indexed_at)
      ORDER BY hour DESC
    `

    // Get top authors per hashtag
    const topAuthors = await sql`
      SELECT 
        hashtag,
        author_handle,
        COUNT(*) as post_count
      FROM bluesky_feed.posts, unnest(hashtags) as hashtag
      WHERE hashtag IN ('budgetbuilder', 'votingpublic')
      GROUP BY hashtag, author_handle
      ORDER BY hashtag, post_count DESC
    `

    return NextResponse.json({
      stats,
      recentPosts,
      trends,
      topAuthors,
    })
  } catch (error) {
    console.error("Hashtag API error:", error)
    return NextResponse.json({ error: "Failed to fetch hashtag data" }, { status: 500 })
  }
}
