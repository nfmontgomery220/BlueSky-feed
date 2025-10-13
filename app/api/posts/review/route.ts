import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.ADMIN_PASSWORD}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "needs_review"
    const limit = Number.parseInt(searchParams.get("limit") || "50")

    const sql = getDb()

    const posts = await sql`
      SELECT 
        id, uri, text, author_did, created_at, indexed_at,
        status, topic, sentiment_score, sentiment_label,
        quality_score, themes, is_actionable, time_sensitivity,
        analyzed_at, like_count, repost_count, reply_count
      FROM bluesky_feed.posts
      WHERE status = ${status}
      ORDER BY indexed_at DESC
      LIMIT ${limit}
    `

    return NextResponse.json({ posts })
  } catch (error) {
    console.error("[v0] Review queue error:", error)
    return NextResponse.json({ error: "Failed to fetch review queue" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.ADMIN_PASSWORD}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { postId, action, notes } = await request.json()

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    const sql = getDb()

    const newStatus = action === "approve" ? "approved" : "rejected"

    await sql`
      UPDATE bluesky_feed.posts
      SET 
        status = ${newStatus},
        reviewed_by = 'admin',
        review_notes = ${notes || null}
      WHERE id = ${postId}
    `

    return NextResponse.json({ success: true, postId, status: newStatus })
  } catch (error) {
    console.error("[v0] Review action error:", error)
    return NextResponse.json({ error: "Failed to update post status" }, { status: 500 })
  }
}
