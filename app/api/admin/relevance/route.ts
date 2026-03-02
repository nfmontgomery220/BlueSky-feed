import { neon } from "@neondatabase/serverless"
import { type NextRequest, NextResponse } from "next/server"

export async function GET() {
  const connectionString = process.env.bfc_DATABASE_URL || process.env.DATABASE_URL
  if (!connectionString) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 })
  }
  
  const sql = neon(connectionString)
  
  try {
    // Fetch keywords
    const keywords = await sql`
      SELECT id, keyword, category, weight, is_hashtag, created_at
      FROM bluesky_feed.relevance_keywords
      ORDER BY category, weight DESC, keyword
    `
    
    // Fetch scoring config
    const config = await sql`
      SELECT category, weight, description
      FROM bluesky_feed.scoring_config
      ORDER BY category
    `
    
    // Fetch top trusted authors
    const topAuthors = await sql`
      SELECT author_did, trust_score, posts_count, avg_relevance, last_updated
      FROM bluesky_feed.author_trust
      ORDER BY trust_score DESC
      LIMIT 50
    `
    
    return NextResponse.json({
      keywords,
      config,
      topAuthors
    })
  } catch (error) {
    console.error("Error fetching relevance data:", error)
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const connectionString = process.env.bfc_DATABASE_URL || process.env.DATABASE_URL
  if (!connectionString) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 })
  }
  
  const sql = neon(connectionString)
  
  try {
    const body = await request.json()
    const { action } = body
    
    switch (action) {
      case "add_keyword": {
        const { keyword, category, weight, is_hashtag } = body
        await sql`
          INSERT INTO bluesky_feed.relevance_keywords (keyword, category, weight, is_hashtag)
          VALUES (${keyword}, ${category}, ${weight}, ${is_hashtag})
          ON CONFLICT (keyword, category) DO UPDATE SET weight = ${weight}
        `
        return NextResponse.json({ success: true })
      }
      
      case "delete_keyword": {
        const { id } = body
        await sql`DELETE FROM bluesky_feed.relevance_keywords WHERE id = ${id}`
        return NextResponse.json({ success: true })
      }
      
      case "update_weight": {
        const { category, weight } = body
        await sql`
          UPDATE bluesky_feed.scoring_config 
          SET weight = ${weight}
          WHERE category = ${category}
        `
        return NextResponse.json({ success: true })
      }
      
      case "reset_author_trust": {
        const { author_did } = body
        if (author_did) {
          await sql`DELETE FROM bluesky_feed.author_trust WHERE author_did = ${author_did}`
        } else {
          await sql`TRUNCATE bluesky_feed.author_trust`
        }
        return NextResponse.json({ success: true })
      }
      
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error processing relevance action:", error)
    return NextResponse.json({ error: "Failed to process action" }, { status: 500 })
  }
}
