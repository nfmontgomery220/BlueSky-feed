import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const feed = searchParams.get("feed")
    const limit = Math.min(Number.parseInt(searchParams.get("limit") || "50"), 100)
    const cursor = searchParams.get("cursor")

    // Validate feed URI
    if (!feed || !feed.includes("voting-public")) {
      return NextResponse.json({ error: "Unknown feed" }, { status: 400 })
    }

    // Parse cursor (timestamp-based pagination)
    const cursorDate = cursor ? new Date(cursor) : new Date()

    // Fetch posts from database
    const posts = await sql`
      SELECT uri, cid, indexed_at
      FROM bluesky_feed.posts
      WHERE indexed_at < ${cursorDate.toISOString()}
      ORDER BY relevance_score DESC, indexed_at DESC
      LIMIT ${limit}
    `

    // Build feed skeleton
    const feed_items = posts.map((post: any) => ({
      post: post.uri,
    }))

    // Generate next cursor
    let nextCursor: string | undefined
    if (posts.length === limit && posts.length > 0) {
      const lastPost = posts[posts.length - 1] as any
      nextCursor = lastPost.indexed_at
    }

    return NextResponse.json({
      feed: feed_items,
      cursor: nextCursor,
    })
  } catch (error) {
    console.error("[v0] Error generating feed skeleton:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
