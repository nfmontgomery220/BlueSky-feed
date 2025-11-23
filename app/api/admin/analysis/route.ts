import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    const sql = neon(process.env.DATABASE_URL)

    // Check if tables exist first
    try {
      await sql`SELECT count(*) FROM bluesky_feed.post_analysis`
    } catch (e) {
      // Table likely doesn't exist yet
      return NextResponse.json({
        total_analyzed: 0,
        category_breakdown: [],
        sentiment_breakdown: [],
        recent_analysis: [],
      })
    }

    // Fetch stats
    const total = await sql`SELECT COUNT(*) as count FROM bluesky_feed.post_analysis`

    const categories = await sql`
      SELECT category as name, COUNT(*) as value 
      FROM bluesky_feed.post_analysis 
      GROUP BY category 
      ORDER BY value DESC
    `

    const sentiment = await sql`
      SELECT sentiment as name, COUNT(*) as value 
      FROM bluesky_feed.post_analysis 
      GROUP BY sentiment
    `

    // Fetch recent analyzed posts with their text
    const recent = await sql`
      SELECT 
        pa.post_uri, 
        pa.category, 
        pa.sentiment, 
        pa.confidence, 
        pa.analyzed_at,
        p.text
      FROM bluesky_feed.post_analysis pa
      JOIN bluesky_feed.posts p ON pa.post_uri = p.uri
      ORDER BY pa.analyzed_at DESC 
      LIMIT 10
    `

    // Format sentiment colors
    const sentimentData = sentiment.map((s) => ({
      name: s.name,
      value: Number.parseInt(s.value),
      color: s.name === "positive" ? "#22c55e" : s.name === "negative" ? "#ef4444" : "#eab308",
    }))

    return NextResponse.json({
      total_analyzed: Number.parseInt(total[0].count),
      category_breakdown: categories.map((c) => ({ name: c.name, value: Number.parseInt(c.value) })),
      sentiment_breakdown: sentimentData,
      recent_analysis: recent,
    })
  } catch (error) {
    console.error("Analysis stats error:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
