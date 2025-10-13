import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    const adminPassword = process.env.ADMIN_PASSWORD

    // Verify admin authentication
    if (!authHeader?.startsWith("Bearer ") || authHeader.slice(7) !== adminPassword) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { action, params } = body

    const sql = getDb()

    switch (action) {
      case "get_stats": {
        // Get database size and row counts
        const [postsCount] = await sql`
          SELECT COUNT(*) as count FROM bluesky_feed.posts
        `
        const [historicalCount] = await sql`
          SELECT COUNT(*) as count FROM bluesky_feed.historical_stats
        `
        const [oldestPost] = await sql`
          SELECT MIN(created_at) as oldest FROM bluesky_feed.posts
        `
        const [newestPost] = await sql`
          SELECT MAX(created_at) as newest FROM bluesky_feed.posts
        `

        return NextResponse.json({
          posts_count: Number(postsCount.count),
          historical_stats_count: Number(historicalCount.count),
          oldest_post: oldestPost.oldest,
          newest_post: newestPost.newest,
        })
      }

      case "delete_old_posts": {
        const daysToKeep = params?.days || 30
        const result = await sql`
          DELETE FROM bluesky_feed.posts
          WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'
        `
        return NextResponse.json({
          success: true,
          deleted: result.count,
          message: `Deleted posts older than ${daysToKeep} days`,
        })
      }

      case "delete_old_history": {
        const daysToKeep = params?.days || 7
        const result = await sql`
          DELETE FROM bluesky_feed.historical_stats
          WHERE timestamp < NOW() - INTERVAL '${daysToKeep} days'
        `
        return NextResponse.json({
          success: true,
          deleted: result.count,
          message: `Deleted historical stats older than ${daysToKeep} days`,
        })
      }

      case "vacuum": {
        // Reclaim space after deletions
        await sql`VACUUM ANALYZE bluesky_feed.posts`
        await sql`VACUUM ANALYZE bluesky_feed.historical_stats`
        return NextResponse.json({
          success: true,
          message: "Database optimized successfully",
        })
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("[v0] Database management error:", error)
    return NextResponse.json(
      {
        error: "Database management failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
