import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { analyzePost, determineStatus } from "@/lib/ai-analyzer"

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.ADMIN_PASSWORD}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { postId, batchSize } = await request.json()

    const sql = getDb()

    // If specific post ID provided, analyze that post
    if (postId) {
      const posts = await sql`
        SELECT id, text, author_did, status
        FROM bluesky_feed.posts
        WHERE id = ${postId}
      `

      if (posts.length === 0) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 })
      }

      const post = posts[0]
      const analysis = await analyzePost(post.text, post.author_did)
      const status = determineStatus(analysis)

      await sql`
        UPDATE bluesky_feed.posts
        SET 
          status = ${status},
          topic = ${analysis.topic},
          sentiment_score = ${analysis.sentiment_score},
          sentiment_label = ${analysis.sentiment_label},
          quality_score = ${analysis.quality_score},
          themes = ${analysis.themes},
          is_actionable = ${analysis.is_actionable},
          time_sensitivity = ${analysis.time_sensitivity},
          analyzed_at = NOW()
        WHERE id = ${postId}
      `

      return NextResponse.json({
        success: true,
        postId,
        analysis,
        status,
        reasoning: analysis.reasoning,
      })
    }

    // Otherwise, analyze a batch of pending posts
    const limit = batchSize || 10

    const pendingPosts = await sql`
      SELECT id, text, author_did
      FROM bluesky_feed.posts
      WHERE status = 'pending_analysis'
      ORDER BY indexed_at DESC
      LIMIT ${limit}
    `

    if (pendingPosts.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No pending posts to analyze",
        analyzed: 0,
      })
    }

    const results = []

    for (const post of pendingPosts) {
      try {
        const analysis = await analyzePost(post.text, post.author_did)
        const status = determineStatus(analysis)

        await sql`
          UPDATE bluesky_feed.posts
          SET 
            status = ${status},
            topic = ${analysis.topic},
            sentiment_score = ${analysis.sentiment_score},
            sentiment_label = ${analysis.sentiment_label},
            quality_score = ${analysis.quality_score},
            themes = ${analysis.themes},
            is_actionable = ${analysis.is_actionable},
            time_sensitivity = ${analysis.time_sensitivity},
            analyzed_at = NOW()
          WHERE id = ${post.id}
        `

        results.push({
          postId: post.id,
          status,
          quality: analysis.quality_score,
          topic: analysis.topic,
        })
      } catch (error) {
        console.error(`[v0] Error analyzing post ${post.id}:`, error)
        results.push({
          postId: post.id,
          error: "Analysis failed",
        })
      }
    }

    // Update stats
    const stats = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pending_analysis') as pending,
        COUNT(*) FILTER (WHERE status = 'needs_review') as needs_review,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected
      FROM bluesky_feed.posts
    `

    await sql`
      UPDATE bluesky_feed.feed_stats
      SET 
        posts_pending_analysis = ${Number.parseInt(stats[0].pending)},
        posts_needs_review = ${Number.parseInt(stats[0].needs_review)},
        posts_approved = ${Number.parseInt(stats[0].approved)},
        posts_rejected = ${Number.parseInt(stats[0].rejected)}
    `

    return NextResponse.json({
      success: true,
      analyzed: results.length,
      results,
      stats: stats[0],
    })
  } catch (error) {
    console.error("[v0] Analysis error:", error)
    return NextResponse.json(
      { error: "Analysis failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
