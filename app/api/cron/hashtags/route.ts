import { neon } from "@neondatabase/serverless"
import { type NextRequest, NextResponse } from "next/server"

const sql = neon(process.env.bfc_DATABASE_URL!)

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Parse new posts for hashtags
    const parseResult = await sql`SELECT * FROM bluesky_feed.parse_hashtags_from_posts()`
    const updatedCount = parseResult[0]?.updated_count || 0

    // Update hashtag statistics
    await sql`SELECT bluesky_feed.update_hashtag_stats()`

    // Get current stats
    const stats = await sql`
      SELECT * FROM bluesky_feed.hashtag_stats 
      WHERE hashtag IN ('budgetbuilder', 'votingpublic')
      ORDER BY total_posts DESC
    `

    return NextResponse.json({
      success: true,
      parsed: updatedCount,
      stats: stats,
    })
  } catch (error) {
    console.error("Hashtag cron error:", error)
    return NextResponse.json({ error: "Failed to parse hashtags" }, { status: 500 })
  }
}
